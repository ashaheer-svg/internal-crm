'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/format'

export default function CRMReportsPage() {
    const [forecastData, setForecastData] = useState<any[]>([])
    const [historyData, setHistoryData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [salesReps, setSalesReps] = useState<any[]>([])
    const [selectedRep, setSelectedRep] = useState('ALL')

    useEffect(() => {
        fetchReports()
        fetchSalesReps()
    }, [selectedRep])

    async function fetchSalesReps() {
        try {
            const res = await fetch('/api/sales-reps')
            if (res.ok) {
                const data = await res.json()
                setSalesReps(data)
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchReports() {
        setLoading(true)
        try {
            const [forecastRes, historyRes] = await Promise.all([
                fetch(`/api/crm/reports/forecast?salesRepId=${selectedRep}`),
                fetch(`/api/crm/reports/history?salesRepId=${selectedRep}`)
            ])

            if (forecastRes.ok) {
                const data = await forecastRes.json()
                setForecastData(data)
            }
            if (historyRes.ok) {
                const data = await historyRes.json()
                setHistoryData(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Sales Forecast & History</h1>

                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Sales Rep:</label>
                    <select
                        className="rounded-md border-gray-300 shadow-sm p-2 bg-white"
                        value={selectedRep}
                        onChange={(e) => setSelectedRep(e.target.value)}
                    >
                        <option value="ALL">All Representatives</option>
                        {salesReps.map(rep => (
                            <option key={rep.id} value={rep.id}>{rep.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading Reports...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Forecast Chart */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">3-Month Forecast</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={forecastData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Bar dataKey="totalValue" name="Expected Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {forecastData.length === 0 && (
                            <p className="text-center text-gray-500 mt-4">No deals expected to close in the next 3 months.</p>
                        )}
                    </div>

                    {/* History Chart */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Sales History</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Bar dataKey="totalValue" name="Won Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {historyData.length === 0 && (
                            <p className="text-center text-gray-500 mt-4">No completed sales records found.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
