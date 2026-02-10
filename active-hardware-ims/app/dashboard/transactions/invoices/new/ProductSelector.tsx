"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
}

type ProductSelectorProps = {
    onProductSelect: (product: Product) => void
    excludeProductIds?: string[]
}

export default function ProductSelector({ onProductSelect, excludeProductIds = [] }: ProductSelectorProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        setLoading(true)
        try {
            const res = await fetch('/api/products')

            if (!res.ok) throw new Error('Failed to fetch products')

            const data = await res.json()
            if (Array.isArray(data)) {
                setProducts(data)
            } else {
                setProducts([])
                console.error('Invalid products data:', data)
            }
        } catch (error) {
            console.error('Failed to fetch products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products
        .filter(p => !excludeProductIds.includes(p.id))
        .filter(p =>
            searchTerm === "" ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.model.toLowerCase().includes(searchTerm.toLowerCase())
        )

    function handleSelect(product: Product) {
        onProductSelect(product)
        setSearchTerm("")
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, brand, category, SKU, or model..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm("")
                            setIsOpen(false)
                        }}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && searchTerm && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No products found</div>
                    ) : (
                        <div className="py-1">
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelect(product)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {product.brand} {product.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                SKU: {product.sku} | Cat: {product.category} {product.model && `| Model: ${product.model}`}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
