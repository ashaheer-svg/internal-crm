import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
    try {
        await requirePermission('settings:manage')

        const { searchParams } = new URL(request.url)
        const subPath = searchParams.get('path') || ''
        const downloadFile = searchParams.get('download')
        const rootType = searchParams.get('root') || 'styleguide' // 'styleguide' or 'public'

        // 1. Define roots supporting project-wide and ancestor traversal layouts
        const roots: Record<string, string> = {
            styleguide: path.join(process.cwd(), 'scripts', 'styleguide'),
            public: path.join(process.cwd(), 'public'),
            project: path.normalize(process.cwd()),
            workspace: path.normalize(path.join(process.cwd(), '..', '..'))
        }

        const rootDir = roots[rootType] || roots.styleguide

        // 2. Security Check: Block Path Traversals
        if (subPath.includes('..')) {
            return NextResponse.json({ error: 'Access Denied: Path traversal detected.' }, { status: 403 })
        }

        const absoluteTarget = path.join(rootDir, subPath)

        // 3. Verify target is inside root
        if (!absoluteTarget.startsWith(rootDir)) {
            return NextResponse.json({ error: 'Access Denied: Out of bounds.' }, { status: 403 })
        }

        if (!fs.existsSync(absoluteTarget)) {
            return NextResponse.json({ error: 'Path not found' }, { status: 404 })
        }

        const stats = await fs.promises.stat(absoluteTarget)

        // 4. Handle Download Request
        if (downloadFile) {
            const downloadPath = path.join(absoluteTarget, downloadFile)

            if (downloadFile.includes('..') || !downloadPath.startsWith(rootDir) || !fs.existsSync(downloadPath)) {
                return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
            }

            const fileBuffer = await fs.promises.readFile(downloadPath)
            const fileStats = await fs.promises.stat(downloadPath)

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${path.basename(downloadFile)}"`,
                    'Content-Length': fileStats.size.toString()
                }
            })
        }

        // 5. Handle Directory Listing
        if (stats.isDirectory()) {
            const items = await fs.promises.readdir(absoluteTarget, { withFileTypes: true })
            
            const fileList = items.map(item => {
                const itemPath = path.join(absoluteTarget, item.name)
                // stats sync
                const itemStats = fs.statSync(itemPath)
                
                return {
                    name: item.name,
                    isDir: item.isDirectory(),
                    size: item.isFile() ? itemStats.size : 0,
                    path: path.join(subPath, item.name).replace(/\\/g, '/') // Relative to root
                }
            })

            return NextResponse.json({
                root: rootType,
                currentPath: subPath,
                files: fileList
            })
        } else {
            return NextResponse.json({ error: 'Not a directory. Use ?download=... to fetch files' }, { status: 400 })
        }

    } catch (error: any) {
        console.error('File Manager API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to list files' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
