import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const INITIAL_MODELS = [
    { modelName: "DS223j", bays: 2, formFactor: "Desktop", powerType: "Standard", series: "J", networkPorts: "1GbE x1", targetMarket: "Home/Basic", defaultRamGB: 1, maxRamGB: 1, supportsSATA: true, supportsSAS: false },
    { modelName: "DS224+", bays: 2, formFactor: "Desktop", powerType: "Standard", series: "Plus", networkPorts: "1GbE x2", targetMarket: "Home/SOHO", defaultRamGB: 2, maxRamGB: 6, supportsSATA: true, supportsSAS: false },
    { modelName: "DS723+", bays: 2, expansionUnitModel: "DX517", expansionBaysPerUnit: 5, maxExpansionUnitsSupported: 1, formFactor: "Desktop", powerType: "Standard", series: "Plus", networkPorts: "1GbE x2, 10GbE Opt", targetMarket: "Advanced/SOHO", defaultRamGB: 2, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "DS923+", bays: 4, expansionUnitModel: "DX517", expansionBaysPerUnit: 5, maxExpansionUnitsSupported: 1, formFactor: "Desktop", powerType: "Standard", series: "Plus", networkPorts: "1GbE x2, 10GbE Opt", targetMarket: "Business", defaultRamGB: 4, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "DS1522+", bays: 5, expansionUnitModel: "DX517", expansionBaysPerUnit: 5, maxExpansionUnitsSupported: 2, formFactor: "Desktop", powerType: "Standard", series: "Plus", networkPorts: "1GbE x4, 10GbE Opt", targetMarket: "Business/VMS", defaultRamGB: 8, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "DS1821+", bays: 8, expansionUnitModel: "DX517", expansionBaysPerUnit: 5, maxExpansionUnitsSupported: 2, formFactor: "Desktop", powerType: "Standard", series: "Plus", networkPorts: "1GbE x4", targetMarket: "Enterprise Edge", defaultRamGB: 4, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "RS1221RP+", bays: 8, expansionUnitModel: "RX418", expansionBaysPerUnit: 4, maxExpansionUnitsSupported: 1, formFactor: "Rackmount", powerType: "Redundant", series: "Plus", networkPorts: "1GbE x4", targetMarket: "Rack/Mission Critical", defaultRamGB: 4, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "RS2423RP+", bays: 12, expansionUnitModel: "RX1223RP", expansionBaysPerUnit: 12, maxExpansionUnitsSupported: 1, formFactor: "Rackmount", powerType: "Redundant", series: "Plus", networkPorts: "1GbE x2, 10GbE x2", targetMarket: "Rack/Datacenter", defaultRamGB: 8, maxRamGB: 32, supportsSATA: true, supportsSAS: false },
    { modelName: "RS3621xs+", bays: 12, expansionUnitModel: "RX1217", expansionBaysPerUnit: 12, maxExpansionUnitsSupported: 2, formFactor: "Rackmount", powerType: "Redundant", series: "XS+", networkPorts: "10GbE x2", targetMarket: "Enterprise Performance", defaultRamGB: 8, maxRamGB: 64, supportsSATA: true, supportsSAS: true },
    { modelName: "RS4021xs+", bays: 16, expansionUnitModel: "RX1217", expansionBaysPerUnit: 12, maxExpansionUnitsSupported: 2, formFactor: "Rackmount", powerType: "Redundant", series: "XS+", networkPorts: "10GbE x2", targetMarket: "Enterprise Storage", defaultRamGB: 16, maxRamGB: 64, supportsSATA: true, supportsSAS: true },
]

async function main() {
    console.log('Seeding NAS Models...')
    for (const model of INITIAL_MODELS) {
        await prisma.nASModel.upsert({
            where: { modelName: model.modelName },
            update: model,
            create: model
        })
    }
    console.log('Seed complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
