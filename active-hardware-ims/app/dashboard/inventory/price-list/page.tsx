"use client"

import { useState, useEffect } from "react"
import { Printer } from "lucide-react"
import { Currency } from "@/components/Currency"
import { formatDate } from "@/lib/utils"

type Product = {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  model: string
  lowResellerPrice: number
  resellerPrice: number
  inventory: { id: string }[]
}

export default function PriceListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [brandSearch, setBrandSearch] = useState("")

  const filteredProducts = products.filter(product =>
    brandSearch === "" ||
    product.brand.toLowerCase().includes(brandSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(brandSearch.toLowerCase())
  )

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
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

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading price list...</p>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          nav { display: none !important; }
          aside { display: none !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="no-print mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Price List
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="brand-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search by Brand
              </label>
              <input
                id="brand-search"
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Enter brand name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {brandSearch && (
              <div className="pt-6">
                <button
                  onClick={() => setBrandSearch("")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
          {brandSearch && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Header for print */}
          <div className="border-b-4 border-gray-800 p-6 print:block">
            <div className="text-3xl font-bold text-gray-900">Active Hardware IMS</div>
            <div className="text-xl font-semibold text-gray-600 mt-2">PRICE LIST</div>
            <div className="text-sm text-gray-500 mt-1">
              Generated on {formatDate(new Date())} at {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 no-print">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This price list shows current pricing for all products. Stock availability is shown for reference.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-[15%]">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-[35%]">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-[10%]">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-[10%]">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-[12%]">
                    Low Reseller
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-[12%]">
                    Reseller
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-[11%]">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 text-right">
                      <Currency amount={product.lowResellerPrice} className="text-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 text-right">
                      <Currency amount={product.resellerPrice} className="text-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-center font-medium">
                      {product.inventory?.length || 0} units
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      {brandSearch ? `No products found matching "${brandSearch}"` : "No products found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-center">
            <p className="text-sm font-medium text-gray-700">Pricing Tiers:</p>
            <p className="text-xs text-gray-600 mt-1">
              Low Reseller Price - For high-volume resellers | Reseller Price - Standard reseller pricing
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This is a computer-generated document. Prices are subject to change without notice.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
