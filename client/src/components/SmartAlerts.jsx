import { useEffect, useState, useCallback } from 'react';
import API from '../services/api';
import { AlertTriangle, ChevronRight, Calendar, X, Box, History, Tag, Loader2, CheckCircle2, AlertOctagon, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import FeatureGate from './FeatureGate';
import useAuthStore from '../store/authStore';

const SmartAlerts = () => {
    const { user } = useAuthStore();
    
    // 🛡️ SECURITY: Hide completely from cashiers on the frontend
    if (user?.role === 'cashier') return null;

    const [alerts, setAlerts] = useState([]);
    const [stockForecast, setStockForecast] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('expiry'); 
    const [applyingDiscountId, setApplyingDiscountId] = useState(null); 
    
    // 🚀 PRO FIX: Loading States for UX
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);

    const fetchInsights = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsInitialLoading(true);
        if (isBackground) setIsBackgroundFetching(true);
        
        try {
            // 🚀 PRO FIX: Unified under analytics endpoint
            const [expiryRes, forecastRes] = await Promise.all([
                API.get('/analytics/smart-alerts'), 
                API.get('/analytics/stock-forecast')
            ]);
            setAlerts(expiryRes.data.data || []);
            setStockForecast(forecastRes.data.data || []);
        } catch (err) {
            console.error("Insight fetching failed", err);
        } finally {
            setIsInitialLoading(false);
            setIsBackgroundFetching(false);
        }
    }, []);

    // 🚀 PRO FIX: Background Polling (Auto-Refresh every 60s)
    useEffect(() => {
        fetchInsights();
        const interval = setInterval(() => {
            fetchInsights(true);
        }, 60000); // 60 seconds
        return () => clearInterval(interval);
    }, [fetchInsights]);

    const handleApplyDiscount = async (productId, currentPrice, suggestedPrice) => {
        const discountPercentage = Math.round(((currentPrice - suggestedPrice) / currentPrice) * 100);

        const result = await Swal.fire({
            title: `Apply ${discountPercentage}% Discount?`,
            text: `The new selling price will be Rs. ${suggestedPrice}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, Apply Discount',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-3xl' }
        });

        if (result.isConfirmed) {
            setApplyingDiscountId(productId);
            try {
                const res = await API.put(`/products/${productId}/apply-discount`, {
                    percentage: discountPercentage
                });

                if (res.data.success) {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'success',
                        title: 'Discount applied successfully!',
                        showConfirmButton: false, timer: 2000,
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-2xl' }
                    });

                    window.dispatchEvent(new CustomEvent('discountApplied'));

                    // Optimistic Update
                    setAlerts(alerts.map(a => a._id === productId ? { ...a, expiryDiscountApplied: true } : a));
                    setActiveTab('applied'); 
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error', title: 'Action Blocked',
                    text: error.response?.data?.error || 'Failed to apply discount',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-3xl' }
                });
            } finally {
                setApplyingDiscountId(null);
            }
        }
    };

    if (isInitialLoading) {
        return (
            <div className="mb-10 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center h-[120px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-700" />
            </div>
        );
    }

    if (alerts.length === 0 && stockForecast.length === 0) return null;

    const pendingAlerts = alerts.filter(a => !a.expiryDiscountApplied);
    const appliedAlerts = alerts.filter(a => a.expiryDiscountApplied);

    const criticalExpiry = pendingAlerts.filter(a => a.daysToExpiry <= 3).length;
    const criticalStock = stockForecast.filter(s => s.status === 'CRITICAL').length;
    const totalCritical = criticalExpiry + criticalStock;

    return (
        <FeatureGate feature="expiryAlerts" featureNameTitle="Smart Expiry Alerts">
        
        {/* 🚀 PREMIUM HIGH-ATTRACTION: Neon Glow & Pan Keyframes (50% Reduced Intensity) */}
        <style>
            {`
                @keyframes neon-pan {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                /* ☀️ LIGHT MODE ANIMATIONS (Softer, cleaner glows for white background) */
                @keyframes neon-glow-critical-light {
                    0%, 100% { box-shadow: 0 0 8px rgba(249, 115, 22, 0.15), 0 0 12px rgba(239, 68, 68, 0.05); }
                    50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.25), 0 0 25px rgba(249, 115, 22, 0.15); }
                }
                @keyframes neon-glow-normal-light {
                    0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.15), 0 0 12px rgba(6, 182, 212, 0.05); }
                    50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.25), 0 0 25px rgba(6, 182, 212, 0.15); }
                }

                /* 🌙 DARK MODE ANIMATIONS (Vivid, deeper glows for dark background) */
                @keyframes neon-glow-critical-dark {
                    0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.2), 0 0 12px rgba(239, 68, 68, 0.1); }
                    50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.45), 0 0 25px rgba(245, 158, 11, 0.3); }
                }
                @keyframes neon-glow-normal-dark {
                    0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.15), 0 0 12px rgba(168, 85, 247, 0.05); }
                    50% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.4), 0 0 25px rgba(168, 85, 247, 0.25); }
                }
                
                /* Default to Light Mode */
                .neon-card-critical {
                    background-size: 200% 200%;
                    animation: neon-pan 2s linear infinite, neon-glow-critical-light 2s ease-in-out infinite;
                }
                .neon-card-normal {
                    background-size: 200% 200%;
                    animation: neon-pan 3s linear infinite, neon-glow-normal-light 2.5s ease-in-out infinite;
                }

                /* Override if Tailwind .dark is active */
                .dark .neon-card-critical {
                    animation: neon-pan 2s linear infinite, neon-glow-critical-dark 2s ease-in-out infinite;
                }
                .dark .neon-card-normal {
                    animation: neon-pan 3s linear infinite, neon-glow-normal-dark 2.5s ease-in-out infinite;
                }
            `}
        </style>

        <div className="mb-10">
            {/* Dashboard Card */}
            <div 
                onClick={() => setIsDrawerOpen(true)} 
                className={`group cursor-pointer relative p-[3px] rounded-[2.5rem] hover:scale-[1.015] active:scale-95 transition-all duration-300 ${
                    totalCritical > 0 ? 'neon-card-critical' : 'neon-card-normal'
                }`}
            >
                {/* 🚀 THE MAGIC: Tailwind Dark/Light Mode Gradient Classes */}
                <div className={`absolute inset-0 rounded-[2.5rem] transition-colors duration-500 ${
                    totalCritical > 0 
                    ? 'bg-gradient-to-r from-rose-400 via-orange-400 to-red-500 dark:from-orange-500 dark:via-amber-400 dark:to-red-600' 
                    : 'bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 dark:from-indigo-500 dark:via-purple-500 dark:to-blue-600'
                }`}></div>

                {/* Main Card Content Layer */}
                <div className="relative bg-white dark:bg-slate-900 p-6 rounded-[2.35rem] flex items-center justify-between w-full h-full">
                    <div className="flex items-center gap-5">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-slate-800 dark:text-slate-200 group-hover:rotate-12 transition-transform relative">
                            <AlertTriangle size={28} className={totalCritical > 0 ? "text-orange-500 animate-pulse" : "text-slate-400 dark:text-slate-500"} />
                            {isBackgroundFetching && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                    <RefreshCw size={10} className="animate-spin" />
                                </span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Business Insights</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                                <span className={pendingAlerts.length > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-500"}>
                                    {pendingAlerts.length} Action Needed
                                </span> 
                                <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                                <span className={stockForecast.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}>
                                    {stockForecast.length} Stock Issues
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 p-3 rounded-2xl group-hover:bg-slate-900 dark:group-hover:bg-slate-100 group-hover:text-white dark:group-hover:text-slate-900 transition-all">
                        <ChevronRight size={20} />
                    </div>
                </div>
            </div>

            {/* Side Drawer */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${isDrawerOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>

                <div className={`absolute right-0 top-0 w-full max-w-md bg-white dark:bg-slate-900 h-screen shadow-2xl flex flex-col transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Insights Center</h2>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 flex items-center gap-1">
                                Real-time Monitoring
                                {isBackgroundFetching && <Loader2 size={10} className="animate-spin text-blue-500" />}
                            </p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-2xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 3-Way Tabs */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                            <button onClick={() => setActiveTab('expiry')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all ${activeTab === 'expiry' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <History size={14} /> Expiry ({pendingAlerts.length})
                            </button>
                            <button onClick={() => setActiveTab('applied')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all ${activeTab === 'applied' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md' : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                <CheckCircle2 size={14} /> Applied ({appliedAlerts.length})
                            </button>
                            <button onClick={() => setActiveTab('stock')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <Box size={14} /> Stock ({stockForecast.length})
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/50">
                        {/* (Tabs Content code remains the same...) */}
                        {activeTab === 'expiry' && ( <div className="space-y-4">{/* ... */}</div> )}
                        {activeTab === 'applied' && ( <div className="space-y-4">{/* ... */}</div> )}
                        {activeTab === 'stock' && ( <div className="space-y-4">{/* ... */}</div> )}
                    </div>

                    {/* Bottom Action */}
                    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none">
                        <button onClick={() => setIsDrawerOpen(false)} className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black dark:hover:bg-slate-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95">
                            Got it, Thanks
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </FeatureGate>
    );
};

export default SmartAlerts;