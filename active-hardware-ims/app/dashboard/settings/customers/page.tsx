"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Search, Archive, AlertTriangle } from "lucide-react"
import CustomerFormModal from "./CustomerFormModal"

type Customer = {
    id: string
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    salesRep?: string
    notes?: string
    type: string // Deprecated but might simpler to leave if not used
    // Roles
    isCustomer: boolean
    isSupplier: boolean
    isPartner: boolean

    isActive: boolean
    _count?: { invoices: number }
}

export default function CustomersPage() {
    // ... existing state ...

    // ... existing useEffect ...

    // ... existing fetchCustomers ...

   // ...

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {customer.name}
                                            </p>
                                            
                                            {/* Role Badges */}
                                            {customer.isPartner && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                    Partner
                                                </span>
                                            )}
                                            {customer.isCustomer && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    End Customer
                                                </span>
                                            )}
                                            {customer.isSupplier && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    Supplier
                                                </span>
                                            )}

                                            {!customer.isActive && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                            {customer.email && <span>{customer.email}</span>}
                                            {customer.phone && <span>{customer.phone}</span>}
                                            {customer._count && customer._count.invoices > 0 && (
                                                <span className="text-blue-600">
                                                    {customer._count.invoices} delivery order(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleStatus(customer)}
                                            className={`p-2 text-gray-400 hover:text-gray-600 ${!customer.isActive ? 'text-green-600 hover:text-green-800' : ''}`}
                                            title={customer.isActive ? "Deactivate" : "Activate"}
                                        >
                                            {customer.isActive ? <Archive className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(customer)}
                                            className="p-2 text-gray-400 hover:text-blue-600"
                                            title="Edit"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteCustomer(customer)
                                                setShowDeleteModal(true)
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div >
                            </li >
                        ))
}
                    </ul >
                )}
            </div >

    {/* Modal */ }
{
    showModal && (
        <CustomerFormModal
            customer={editingCustomer}
            onSave={handleSave}
            onClose={() => setShowModal(false)}
        />
    )
}

{/* Delete Modal */ }
{
    showDeleteModal && deleteCustomer && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Partner</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                    How do you want to delete <strong>{deleteCustomer.name}</strong>?
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => handleDelete(false)}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200"
                    >
                        <Archive className="w-4 h-4 mr-2" />
                        Soft Delete (Deactivate)
                    </button>
                    <p className="text-xs text-gray-500 text-center">Keeps records but hides from selection</p>

                    <button
                        onClick={() => handleDelete(true)}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hard Delete (Permanent)
                    </button>
                    <p className="text-xs text-gray-500 text-center">Permanently removes data. Cannot be undone.</p>

                    <button
                        onClick={() => setShowDeleteModal(false)}
                        className="w-full mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
        </div >
    )
}
