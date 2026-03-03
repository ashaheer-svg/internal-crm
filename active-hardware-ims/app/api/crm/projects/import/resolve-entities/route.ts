import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length
    const len2 = s2.length
    const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0))

    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            )
        }
    }
    return matrix[len1][len2]
}

function getSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2
    if (longer.length === 0) return 1.0
    return (longer.length - levenshteinDistance(s1.toLowerCase(), s2.toLowerCase())) / longer.length
}

export async function POST(req: Request) {
    try {
        await requirePermission('crm:manage')
        /**
         * names: Array<{ input: string; type: 'CUSTOMER' | 'PARTNER' }>
         */
        const { names } = await req.json()

        if (!names || !Array.isArray(names)) {
            return NextResponse.json({ error: 'Invalid names data' }, { status: 400 })
        }

        // Fetch all existing customers / partners
        const existingEntities = await prisma.customer.findMany({
            select: { id: true, name: true, isCustomer: true, isPartner: true }
        })

        const results = names.map((item: { input: string; type?: 'CUSTOMER' | 'PARTNER' } | string) => {
            // Accept both old format (string) and new format ({ input, type })
            const name = typeof item === 'string' ? item : item.input
            const entityType = typeof item === 'string' ? undefined : item.type

            const normalized = name?.trim()
            if (!normalized) return null

            // Filter candidates by type if specified
            let candidates = existingEntities
            if (entityType === 'CUSTOMER') {
                candidates = existingEntities.filter(e => e.isCustomer)
            } else if (entityType === 'PARTNER') {
                candidates = existingEntities.filter(e => e.isPartner)
            }

            // If narrowed pool is empty, fall back to all
            if (candidates.length === 0) candidates = existingEntities

            let bestMatch: typeof existingEntities[0] | null = null
            let highScorer = -1

            for (const entity of candidates) {
                const score = getSimilarity(normalized, entity.name)
                if (score > highScorer) {
                    highScorer = score
                    bestMatch = entity
                }
            }

            return {
                input: name,
                type: entityType,
                match: highScorer > 0.6 ? {
                    id: bestMatch?.id,
                    name: bestMatch?.name,
                    score: highScorer,
                    isPartner: bestMatch?.isPartner,
                    isCustomer: bestMatch?.isCustomer,
                } : null,
                suggestions: candidates
                    .map(e => ({ id: e.id, name: e.name, score: getSimilarity(normalized, e.name), isPartner: e.isPartner, isCustomer: e.isCustomer }))
                    .filter(s => s.score > 0.35)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6)
            }
        }).filter(Boolean)

        return NextResponse.json({ results })

    } catch (error: any) {
        console.error('Resolve entities error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to resolve entities' },
            { status: 500 }
        )
    }
}
