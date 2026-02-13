"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import EmployeeManager from "./EmployeeManager"

type CustomerFormModalProps = {
    customer?: any
    onSave: (customer: any) => void
    onClose: () => void
}

export default function CustomerFormModal({ customer, onSave, onClose }: CustomerFormModalProps) {
    const [name, setName] = useState(customer?.name || "")
    const [contactName, setContactName] = useState(customer?.contactName || "")
    const [email, setEmail] = useState(customer?.email || "")
    const [phone, setPhone] = useState(customer?.phone || "")
    const [address, setAddress] = useState(customer?.address || "")
    const [taxId, setTaxId] = useState(customer?.taxId || "")
    const [salesRep, setSalesRep] = useState(customer?.salesRep || "")
    const [notes, setNotes] = useState(customer?.notes || "")

    // Multi-role state
    const [isCustomer, setIsCustomer] = useState(customer?.isCustomer || false)
    const [isSupplier, setIsSupplier] = useState(customer?.isSupplier || false)
    const [isPartner, setIsPartner] = useState(customer?.isPartner || false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Address state
    const [addresses, setAddresses] = useState<any[]>([])
    const [loadingAddresses, setLoadingAddresses] = useState(false)
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<any | null>(null)

    // New Address Form State
    const [addrLabel, setAddrLabel] = useState("")
    const [addrText, setAddrText] = useState("")
    const [addrContact, setAddrContact] = useState("")
    const [addrPhone, setAddrPhone] = useState("")
    const [addrDefault, setAddrDefault] = useState(false)

    useEffect(() => {
        if (customer?.id) {
            fetchAddresses()
        }
    }, [customer])

    async function fetchAddresses() {
        if (!customer?.id) return
        setLoadingAddresses(true)
        try {
            const res = await fetch(`/api/customers/${customer.id}/addresses`)
            if (res.ok) {
                const data = await res.json()
                setAddresses(data)
            }
        } catch (e) {
            console.error("Failed to fetch addresses")
        } finally {
            setLoadingAddresses(false)
        }
    }

    async function handleSaveAddress(e: React.FormEvent) {
        e.preventDefault()
        if (!customer?.id) return

        try {
            const url = editingAddress
                ? `/api/customers/${customer.id}/addresses/${editingAddress.id}`
                : `/api/customers/${customer.id}/addresses`

            const method = editingAddress ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: addrLabel,
                    address: addrText,
                    contactName: addrContact,
                    phone: addrPhone,
                    isDefault: addrDefault
                })
            })

            if (res.ok) {
                fetchAddresses()
                setShowAddressForm(false)
                resetAddressForm()
            }
        } catch (e) {
            console.error("Failed to save address")
        }
    }

    async function handleDeleteAddress(addressId: string) {
        if (!confirm("Are you sure you want to delete this address?")) return
        try {
            const res = await fetch(`/api/customers/${customer.id}/addresses/${addressId}`, {
                method: "DELETE"
            })
            if (res.ok) fetchAddresses()
        } catch (e) {
            console.error("Failed to delete address")
        }
    }

    function resetAddressForm() {
        setAddrLabel("")
        setAddrText("")
        setAddrContact("")
        setAddrPhone("")
        setAddrDefault(false)
        setEditingAddress(null)
    }

    function openAddressForm(address?: any) {
        if (address) {
            setEditingAddress(address)
            setAddrLabel(address.label)
            setAddrText(address.address)
            setAddrContact(address.contactName || "")
            setAddrPhone(address.phone || "")
            setAddrDefault(address.isDefault)
        } else {
            resetAddressForm()
        }
        setShowAddressForm(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        // Validate at least one role is selected
        if (!isCustomer && !isSupplier && !isPartner) {
            setError("Please select at least one role (Partner, End Customer, or Supplier).")
            setLoading(false)
            return
        }

        try {
            const url = customer ? `/api/customers/${customer.id}` : "/api/customers"
            const method = customer ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, contactName, email, phone, address, taxId, salesRep, notes,
                    isCustomer, isSupplier, isPartner
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to save partner")
            }

            const data = await res.json()
            onSave(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
    const buttonPrimaryClass = "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
    const buttonSecondaryClass = "px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                        {customer ? "Edit Partner" : "Add New Partner"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Basic Info */}
                        <form id="partner-form" onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Partner Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Partner Roles *</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={isPartner}
                                            onChange={(e) => setIsPartner(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Partner</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={isCustomer}
                                            onChange={(e) => setIsCustomer(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700">End Customer</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={isSupplier}
                                            onChange={(e) => setIsSupplier(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Supplier</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tax ID / VAT</label>
                                    <input
                                        type="text"
                                        value={taxId}
                                        onChange={(e) => setTaxId(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sales Rep</label>
                                    <input
                                        type="text"
                                        value={salesRep}
                                        onChange={(e) => setSalesRep(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                        </form>

                        {/* Right Column - Delivery Addresses */}
                        <div className="border-l pl-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-md font-medium text-gray-900">Delivery Addresses</h4>
                                {customer && (
                                    <button
                                        type="button"
                                        onClick={() => openAddressForm()}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        + Add Address
                                    </button>
                                )}
                            </div>

                            {!customer ? (
                                <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded text-center">
                                    Please save the partner first to manage delivery addresses.
                                </p>
                            ) : (
                                <>
                                    {showAddressForm ? (
                                        <div className="bg-gray-50 p-4 rounded border">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700">Label (e.g. Warehouse)</label>
                                                    <input
                                                        type="text"
                                                        value={addrLabel}
                                                        onChange={(e) => setAddrLabel(e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700">Address</label>
                                                    <textarea
                                                        value={addrText}
                                                        onChange={(e) => setAddrText(e.target.value)}
                                                        rows={2}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700">Contact</label>
                                                        <input
                                                            type="text"
                                                            value={addrContact}
                                                            onChange={(e) => setAddrContact(e.target.value)}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700">Phone</label>
                                                        <input
                                                            type="text"
                                                            value={addrPhone}
                                                            onChange={(e) => setAddrPhone(e.target.value)}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={addrDefault}
                                                        onChange={(e) => setAddrDefault(e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                                                    />
                                                    <span className="text-xs text-gray-700">Set as default</span>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        onClick={() => setShowAddressForm(false)}
                                                        className={buttonSecondaryClass}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveAddress}
                                                        className={buttonPrimaryClass}
                                                    >
                                                        Save Address
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                            {addresses.length === 0 ? (
                                                <p className="text-sm text-gray-500">No delivery addresses yet.</p>
                                            ) : (
                                                addresses.map(addr => (
                                                    <div key={addr.id} className="border rounded p-3 text-sm relative hover:bg-gray-50 group">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900">{addr.label}</span>
                                                                    {addr.isDefault && <span className="bg-green-100 text-green-800 text-xs px-1.5 rounded">Default</span>}
                                                                </div>
                                                                <p className="text-gray-600 mt-1 whitespace-pre-wrap">{addr.address}</p>
                                                                {(addr.contactName || addr.phone) && (
                                                                    <p className="text-gray-500 text-xs mt-1">
                                                                        {addr.contactName} {addr.phone && `• ${addr.phone}`}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => openAddressForm(addr)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAddress(addr.id)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Employees Section */}
                <div className="px-6 pb-6 pt-2 border-t mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-gray-900">Partner Employees</h4>
                    </div>

                    {!customer ? (
                        <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded text-center">
                            Please save the partner first to manage employees.
                        </p>
                    ) : (
                        <EmployeeManager customerId={customer.id} />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-gray-50 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className={buttonSecondaryClass}
                    >
                        Close
                    </button>
                    <button
                        form="partner-form"
                        type="submit"
                        disabled={loading}
                        className={buttonPrimaryClass}
                    >
                        {loading ? "Saving..." : customer ? "Update Partner" : "Create Partner"}
                    </button>
                </div>
            </div>
        </div>
    )
}
