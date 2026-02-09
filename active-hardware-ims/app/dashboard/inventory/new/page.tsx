"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function NewProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

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
            minStock: formData.get("minStock"),
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
                <Link href="/dashboard/inventory" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add New Product</h1>
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
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="e.g. ROG Strix GeForce RTX 4090"
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
                                defaultValue={0}
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
                                defaultValue={0}
                                min={0}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="e.g. 12 for 1 year"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Enter warranty period in months (e.g., 12 for 1 year, 24 for 2 years)</p>
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <Link
                            href="/dashboard/inventory"
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
                            {loading ? "Saving..." : "Save Product"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
