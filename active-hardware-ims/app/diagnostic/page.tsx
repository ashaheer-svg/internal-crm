'use client'

import { useEffect, useState } from 'react'

export default function DiagnosticPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/diagnostic')
            .then(res => res.json())
            .then(data => {
                setData(data)
                setLoading(false)
            })
            .catch(err => {
                setData({ error: err.message })
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div style={{ padding: '20px', fontFamily: 'monospace' }}>
                <h1>🔍 System Diagnostics</h1>
                <p>Loading...</p>
            </div>
        )
    }

    const isHealthy = data?.overallStatus?.healthy

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>🔍 System Diagnostics</h1>
            <p style={{ color: '#666' }}>Generated: {data?.timestamp}</p>

            {/* Overall Status */}
            <div style={{
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: isHealthy ? '#d4edda' : '#f8d7da',
                border: `2px solid ${isHealthy ? '#28a745' : '#dc3545'}`,
                borderRadius: '8px'
            }}>
                <h2 style={{ margin: '0 0 10px 0' }}>
                    {isHealthy ? '✅ System Healthy' : '❌ Issues Detected'}
                </h2>
                {data?.overallStatus?.issues?.length > 0 && (
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        {data.overallStatus.issues.map((issue: string, i: number) => (
                            <li key={i} style={{ color: '#721c24' }}>{issue}</li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Recommendations */}
            {data?.recommendations?.length > 0 && (
                <div style={{
                    padding: '20px',
                    marginBottom: '20px',
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px'
                }}>
                    <h2 style={{ margin: '0 0 10px 0' }}>💡 Recommendations</h2>
                    <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        {data.recommendations.map((rec: string, i: number) => (
                            <li key={i} style={{ marginBottom: '5px' }}>{rec}</li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Detailed Checks */}
            <h2>Detailed Checks</h2>

            {/* Environment */}
            <CheckSection title="Environment Variables" data={data?.checks?.environment} />

            {/* Database File */}
            <CheckSection title="Database File" data={data?.checks?.database} />

            {/* Database Connection */}
            <CheckSection title="Database Connection" data={data?.checks?.databaseConnection} />

            {/* User Table */}
            <CheckSection title="User Table" data={data?.checks?.userTable} />

            {/* Admin User */}
            <CheckSection title="Admin User" data={data?.checks?.adminUser} />

            {/* Tables */}
            <CheckSection title="Database Tables" data={data?.checks?.tables} />

            {/* Prisma Schema */}
            <CheckSection title="Prisma Schema" data={data?.checks?.prismaSchema} />

            {/* Migrations */}
            <CheckSection title="Migrations" data={data?.checks?.migrations} />

            {/* Raw JSON */}
            <details style={{ marginTop: '30px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    📄 View Raw JSON
                </summary>
                <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto',
                    fontSize: '12px'
                }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </details>
        </div>
    )
}

function CheckSection({ title, data }: { title: string, data: any }) {
    return (
        <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '5px'
        }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{title}</h3>
            <pre style={{
                margin: 0,
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    )
}
