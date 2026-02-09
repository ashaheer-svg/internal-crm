import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'

type ImportResult = {
    success: boolean
    totalRows: number
    successCount: number
    errorCount: number
    errors: Array<{ row: number; sku: string; error: string }>
    createdProducts: Array<{ sku: string; name: string }>
}

function parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows')
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows: any[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())

        if (values.length === 0 || values.every(v => !v)) {
            continue
        }

        const row: any = { _rowNumber: i + 1 }
        header.forEach((col, idx) => {
            row[col] = values[idx] || ''
        })
        rows.push(row)
    }

    return rows
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['ADMIN'])

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            return NextResponse.json({
                error: 'Only CSV files are allowed. If you have an Excel file, save it as CSV first.'
            }, { status: 400 })
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
        }

        // Parse CSV
        const text = await file.text()
        const rows = parseCSV(text)

        // Validate required columns
        const requiredColumns = ['sku', 'name', 'brand', 'model']
        const firstRow = rows[0]
        const missingColumns = requiredColumns.filter(col => !(col in firstRow))

        if (missingColumns.length > 0) {
            return NextResponse.json({
                error: `Missing required columns: ${missingColumns.join(', ')}`
            }, { status: 400 })
        }

        const result: ImportResult = {
            success: true,
            totalRows: rows.length,
            successCount: 0,
            errorCount: 0,
            errors: [],
            createdProducts: []
        }

        // Get existing SKUs to check for duplicates
        const existingProducts = await prisma.product.findMany({
            select: { sku: true }
        })
        const existingSKUs = new Set(existingProducts.map(p => p.sku))

        // Process each row
        for (const row of rows) {
            const rowNumber = row._rowNumber

            try {
                // Validate required fields
                if (!row.sku) throw new Error('SKU is required')
                if (!row.name) throw new Error('Name is required')
                if (!row.brand) throw new Error('Brand is required')
                if (!row.model) throw new Error('Model is required')

                // Check for duplicate SKU in database
                if (existingSKUs.has(row.sku)) {
                    throw new Error(`SKU already exists in database`)
                }

                // Parse numeric fields
                const minStock = row.minstock ? parseInt(row.minstock) : 0
                const warrantyMonths = row.warrantymonths ? parseInt(row.warrantymonths) : 0
                const lowResellerPrice = row.lowresellerprice ? parseFloat(row.lowresellerprice) : 0
                const resellerPrice = row.resellerprice ? parseFloat(row.resellerprice) : 0

                // Validate numeric fields
                if (isNaN(minStock) || minStock < 0) {
                    throw new Error('Min stock must be a non-negative number')
                }
                if (isNaN(warrantyMonths) || warrantyMonths < 0) {
                    throw new Error('Warranty months must be a non-negative number')
                }
                if (isNaN(lowResellerPrice) || lowResellerPrice < 0) {
                    throw new Error('Low reseller price must be a non-negative number')
                }
                if (isNaN(resellerPrice) || resellerPrice < 0) {
                    throw new Error('Reseller price must be a non-negative number')
                }

                // Create product
                const product = await prisma.product.create({
                    data: {
                        sku: row.sku,
                        name: row.name,
                        brand: row.brand,
                        category: row.category || 'General',
                        model: row.model,
                        description: row.description || null,
                        minStock,
                        warrantyMonths,
                        lowResellerPrice,
                        resellerPrice
                    }
                })

                result.successCount++
                result.createdProducts.push({
                    sku: product.sku,
                    name: product.name
                })
                existingSKUs.add(row.sku)

            } catch (error: any) {
                result.errorCount++
                result.errors.push({
                    row: rowNumber,
                    sku: row.sku || 'N/A',
                    error: error.message
                })
            }
        }

        // Log the import
        await logCreate('PRODUCT', 'bulk-import', user.id, user.name, {
            filename: file.name,
            totalRows: result.totalRows,
            successCount: result.successCount,
            errorCount: result.errorCount,
            timestamp: new Date().toISOString()
        })

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Bulk import error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to import products' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}

// GET - Download CSV template
export async function GET() {
    try {
        await requireRole(['ADMIN'])

        const template = `sku,name,brand,category,model,description,minStock,warrantyMonths,lowResellerPrice,resellerPrice
SAMPLE001,Sample Product 1,Brand A,Electronics,Model X,High quality product,10,12,45.00,50.00
SAMPLE002,Sample Product 2,Brand B,Model Y,Durable hardware,5,24,90.00,100.00
SAMPLE003,Sample Product 3,Brand C,Model Z,Premium item,15,36,180.00,200.00`

        return new NextResponse(template, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="product_import_template.csv"'
            }
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to download template' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
