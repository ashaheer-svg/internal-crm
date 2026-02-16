"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, RefreshCw, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

type Props = {
    productId: string
    locations: { id: string, name: string }[]
    poId?: string
}

type PurchaseOrder = {
    id: string
    poNumber: string
    supplier: string
    items: {
        productId: string
        quantity: number
        receivedQty: number
        unitCost: number
    }[]
}

export default function AddInventoryForm({ productId, locations, poId }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [serialInput, setSerialInput] = useState("")
    const [locationId, setLocationId] = useState(locations[0]?.id || "")
    const [grnNumber, setGrnNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [unitCost, setUnitCost] = useState("")

    // PO Selection
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
    const [selectedPoId, setSelectedPoId] = useState("")

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoadingData, setIsLoadingData] = useState(true)

    const [isFetchingGrn, setIsFetchingGrn] = useState(false)

    async function fetchNextGrn() {
        try {
            setIsFetchingGrn(true)
            const seqRes = await fetch("/api/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "GRN" })
            })
            if (seqRes.ok) {
                const data = await seqRes.json()
                setGrnNumber(data.number)
            }
        } catch (e) {
            console.error("Failed to fetch GRN", e)
        } finally {
            setIsFetchingGrn(false)
        }
    }

    useEffect(() => {
        async function loadData() {
            try {
                // 1. Fetch Next GRN Number
                await fetchNextGrn()

                // 2. Fetch POs for this product
                const poRes = await fetch(`/api/purchase-orders?productId=${productId}&status=DRAFT,SUBMITTED,PARTIAL`)
                if (poRes.ok) {
                    const data = await poRes.json()
                    setPurchaseOrders(data)

                    // Auto-select PO if poId is provided from searchParams
                    if (poId) {
                        const po = data.find((p: PurchaseOrder) => p.id === poId)
                        if (po) {
                            setSelectedPoId(poId)
                            setSupplier(po.supplier)
                            const item = po.items.find((i: any) => i.productId === productId)
                            if (item) {
                                setUnitCost(item.unitCost.toString())
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load initial data", e)
            } finally {
                setIsLoadingData(false)
            }
        }
        loadData()
    }, [productId, poId])

    function handlePoSelect(poId: string) {
        setSelectedPoId(poId)
        if (!poId) {
            setSupplier("")
            setUnitCost("")
            return
        }

        const po = purchaseOrders.find(p => p.id === poId)
        if (po) {
            setSupplier(po.supplier)
            const item = po.items.find(i => i.productId === productId)
            if (item) {
                setUnitCost(item.unitCost.toString())
            }
        }
    }

    // Parse serial numbers from input
    function parseSerialNumbers(input: string): string[] {
        return input
            .split(/[,\n\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
    }

    const serialNumbers = parseSerialNumbers(serialInput)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!locationId) {
            setError("Please select a location first")
            return
        }

        if (!grnNumber) {
            setError("Please enter a GRN Number")
            return
        }

        if (!supplier) {
            setError("Please enter a Supplier")
            return
        }

        if (serialNumbers.length === 0) {
            setError("Please enter at least one serial number")
            return
        }

        if (selectedPoId) {
            const po = purchaseOrders.find(p => p.id === selectedPoId)
            const item = po?.items.find(i => i.productId === productId)

            if (item) {
                const remaining = item.quantity - item.receivedQty
                if (serialNumbers.length > remaining) {
                    setError(`Cannot add ${serialNumbers.length} items. Only ${remaining} remaining in this Purchase Order.`)
                    return
                }
            }
        }

        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    serialNumbers, // Send array of serials
                    locationId,
                    unitCost: unitCost ? Number(unitCost) : 0,
                    grnNumber,
                    supplier,
                    purchaseOrderId: selectedPoId || undefined
                }),
            })

            const json = await res.json()

            if (!res.ok) {
                // Handle potential bulk error or specific validation error
                setError(json.error || "Failed to add items")
            } else {
                setSuccess(`✓ Successfully added ${json.count} item(s) to stock`)
                setSerialInput("")
                // Don't clear unit cost or supplier as they might be adding more from same batch
                router.refresh()
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : "Error adding items")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                    <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 space-y-3">
                    <p className="text-sm text-green-700 font-medium">{success}</p>
                    {poId && (
                        <div>
                            <Link
                                href={`/dashboard/transactions/purchase-orders/${poId}`}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3 mr-1.5 rotate-180" />
                                Back to Purchase Order
                            </Link>
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number(s) *
                    {serialNumbers.length > 0 && (
                        <span className="ml-2 text-blue-600 font-semibold">
                            ({serialNumbers.length} item{serialNumbers.length !== 1 ? 's' : ''})
                        </span>
                    )}
                </label>
                <textarea
                    required
                    rows={4}
                    autoFocus
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-3 text-sm font-mono"
                    placeholder="Enter serial numbers separated by comma, space, or new line&#10;Example:&#10;SN001, SN002, SN003&#10;or paste multiple lines"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                    💡 Tip: Paste multiple serial numbers from Excel/CSV - separated by commas, spaces, or line breaks
                </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link to Purchase Order (Optional)</label>
                    <div className="relative">
                        <select
                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pl-9"
                            value={selectedPoId}
                            onChange={(e) => handlePoSelect(e.target.value)}
                            disabled={isLoadingData}
                        >
                            <option value="">-- Select PO --</option>
                            {purchaseOrders.map(po => {
                                const item = po.items.find(i => i.productId === productId)
                                const remaining = item ? item.quantity - item.receivedQty : 0

                                // Don't show fully received POs unless it's the currently selected one (edge case)
                                if (remaining <= 0 && po.id !== selectedPoId) return null

                                return (
                                    <option key={po.id} value={po.id}>
                                        {po.poNumber} - {po.supplier} (Remaining: {remaining} / {item?.quantity})
                                    </option>
                                )
                            })}
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                    {isLoadingData && <p className="text-xs text-gray-500 mt-1">Loading POs...</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GRN Number *</label>
                        <div className="flex">
                            <input
                                type="text"
                                required
                                className="block w-full rounded-l-md border-gray-300 shadow-sm border p-2 text-sm"
                                placeholder="e.g. GRN-YYMM-0001"
                                value={grnNumber}
                                onChange={(e) => setGrnNumber(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={fetchNextGrn}
                                className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100"
                                title="Auto-generated based on sequence"
                                disabled={isFetchingGrn}
                            >
                                <RefreshCw className={`h-4 w-4 ${isFetchingGrn ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                        <input
                            type="text"
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            placeholder="e.g. Tech Distributor Inc."
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receive At Location *</label>
                <select
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                >
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                    {locations.length === 0 && <option value="">No locations available</option>}
                </select>
                {locations.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">Create a location first.</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Cost per unit (applies to all items)</p>
            </div>

            <button
                type="submit"
                disabled={loading || locations.length === 0 || serialNumbers.length === 0 || !grnNumber || !supplier}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Adding..." : `Add ${serialNumbers.length} Item${serialNumbers.length !== 1 ? 's' : ''} to Stock`}
            </button>
        </form>
    )
}
