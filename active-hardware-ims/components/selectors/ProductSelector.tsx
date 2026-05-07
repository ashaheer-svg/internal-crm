"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X, Box, Tag } from "lucide-react"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    resellerPrice?: number
    _count?: {
        inventory: number
    }
    inventory?: {
        location: {
            name: string
        }
    }[]
}

type ProductSelectorProps = {
    onProductSelect: (product: Product) => void
    excludeProductIds?: string[]
    type?: 'product' | 'service' | 'all'
    placeholder?: string
    className?: string
}

export default function ProductSelector({
    onProductSelect,
    excludeProductIds = [],
    type = 'product',
    placeholder,
    className = ""
}: ProductSelectorProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const fetchProducts = useCallback(async (search: string = "") => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                type,
                search,
                limit: '100'
            })
            const res = await fetch(`/api/products?${params}`)

            if (!res.ok) throw new Error('Failed to fetch products')

            const data = await res.json()
            const prods = data.products || (Array.isArray(data) ? data : [])
            setProducts(prods)
        } catch (error) {
            console.error('Failed to fetch products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }, [type])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                fetchProducts(searchTerm)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, isOpen, fetchProducts])

    const filteredProducts = products.filter(p => !excludeProductIds.includes(p.id))

    function handleSelect(product: Product) {
        onProductSelect(product)
        setSearchTerm("")
        setIsOpen(false)
    }

    return (
        <div className={`relative ${className}`}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    placeholder={placeholder || "Search products by name, SKU, or model..."}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm("")
                            setIsOpen(false)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && (searchTerm || loading) && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
                            <p className="mt-2 text-sm text-gray-500">Searching products...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-8 text-center">
                            <Box className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No matching products found</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-4 py-1 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Results</span>
                            </div>
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => handleSelect(product)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50/50 focus:bg-blue-50/50 transition-colors border-l-4 border-transparent hover:border-blue-500 flex items-start gap-3"
                                >
                                    <div className="mt-1 bg-gray-100 p-1.5 rounded-md group-hover:bg-blue-100 transition-colors">
                                        <Tag className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {product.brand} {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {product._count && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product._count.inventory > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        Stock: {product._count.inventory}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                    {product.sku}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className="text-xs text-gray-500 truncate uppercase tracking-tight">
                                                {product.category} {product.model && `• ${product.model}`}
                                            </p>
                                            {product.inventory && product.inventory.length > 0 && (
                                                <div className="text-[9px] text-gray-400 flex items-center gap-1">
                                                    <Box className="h-2.5 w-2.5" />
                                                    {Object.entries(
                                                        product.inventory.reduce((acc: Record<string, number>, item) => {
                                                            const loc = item.location.name;
                                                            acc[loc] = (acc[loc] || 0) + 1;
                                                            return acc;
                                                        }, {})
                                                    ).map(([loc, count]) => `${loc} (${count})`).join(', ')}
                                                </div>
                                            )}
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
