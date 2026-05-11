import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import API from '../services/api';
import { grnService } from '../services/grnService';
import Swal from 'sweetalert2';
import {
    ClipboardList, Filter, Eye, X,
    AlertTriangle, ShieldAlert, Loader2, Calendar, User as UserIcon
} from 'lucide-react';

const GRNHistory = () => {
    const user = useAuthStore((state) => state.user);

    // 🛡️ ROLE GUARD: Cashiers blocked from GRN History
    if (user?.role === 'cashier') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
                <ShieldAlert size={80} className="mb-4 opacity-20 text-red-500" />
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Access Denied</h2>
                <p className="font-bold text-sm">Only Owners, Admins, or Managers can view audit trails.</p>
            </div>
        );
    }

    const [grns, setGrns] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', supplierId: '', status: '' });
    const [selectedGrn, setSelectedGrn] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const res = await API.get('/suppliers');
                setSuppliers(res.data.data || []);
            } catch (err) {
                console.error("Failed to load suppliers for filter");
            }
        };
        fetchSuppliers();
    }, []);

    const fetchGRNs = async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await grnService.getGRNList({ ...filters, page, limit: pagination.limit });
            setGrns(res.data.data || []);
            setPagination(prev => ({ ...prev, ...(res.data.pagination || {}), page }));
        } catch (error) {
            Swal.fire('Error', 'Failed to load GRN records. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGRNs(1);
    }, [filters]);

    const handleViewDetails = async (id) => {
        try {
            setSelectedGrn(null);
            setIsDrawerOpen(true); // open drawer with loading state
            const res = await grnService.getGRNById(id);
            setSelectedGrn(res.data.data);
        } catch (error) {
            setIsDrawerOpen(false);
            Swal.fire('Error', 'Failed to load GRN details', 'error');
        }
    };

    const handleVoidGRN = async () => {
        if (!selectedGrn) return;

        if (user.role !== 'owner' && user.role !== 'admin') {
            return Swal.fire('Restricted', 'Only Owners or Admins can void entries.', 'error');
        }

        const { value: reason } = await Swal.fire({
            title: '<span style="color:#ef4444">VOID THIS GRN?</span>',
            html: 'This will <b>reverse all stock additions</b> for this entry. This cannot be undone.',
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Reason for voiding (required)',
            inputPlaceholder: 'e.g., Wrong supplier, data entry error...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'CONFIRM VOID',
            cancelButtonText: 'CANCEL',
            inputValidator: (value) => {
                if (!value || value.trim().length < 5) return 'Please provide a valid reason (min 5 characters)';
            },
            customClass: { popup: 'rounded-[2rem]' }
        });

        if (reason) {
            try {
                Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                await grnService.voidGRN(selectedGrn._id, reason);
                await Swal.fire('Voided', 'GRN voided and stock restored successfully.', 'success');
                setIsDrawerOpen(false);
                fetchGRNs(pagination.page);
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Void Failed',
                    // BUG 3 NOTE: Server error message shown as-is (e.g. "X units already sold")
                    text: error.response?.data?.error || 'Server rejected the void request.',
                    customClass: { popup: 'rounded-[2rem]' }
                });
            }
        }
    };

    // BUG 3 FIX: Safe date formatter — prevents "Invalid Date" while selectedGrn loads
    const formatDate = (dateStr) => {
        if (!dateStr) return '---';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '---' : d.toLocaleString();
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col font-sans">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                        <ClipboardList className="text-indigo-600" size={32} /> GRN HISTORY
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Inward Goods Audit Trail</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center mb-6 shrink-0">
                <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-2 rounded-xl">
                    <Filter size={16} /><span className="text-[10px] font-black uppercase">Filters</span>
                </div>
                <div className="flex items-center gap-2">
                    <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-slate-300 font-bold text-xs">to</span>
                    <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={filters.supplierId} onChange={(e) => setFilters({...filters, supplierId: e.target.value})} className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Suppliers</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="voided">Voided</option>
                </select>
                {(filters.startDate || filters.endDate || filters.supplierId || filters.status) && (
                    <button onClick={() => setFilters({ startDate: '', endDate: '', supplierId: '', status: '' })} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider">
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="p-6">GRN Number</th>
                                <th className="p-6">Date</th>
                                <th className="p-6">Supplier</th>
                                <th className="p-6 text-right">Total</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-center">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center py-24 text-slate-400 font-black uppercase tracking-widest">
                                    <Loader2 className="animate-spin mx-auto mb-4" size={32} /> Loading...
                                </td></tr>
                            ) : grns.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-24 text-slate-400 font-black uppercase tracking-widest">No records found</td></tr>
                            ) : (
                                grns.map((grn) => (
                                    <tr key={grn._id} className="hover:bg-slate-50/80 transition-all">
                                        <td className="p-6 font-black text-slate-800 text-sm">{grn.grnNumber}</td>
                                        <td className="p-6 text-xs font-bold text-slate-500">{new Date(grn.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 text-sm font-bold text-slate-700">{grn.supplierId?.name || '---'}</td>
                                        <td className="p-6 text-right font-black text-indigo-600">Rs. {grn.totalAmount?.toLocaleString()}</td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${grn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {grn.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button onClick={() => handleViewDetails(grn._id)} className="p-2.5 bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <button disabled={pagination.page <= 1} onClick={() => fetchGRNs(pagination.page - 1)} className="px-5 py-2.5 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all">Prev</button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                    <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchGRNs(pagination.page + 1)} className="px-5 py-2.5 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all">Next</button>
                </div>
            </div>

            {/* Drawer */}
            <div className={`fixed inset-0 z-50 transition-all duration-500 ${isDrawerOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsDrawerOpen(false)}></div>
                <div className={`absolute right-0 top-0 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transition-transform duration-500 ease-in-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} rounded-l-[3rem]`}>

                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-tl-[3rem] shrink-0">
                        <div>
                            {/* BUG 3 FIX: selectedGrn null-safe — shows loading state while fetching */}
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                                {selectedGrn?.grnNumber || <span className="text-slate-400 animate-pulse">Loading...</span>}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Audit Log • {formatDate(selectedGrn?.createdAt)}
                            </p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl border border-slate-200 transition-all"><X size={24}/></button>
                    </div>

                    {!selectedGrn ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin text-indigo-500" size={40} />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {selectedGrn.status === 'voided' && (
                                <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex items-start gap-4 text-red-800">
                                    <AlertTriangle className="shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-black text-xs uppercase tracking-widest">Voided Entry</h4>
                                        <p className="text-sm font-bold mt-2 italic">"{selectedGrn.voidReason}"</p>
                                        <div className="flex gap-4 mt-3 opacity-70">
                                            <p className="text-[10px] font-black uppercase flex items-center gap-1"><UserIcon size={10}/> {selectedGrn.voidedBy?.name || '---'}</p>
                                            <p className="text-[10px] font-black uppercase flex items-center gap-1"><Calendar size={10}/> {formatDate(selectedGrn.voidedAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-6 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Supplier</p>
                                    <p className="font-black text-slate-800 text-lg tracking-tight">{selectedGrn.supplierId?.name}</p>
                                    <p className="font-bold text-xs text-slate-500 mt-1">{selectedGrn.supplierId?.phone}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Payment</p>
                                    <p className="font-black text-slate-800 text-lg tracking-tight">{selectedGrn.paymentType}</p>
                                    <p className="font-bold text-xs text-slate-500 mt-1">Ref: {selectedGrn.supplierInvoiceNumber || 'Manual Entry'}</p>
                                </div>
                            </div>

                            {/* Items table */}
                            <div>
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mb-4 ml-2">Items Received</h3>
                                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                            <tr>
                                                <th className="p-4">Product</th>
                                                <th className="p-4 text-center">Qty</th>
                                                <th className="p-4 text-right">Unit Cost</th>
                                                <th className="p-4 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                                            {/* BUG 3 FIX: selectedGrn?.items?.map with fallback [] */}
                                            {(selectedGrn?.items ?? []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="p-4">
                                                        <span className="block font-black text-slate-800">{item.name}</span>
                                                        {item.previousUnitCost !== item.unitCost && (
                                                            <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">Cost Fluctuation</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center font-black">{item.quantity}</td>
                                                    <td className="p-4 text-right">Rs. {item.unitCost?.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-black">Rs. {item.subTotal?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Financial summary */}
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs font-black uppercase text-white/40 tracking-widest">
                                        <span>Total</span><span>Rs. {selectedGrn.totalAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black uppercase text-emerald-400 tracking-widest">
                                        <span>Paid</span><span>Rs. {selectedGrn.paidAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-white/10 my-4"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Balance Due</span>
                                        <span className="text-2xl font-black text-white">Rs. {selectedGrn.balanceAmount?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-8 bg-white border-t border-slate-100 shrink-0">
                        {selectedGrn?.status === 'completed' && (user?.role === 'admin' || user?.role === 'owner') ? (
                            <button onClick={handleVoidGRN} className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] font-black text-xs tracking-widest uppercase transition-all flex justify-center items-center gap-3">
                                <AlertTriangle size={18} /> Void This GRN
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <ShieldAlert size={16} className="text-slate-400" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No further actions available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GRNHistory;