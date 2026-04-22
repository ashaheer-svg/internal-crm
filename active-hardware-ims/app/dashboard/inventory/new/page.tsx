"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import FormattedNumberInput from "@/components/FormattedNumberInput"

export default function NewProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const [minStock, setMinStock] = useState(0)
    const [warrantyMonths, setWarrantyMonths] = useState(0)

    // Service State
    const [isService, setIsService] = useState(false)
    const [serviceType, setServiceType] = useState("ONE_TIME")
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")
    const [billingCycle, setBillingCycle] = useState("")
    const [isMetered, setIsMetered] = useState(false)

    useEffect(() => {
        fetch("/api/categories")
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Failed to fetch categories", err))
    }, [])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setError("")

        const formData = new FormData(event.currentTarget)
        const data = {
            sku: formData.get("sku"),
            name: formData.get("name"),
            brand: formData.get("brand"),
            category: formData.get("category"),
            model: formData.get("model"),
            description: formData.get("description"),
            minStock: minStock,
            warrantyMonths: warrantyMonths,
            // Service data
            isService,
            serviceType,
            durationValue,
            durationUnit,
            billingCycle,
            isMetered
        }

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create product")
            }

            router.push("/dashboard/inventory")
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/inventory" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-background">Add New Product</h1>
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
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="e.g. GPU-RTX4090-OC"
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
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="e.g. ASUS"
                            />
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
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="e.g. ROG Strix GeForce RTX 4090"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Category *
                        </label>
                        <div className="mt-1">
                            <select
                                name="category"
                                id="category"
                                required
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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

                    <div className="sm:col-span-2">
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                            Model Number
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="model"
                                id="model"
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
                            Minimum Stock Level
                        </label>
                        <div className="mt-1">
                            <FormattedNumberInput
                                value={minStock}
                                onChange={setMinStock}
                                id="minStock"
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="warrantyMonths" className="block text-sm font-medium text-gray-700">
                            Warranty Period (Months)
                        </label>
                        <div className="mt-1">
                            <FormattedNumberInput
                                value={warrantyMonths}
                                onChange={setWarrantyMonths}
                                id="warrantyMonths"
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="e.g. 12 for 1 year"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Enter warranty period in months (e.g., 12 for 1 year, 24 for 2 years)</p>
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
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
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
                                        <FormattedNumberInput
                                            value={durationValue}
                                            onChange={setDurationValue}
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

                                <div className="sm:col-span-3">
                                    <label htmlFor="billingCycle" className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                                    <select
                                        id="billingCycle"
                                        value={billingCycle}
                                        onChange={(e) => setBillingCycle(e.target.value)}
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                                        <option value="">None / Manual</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="YEARLY">Yearly</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-3 flex items-end pb-2">
                                    <div className="flex items-center">
                                        <input
                                            id="isMetered"
                                            name="isMetered"
                                            type="checkbox"
                                            checked={isMetered}
                                            onChange={(e) => setIsMetered(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="isMetered" className="ml-2 block text-sm text-gray-900">
                                            Is Metered Service?
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end gap-3">
                        <Link
                            href="/dashboard/inventory"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? "Saving..." : "Save Product"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
