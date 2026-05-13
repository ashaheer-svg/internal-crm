"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Filter, AlertTriangle, AlertCircle, Calendar, 
  Clock, CheckCircle2, Package, LayoutDashboard, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";
import SortIcon from "@/components/SortIcon";
import PaginationControls from "@/components/PaginationControls";

export default function ServicesDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tracking"); // "tracking" | "inventory"

  // Service Tracking State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Attention");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [error, setError] = useState("");

  // Inventory State
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySort, setInventorySort] = useState({ key: 'name', direction: 'asc' });
  const [inventoryMeta, setInventoryMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  const categories = ["All", "License", "Rental", "AMC", "Services"];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/service/items");
      if (!res.ok) throw new Error("Failed to fetch service items");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      setError("Could not load service data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventoryProducts = useCallback(async (page = 1) => {
    setInventoryLoading(true);
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: inventorySearch,
            sortKey: inventorySort.key,
            sortDir: inventorySort.direction,
            category: 'Rental'
        });
        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) throw new Error('Failed to fetch inventory');
        const data = await res.json();
        setInventoryProducts(data.products || []);
        setInventoryMeta(data.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
        console.error(err);
    } finally {
        setInventoryLoading(false);
    }
  }, [inventorySearch, inventorySort]);

  useEffect(() => {
    if (activeTab === "tracking") {
        fetchItems();
    }
  }, [activeTab, fetchItems]);

  useEffect(() => {
    if (activeTab === "inventory") {
        fetchInventoryProducts();
    }
  }, [activeTab, fetchInventoryProducts]);

  // Reset tracking pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter]);

  const handleInventorySort = (key) => {
    setInventorySort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusInfo = (endDate) => {
    if (!endDate) return { label: "No Expiry", color: "bg-gray-100 text-gray-800", icon: <CheckCircle2 className="w-4 h-4 mr-1" /> };
    
    const end = new Date(endDate);
    const now = new Date();
    end.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        label: "Expired", 
        color: "bg-red-100 text-red-800 border-red-200", 
        rowColor: "bg-red-50 hover:bg-red-100/80 border-l-4 border-red-500",
        icon: <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
      };
    } else if (diffDays <= 30) {
      return { 
        label: `Expiring (${diffDays}d)`, 
        color: "bg-orange-100 text-orange-800 border-orange-200", 
        rowColor: "bg-orange-50 hover:bg-orange-100/80 border-l-4 border-orange-500",
        icon: <AlertTriangle className="w-4 h-4 mr-1 text-orange-600" />
      };
    } else {
      return { 
        label: "Active", 
        color: "bg-green-100 text-green-800 border-green-200", 
        rowColor: "bg-white hover:bg-gray-50 border-l-4 border-transparent",
        icon: <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
      };
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.deliveryOrder?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deliveryOrder?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.licenseKey?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || item.product?.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter !== "All") {
      if (!item.serviceEndDate) {
        matchesStatus = statusFilter === "Active";
      } else {
        const end = new Date(item.serviceEndDate);
        const now = new Date();
        end.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (statusFilter === "Expired") {
          matchesStatus = diffDays < 0;
        } else if (statusFilter === "ExpiringSoon") {
          matchesStatus = diffDays >= 0 && diffDays <= 30;
        } else if (statusFilter === "Active") {
          matchesStatus = diffDays > 30;
        } else if (statusFilter === "Attention") {
          matchesStatus = diffDays <= 30;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: items.length,
    expired: items.filter(i => {
        if (!i.serviceEndDate) return false;
        const end = new Date(i.serviceEndDate);
        const now = new Date();
        end.setHours(0,0,0,0);
        now.setHours(0,0,0,0);
        return end < now;
    }).length,
    expiringSoon: items.filter(i => {
      if (!i.serviceEndDate) return false;
      const end = new Date(i.serviceEndDate);
      const now = new Date();
      end.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length,
    active: items.filter(i => {
        if (!i.serviceEndDate) return true;
        const end = new Date(i.serviceEndDate);
        const now = new Date();
        end.setHours(0,0,0,0);
        now.setHours(0,0,0,0);
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 30;
    }).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-background tracking-tight">Service & Asset Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Manage service lifecycle and rental asset inventory.</p>
          </div>
        </div>
      </div>

      {/* Premium Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex gap-1 w-fit">
          {[
              { id: 'tracking', label: 'Service Tracking', icon: LayoutDashboard },
              { id: 'inventory', label: 'Rental Inventory', icon: Database },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                      "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                      activeTab === tab.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  )}
              >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
              </button>
          ))}
      </div>

      {activeTab === "tracking" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => setStatusFilter("All")}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === "All" ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Tracked Items</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setStatusFilter("Active")}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === "Active" ? "border-green-500 ring-1 ring-green-500" : "border-gray-200"}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600">Active Contracts</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{stats.active}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setStatusFilter("ExpiringSoon")}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === "ExpiringSoon" ? "border-orange-500 ring-1 ring-orange-500" : "border-gray-200"}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-600">Expiring in 30 Days</p>
                            <p className="text-3xl font-bold text-orange-700 mt-1">{stats.expiringSoon}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setStatusFilter("Expired")}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === "Expired" ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600">Already Expired</p>
                            <p className="text-3xl font-bold text-red-700 mt-1">{stats.expired}</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Search by DO, customer, product, or key..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        className="block w-full sm:w-48 py-2 px-3 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat} {cat === "All" ? "Categories" : ""}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DO Reference</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Details</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product / Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Period</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading data...
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                                        No items found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item) => {
                                    const statusInfo = getStatusInfo(item.serviceEndDate);
                                    return (
                                        <tr key={item.id} className={`${statusInfo.rowColor} transition-colors duration-150`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link 
                                                    href={`/dashboard/transactions/delivery-orders/${item.deliveryOrderId}`}
                                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {item.deliveryOrder?.orderNumber}
                                                </Link>
                                                {item.licenseKey && (
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">Key: {item.licenseKey}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.deliveryOrder?.customerName}</div>
                                                {item.deliveryOrder?.endCustomerName && item.deliveryOrder?.endCustomerName !== item.deliveryOrder?.customerName && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        End User: {item.deliveryOrder.endCustomerName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{item.product?.name}</div>
                                                <div className="text-xs mt-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {item.product?.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.serviceStartDate || item.serviceEndDate ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.serviceStartDate && (
                                                            <div className="flex items-center text-xs">
                                                                <Calendar className="w-3 h-3 mr-1.5 text-gray-400" />
                                                                Start: {new Date(item.serviceStartDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        {item.serviceEndDate && (
                                                            <div className="flex items-center text-xs font-medium">
                                                                <Calendar className="w-3 h-3 mr-1.5 text-gray-400" />
                                                                End: {new Date(item.serviceEndDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalResults={filteredItems.length}
                    limit={itemsPerPage}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Inventory Search */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search rental products by name, SKU, or model..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                {inventoryLoading ? (
                    <div className="flex flex-col justify-center items-center h-64 gap-3">
                        <Package className="w-8 h-8 text-blue-500 animate-pulse" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Scanning Rental Stock...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="py-3.5 px-6 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        <SortIcon sort={inventorySort} column="sku" label="SKU" onSort={handleInventorySort} />
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        <SortIcon sort={inventorySort} column="name" label="Product Name" onSort={handleInventorySort} />
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        <SortIcon sort={inventorySort} column="brand" label="Brand" onSort={handleInventorySort} />
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        <SortIcon sort={inventorySort} column="category" label="Category" onSort={handleInventorySort} />
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        <SortIcon sort={inventorySort} column="model" label="Model" onSort={handleInventorySort} />
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        Min Stock
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        Available Stock
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {inventoryProducts.map((product) => (
                                    <tr 
                                        key={product.id} 
                                        onDoubleClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                                        className={cn(
                                            "transition-all hover:bg-gray-50/50 group cursor-pointer",
                                            product._count.inventory < product.minStock ? "bg-red-50/30" : ""
                                        )}
                                    >
                                        <td className="whitespace-nowrap py-4 px-6 text-sm font-bold text-gray-900 font-mono tracking-tighter uppercase">{product.sku}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-tight">{product.name}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500 uppercase">{product.brand}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500 uppercase">{product.model}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={cn(
                                                "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter border",
                                                product.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            )}>
                                                {product.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs font-bold text-gray-400 text-center tabular-nums">
                                            {product.minStock?.toLocaleString() || 0}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900 text-center tabular-nums">
                                            {product._count.inventory.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {inventoryProducts.length === 0 && !inventoryLoading && (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Package className="w-10 h-10 text-gray-200" />
                                                <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest font-bold">No rental assets found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <PaginationControls
                    currentPage={inventoryMeta.page}
                    totalPages={inventoryMeta.totalPages}
                    onPageChange={fetchInventoryProducts}
                    totalResults={inventoryMeta.total}
                    limit={inventoryMeta.limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>
        </div>
      )}
    </div>
  );
}
