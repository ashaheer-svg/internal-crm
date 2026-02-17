"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    description: string | null
    minStock: number
    warrantyMonths: number
}

export default function EditProductPage({ params }: PageProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [productId, setProductId] = useState<string>("")
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const [formData, setFormData] = useState<Product>({
        id: "",
        sku: "",
        name: "",
        brand: "",
        category: "General",
        model: "",
        description: "",
        minStock: 0,
        warrantyMonths: 0
    })

    // Service State
    const [isService, setIsService] = useState(false)
    const [serviceType, setServiceType] = useState("ONE_TIME")
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")
    const [billingCycle, setBillingCycle] = useState("")
    const [isMetered, setIsMetered] = useState(false)

    useEffect(() => {
        // Fetch categories
        fetch("/api/categories")
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Failed to fetch categories", err))

        params.then(p => {
            setProductId(p.id)
            fetchProduct(p.id)
        })
    }, [params])

    async function fetchProduct(id: string) {
        try {
            const res = await fetch(`/api/products/${id}`)
            if (!res.ok) throw new Error("Failed to load product")
            const data = await res.json()
            setFormData(data)

            // Populate Service Data
            if (data.serviceDefinition) {
                setIsService(true)
                setServiceType(data.serviceDefinition.type)
                setDurationValue(data.serviceDefinition.durationValue)
                setDurationUnit(data.serviceDefinition.durationUnit)
                setBillingCycle(data.serviceDefinition.billingCycle || "")
                setIsMetered(data.serviceDefinition.isMetered)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load product")
        } finally {
            setLoading(false)
        }
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSaving(true)
        setError("")

        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    isService,
                    serviceType,
                    durationValue,
                    durationUnit,
                    billingCycle,
                    isMetered
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update product")
            }

            router.push(`/dashboard/inventory/${productId}`)
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/inventory/${productId}`} className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Product</h1>
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
                        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                            SKU (Stock Keeping Unit) *
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="sku"
                                id="sku"
                                required
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                            Brand *
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="brand"
                                id="brand"
                                required
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Category *
                        </label>
                        <div className="mt-1">
                            <select
                                name="category"
                                id="category"
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Product Name *
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                            Model Number
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="model"
                                id="model"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <div className="mt-1">
                            <textarea
                                id="description"
                                name="description"
                                rows={3}
                                value={formData.description || ""}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
                            Minimum Stock Level
                        </label>
                        <div className="mt-1">
                            <input
                                type="number"
                                name="minStock"
                                id="minStock"
                                value={formData.minStock}
                                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                                min={0}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="warrantyMonths" className="block text-sm font-medium text-gray-700">
                            Warranty Period (Months)
                        </label>
                        <div className="mt-1">
                            <input
                                type="number"
                                name="warrantyMonths"
                                id="warrantyMonths"
                                value={formData.warrantyMonths}
                                onChange={(e) => setFormData({ ...formData, warrantyMonths: Number(e.target.value) })}
                                min={0}
                                placeholder="0 = No warranty"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Number of months warranty is valid from purchase date</p>
                    </div>

                    {/* Service Configuration Section */}
                    <div className="sm:col-span-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Service Configuration</h3>
                                <p className="text-xs text-gray-500">Enable this if the product is a service (e.g. License, Subscription)</p>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="isService"
                                    name="isService"
                                    type="checkbox"
                                    checked={isService}
                                    onChange={(e) => setIsService(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isService" className="ml-2 block text-sm text-gray-900">
                                    Is Service Product?
                                </label>
                            </div>
                        </div>

                        {isService && (
                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 border-t border-gray-200 pt-4">
                                <div className="sm:col-span-3">
                                    <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type</label>
                                    <select
                                        id="serviceType"
                                        value={serviceType}
                                        onChange={(e) => setServiceType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    >
                                        <option value="ONE_TIME">One Time</option>
                                        <option value="SUBSCRIPTION">Subscription</option>
                                        <option value="CONTRACT">Contract (AMC)</option>
                                        <option value="RENTAL">Rental</option>
                                        <option value="LICENSE">License</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Default Duration</label>
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
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <Link
                            href={`/dashboard/inventory/${productId}`}
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
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
