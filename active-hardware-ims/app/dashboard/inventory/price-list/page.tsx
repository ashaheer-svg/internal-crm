"use client"

import { useState, useEffect } from "react"
import { Printer, X } from "lucide-react"
import BackButton from "@/components/BackButton"
import { Currency } from "@/components/Currency"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import '@/styles/print.css'

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
  const [brandFilter, setBrandFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")

  // Unique sorted values for dropdowns
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      brandSearch === "" ||
      product.brand.toLowerCase().includes(brandSearch.toLowerCase()) ||
      product.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(brandSearch.toLowerCase())
    const matchesBrand = brandFilter === "" || product.brand === brandFilter
    const matchesCategory = categoryFilter === "" || product.category === categoryFilter
    return matchesSearch && matchesBrand && matchesCategory
  })

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
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
      {/* ── Print Styles ─────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print  { display: none !important; }
          nav, aside, header, .sidebar { display: none !important; }

          /* Compact type */
          .pl-table th,
          .pl-table td { font-size: 7.5pt !important; padding: 3px 5px !important; }

          /* Keep rows together */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .pl-table tr { break-inside: avoid; page-break-inside: avoid; }

          /* Force our column widths in print */
          .pl-table { table-layout: fixed; width: 100% !important; }

          /* Stripe rows for easy reading on B&W */
          .pl-table tbody tr:nth-child(even) { background-color: #f8fafc !important; }

          /* Prevent last rows from overlapping the page footer */
          .pl-print-wrapper { padding-bottom: 18mm; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">

        {/* ── Screen Controls ───────────────────────────────────── */}
        <div className="no-print mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <BackButton className="mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredProducts.length} of {products.length} products
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Price List
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <input
                id="brand-search"
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search name, SKU, brand…"
                className="block w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Brand dropdown */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="block rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">All Brands</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Category dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Clear all filters */}
            {(brandSearch || brandFilter || categoryFilter) && (
              <button
                onClick={() => { setBrandSearch(""); setBrandFilter(""); setCategoryFilter("") }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Print Header (hidden on screen) ──────────────────── */}
        <div className="hidden print:block mb-2">
          <DocumentHeader title="PRICE LIST" subtitle="Wholesale & Reseller Pricing" />
          {(brandSearch || brandFilter || categoryFilter) && (
            <p style={{ fontSize: '8pt', color: '#666', marginBottom: '4px' }}>
              {[brandFilter && `Brand: ${brandFilter}`, categoryFilter && `Category: ${categoryFilter}`, brandSearch && `Search: "${brandSearch}"`].filter(Boolean).join(' · ')}
              {' '}— {filteredProducts.length} of {products.length} products shown
            </p>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="pl-print-wrapper bg-white shadow-sm rounded-lg overflow-hidden print:shadow-none print:overflow-visible print:bg-transparent">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="pl-table min-w-full table-fixed text-sm" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <colgroup>
                <col style={{ width: '9%' }} />  {/* SKU */}
                <col style={{ width: '32%' }} />  {/* Product Name */}
                <col style={{ width: '12%' }} />  {/* Brand */}
                <col style={{ width: '11%' }} />  {/* Category */}
                <col style={{ width: '10%' }} />  {/* Model */}
                <col style={{ width: '11%' }} />  {/* Low Reseller */}
                <col style={{ width: '11%' }} />  {/* Reseller */}
                <col style={{ width: '4%' }} />  {/* Stock */}
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#2563eb' }}>
                  {[
                    { label: 'SKU', align: 'left' },
                    { label: 'Product Name', align: 'left' },
                    { label: 'Brand', align: 'left' },
                    { label: 'Category', align: 'left' },
                    { label: 'Model', align: 'left' },
                    { label: 'Low Reseller', align: 'right' },
                    { label: 'Reseller', align: 'right' },
                    { label: 'Stock', align: 'center' },
                  ].map(col => (
                    <th
                      key={col.label}
                      style={{
                        padding: '7px 8px',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#fff',
                        textAlign: col.align as any,
                        whiteSpace: 'nowrap',
                        borderBottom: '2px solid #1d4ed8',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => {
                  const stock = product.inventory?.length || 0
                  const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  return (
                    <tr key={product.id} style={{ backgroundColor: rowBg }}>
                      {/* SKU */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.sku}
                      </td>
                      {/* Product Name */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#111827', fontWeight: 500, wordBreak: 'break-word' }}>
                        {product.name}
                      </td>
                      {/* Brand */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.brand}
                      </td>
                      {/* Category */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.category}
                      </td>
                      {/* Model */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.model}
                      </td>
                      {/* Low Reseller Price */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, color: '#2563eb', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Currency amount={product.lowResellerPrice} className="text-blue-600" />
                      </td>
                      {/* Reseller Price */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 700, color: '#2563eb', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Currency amount={product.resellerPrice} className="text-blue-600" />
                      </td>
                      {/* Stock */}
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: stock > 0 ? '#16a34a' : '#dc2626' }}>
                        {stock}
                      </td>
                    </tr>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      {brandSearch ? `No products matching "${brandSearch}"` : "No products found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Screen-only footer note ────────────────────────── */}
          <div className="no-print border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">Pricing Tiers:</span>{' '}
              Low Reseller — high-volume partners &nbsp;·&nbsp; Reseller — standard reseller rate
              &nbsp;·&nbsp; Prices subject to change without notice.
            </p>
          </div>

          {/* ── Print footer ──────────────────────────────────── */}
          <div className="hidden print:block">
            <div style={{ marginTop: '6px', padding: '4px 0', borderTop: '1px solid #e5e7eb', fontSize: '7.5pt', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
              <span>Low Reseller = high-volume rate &nbsp;·&nbsp; Reseller = standard rate &nbsp;·&nbsp; Prices subject to change without notice.</span>
              <span>{filteredProducts.length} products &nbsp;·&nbsp; Printed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <DocumentFooter />
          </div>
        </div>
      </div>
    </>
  )
}
