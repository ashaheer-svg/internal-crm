'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Customer {
    id: string
    name: string
}

interface Pipeline {
    id: string
    name: string
}

export default function NewProjectPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [pipelines, setPipelines] = useState<Pipeline[]>([])

    const [formData, setFormData] = useState({
        title: '',
        customerId: '',
        pipelineId: '',
        expectedValue: '',
        currency: 'INR',
        description: ''
    })

    useEffect(() => {
        // Fetch Customers and Pipelines
        Promise.all([
            fetch('/api/customers?limit=100').then(res => {
                if (!res.ok) throw new Error('Failed to fetch customers')
                return res.json()
            }),
            fetch('/api/crm/pipeline').then(res => {
                if (!res.ok) throw new Error('Failed to fetch pipeline')
                return res.json()
            })
        ]).then(([customersData, pipelineData]) => {
            // customersData is { customers: [], totalCount: ... }
            if (customersData && customersData.customers) {
                setCustomers(customersData.customers)
            } else if (Array.isArray(customersData)) {
                setCustomers(customersData)
            }

            // If fetch('/api/crm/pipeline') returns a single object (default pipeline)
            if (pipelineData && pipelineData.id) {
                setPipelines([pipelineData])
                setFormData(prev => ({ ...prev, pipelineId: pipelineData.id }))
            }
        }).catch(err => {
            console.error(err)
            // alert('Failed to load initial data') // Optional: don't annoy user if it's just a blip
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/crm/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                const project = await res.json()
                router.push(`/dashboard/crm/projects/${project.id}`) // Redirect to project detail (Phase 2)
                // For now, redirect back to pipeline if detail page doesn't exist
                // router.push('/dashboard/crm/pipeline')
            } else {
                alert('Failed to create project')
            }
        } catch (error) {
            console.error(error)
            alert('Error creating project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Create New Sales Project</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Project Title</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Acme Corp Network Upgrade"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <select
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.customerId}
                        onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    >
                        <option value="">Select a Customer</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Value</label>
                        <input
                            type="number"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.expectedValue}
                            onChange={e => setFormData({ ...formData, expectedValue: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    )
}
