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
        <div className="mb-10">
            {/* Dashboard Card */}
            <div onClick={() => setIsDrawerOpen(true)} className="group cursor-pointer bg-gradient-to-r from-indigo-500 via-amber-500 to-orange-600 p-[1.5px] rounded-[2.5rem] shadow-xl shadow-amber-500/10 hover:scale-[1.01] active:scale-95 transition-all duration-300">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.45rem] flex items-center justify-between">
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
                        
                        {/* 1. EXPIRY TAB */}
                        {activeTab === 'expiry' && (
                            <div className="space-y-4">
                                {pendingAlerts.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 font-bold text-sm mt-10">No pending expiry alerts. You're all good!</p>}
                                
                                {pendingAlerts.map((item) => {
                                    const diff = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    const isApplying = applyingDiscountId === item._id;
                                    const isExpired = diff <= 0; 

                                    return (
                                        <div key={item._id} className={`p-5 rounded-3xl border ${isExpired ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : diff <= 3 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight w-2/3">{item.name}</h4>
                                                <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${isExpired ? 'bg-red-600 text-white animate-pulse' : diff <= 3 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                                    {isExpired ? 'Expired!' : `In ${diff} Days`}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">
                                                <Calendar size={14} />
                                                <span>Expiry: {new Date(item.expiryDate).toDateString()}</span>
                                            </div>

                                            {isExpired ? (
                                                <div className="p-4 bg-red-100/50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                                                    <AlertOctagon className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" size={20} />
                                                    <div>
                                                        <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Remove From Shelf</p>
                                                        <p className="text-xs font-bold text-red-600/70 dark:text-red-400/70 mt-1">This item has expired. Selling is blocked.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight mb-2">{item.suggestedAction}</p>
                                                    
                                                    {item.discountSuggestion > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                            <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3">
                                                                <span className="line-through decoration-slate-300 dark:decoration-slate-600">Current: Rs. {item.price}</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400">Suggested: Rs. {item.recommendedPrice}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleApplyDiscount(item._id, item.price, item.recommendedPrice)}
                                                                disabled={isApplying}
                                                                className="w-full py-3 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                            >
                                                                {isApplying ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                                                                {isApplying ? 'Applying...' : `Apply Flash Sale`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. APPLIED TAB */}
                        {activeTab === 'applied' && (
                            <div className="space-y-4">
                                {appliedAlerts.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 font-bold text-sm mt-10">No active expiry discounts running.</p>}
                                
                                {appliedAlerts.map(item => (
                                    <div key={item._id} className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 opacity-90">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg leading-tight">{item.name}</h4>
                                            <CheckCircle2 className="text-emerald-500 dark:text-emerald-400" size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase mb-3">Flash Sale Running</p>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center text-sm font-black">
                                            <span className="line-through text-slate-400 dark:text-slate-500">Rs. {item.price}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">Rs. {item.discount?.discountedPrice || item.recommendedPrice}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. STOCK TAB */}
                        {activeTab === 'stock' && (
                            <div className="space-y-4">
                                {stockForecast.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 font-bold text-sm mt-10">Stock levels look healthy.</p>}
                                
                                {stockForecast.map(item => (
                                    <div key={item._id} className={`p-5 rounded-3xl border ${item.status === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{item.name}</h4>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${item.status === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                            <span>Stock: {item.stock}</span>
                                            <span className="text-slate-900 dark:text-slate-100 font-black tracking-tighter">Out in ≈ {item.daysRemaining} Days</span>
                                        </div>
                                        <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 dark:bg-blue-500 h-full transition-all" style={{ width: `${Math.min((item.velocity / 10) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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