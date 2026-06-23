import React, { useState, useEffect, useRef } from 'react'; 
import useAuthStore from '../store/authStore';
import API from '../services/api';
import { grnService } from '../services/grnService';
import Swal from 'sweetalert2';
import {
    ClipboardList, Filter, Eye, X,
    AlertTriangle, ShieldAlert, Loader2, Calendar, User as UserIcon, ChevronDown, Building2, CheckCircle2, XCircle
} from 'lucide-react';
import Datepicker from "react-tailwindcss-datepicker";

const GRNHistory = () => {
    const user = useAuthStore((state) => state.user);

    // 🛡️ ROLE GUARD: Cashiers blocked from GRN History
    if (user?.role === 'cashier') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 dark:text-slate-600 transition-colors">
                <ShieldAlert size={80} className="mb-4 opacity-20 text-red-500 dark:text-red-400" />
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-200">Access Denied</h2>
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
    const [isSupplierFilterOpen, setIsSupplierFilterOpen] = useState(false);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    // මේවා දැන් Datepicker Package එකත් එක්ක ලොකුවට ඕනේ නැතත්, අනාගතේට තියාගමු
    const endDateRef = useRef(null);
    const startDateRef = useRef(null);

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
            Swal.fire({
                title: 'Error', 
                text: 'Failed to load GRN records. Please try again.', 
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
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
            Swal.fire({
                title: 'Error', 
                text: 'Failed to load GRN details', 
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }
    };

    const handleVoidGRN = async () => {
        if (!selectedGrn) return;

        if (user.role !== 'owner' && user.role !== 'admin') {
            return Swal.fire({
                title: 'Restricted', 
                text: 'Only Owners or Admins can void entries.', 
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }

        const { value: reason } = await Swal.fire({
            title: '<span class="text-red-500">VOID THIS GRN?</span>',
            html: '<span class="dark:text-slate-300">This will <b>reverse all stock additions</b> for this entry. This cannot be undone.</span>',
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
            customClass: { 
                popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]',
                input: 'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
                inputLabel: 'dark:text-slate-300'
            }
        });

        if (reason) {
            try {
                Swal.fire({ 
                    title: 'Processing...', 
                    allowOutsideClick: false, 
                    didOpen: () => Swal.showLoading(),
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
                await grnService.voidGRN(selectedGrn._id, reason);
                await Swal.fire({
                    title: 'Voided', 
                    text: 'GRN voided and stock restored successfully.', 
                    icon: 'success',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
                setIsDrawerOpen(false);
                fetchGRNs(pagination.page);
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Void Failed',
                    text: error.response?.data?.error || 'Server rejected the void request.',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '---';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '---' : d.toLocaleString();
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col font-sans dark:[color-scheme:dark] transition-colors duration-500 overflow-hidden">

            {/* 1. Header & Filter Trigger Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0 relative z-50">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter flex items-center gap-3 transition-colors">
                        <ClipboardList className="text-indigo-600 dark:text-indigo-500" size={32} /> GRN HISTORY
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1 transition-colors">Inward Goods Audit Trail</p>
                </div>
                
                {/* 🚀 PREMIUM UX: The Animated Filter Toggle Button */}
                <button 
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className={`flex items-center gap-2.5 px-5 py-2.5 md:py-3 rounded-[1.2rem] font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                        isFiltersOpen 
                        ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] border border-indigo-500' 
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
                    }`}
                >
                    <Filter size={16} className={isFiltersOpen ? 'text-white' : 'text-indigo-500'} />
                    {isFiltersOpen ? 'Close Filters' : 'Filter Records'}
                    
                    {/* 🔴 RED GLOWING DOT: User ට පෙන්නනවා Filters මොනවා හරි දාලා තියෙන්නේ කියලා */}
                    {(filters.startDate || filters.endDate || filters.supplierId || filters.status) && !isFiltersOpen && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse ml-1"></div>
                    )}
                </button>
            </div>

            {/* 2. 🚀 PREMIUM FIX: Collapsible Animated Filters Box */}
            <div className={`z-[40] transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] origin-top shrink-0 ${
                isFiltersOpen ? 'opacity-100 scale-y-100 max-h-[800px] mb-6 visible' : 'opacity-0 scale-y-95 max-h-0 mb-0 invisible pointer-events-none'
            }`}>
                <div className="relative z-[40] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-xl dark:shadow-[0_10px_40px_rgb(0,0,0,0.3)] border border-slate-200/60 dark:border-slate-700/60 flex flex-col md:flex-row flex-wrap gap-4 items-center overflow-visible">
                    
                    <div className="relative z-[40] bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row flex-wrap gap-4 items-center mb-8 overflow-visible">
    
    {/* 1. Filter Badge */}
    <div className="w-full md:w-auto flex justify-between items-center">
        <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-4 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
            <Filter size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">Filters</span>
        </div>
        
        {/* Mobile View Clear Button */}
        {(filters.startDate || filters.endDate || filters.supplierId || filters.status) && (
            <button onClick={() => setFilters({ startDate: '', endDate: '', supplierId: '', status: '' })} className="md:hidden flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-wider bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl transition-all active:scale-95">
                <X size={14} /> Clear
            </button>
        )}
    </div>

    {/* 🚀 PREMIUM UX: Sequential Date Pickers - Bulletproof Mobile Placeholders & Auto-Close */}
    <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
        
        {/* STEP 1: START DATE */}
        <div 
            onClick={() => {
                if (startDateRef.current && typeof startDateRef.current.showPicker === 'function') {
                    startDateRef.current.showPicker();
                }
            }}
            className="w-full md:w-[160px] relative z-[110] flex items-center bg-slate-50 dark:bg-slate-800/40 px-3 py-2.5 md:py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 cursor-pointer shadow-inner group hover:border-blue-400 transition-all"
        >
            <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0 group-hover:scale-110 group-hover:text-blue-500 transition-all z-10" />
            
            {/* BULLETPROOF PLACEHOLDER */}
            {!filters.startDate && (
                <span className="absolute left-[34px] text-[11px] font-black uppercase tracking-wider text-slate-400 pointer-events-none z-10">
                    START DATE
                </span>
            )}

            <input 
                ref={startDateRef}
                type="date" 
                value={filters.startDate} 
                onChange={(e) => {
                    const newStart = e.target.value;
                    // 🚀 FIX 1: Removed the forced showPicker() here. 
                    // දැන් මාසේ මාරු කරද්දී End Date එක ඉබේම පැනලා එන්නේ නෑ! Box එක විතරක් ලස්සනට Slide වෙලා එයි.
                    setFilters({ ...filters, startDate: newStart, endDate: newStart ? filters.endDate : '' });
                }} 
                className={`w-full pl-2 bg-transparent border-none text-[11px] font-black uppercase tracking-wider outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${filters.startDate ? 'text-slate-700 dark:text-slate-200' : 'text-transparent'}`} 
            />
        </div>

        {/* STEP 2: END DATE */}
        <div className={`w-full md:w-auto flex flex-col md:flex-row items-center md:items-center gap-3 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            filters.startDate 
            ? 'max-h-[200px] md:max-w-[500px] opacity-100 translate-y-0 md:translate-x-0' 
            : 'max-h-0 md:max-w-0 opacity-0 -translate-y-4 md:-translate-y-0 md:-translate-x-4 pointer-events-none'
        }`}>
            <span className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">To</span>
            
            <div 
                onClick={() => {
                    if (endDateRef.current && typeof endDateRef.current.showPicker === 'function') {
                        endDateRef.current.showPicker();
                    }
                }}
                className="w-full md:w-[160px] relative z-[105] flex items-center bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2.5 md:py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 cursor-pointer shadow-inner group hover:border-indigo-400 transition-all"
            >
                <Calendar size={14} className="text-indigo-400 dark:text-indigo-500 shrink-0 group-hover:scale-110 group-hover:text-indigo-600 transition-all z-10" />
                
                {/* BULLETPROOF PLACEHOLDER */}
                {!filters.endDate && (
                    <span className="absolute left-[34px] text-[11px] font-black uppercase tracking-wider text-indigo-400/70 pointer-events-none z-10">
                        END DATE
                    </span>
                )}

                <input 
                    ref={endDateRef}
                    type="date" 
                    min={filters.startDate} 
                    value={filters.endDate} 
                    onChange={(e) => {
                        const newEnd = e.target.value;
                        setFilters({ ...filters, endDate: newEnd });

                        // 🚀 FIX 2: THE AUTO-CLOSE MAGIC!
                        if (newEnd && filters.startDate) {
                            // Date එක select කරපු ගමන් තත්පර බාගයක් (400ms) ඉඳලා Filters Box එක ලස්සනට වහනවා
                            setTimeout(() => {
                                setIsFiltersOpen(false);
                            }, 400); 
                        }
                    }} 
                    className={`w-full pl-2 bg-transparent border-none text-[11px] font-black uppercase tracking-wider outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${filters.endDate ? 'text-indigo-700 dark:text-indigo-300' : 'text-transparent'}`} 
                />
            </div>
        </div>
    </div>

    {/* 3. Animated Custom Supplier Dropdown */}
    <div className="relative w-full md:w-auto">
        <button 
            onClick={() => { setIsSupplierFilterOpen(!isSupplierFilterOpen); setIsStatusFilterOpen(false); }}
            className="w-full md:w-auto flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 px-4 py-3.5 md:py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-all focus:ring-2 focus:ring-blue-500/20"
        >
            <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" />
                <span className="uppercase tracking-wide">
                    {filters.supplierId ? suppliers.find(s => s._id === filters.supplierId)?.name || 'Unknown' : 'All Suppliers'}
                </span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isSupplierFilterOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`absolute z-50 mt-2 w-full md:w-[220px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top ${
            isSupplierFilterOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'
        }`}>
            <div className="max-h-[200px] overflow-y-auto p-1.5 scrollbar-hide">
                <div onClick={() => { setFilters({...filters, supplierId: ''}); setIsSupplierFilterOpen(false); }} className={`px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${!filters.supplierId ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    All Suppliers
                </div>
                {suppliers.map(s => (
                    <div key={s._id} onClick={() => { setFilters({...filters, supplierId: s._id}); setIsSupplierFilterOpen(false); }} className={`px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors mt-0.5 ${filters.supplierId === s._id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        {s.name}
                    </div>
                ))}
            </div>
        </div>
    </div>

    {/* 4. Animated Custom Status Dropdown */}
    <div className="relative w-full md:w-auto ml-auto">
        <button 
            onClick={() => { setIsStatusFilterOpen(!isStatusFilterOpen); setIsSupplierFilterOpen(false); }}
            className="w-full md:w-auto flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 px-4 py-3.5 md:py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-all focus:ring-2 focus:ring-blue-500/20"
        >
            <div className="flex items-center gap-2 uppercase tracking-wide">
                {filters.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
                 filters.status === 'voided' ? <XCircle size={16} className="text-red-500" /> : 
                 <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-dashed" />}
                <span>{filters.status ? filters.status : 'All Statuses'}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`absolute z-50 mt-2 w-full md:w-[180px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 origin-top right-0 ${
            isStatusFilterOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'
        }`}>
            <div className="p-1.5 space-y-0.5">
                <div onClick={() => { setFilters({...filters, status: ''}); setIsStatusFilterOpen(false); }} className={`px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${!filters.status ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    All Statuses
                </div>
                <div onClick={() => { setFilters({...filters, status: 'completed'}); setIsStatusFilterOpen(false); }} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${filters.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <CheckCircle2 size={16} className={filters.status === 'completed' ? 'text-emerald-500' : 'text-emerald-400'} /> Completed
                </div>
                <div onClick={() => { setFilters({...filters, status: 'voided'}); setIsStatusFilterOpen(false); }} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${filters.status === 'voided' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <XCircle size={16} className={filters.status === 'voided' ? 'text-red-500' : 'text-red-400'} /> Voided
                </div>
            </div>
        </div>
    </div>

    {/* Desktop Clear Button */}
    {(filters.startDate || filters.endDate || filters.supplierId || filters.status) && (
        <button onClick={() => setFilters({ startDate: '', endDate: '', supplierId: '', status: '' })} className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 rounded-xl uppercase tracking-widest transition-all">
            <X size={14} /> Clear
        </button>
    )}
</div>

                    {/* <div className="relative w-full md:w-auto flex-1 min-w-[200px]">
                        <button 
                            onClick={() => { setIsSupplierFilterOpen(!isSupplierFilterOpen); setIsStatusFilterOpen(false); }}
                            className="w-full flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 md:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-all focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                        >
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-500" />
                                <span className="uppercase tracking-wide">
                                    {filters.supplierId ? suppliers.find(s => s._id === filters.supplierId)?.name || 'Unknown' : 'All Suppliers'}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isSupplierFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`absolute z-[45] mt-2 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top ${isSupplierFilterOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                            <div className="max-h-[220px] overflow-y-auto p-1.5 scrollbar-hide">
                                <div onClick={() => { setFilters({...filters, supplierId: ''}); setIsSupplierFilterOpen(false); }} className={`px-3 py-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${!filters.supplierId ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>All Suppliers</div>
                                {suppliers.map(s => (
                                    <div key={s._id} onClick={() => { setFilters({...filters, supplierId: s._id}); setIsSupplierFilterOpen(false); }} className={`px-3 py-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors mt-0.5 ${filters.supplierId === s._id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>{s.name}</div>
                                ))}
                            </div>
                        </div>
                    </div> */}

                    {/* <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
                        <button 
                            onClick={() => { setIsStatusFilterOpen(!isStatusFilterOpen); setIsSupplierFilterOpen(false); }}
                            className="w-full flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 px-4 py-3.5 md:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-all focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                        >
                            <div className="flex items-center gap-2 uppercase tracking-wide">
                                {filters.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : filters.status === 'voided' ? <XCircle size={16} className="text-red-500" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-dashed" />}
                                <span>{filters.status ? filters.status : 'All Statuses'}</span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`absolute z-[45] mt-2 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top right-0 ${isStatusFilterOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                            <div className="p-1.5 space-y-0.5">
                                <div onClick={() => { setFilters({...filters, status: ''}); setIsStatusFilterOpen(false); }} className={`px-3 py-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${!filters.status ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>All Statuses</div>
                                <div onClick={() => { setFilters({...filters, status: 'completed'}); setIsStatusFilterOpen(false); }} className={`flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${filters.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><CheckCircle2 size={16} className={filters.status === 'completed' ? 'text-emerald-500' : 'text-emerald-400'} /> Completed</div>
                                <div onClick={() => { setFilters({...filters, status: 'voided'}); setIsStatusFilterOpen(false); }} className={`flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer text-xs font-bold uppercase transition-colors ${filters.status === 'voided' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><XCircle size={16} className={filters.status === 'voided' ? 'text-red-500' : 'text-red-400'} /> Voided</div>
                            </div>
                        </div>
                    </div> */}

                    {(filters.startDate || filters.endDate || filters.supplierId || filters.status) && (
                        <button 
                            onClick={() => setFilters({ startDate: '', endDate: '', supplierId: '', status: '' })} 
                            className="w-full md:w-auto flex justify-center items-center gap-1.5 text-[10px] md:text-xs font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-5 py-3 rounded-2xl uppercase tracking-widest transition-all md:ml-auto"
                        >
                            <X size={16} /> Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* 3. 🚀 PREMIUM FIX: Responsive Scrollable Table Area */}
            {/* flex-1 and min-h-0 makes the table take all remaining space and scroll internally */}
            <div className="relative z-10 bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/60 flex-1 flex flex-col min-h-0 transition-colors">
                
                {/* Scrollable Container for Table */}
                <div className="overflow-auto flex-1 scrollbar-hide rounded-t-[2.5rem]">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        {/* 🚀 SENIOR UX: Sticky Header - Stays at top when scrolling! */}
                        <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <tr className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                                <th className="p-5 md:p-6">GRN Number</th>
                                <th className="p-5 md:p-6">Date</th>
                                <th className="p-5 md:p-6">Supplier</th>
                                <th className="p-5 md:p-6 text-right">Total</th>
                                <th className="p-5 md:p-6 text-center">Status</th>
                                <th className="p-5 md:p-6 text-center">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center py-24 text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">
                                    <Loader2 className="animate-spin mx-auto mb-4" size={32} /> Loading...
                                </td></tr>
                            ) : grns.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-24 text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">No records found</td></tr>
                            ) : (
                                grns.map((grn) => (
                                    <tr key={grn._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                                        <td className="p-5 md:p-6 font-black text-slate-800 dark:text-slate-200 text-xs md:text-sm">{grn.grnNumber}</td>
                                        <td className="p-5 md:p-6 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(grn.createdAt).toLocaleDateString()}</td>
                                        <td className="p-5 md:p-6 text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">{grn.supplierId?.name || '---'}</td>
                                        <td className="p-5 md:p-6 text-right font-black text-indigo-600 dark:text-indigo-400 text-xs md:text-sm">Rs. {grn.totalAmount?.toLocaleString()}</td>
                                        <td className="p-5 md:p-6 text-center">
                                            <span className={`px-3 md:px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-colors ${grn.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                {grn.status}
                                            </span>
                                        </td>
                                        <td className="p-5 md:p-6 text-center">
                                            <button onClick={() => handleViewDetails(grn._id)} className="p-2.5 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white rounded-2xl transition-all shadow-sm">
                                                <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-5 md:p-6 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0 transition-colors rounded-b-[2.5rem]">
                    <button disabled={pagination.page <= 1} onClick={() => fetchGRNs(pagination.page - 1)} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all active:scale-95">Prev</button>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                    <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchGRNs(pagination.page + 1)} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all active:scale-95">Next</button>
                </div>
            </div>

            {/* Drawer (Z-Index is 50, so Filters at 40 stay behind it) */}
            <div className={`fixed inset-0 z-50 transition-all duration-500 ${isDrawerOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsDrawerOpen(false)}></div>
                <div className={`absolute right-0 top-0 w-full max-w-2xl bg-white dark:bg-[#0f172a] h-full shadow-2xl flex flex-col transition-transform duration-500 ease-in-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} rounded-l-[3rem]`}>

                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-tl-[3rem] shrink-0 transition-colors">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter transition-colors">
                                {selectedGrn?.grnNumber || <span className="text-slate-400 dark:text-slate-600 animate-pulse">Loading...</span>}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 transition-colors">
                                Audit Log • {formatDate(selectedGrn?.createdAt)}
                            </p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all"><X size={24}/></button>
                    </div>

                    {!selectedGrn ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400" size={40} />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {selectedGrn.status === 'voided' && (
                                <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-500/20 flex items-start gap-4 text-red-800 dark:text-red-400 transition-colors">
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
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] transition-colors">
                                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Supplier</p>
                                    <p className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight">{selectedGrn.supplierId?.name}</p>
                                    <p className="font-bold text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedGrn.supplierId?.phone}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] transition-colors">
                                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Payment</p>
                                    <p className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight">{selectedGrn.paymentType}</p>
                                    <p className="font-bold text-xs text-slate-500 dark:text-slate-400 mt-1">Ref: {selectedGrn.supplierInvoiceNumber || 'Manual Entry'}</p>
                                </div>
                            </div>

                            {/* Items table */}
                            <div>
                                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] mb-4 ml-2 transition-colors">Items Received</h3>
                                <div className="border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-colors">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest transition-colors">
                                            <tr>
                                                <th className="p-4">Product</th>
                                                <th className="p-4 text-center">Qty</th>
                                                <th className="p-4 text-right">Unit Cost</th>
                                                <th className="p-4 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-bold text-slate-700 dark:text-slate-300 transition-colors">
                                            {(selectedGrn?.items ?? []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4">
                                                        <span className="block font-black text-slate-800 dark:text-slate-200">{item.name}</span>
                                                        {item.previousUnitCost !== item.unitCost && (
                                                            <span className="text-[8px] font-black text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20 px-2 py-0.5 rounded mt-1 inline-block transition-colors">Cost Fluctuation</span>
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
                            <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-lg transition-colors">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs font-black uppercase text-white/40 dark:text-white/30 tracking-widest">
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

                    <div className="p-8 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800 shrink-0 transition-colors">
                        {selectedGrn?.status === 'completed' && (user?.role === 'admin' || user?.role === 'owner') ? (
                            <button onClick={handleVoidGRN} className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] font-black text-xs tracking-widest uppercase transition-all flex justify-center items-center gap-3">
                                <AlertTriangle size={18} /> Void This GRN
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                                <ShieldAlert size={16} className="text-slate-400 dark:text-slate-500" />
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No further actions available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GRNHistory;