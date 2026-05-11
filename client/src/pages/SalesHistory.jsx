import React, { useState, useEffect, useMemo } from 'react';
import API from '../services/api'; // 💡 PRO FIX: අලුත් API Service එක
import useAuthStore from '../store/authStore'; // 💡 PRO FIX: අලුත් Zustand Store එක
import {
    Search, Download, Eye, TrendingUp, DollarSign, ShoppingBag, X, Calendar, ChevronDown 
} from 'lucide-react';
import Swal from 'sweetalert2';

const SalesHistory = () => {
    const user = useAuthStore((state) => state.user); // 💡 PRO FIX: Zustand වලින් user ගන්නවා
    const isManager = user?.role === 'admin' || user?.role === 'owner';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ 
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0] 
    });
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterMode, setFilterMode] = useState('today'); // Default 'today' වලට හැදුවා
    const [showVoided, setShowVoided] = useState(false);
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear()
    });

    useEffect(() => {
        fetchSalesHistory();
    }, [dateFilter, filterMode, selectedMonth.month, selectedMonth.year]); // 💡 PRO FIX: Object එක වෙනුවට values දැම්මා (infinite loops නවත්වන්න)

    const fetchSalesHistory = async () => {
        try {
            setLoading(true);
            let url = '/orders/history';
            const params = new URLSearchParams();
            const now = new Date();
            
            if (filterMode === 'today') {
                const today = now.toISOString().split('T')[0];
                params.append('startDate', today);
                params.append('endDate', today);
            } 
            else if (filterMode === 'month') {
                const firstDay = new Date(selectedMonth.year, selectedMonth.month, 1).toISOString().split('T')[0];
                // 💡 PRO FIX: Next month's 0th day is the last day of the current month
                const lastDay = new Date(selectedMonth.year, selectedMonth.month + 1, 0).toISOString().split('T')[0];
                params.append('startDate', firstDay);
                params.append('endDate', lastDay);
            } 
            else if (filterMode === 'custom' && dateFilter.start && dateFilter.end) {
                params.append('startDate', dateFilter.start);
                params.append('endDate', dateFilter.end);
            }
            
            const res = await API.get(`${url}?${params.toString()}`);
            if (res.data.success) {
                setOrders(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            Swal.fire('Error', 'Failed to fetch sales history', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 💡 PRO FIX: Performance - useMemo for calculations
    const displayOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = o.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVoidFilter = showVoided ? true : o.status !== 'voided';
            return matchesSearch && matchesVoidFilter;
        });
    }, [orders, searchTerm, showVoided]);

    // 💡 PRO FIX: O(N) calculations cached with useMemo!
    const { totalSales, totalProfit, successOrdersCount } = useMemo(() => {
        const activeOrders = orders.filter(o => o.status !== 'voided');
        return {
            totalSales: activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
            totalProfit: activeOrders.reduce((sum, o) => sum + (o.totalProfit || 0), 0),
            successOrdersCount: activeOrders.length
        };
    }, [orders]);

    // 💡 PRO FIX: Role-Based Secure CSV Export
    const exportToCSV = () => {
        // Cashier කෙනෙක් නම් Profit column එක CSV එකට යන්නේ නෑ!
        const headers = isManager 
            ? ["Bill Number, Date, Time, Cashier, Payment, Total Amount, Total Profit, Status\n"]
            : ["Bill Number, Date, Time, Cashier, Payment, Total Amount, Status\n"];

        const rows = displayOrders.map(o => {
            const date = new Date(o.createdAt).toLocaleDateString();
            const time = new Date(o.createdAt).toLocaleTimeString();
            const cashierName = o.cashierId?.name || 'Unknown';
            
            if (isManager) {
                return `${o.billNumber}, ${date}, ${time}, ${cashierName}, ${o.paymentMethod}, ${o.totalAmount}, ${o.totalProfit || 0}, ${o.status}\n`;
            } else {
                return `${o.billNumber}, ${date}, ${time}, ${cashierName}, ${o.paymentMethod}, ${o.totalAmount}, ${o.status}\n`;
            }
        });

        const blob = new Blob([headers, ...rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales_Report_${new Date().toLocaleDateString()}.csv`;
        a.click();
    };

    const handleVoidOrder = async (orderId) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will restore stock and void the bill!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Void it!',
            customClass: { popup: 'rounded-[2rem]' }
        });

        if (result.isConfirmed) {
            try {
                const res = await API.put(`/orders/${orderId}/void`);
                if (res.data.success) {
                    Swal.fire({ title: 'Voided!', icon: 'success', customClass: { popup: 'rounded-[2rem]' } });
                    fetchSalesHistory();
                }
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Something went wrong', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Sales Analytics</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Transaction Records & Insights</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show Voided</span>
                    <button 
                        onClick={() => setShowVoided(!showVoided)}
                        className={`w-12 h-6 rounded-full transition-all relative ${showVoided ? 'bg-red-500' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${showVoided ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-100 w-fit">
                {[{ label: 'Today', value: 'today' }, { label: 'This Month', value: 'month' }, { label: 'All Time', value: 'all' }].map((btn) => (
                    <button
                        key={btn.value}
                        onClick={() => setFilterMode(btn.value)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === btn.value ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        {btn.label}
                    </button>
                ))}
                
                {filterMode === 'month' && (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                        {/* CUSTOM MONTH DROPDOWN */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsMonthOpen(!isMonthOpen)}
                                className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-blue-400 transition-all active:scale-95"
                            >
                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth.month]}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isMonthOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMonthOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsMonthOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 w-32 bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-2xl overflow-hidden z-20 py-1 animate-in slide-in-from-top-2 duration-200">
                                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setSelectedMonth({...selectedMonth, month: i});
                                                    setIsMonthOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors
                                                    ${selectedMonth.month === i ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}
                                                `}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* CUSTOM YEAR DROPDOWN */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsYearOpen(!isYearOpen)}
                                className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm text-[11px] font-black text-slate-600 tracking-widest hover:border-blue-400 transition-all active:scale-95"
                            >
                                {selectedMonth.year}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isYearOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isYearOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsYearOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 w-28 bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-2xl overflow-hidden z-20 py-1 animate-in slide-in-from-top-2 duration-200">
                                        {[2024, 2025, 2026].map(y => (
                                            <button
                                                key={y}
                                                onClick={() => {
                                                    setSelectedMonth({...selectedMonth, year: y});
                                                    setIsYearOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-[10px] font-bold tracking-widest transition-colors
                                                    ${selectedMonth.year === y ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}
                                                `}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="h-6 w-[1px] bg-slate-100 mx-2 hidden md:block"></div>
                
                <div className="flex items-center gap-2">
                    <input type="date" value={dateFilter.start} className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-600" onChange={(e) => { setDateFilter({ ...dateFilter, start: e.target.value }); setFilterMode('custom'); }} />
                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tighter">to</span>
                    <input type="date" value={dateFilter.end} className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-600" onChange={(e) => { setDateFilter({ ...dateFilter, end: e.target.value }); setFilterMode('custom'); }} />
                </div>

                <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all shadow-sm">
                    <Download size={16} /> Export
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isManager && (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><DollarSign size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                                <h3 className="text-2xl font-black text-slate-800">Rs. {totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            </div>
                        </div>
                    </div>
                )}

                {isManager && (
                    <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-lg shadow-emerald-100">
                        <div className="flex items-center gap-4 text-white">
                            <div className="p-4 bg-white/20 rounded-2xl"><TrendingUp size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Net Profit</p>
                                <h3 className="text-2xl font-black">Rs. {totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm ${!isManager ? 'md:col-span-3' : ''}`}>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl"><ShoppingBag size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Orders</p>
                            <h3 className="text-2xl font-black text-slate-800">{successOrdersCount}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search bill number..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Bill Info</th>
                                <th className="px-8 py-5">Cashier</th>
                                <th className="px-8 py-5 text-center">Payment</th>
                                <th className="px-8 py-5">Total Amount</th>
                                {isManager && <th className="px-8 py-5 text-right text-emerald-600">Profit</th>}
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="p-20 text-center font-bold text-slate-400 animate-pulse tracking-widest uppercase text-xs">Fetching Records...</td></tr>
                            ) : displayOrders.length === 0 ? (
                                <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400">No orders found</td></tr>
                            ) : displayOrders.map((order) => (
                                <tr key={order._id} className={`hover:bg-slate-50/50 transition-colors ${order.status === 'voided' ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${order.status === 'voided' ? 'text-red-400 line-through' : 'text-slate-700'}`}>{order.billNumber}</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">{new Date(order.createdAt).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">{order.cashierId?.name?.charAt(0) || '?'}</div>
                                        <span className="text-sm font-bold text-slate-600">{order.cashierId?.name || 'Unknown'}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{order.paymentMethod}</span>
                                    </td>
                                    <td className="px-8 py-5 font-black text-slate-800">Rs. {order.totalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    {isManager && <td className="px-8 py-5 text-right font-bold text-emerald-600">Rs. {order.totalProfit?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>}
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={18} /></button>
                                            {isManager && order.status !== 'voided' ? (
                                                <button onClick={() => handleVoidOrder(order._id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={18} /></button>
                                            ) : order.status === 'voided' && <span className="text-[9px] font-black text-red-500 uppercase px-2 py-1 bg-red-50 rounded-lg border border-red-100">Voided</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal - Transaction Details */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Transaction Details</span>
                                <h3 className="text-2xl font-black text-slate-800">{selectedOrder.billNumber}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-red-50 rounded-2xl transition-all text-slate-400 hover:text-red-500 shadow-sm"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${selectedOrder.status === 'voided' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{selectedOrder.status}</span></div>
                                <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Date</p><p className="text-sm font-bold text-slate-700">{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
                            </div>
                            <div className="border border-slate-100 rounded-[1.5rem] overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr><th className="px-6 py-4">Item Name</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-right">Subtotal</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                        {selectedOrder.items.map((item, idx) => (
                                            <tr key={idx} className="text-slate-600">
                                                <td className="px-6 py-4 font-bold">{item.name}</td>
                                                <td className="px-6 py-4 text-center">{item.quantity}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-800">Rs. {(item.price * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-900 text-white">
                            <div className="flex justify-between items-center">
                                {isManager && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-1">Total Profit</p>
                                        <h4 className="text-xl font-black text-emerald-400">Rs. {selectedOrder.totalProfit?.toLocaleString(undefined, {minimumFractionDigits: 2}) || 0}</h4>
                                    </div>
                                )}
                                <div className="text-right ml-auto">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Grand Total</p>
                                    <h2 className="text-4xl font-black text-white">Rs. {selectedOrder.totalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;