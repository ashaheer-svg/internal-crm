import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        const timestamp = Date.now()
        const stagingDir = path.join('/tmp', `diag_${timestamp}`)
        const bundlePath = path.join('/tmp', `diagnostics_${timestamp}.tar.gz`)

        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true })
        }

        // 1. Gather System Commands
        const commands = [
            { cmd: 'ip a', file: 'network_ip.txt' },
            { cmd: 'netstat -tulnp', file: 'network_ports.txt' },
            { cmd: 'df -h', file: 'disk_space.txt' },
            { cmd: 'lsblk', file: 'disk_layout.txt' },
            { cmd: 'free -m', file: 'memory.txt' },
            { cmd: 'top -b -n 1', file: 'cpu_usage.txt' },
            { cmd: 'ps aux --sort=-%cpu | head -n 20', file: 'top_processes.txt' },
            { cmd: 'dmesg | tail -n 500', file: 'dmesg.txt' },
            { cmd: 'mdadm --detail --scan', file: 'raid_status.txt' }
        ]

        for (const c of commands) {
            try {
                const output = execSync(c.cmd, { encoding: 'utf-8', timeout: 5000 })
                fs.writeFileSync(path.join(stagingDir, c.file), output)
            } catch (err: any) {
                fs.writeFileSync(path.join(stagingDir, c.file), `Failed to run ${c.cmd}: ${err.message}`)
            }
        }

        // 2. Gather Logs (Tail 500)
        const logs = [
            { path: '/var/log/syslog', file: 'syslog.txt' },
            { path: '/var/log/messages', file: 'messages.txt' },
            { path: '/var/log/auth.log', file: 'auth.txt' },
            { path: '/var/log/nginx/error.log', file: 'nginx_error.txt' },
            { path: '/var/log/nginx/access.log', file: 'nginx_access.txt' },
        ]

        for (const log of logs) {
            try {
                if (fs.existsSync(log.path)) {
                    const output = execSync(`tail -n 500 ${log.path}`, { encoding: 'utf-8', timeout: 5000 })
                    fs.writeFileSync(path.join(stagingDir, log.file), output)
                } else {
                    fs.writeFileSync(path.join(stagingDir, log.file), `Log file not found at ${log.path}`)
                }
            } catch (err: any) {
                fs.writeFileSync(path.join(stagingDir, log.file), `Failed to read ${log.path}: ${err.message}`)
            }
        }

        // 3. Systemd / Journalctl
        try {
            const output = execSync('journalctl -n 500', { encoding: 'utf-8', timeout: 5000 })
            fs.writeFileSync(path.join(stagingDir, 'systemd_journal.txt'), output)
        } catch (err: any) {
            fs.writeFileSync(path.join(stagingDir, 'systemd_journal.txt'), `Failed to run journalctl: ${err.message}`)
        }

        // 4. Config Files
        const configs = ['package.json', 'next.config.ts', 'next.config.js', 'prisma/schema.prisma']
        for (const config of configs) {
            const src = path.join(process.cwd(), config)
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(stagingDir, path.basename(config)))
            }
        }

        // 5. Create Tarball
        execSync(`tar -czf ${bundlePath} -C /tmp diag_${timestamp}`, { timeout: 10000 })

        // 6. Read and Return Stream
        const fileBuffer = fs.readFileSync(bundlePath)

        // Cleanup staging
        try {
            fs.rmSync(stagingDir, { recursive: true, force: true })
            fs.unlinkSync(bundlePath)
        } catch (err) {}

        return new Response(fileBuffer, {
            headers: {
                'Content-Type': 'application/gzip',
                'Content-Disposition': `attachment; filename="diagnostics_${timestamp}.tar.gz"`
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to generate bundle' }, { status: 500 })
    }
}
