import { prisma as db } from "./db";

// Enums as constants since we are using Strings in SQLite
export const ServiceType = {
    ONE_TIME: "ONE_TIME",
    SUBSCRIPTION: "SUBSCRIPTION",
    CONTRACT: "CONTRACT",
    RENTAL: "RENTAL",
    LICENSE: "LICENSE",
};

export const DurationUnit = {
    DAY: "DAY",
    WEEK: "WEEK",
    MONTH: "MONTH",
    YEAR: "YEAR",
};

export const ContractStatus = {
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
};

export const RentalStatus = {
    AVAILABLE: "AVAILABLE",
    RENTED: "RENTED",
    MAINTENANCE: "MAINTENANCE",
    RETIRED: "RETIRED",
};


// Helper to calculate End Date
export function calculateEndDate(startDate: Date, value: number, unit: string): Date {
    const endDate = new Date(startDate);
    switch (unit) {
        case DurationUnit.DAY:
            endDate.setDate(endDate.getDate() + value);
            break;
        case DurationUnit.WEEK:
            endDate.setDate(endDate.getDate() + (value * 7));
            break;
        case DurationUnit.MONTH:
            endDate.setMonth(endDate.getMonth() + value);
            break;
        case DurationUnit.YEAR:
            endDate.setFullYear(endDate.getFullYear() + value);
            break;
    }
    return endDate;
}


// 1. Definition Management
export async function createServiceDefinition(productId: string, data: {
    type: string;
    durationValue: number;
    durationUnit: string;
    isMetered?: boolean;
    billingCycle?: string;
}) {
    return db.serviceDefinition.create({
        data: {
            productId,
            ...data
        }
    });
}

// 2. Contract Activation
export async function activateServiceContract(data: {
    customerId: string;
    productId: string;
    invoiceItemId?: string;
    startDate?: Date; // Defaults to now if empty
    customDurationValue?: number;
    customDurationUnit?: string;
    description?: string;
    licenseKey?: string;
}) {
    // Fetch definition to get defaults
    const def = await db.serviceDefinition.findUnique({
        where: { productId: data.productId }
    });

    if (!def) throw new Error("Product is not a service");

    const startDate = data.startDate || new Date();
    const durationValue = data.customDurationValue || def.durationValue;
    const durationUnit = data.customDurationUnit || def.durationUnit;

    const endDate = calculateEndDate(startDate, durationValue, durationUnit);

    return db.serviceContract.create({
        data: {
            customerId: data.customerId,
            productId: data.productId,
            invoiceItemId: data.invoiceItemId,
            startDate,
            endDate,
            status: ContractStatus.ACTIVE,
            durationValue,
            durationUnit,
            description: data.description,
            licenseKey: data.licenseKey
        }
    });
}

// 3. Expiration Logic
export async function getExpiringContracts(daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return db.serviceContract.findMany({
        where: {
            status: ContractStatus.ACTIVE,
            endDate: {
                lte: thresholdDate,
                gte: new Date() // Not already expired
            }
        },
        include: {
            customer: true,
            product: true
        },
        orderBy: {
            endDate: 'asc'
        }
    });
}

export async function getActiveContracts() {
    return db.serviceContract.findMany({
        where: {
            status: ContractStatus.ACTIVE
        },
        include: {
            customer: true,
            product: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getAllRentals() {
    return db.rentalAsset.findMany({
        include: {
            product: true,
            currentContract: {
                include: {
                    customer: true
                }
            }
        },
        orderBy: {
            status: 'asc' // AVAILABLE first
        }
    });
}

// 4. Renewal Workflow
export async function renewContract(oldContractId: string, options?: {
    forceStartDate?: Date,
    newDurationValue?: number,
    newDurationUnit?: string
}) {
    const oldContract = await db.serviceContract.findUnique({
        where: { id: oldContractId }
    });

    if (!oldContract) throw new Error("Contract not found");


    // Check if already renewed via reverse lookup or if I added a field? 
    // Schema: nextContract ServiceContract? @relation("RenewalHistory")
    // Note: In prisma findUnique we didn't include it. 
    // Proper check:
    const existingRenewal = await db.serviceContract.findFirst({
        where: { previousContractId: oldContractId }
    });
    if (existingRenewal) throw new Error("Contract already renewed");


    // Default new start date is old end date + 1 day? Or continuous?
    // Let's say continuous, so start = old end.
    let newStartDate = options?.forceStartDate
        || (oldContract.endDate ? new Date(oldContract.endDate) : new Date());

    // Add 1 day if we want to avoid overlap, but for subscriptions usually it's same day or next day.
    // Let's use exactly the old End Date as the new Start Date for seamless continuity

    const durationValue = options?.newDurationValue || oldContract.durationValue;
    const durationUnit = options?.newDurationUnit || oldContract.durationUnit;

    const newEndDate = calculateEndDate(newStartDate, durationValue, durationUnit);

    // Create new contract
    const newContract = await db.serviceContract.create({
        data: {
            customerId: oldContract.customerId,
            productId: oldContract.productId,
            previousContractId: oldContract.id,

            startDate: newStartDate,
            endDate: newEndDate,
            status: ContractStatus.PENDING, // Pending payment/activation

            durationValue,
            durationUnit,
            description: oldContract.description,
            // Don't copy license key/rental asset automatically unless specified logic
        }
    });

    return newContract;
}

// 5. Rental Management
export async function rentOutAsset(contractId: string, rentalAssetId: string) {
    // Verify asset is available
    const asset = await db.rentalAsset.findUnique({
        where: { id: rentalAssetId }
    });

    if (!asset) throw new Error("Asset not found");
    if (asset.status !== RentalStatus.AVAILABLE) throw new Error("Asset is not available");

    // Transaction to link both
    return db.$transaction(async (tx) => {
        // Link contract to asset
        await tx.serviceContract.update({
            where: { id: contractId },
            data: { rentedAssetId: rentalAssetId }
        });

        // Update asset status
        await tx.rentalAsset.update({
            where: { id: rentalAssetId },
            data: { status: RentalStatus.RENTED }
        });
    });
}

export async function returnAsset(rentalAssetId: string) {
    const asset = await db.rentalAsset.findUnique({
        where: { id: rentalAssetId },
        include: { currentContract: true }
    });

    if (!asset) throw new Error("Asset not found");

    // If it was linked to a contract, we might want to unlink it in the contract too?
    // The relation is 1:1 optional. `currentContract` on RentalAsset is the inverse of `rentedAsset` on ServiceContract.
    // So if we set `rentedAssetId` on ServiceContract to null, it breaks the link.

    return db.$transaction(async (tx) => {
        if (asset.currentContract) {
            await tx.serviceContract.update({
                where: { id: asset.currentContract.id },
                data: { rentedAssetId: null }
            });
        }

        await tx.rentalAsset.update({
            where: { id: rentalAssetId },
            data: { status: RentalStatus.AVAILABLE }
        });
    });
}
