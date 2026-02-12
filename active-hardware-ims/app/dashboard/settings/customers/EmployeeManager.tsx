"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, X, Archive, CheckCircle } from "lucide-react"

type Employee = {
    id: string
    name: string
    designation: string | null
    email: string | null
    phone: string | null
    isActive: boolean
}

export default function EmployeeManager({ customerId }: { customerId: string }) {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null) // employeeId
    const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft')

    // Form State
    const [name, setName] = useState("")
    const [designation, setDesignation] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")

    useEffect(() => {
        fetchEmployees()
    }, [customerId])

    async function fetchEmployees() {
        setLoading(true)
        try {
            const res = await fetch(`/api/customers/${customerId}/employees`)
            if (res.ok) {
                const data = await res.json()
                setEmployees(data)
            }
        } catch (e) {
            console.error("Failed to fetch employees")
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setName("")
        setDesignation("")
        setEmail("")
        setPhone("")
        setEditingEmployee(null)
        setShowForm(false)
        setShowDeleteConfirm(null)
    }

    function openForm(employee?: Employee) {
        if (employee) {
            setEditingEmployee(employee)
            setName(employee.name)
            setDesignation(employee.designation || "")
            setEmail(employee.email || "")
            setPhone(employee.phone || "")
        } else {
            resetForm()
            // We need to set showForm true after resetting, as reset sets it to false
            // But state updates are batched, so we can just do:
            setEditingEmployee(null)
            setName("")
            setDesignation("")
            setEmail("")
            setPhone("")
        }
        setShowForm(true)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        try {
            const url = editingEmployee
                ? `/api/customers/${customerId}/employees/${editingEmployee.id}`
                : `/api/customers/${customerId}/employees`

            const method = editingEmployee ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    designation,
                    email,
                    phone
                })
            })

            if (res.ok) {
                fetchEmployees()
                resetForm()
            }
        } catch (e) {
            console.error("Failed to save employee")
        }
    }

    function initiateDelete(employeeId: string, hard: boolean) {
        setDeleteMode(hard ? 'hard' : 'soft')
        setShowDeleteConfirm(employeeId)
    }

    async function confirmDelete() {
        if (!showDeleteConfirm) return

        try {
            const res = await fetch(`/api/customers/${customerId}/employees/${showDeleteConfirm}?hard=${deleteMode === 'hard'}`, {
                method: "DELETE"
            })
            if (res.ok) {
                fetchEmployees()
                setShowDeleteConfirm(null)
            }
        } catch (e) {
            console.error("Failed to delete employee")
        }
    }

    async function handleReactivate(employee: Employee) {
        try {
            const res = await fetch(`/api/customers/${customerId}/employees/${employee.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...employee, isActive: true })
            })
            if (res.ok) fetchEmployees()
        } catch (e) {
            console.error("Failed to reactivate employee")
        }
    }

    return (
        <div className="space-y-4 relative">
            {/* Delete Confirmation Modal/Overlay */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                    <div className="bg-white border shadow-lg p-4 rounded-md max-w-sm w-full mx-4">
                        <h5 className="font-medium text-gray-900 mb-2">Confirm Action</h5>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to {deleteMode === 'hard' ? 'permanently delete' : 'deactivate'} this employee?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 bg-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className={`px-3 py-1.5 text-xs text-white rounded ${deleteMode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700 hidden">Employees</h4> {/* Hidden title as parent has it, or we can use it */}
                <button
                    type="button"
                    onClick={() => openForm()}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                    <Plus className="w-3 h-3" /> Add Employee
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-50 p-4 rounded border border-blue-100">
                    <form onSubmit={handleSave} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="mt-1 block w-full rounded border-gray-300 text-sm p-1.5 border"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Designation</label>
                                <input
                                    type="text"
                                    value={designation}
                                    onChange={e => setDesignation(e.target.value)}
                                    className="mt-1 block w-full rounded border-gray-300 text-sm p-1.5 border"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="mt-1 block w-full rounded border-gray-300 text-sm p-1.5 border"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="mt-1 block w-full rounded border-gray-300 text-sm p-1.5 border"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-blue-600 rounded text-xs text-white hover:bg-blue-700"
                            >
                                {editingEmployee ? "Update" : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {employees.length === 0 && !loading && (
                    <p className="text-sm text-gray-500 text-center py-4">No employees found.</p>
                )}

                {employees.map(emp => (
                    <div
                        key={emp.id}
                        className={`border rounded p-3 flex justify-between items-start group hover:bg-gray-50 ${!emp.isActive ? 'bg-gray-100 opacity-75' : 'bg-white'}`}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">{emp.name}</span>
                                {emp.designation && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded border">
                                        {emp.designation}
                                    </span>
                                )}
                                {!emp.isActive && (
                                    <span className="text-xs text-red-600 font-medium px-1.5 rounded border border-red-200 bg-red-50">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                {emp.email && <span>{emp.email}</span>}
                                {emp.phone && <span>{emp.phone}</span>}
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {emp.isActive ? (
                                <>
                                    <button
                                        onClick={() => openForm(emp)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => initiateDelete(emp.id, false)}
                                        className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                        title="Soft Delete (Deactivate)"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleReactivate(emp)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Reactivate"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => initiateDelete(emp.id, true)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Hard Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
