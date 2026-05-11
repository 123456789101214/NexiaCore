// FIXED: Feature - Actionable Insights (Apply Discount Button & Event Emitting)
import { useEffect, useState } from 'react';
import API from '../services/api';
import { AlertTriangle, ChevronRight, Calendar, X, Box, History, Tag, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const SmartAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [stockForecast, setStockForecast] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('expiry'); 
    
    // 💡 PRO FIX: Loading state for individual discount applications
    const [applyingDiscountId, setApplyingDiscountId] = useState(null); 

    const fetchInsights = async () => {
        try {
            const [expiryRes, forecastRes] = await Promise.all([
                API.get('/products/expiry-alerts'),
                API.get('/analytics/stock-forecast')
            ]);
            setAlerts(expiryRes.data.data || []);
            setStockForecast(forecastRes.data.data || []);
        } catch (err) {
            console.error("Insight fetching failed", err);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    useEffect(() => {
        if (isDrawerOpen) {
            fetchInsights();
        }
    }, [isDrawerOpen]);

    // 💡 PRO FIX: The Actionable Insight Handler
    const handleApplyDiscount = async (productId, currentPrice, suggestedPrice) => {
        // Calculate the percentage based on the suggested price
        const discountPercentage = Math.round(((currentPrice - suggestedPrice) / currentPrice) * 100);

        // Security / Safety Confirmation before applying
        const result = await Swal.fire({
            title: `Apply ${discountPercentage}% Discount?`,
            text: `The new selling price will be Rs. ${suggestedPrice}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, Apply Discount'
        });

        if (result.isConfirmed) {
            setApplyingDiscountId(productId);
            try {
                // Call our new strictly verified backend endpoint
                const res = await API.put(`/products/${productId}/apply-discount`, {
                    percentage: discountPercentage
                });

                if (res.data.success) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Discount applied successfully!',
                        showConfirmButton: false,
                        timer: 2000
                    });

                    // 💡 PRO FIX: EVENT-DRIVEN ARCHITECTURE
                    // වෙන Components (උදා: POS.jsx) වලට කියනවා ඩේටා අප්ඩේට් වුණා, refresh වෙන්න කියලා.
                    // මේකෙන් අලුතින් මුළු ඇප් එකම රීලෝඩ් කරන්න ඕනේ නෑ.
                    window.dispatchEvent(new CustomEvent('discountApplied'));

                    // Remove the item from the alert list so the user knows it's handled
                    setAlerts(alerts.filter(a => a._id !== productId));
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Action Blocked',
                    text: error.response?.data?.error || 'Failed to apply discount',
                });
            } finally {
                setApplyingDiscountId(null);
            }
        }
    };

    if (alerts.length === 0 && stockForecast.length === 0) return null;

    const criticalExpiry = alerts.filter(a => a.daysToExpiry <= 3).length;
    const criticalStock = stockForecast.filter(s => s.status === 'CRITICAL').length;
    const totalCritical = criticalExpiry + criticalStock;

    return (
        <div className="mb-10">
            {/* Dashboard Card */}
            <div 
                onClick={() => setIsDrawerOpen(true)}
                className="group cursor-pointer bg-gradient-to-r from-indigo-500 via-amber-500 to-orange-600 p-[1.5px] rounded-[2.5rem] shadow-xl shadow-amber-500/10 hover:scale-[1.01] active:scale-95 transition-all duration-300"
            >
                <div className="bg-white p-6 rounded-[2.45rem] flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="bg-slate-100 p-4 rounded-2xl text-slate-800 group-hover:rotate-12 transition-transform">
                            <AlertTriangle size={28} className={totalCritical > 0 ? "text-orange-500 animate-pulse" : "text-slate-400"} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Business Insights</h3>
                            <p className="text-sm text-slate-500 font-bold">
                                <span className="text-orange-600">{alerts.length} Expiry Alerts</span> 
                                <span className="mx-2 text-slate-300">|</span>
                                <span className="text-blue-600">{stockForecast.length} Stock Issues</span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                    </div>
                </div>
            </div>

            {/* Side Drawer */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${isDrawerOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>

                <div className={`absolute right-0 top-0 w-full max-w-md bg-white h-screen shadow-2xl flex flex-col transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Insights Center</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Real-time Inventory Monitoring</p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-3 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 bg-slate-50/50">
                        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                            <button 
                                onClick={() => setActiveTab('expiry')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'expiry' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <History size={16} /> Expiry ({alerts.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('stock')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Box size={16} /> Stock ({stockForecast.length})
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'expiry' ? (
                            <div className="space-y-4">
                                {alerts.map((item) => {
                                    const diff = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    const isApplying = applyingDiscountId === item._id;

                                    return (
                                        <div key={item._id} className={`p-5 rounded-3xl border ${diff <= 3 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h4>
                                                <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${diff <= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                                                    {diff <= 0 ? 'Expired' : `In ${diff} Days`}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-4">
                                                <Calendar size={14} />
                                                <span>Expiry: {new Date(item.expiryDate).toDateString()}</span>
                                            </div>

                                            {/* Recommended Action Box */}
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 border-dashed">
                                                <p className="text-sm font-bold text-slate-700 leading-tight mb-2">{item.suggestedAction}</p>
                                                
                                                {/* 💡 PRO FIX: The Apply Discount Interface */}
                                                {item.discountSuggestion > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-amber-200/50">
                                                        <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase mb-3">
                                                            <span>Current: Rs. {item.price}</span>
                                                            <span className="text-emerald-600">Suggested: Rs. {item.recommendedPrice}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleApplyDiscount(item._id, item.price, item.recommendedPrice)}
                                                            disabled={isApplying}
                                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {isApplying ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                                                            {isApplying ? 'Applying...' : `Apply Flash Sale`}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stockForecast.map(item => (
                                    <div key={item._id} className={`p-5 rounded-3xl border ${item.status === 'CRITICAL' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h4>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${item.status === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                                            <span>Stock: {item.stock}</span>
                                            <span className="text-slate-900 font-black tracking-tighter">Out in ≈ {item.daysRemaining} Days</span>
                                        </div>
                                        <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((item.velocity / 10) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Action */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <button onClick={() => setIsDrawerOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                            Got it, Thanks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartAlerts;