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
        const { names } = await req.json()

        if (!names || !Array.isArray(names)) {
            return NextResponse.json({ error: 'Invalid names data' }, { status: 400 })
        }

        // 1. Fetch all existing customers and partners
        const existingEntities = await prisma.customer.findMany({
            select: { id: true, name: true, isCustomer: true, isPartner: true }
        })

        const results = names.map(name => {
            const normalized = name.trim()
            if (!normalized) return null

            // Find best match
            let bestMatch = null
            let highScorer = -1

            for (const entity of existingEntities) {
                const score = getSimilarity(normalized, entity.name)
                if (score > highScorer) {
                    highScorer = score
                    bestMatch = entity
                }
            }

            return {
                input: name,
                match: highScorer > 0.6 ? {
                    id: bestMatch?.id,
                    name: bestMatch?.name,
                    score: highScorer,
                    type: bestMatch?.isPartner ? 'PARTNER' : 'CUSTOMER'
                } : null,
                suggestions: existingEntities
                    .map(e => ({ id: e.id, name: e.name, score: getSimilarity(normalized, e.name) }))
                    .filter(s => s.score > 0.4 && s.score < 1.0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
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
