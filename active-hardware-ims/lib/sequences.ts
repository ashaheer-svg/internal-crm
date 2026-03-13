import { prisma } from './db'

export type SequenceType = 'PO' | 'PROJ' | 'DO' | 'QUOTE' | 'INV' | 'GRN'

/**
 * Generates the next sequential number for a given document type.
 * Format: PREFIX-YYMM-XXXX (e.g., PO-2403-0001)
 * 
 * @param type The document type (PO, PROJ, etc.)
 * @param consume If true, increments the sequence in the database.
 * @returns The formatted sequence number.
 */
export async function getNextSequence(type: SequenceType, consume: boolean = false): Promise<string> {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearMonth = `${year}${month}`

    const prefixes: Record<SequenceType, string> = {
        'PO': 'PO-',
        'PROJ': 'PROJ-',
        'DO': 'DO-',
        'QUOTE': 'QT-',
        'INV': 'INV-',
        'GRN': 'GRN-'
    }

    const prefix = prefixes[type]

    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
        let sequence = await tx.sequence.findUnique({
            where: { id: type }
        })

        if (!sequence) {
            sequence = await tx.sequence.create({
                data: {
                    id: type,
                    prefix,
                    nextNumber: 1,
                    lastYearMonth: currentYearMonth
                }
            })
        }

        let nextNum = sequence.nextNumber
        let lastYM = sequence.lastYearMonth

        // Reset if month changed
        if (lastYM !== currentYearMonth) {
            nextNum = 1
            lastYM = currentYearMonth
        }

        const formattedNumber = `${prefix}${currentYearMonth}-${nextNum.toString().padStart(4, '0')}`

        if (consume) {
            await tx.sequence.update({
                where: { id: type },
                data: {
                    nextNumber: nextNum + 1,
                    lastYearMonth: lastYM
                }
            })
        }

        return formattedNumber
    })
}

/**
 * Safely increments a sequence after a successful document creation.
 * Use this if you fetched the number without consuming it first.
 */
export async function incrementSequence(type: SequenceType): Promise<void> {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearMonth = `${year}${month}`

    await prisma.$transaction(async (tx) => {
        const sequence = await tx.sequence.findUnique({
            where: { id: type }
        })

        if (!sequence) return

        let nextNum = sequence.nextNumber
        if (sequence.lastYearMonth !== currentYearMonth) {
            nextNum = 1
        }

        await tx.sequence.update({
            where: { id: type },
            data: {
                nextNumber: nextNum + 1,
                lastYearMonth: currentYearMonth
            }
        })
    })
}
