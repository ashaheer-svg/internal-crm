"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Save } from "lucide-react"
import Link from "next/link"
import BackButton from '@/components/BackButton'

export default function EditServicePackagePage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])

    // Form State
    const [sku, setSku] = useState("")
    const [name, setName] = useState("")
    const [category, setCategory] = useState("")
    const [description, setDescription] = useState("")

    // Service Configuration
    const [serviceType, setServiceType] = useState("CONTRACT")
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")
    const [billingCycle, setBillingCycle] = useState("YEARLY")
    const [isMetered, setIsMetered] = useState(false)
    const [isActive, setIsActive] = useState(true)

    useEffect(() => {
        if (!id) return;

        Promise.all([
            fetch("/api/categories").then(res => res.json()),
            fetch(`/api/products/${id}`).then(res => res.json())
        ]).then(([categoriesData, productData]) => {
            setCategories(categoriesData)

            if (productData.error) throw new Error(productData.error)

            // Pre-fill form
            setSku(productData.sku)
            setName(productData.name)
            setCategory(productData.category)
            setDescription(productData.description || "")
            setIsActive(productData.isActive)

            if (productData.serviceDefinition) {
                setServiceType(productData.serviceDefinition.type)
                setDurationValue(productData.serviceDefinition.durationValue)
                setDurationUnit(productData.serviceDefinition.durationUnit)
                setBillingCycle(productData.serviceDefinition.billingCycle || "")
                setIsMetered(productData.serviceDefinition.isMetered)
            }

            setLoading(false)
        }).catch(err => {
            console.error("Failed to fetch data", err)
            setError(err.message || "Failed to load service package details")
            setLoading(false)
        })
    }, [id])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError("")

        const data = {
            sku,
            name,
            category,
            description,
            isActive,
            // Service Specifics
            isService: true,
            serviceType,
            durationValue,
            durationUnit,
            billingCycle,
            isMetered
        }

        try {
            const res = await fetch(`/api/products/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update service package")
            }

            router.push("/dashboard/services/catalog")
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading package details...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <BackButton className="p-2 hover:bg-gray-200 rounded-full" label="" />
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-background">Edit Service Package</h1>
                    <p className="text-sm text-gray-500">{sku}</p>
                </div>
                <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className="ml-3 text-sm text-blue-600 hover:text-blue-900"
                    >
                        {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>

            <form onSubmit={onSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Service SKU / Code</label>
                        <div className="mt-1">
                            <input
                                type="text"
                                value={sku}
                                onChange={e => setSku(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <div className="mt-1">
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select a category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700">Package Name</label>
                        <div className="mt-1">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700">Description / Scope</label>
                        <div className="mt-1">
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Service Configuration */}
                    <div className="sm:col-span-6 border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Service Configuration</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                                <select
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="ONE_TIME">One Time (Labor/Install)</option>
                                    <option value="SUBSCRIPTION">Subscription</option>
                                    <option value="CONTRACT">Contract (AMC/Warranty)</option>
                                    <option value="RENTAL">Rental</option>
                                    <option value="LICENSE">License</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                                <select
                                    value={billingCycle}
                                    onChange={(e) => setBillingCycle(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">None / Manual</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="YEARLY">Yearly</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Duration</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={durationValue}
                                        onChange={(e) => setDurationValue(Number(e.target.value))}
                                        min={1}
                                        className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    />
                                    <select
                                        value={durationUnit}
                                        onChange={(e) => setDurationUnit(e.target.value)}
                                        className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm border-l"
                                    >
                                        <option value="DAY">Days</option>
                                        <option value="WEEK">Weeks</option>
                                        <option value="MONTH">Months</option>
                                        <option value="YEAR">Years</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-3 flex items-end pb-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isMetered}
                                        onChange={(e) => setIsMetered(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="ml-2 block text-sm text-gray-900">
                                        Is Metered Service?
                                    </label>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="pt-5 flex justify-end">
                    <Link
                        href="/dashboard/services/catalog"
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Update Package"}
                    </button>
                </div>
            </form>
        </div>
    )
}
