import React, { useRef , useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import {
    Search, Download, Eye, TrendingUp, DollarSign, ShoppingBag, X, ChevronDown, WifiOff, Calendar  
} from 'lucide-react';
import Swal from 'sweetalert2';
import FeatureGate from '../components/FeatureGate';
import useOfflineStore from '../store/offlineStore';
import db from '../db/nexiaDB';

const SalesHistory = () => {
    // 🌐 Zustand Offline State
    const isOnline = useOfflineStore((state) => state.isOnline);
    
    // 🛡️ Auth & Role
    const user = useAuthStore((state) => state.user);
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
    const [filterMode, setFilterMode] = useState('today');
    const [showVoided, setShowVoided] = useState(false);
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);

    const [selectedMonth, setSelectedMonth] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear()
    });

    useEffect(() => {
        fetchSalesHistory();
    }, [dateFilter, filterMode, selectedMonth.month, selectedMonth.year]);

    const fetchSalesHistory = async () => {
        try {
            setLoading(true);
            const { isOnline } = useOfflineStore.getState();

            // 📴 බ්‍රවුසර් එක OFFLINE නම්: Local IndexedDB එකෙන් ගන්නවා
            if (!isOnline) {
                console.log("Offline mode: Fetching orders from local cache...");
                
                // 1. Pending Orders (Offline වෙලාවේ ගහපු බිල්) ගන්නවා
                const pendingOrders = await db.pendingOrders.toArray();
                
                // ඒවා Normal Orders විදිහට ෆෝමැට් කරනවා (UI එකට ගැලපෙන්න)
                const formattedPending = pendingOrders.map(order => ({
                    ...order,
                    _id: order.offlineId || order.id,
                    createdAt: order.createdAt || new Date().toISOString(),
                    status: order.syncStatus === 'pending' ? 'pending_sync' : 'completed',
                    totalAmount: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
                    // Offline නිසා Cashier details හරියටම නෑ, ඒත් අත්‍යවශ්‍ය ටික දානවා
                    cashierId: { name: user?.name || 'Offline User' }
                }));

                // දැනට අපි Offline පෙන්නන්නේ අද ගහපු/පෙන්ඩින් බිල් ටික විතරයි
                setOrders(formattedPending);
                return; // මෙතනින් නවත්වනවා, API එකට යන්නේ නෑ
            }

            // 🌐 බ්‍රවුසර් එක ONLINE නම්: සාමාන්‍ය විදිහට Server එකෙන් ගන්නවා
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
            Swal.fire({
                title: 'Error',
                text: 'Failed to fetch sales history',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        } finally {
            setLoading(false);
        }
    };

    const displayOrders = useMemo(() => {
        return orders.filter(o => {
            // 💡 PRO FIX: billNumber එක නැත්නම් Error එන්නේ නැති වෙන්න (|| '') දැම්මා
            const safeBillNumber = o.billNumber || '';
            const safeSearchTerm = searchTerm || '';
            
            const matchesSearch = safeBillNumber.toLowerCase().includes(safeSearchTerm.toLowerCase());
            const matchesVoidFilter = showVoided ? true : o.status !== 'voided';
            
            return matchesSearch && matchesVoidFilter;
        });
    }, [orders, searchTerm, showVoided]);

    const { totalSales, totalProfit, successOrdersCount } = useMemo(() => {
        const activeOrders = orders.filter(o => o.status !== 'voided');
        return {
            totalSales: activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
            totalProfit: activeOrders.reduce((sum, o) => sum + (o.totalProfit || 0), 0),
            successOrdersCount: activeOrders.length
        };
    }, [orders]);

    const exportToCSV = () => {
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
        // 📴 Offline Guard
        if (!isOnline) {
            return Swal.fire({
                title: 'Offline Action Disabled',
                text: 'You cannot void orders while offline. Please connect to the internet.',
                icon: 'warning',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will restore stock and void the bill!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Void it!',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });

        if (result.isConfirmed) {
            try {
                const res = await API.put(`/orders/${orderId}/void`);
                if (res.data.success) {
                    Swal.fire({ title: 'Voided!', icon: 'success', customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' } });
                    fetchSalesHistory();
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.message || 'Something went wrong',
                    icon: 'error',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
        }
    };

    return (
        <FeatureGate feature="analytics" featureNameTitle="Sales Analytics">
            <div className="space-y-6 animate-in fade-in duration-700 dark:[color-scheme:dark] transition-colors duration-500">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">Sales Analytics</h1>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">Transaction Records & Insights</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none transition-colors">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Show Voided</span>
                        <button 
                            onClick={() => setShowVoided(!showVoided)}
                            className={`w-12 h-6 rounded-full transition-all relative ${showVoided ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${showVoided ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* 💡 Offline Indicator Banner */}
                {!isOnline && (
                    <div className="bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20 px-4 py-3 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <WifiOff size={16} className="animate-pulse shrink-0" />
                        OFFLINE MODE — Showing only pending offline orders. Full history will be available when connected.
                    </div>
                )}

                {/* Quick Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-white dark:bg-slate-900/60 backdrop-blur-md p-2 rounded-[1.5rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800/60 w-fit transition-colors">
                    {[{ label: 'Today', value: 'today' }, { label: 'This Month', value: 'month' }, { label: 'All Time', value: 'all' }].map((btn) => (
                        <button
                            key={btn.value}
                            onClick={() => setFilterMode(btn.value)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === btn.value ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg dark:shadow-none' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                    
                    {/* 🚀 PREMIUM FIX: Sequential Animated Date Picker (Sales Analytics Version) */}
{/* 🚀 PREMIUM UX: Animated Sequential Date Picker with Clear Button */}
<div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden md:block transition-colors"></div>
                    
                    {/* 🚀 PREMIUM UX: Sequential Date Pickers (Bug-Free) */}
                    <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-2 flex-1 md:flex-initial">
                        
                        {/* STEP 1: START DATE */}
                        <div 
                            onClick={() => {
                                if (startDateRef.current && typeof startDateRef.current.showPicker === 'function') {
                                    startDateRef.current.showPicker();
                                }
                            }}
                            className="w-full md:w-[140px] relative flex items-center bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 md:py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 cursor-pointer shadow-inner group hover:border-blue-400 transition-all"
                        >
                            <Calendar size={12} className="text-slate-400 dark:text-slate-500 shrink-0 group-hover:scale-110 group-hover:text-blue-500 transition-all z-10" />
                            
                            {/* Bulletproof Mobile Placeholder */}
                            {!dateFilter.start && (
                                <span className="absolute left-[30px] text-[10px] font-bold uppercase tracking-wider text-slate-400 pointer-events-none z-10">
                                    Start Date
                                </span>
                            )}

                            <input 
                                ref={startDateRef}
                                type="date" 
                                value={dateFilter.start} 
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    // 🚀 BUG FIX: Auto-open (setTimeout) එක අයින් කරා. දැන් මාස මාරු කරද්දී පනින්නේ නෑ!
                                    setDateFilter({ ...dateFilter, start: newStart, end: newStart ? dateFilter.end : '' });
                                    setFilterMode('custom');
                                }} 
                                className={`w-full pl-2 bg-transparent border-none text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${dateFilter.start ? 'text-slate-600 dark:text-slate-300' : 'text-transparent'}`} 
                            />
                        </div>

                        {/* STEP 2: END DATE & CLEAR BUTTON */}
                        <div className={`w-full md:w-auto flex items-center gap-2 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            dateFilter.start 
                            ? 'max-h-[100px] md:max-w-[400px] opacity-100 translate-y-0 md:translate-x-0 mt-2 md:mt-0' 
                            : 'max-h-0 md:max-w-0 opacity-0 -translate-y-4 md:-translate-y-0 md:-translate-x-4 pointer-events-none'
                        }`}>
                            <span className="text-slate-300 dark:text-slate-600 text-[10px] font-bold uppercase tracking-tighter shrink-0 hidden md:block">To</span>
                            
                            <div 
                                onClick={() => {
                                    if (endDateRef.current && typeof endDateRef.current.showPicker === 'function') {
                                        endDateRef.current.showPicker();
                                    }
                                }}
                                className="flex-1 md:w-[140px] relative flex items-center bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2.5 md:py-2 rounded-xl border border-indigo-200/60 dark:border-indigo-500/30 cursor-pointer shadow-inner group hover:border-indigo-400 transition-all"
                            >
                                <Calendar size={12} className="text-indigo-400 dark:text-indigo-500 shrink-0 group-hover:scale-110 group-hover:text-indigo-600 transition-all z-10" />
                                
                                {/* Bulletproof Mobile Placeholder */}
                                {!dateFilter.end && (
                                    <span className="absolute left-[30px] text-[10px] font-bold uppercase tracking-wider text-indigo-400/70 pointer-events-none z-10">
                                        End Date
                                    </span>
                                )}

                                <input 
                                    ref={endDateRef}
                                    type="date" 
                                    min={dateFilter.start} 
                                    value={dateFilter.end} 
                                    onChange={(e) => {
                                        setDateFilter({ ...dateFilter, end: e.target.value });
                                        setFilterMode('custom');
                                    }} 
                                    className={`w-full pl-2 bg-transparent border-none text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${dateFilter.end ? 'text-indigo-600 dark:text-indigo-300' : 'text-transparent'}`} 
                                />
                            </div>

                            {/* THE CLEAR BUTTON */}
                            {(dateFilter.start || dateFilter.end) && (
                                <button 
                                    onClick={() => { 
                                        setDateFilter({ start: '', end: '' }); 
                                        setFilterMode('all'); 
                                    }} 
                                    className="flex items-center justify-center z-[40] p-2.5 md:p-2 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 rounded-xl transition-all shrink-0 active:scale-95"
                                    title="Clear Custom Dates"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 🚀 PREMIUM FIX: Mobile Centered Export Button */}
                    <button 
                        onClick={exportToCSV} 
                        className="w-full md:w-auto flex justify-center items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-3 md:py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm dark:shadow-none ml-0 md:ml-auto mt-2 md:mt-0 active:scale-95"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isManager && (
                        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-colors"><DollarSign size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Revenue</p>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white transition-colors">Rs. {totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {isManager && (
                        <div className="bg-emerald-600 dark:bg-emerald-600/90 p-6 rounded-[2rem] shadow-lg shadow-emerald-100 dark:shadow-none transition-colors">
                            <div className="flex items-center gap-4 text-white">
                                <div className="p-4 bg-white/20 rounded-2xl"><TrendingUp size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Net Profit</p>
                                    <h3 className="text-2xl font-black">Rs. {totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none transition-colors ${!isManager ? 'md:col-span-3' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-2xl transition-colors"><ShoppingBag size={24} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Success Orders</p>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white transition-colors">{successOrdersCount}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-800/50 transition-colors">
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                            <input type="text" placeholder="Search bill number..." className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors" onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
                                <tr>
                                    <th className="px-8 py-5">Bill Info</th>
                                    <th className="px-8 py-5">Cashier</th>
                                    <th className="px-8 py-5 text-center">Payment</th>
                                    <th className="px-8 py-5">Total Amount</th>
                                    {isManager && <th className="px-8 py-5 text-right text-emerald-600 dark:text-emerald-500">Profit</th>}
                                    <th className="px-8 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 transition-colors">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-20 text-center font-bold text-slate-400 dark:text-slate-500 animate-pulse tracking-widest uppercase text-xs">Fetching Records...</td></tr>
                                ) : displayOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400 dark:text-slate-500">No orders found</td></tr>
                                ) : displayOrders.map((order) => (
                                    <tr key={order._id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${order.status === 'voided' ? 'bg-red-50/30 dark:bg-red-500/10' : ''}`}>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className={`font-bold transition-colors ${order.status === 'voided' ? 'text-red-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{order.billNumber}</span>
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase transition-colors">{new Date(order.createdAt).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-colors">{order.cashierId?.name?.charAt(0) || '?'}</div>
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors">{order.cashierId?.name || 'Unknown'}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">{order.paymentMethod}</span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-slate-800 dark:text-slate-100 transition-colors">Rs. {order.totalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        {isManager && <td className="px-8 py-5 text-right font-bold text-emerald-600 dark:text-emerald-400 transition-colors">Rs. {order.totalProfit?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>}
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-all"><Eye size={18} /></button>
                                                {isManager && order.status !== 'voided' ? (
                                                    <button onClick={() => handleVoidOrder(order._id)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-all"><X size={18} /></button>
                                                ) : order.status === 'voided' && <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase px-2 py-1 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-100 dark:border-red-500/20 transition-colors">Voided</span>}
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
                        <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-colors" onClick={() => setIsModalOpen(false)}></div>
                        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-colors">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                <div>
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] transition-colors">Transaction Details</span>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 transition-colors">{selectedOrder.billNumber}</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-2xl transition-all text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 shadow-sm dark:shadow-none"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl transition-colors">
                                    <div><p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 transition-colors">Status</p><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${selectedOrder.status === 'voided' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-400'}`}>{selectedOrder.status}</span></div>
                                    <div className="text-right"><p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 transition-colors">Date</p><p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
                                </div>
                                <div className="border border-slate-100 dark:border-slate-800/60 rounded-[1.5rem] overflow-hidden transition-colors">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
                                            <tr><th className="px-6 py-4">Item Name</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-right">Subtotal</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-medium transition-colors">
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="text-slate-600 dark:text-slate-300 transition-colors">
                                                    <td className="px-6 py-4 font-bold">{item.name}</td>
                                                    <td className="px-6 py-4 text-center">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100">Rs. {(item.price * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-900 dark:bg-slate-950 text-white border-t dark:border-slate-800 transition-colors">
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
        </FeatureGate>
    );
};

export default SalesHistory;