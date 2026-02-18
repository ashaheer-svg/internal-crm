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
    // New Fields
    contractNumber?: string;
    partnerId?: string;
    contractValue?: number;
    invoiceReference?: string;
    salesRepId?: string;
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
            licenseKey: data.licenseKey,
            // New Agreement Fields
            contractNumber: data.contractNumber,
            partnerId: data.partnerId,
            contractValue: data.contractValue || 0,
            invoiceReference: data.invoiceReference,
            salesRepId: data.salesRepId
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
            status: ContractStatus.ACTIVE,
            isDeleted: false
        },
        include: {
            customer: true,
            product: true,
            partner: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getAllRentals() {
    return db.rentalAsset.findMany({
        where: {
            isDeleted: false
        },
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
    if (asset.isDeleted) throw new Error("Asset has been deleted");
    if (asset.status !== RentalStatus.AVAILABLE) throw new Error("Asset is not available");

    // Transaction to link both
    return db.$transaction(async (tx) => {
        // Link asset to contract (1:N, so we update the Asset side)
        await tx.rentalAsset.update({
            where: { id: rentalAssetId },
            data: {
                status: RentalStatus.RENTED,
                currentContractId: contractId
            }
        });
    });
}

export async function returnAsset(rentalAssetId: string) {
    const asset = await db.rentalAsset.findUnique({
        where: { id: rentalAssetId }
    });

    if (!asset) throw new Error("Asset not found");

    return db.$transaction(async (tx) => {
        await tx.rentalAsset.update({
            where: { id: rentalAssetId },
            data: {
                status: RentalStatus.AVAILABLE,
                currentContractId: null
            }
        });
    });
}

// Soft Delete Helpers
export async function softDeleteContract(contractId: string) {
    return db.$transaction(async (tx) => {
        // 1. Find all assets linked to this contract
        const linkedAssets = await tx.rentalAsset.findMany({
            where: { currentContractId: contractId }
        });

        // 2. Return all assets
        for (const asset of linkedAssets) {
            await tx.rentalAsset.update({
                where: { id: asset.id },
                data: {
                    status: RentalStatus.AVAILABLE,
                    currentContractId: null
                }
            });
        }

        // 3. Mark contract as deleted
        await tx.serviceContract.update({
            where: { id: contractId },
            data: { isDeleted: true, status: ContractStatus.CANCELLED }
        });
    });
}

export async function softDeleteAsset(assetId: string) {
    // Check if currently rented
    const asset = await db.rentalAsset.findUnique({
        where: { id: assetId }
    });

    if (asset && asset.status === RentalStatus.RENTED) {
        throw new Error("Cannot delete an asset that is currently rented. Return it first.");
    }

    return db.rentalAsset.update({
        where: { id: assetId },
        data: { isDeleted: true }
    });
}

export async function completeContract(contractId: string) {
    return db.$transaction(async (tx) => {
        // 1. Find all assets linked to this contract
        const linkedAssets = await tx.rentalAsset.findMany({
            where: { currentContractId: contractId }
        });

        // 2. Return all assets
        for (const asset of linkedAssets) {
            await tx.rentalAsset.update({
                where: { id: asset.id },
                data: {
                    status: RentalStatus.AVAILABLE,
                    currentContractId: null
                }
            });
        }

        // 3. Mark contract as completed
        await tx.serviceContract.update({
            where: { id: contractId },
            data: { status: ContractStatus.COMPLETED }
        });
    });
}
