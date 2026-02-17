"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function NewServicePackagePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])

    // Service Defaults
    const [serviceType, setServiceType] = useState("CONTRACT")
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")
    const [billingCycle, setBillingCycle] = useState("YEARLY")
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
            brand: "Service", // Default or allow input? Let's allow input but default for services often internal
            category: formData.get("category"),
            model: "", // Services usually don't have models
            description: formData.get("description"),
            minStock: 0,
            warrantyMonths: 0,
            // Service Specifics
            isService: true,
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
                throw new Error(json.error || "Failed to create service package")
            }

            router.push("/dashboard/services/catalog")
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
                <Link href="/dashboard/services/catalog" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add Service Package</h1>
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
                            Service SKU / Code *
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="sku"
                                id="sku"
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="e.g. SVC-GOLD-1Y"
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

                    <div className="sm:col-span-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Package Name *
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="e.g. Gold Support Package (1 Year)"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description / Scope
                        </label>
                        <div className="mt-1">
                            <textarea
                                id="description"
                                name="description"
                                rows={3}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="Details about what this service includes..."
                            />
                        </div>
                    </div>

                    {/* Service Configuration */}
                    <div className="sm:col-span-6 border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Service Configuration</h3>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                            <div className="sm:col-span-3">
                                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type</label>
                                <select
                                    id="serviceType"
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="ONE_TIME">One Time (Labor/Install)</option>
                                    <option value="SUBSCRIPTION">Subscription</option>
                                    <option value="CONTRACT">Contract (AMC/Warranty)</option>
                                    <option value="RENTAL">Rental</option>
                                    <option value="LICENSE">License</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="billingCycle" className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                                <select
                                    id="billingCycle"
                                    value={billingCycle}
                                    onChange={(e) => setBillingCycle(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <Link
                            href="/dashboard/services/catalog"
                            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? "Saving..." : "Create Package"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
