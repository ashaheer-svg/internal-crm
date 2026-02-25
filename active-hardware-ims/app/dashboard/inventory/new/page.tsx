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
