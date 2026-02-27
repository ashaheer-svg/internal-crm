import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
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
        const user = await requirePermission('inventory:create')
        const contentType = request.headers.get('content-type') || ''

        // Handle JSON Batch Import (Chunked)
        if (contentType.includes('application/json')) {
            const body = await request.json()
            const { products } = body

            if (!Array.isArray(products)) {
                return NextResponse.json({ error: 'Invalid data format. Expected array of products.' }, { status: 400 })
            }

            let successCount = 0
            let errorCount = 0
            const errors: any[] = []

            for (const item of products) {
                // Auto-create category if provided
                if (item.category && typeof item.category === 'string' && item.category.trim() !== '') {
                    const categoryName = item.category.trim()
                    // Fire and forget upsert? Or await? Await to ensure safety.
                    // Doing it inside loop might be slow for massive imports, but safe.
                    // Better: dedupe first. But for JSON batch which might be small, loop is okay.
                    // Actually, let's allow the individual upsert to fail silently if needed, or just await it.
                    try {
                        await prisma.category.upsert({
                            where: { name: categoryName },
                            update: {},
                            create: { name: categoryName }
                        })
                    } catch (e) {
                        // Ignore race conditions or other category errors, don't block product creation?
                        // Ideally we want it to exist.
                        console.error(`Failed to auto-create category ${categoryName}`, e)
                    }
                }

                try {
                    await prisma.product.create({
                        data: {
                            sku: item.sku,
                            name: item.name,
                            brand: item.brand,
                            category: item.category,
                            model: item.model,
                            description: item.description,
                            minStock: item.minStock,
                            warrantyMonths: item.warrantyMonths,
                            lowResellerPrice: item.lowResellerPrice,
                            resellerPrice: item.resellerPrice,
                            serviceDefinition: item.isService ? {
                                create: {
                                    type: item.serviceType || 'LICENSE'
                                }
                            } : undefined
                        }
                    })
                    successCount++
                } catch (error: any) {
                    errorCount++
                    errors.push({ sku: item.sku, error: error.message })
                }
            }

            return NextResponse.json({ success: true, successCount, errorCount, errors })
        }

        // Handle CSV File Upload (Preview or Legacy Full Import)
        const { searchParams } = new URL(request.url);
        const isPreview = searchParams.get('preview') === 'true';

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
        // isService and serviceType are optional but supported
        const firstRow = rows[0]
        const missingColumns = requiredColumns.filter(col => !(col in firstRow))

        if (missingColumns.length > 0) {
            return NextResponse.json({
                error: `Missing required columns: ${missingColumns.join(', ')}`
            }, { status: 400 })
        }

        const result: ImportResult & { preview?: any[] } = {
            success: true,
            totalRows: rows.length,
            successCount: 0,
            errorCount: 0,
            errors: [],
            createdProducts: [],
            preview: []
        }

        // Get existing SKUs to check for duplicates
        const existingProducts = await prisma.product.findMany({
            select: { sku: true }
        })
        const existingSKUs = new Set(existingProducts.map(p => p.sku))

        // Auto-create Categories from CSV
        if (!isPreview) {
            const categories = new Set<string>()
            rows.forEach(row => {
                if (row.category && row.category.trim()) {
                    categories.add(row.category.trim())
                }
            })

            for (const categoryName of Array.from(categories)) {
                try {
                    await prisma.category.upsert({
                        where: { name: categoryName },
                        update: {},
                        create: { name: categoryName }
                    })
                } catch (e) {
                    console.error(`Failed to auto-create category ${categoryName}`, e)
                }
            }
        }

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
                const isService = row.isservice ? (row.isservice.toLowerCase() === 'true' || row.isservice === '1' || row.isservice.toLowerCase() === 'yes') : false
                const serviceType = row.servicetype ? row.servicetype.toUpperCase() : 'LICENSE'

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

                const productData = {
                    sku: row.sku,
                    name: row.name,
                    brand: row.brand,
                    category: row.category || 'General',
                    model: row.model,
                    description: row.description || null,
                    minStock,
                    warrantyMonths,
                    lowResellerPrice,
                    resellerPrice,
                    serviceDefinition: isService ? {
                        create: {
                            type: serviceType as any // LICENSE, AMC, RENTAL, LABOR
                        }
                    } : undefined
                };

                if (isPreview) {
                    result.preview?.push(productData);
                    result.successCount++;
                    // In preview, we pretend we added it to check for duplicates within the file itself
                    existingSKUs.add(row.sku);
                } else {
                    // Create product
                    const product = await prisma.product.create({
                        data: productData
                    })

                    result.successCount++
                    result.createdProducts.push({
                        sku: product.sku,
                        name: product.name
                    })
                    existingSKUs.add(row.sku)
                }

            } catch (error: any) {
                result.errorCount++
                result.errors.push({
                    row: rowNumber,
                    sku: row.sku || 'N/A',
                    error: error.message
                })
            }
        }

        if (!isPreview) {
            // Log the import only if not preview (or if using legacy full file upload without preview)
            await logCreate('PRODUCT', 'bulk-import', user.id, user.name, {
                filename: file.name,
                totalRows: result.totalRows,
                successCount: result.successCount,
                errorCount: result.errorCount,
                timestamp: new Date().toISOString()
            })
        }

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
        await requirePermission('inventory:create')

        const template = `sku,name,brand,category,model,description,minStock,warrantyMonths,lowResellerPrice,resellerPrice,isService,serviceType
SAMPLE001,Sample Product 1,Brand A,Electronics,Model X,High quality product,10,12,45.00,50.00,false,
SAMPLE002,Sample Service,Brand B,Services,Model S,Annual Maintenance,0,0,900.00,1000.00,true,AMC
SAMPLE003,Software License,Brand C,Licenses,Model L,Active 1 Year,0,0,180.00,200.00,true,LICENSE`

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
