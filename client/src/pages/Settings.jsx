import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Swal from 'sweetalert2';
import { Store, CreditCard, Save, AlertCircle, ArrowUpCircle, CheckCircle2, Loader2, Clock, UploadCloud, XCircle } from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [shopData, setShopData] = useState(null);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '', phone: '', address: '', currency: 'LKR', taxRate: 0, billPrefix: 'INV', timezone: 'Asia/Colombo'
    });

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [targetPlan, setTargetPlan] = useState('pro');
    const [paymentMethod, setPaymentMethod] = useState('Online Transfer');
    const [transactionId, setTransactionId] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState('');

    const fetchShopData = async () => {
        try {
            const res = await API.get('/subscription');
            if (res.data.success) {
                const { shop, trialDaysRemaining, paymentHistory } = res.data.data;
                setShopData(shop);
                setTrialDaysRemaining(trialDaysRemaining);
                setPaymentHistory(paymentHistory || []);
                setFormData({
                    name: shop.name || '', phone: shop.phone || '', address: shop.address || '',
                    currency: shop.currency || 'LKR', taxRate: shop.taxRate || 0,
                    billPrefix: shop.billPrefix || 'INV', timezone: shop.timezone || 'Asia/Colombo'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to load shop settings.',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchShopData(); }, []);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        try {
            const res = await API.put('/subscription/settings', formData);
            if (res.data.success) {
                setShopData(res.data.data);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Settings saved securely',
                    showConfirmButton: false,
                    timer: 2000,
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100' }
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Update Failed',
                text: error.response?.data?.error || 'Failed to update settings',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }
    };

    const handleUpgrade = async (e) => {
        e.preventDefault();
        
        // 🛡️ Prevent submission if PayHere is selected
        if (paymentMethod === 'PayHere') return;

        setUpgradeLoading(true);
        setUpgradeError('');
        
        try {
            const submitData = new FormData();
            submitData.append('plan', targetPlan);
            submitData.append('paymentMethod', paymentMethod);

            if (paymentMethod === 'Online Transfer') {
                if (!transactionId || transactionId.trim().length < 5) {
                    setUpgradeError('Please enter a valid transaction reference');
                    setUpgradeLoading(false);
                    return;
                }
                submitData.append('transactionId', transactionId);
            }

            if (paymentMethod === 'Bank Deposit') {
                if (!receiptFile) {
                    setUpgradeError('Please upload your bank deposit slip');
                    setUpgradeLoading(false);
                    return;
                }
                submitData.append('receipt', receiptFile);
            }

            const res = await API.post('/subscription/upgrade', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                title: 'Success',
                text: res.data.message,
                icon: 'success',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
            setShowUpgradeModal(false);
            fetchShopData();
        } catch (err) {
            setUpgradeError(err.response?.data?.error || 'Upgrade failed');
        } finally {
            setUpgradeLoading(false);
        }
    };

    const openUpgradeModal = (planName) => {
        setTargetPlan(planName);
        setPaymentMethod('Online Transfer');
        setTransactionId('');
        setReceiptFile(null);
        setUpgradeError('');
        setShowUpgradeModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 5 * 1024 * 1024) {
            return Swal.fire({
                title: 'File Too Large',
                text: 'Maximum file size allowed is 5MB',
                icon: 'warning',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }
        setReceiptFile(file);
    };

    if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
    if (!shopData) return <div className="text-center text-red-500 mt-20">Failed to load data</div>;

    const isFreeCurrent = shopData?.subscriptionPlan === 'free';
    const isProCurrent = shopData?.subscriptionPlan === 'pro' && shopData?.planStatus === 'active';
    const isEntCurrent = shopData?.subscriptionPlan === 'enterprise' && shopData?.planStatus === 'active';

    const pendingPayment = (paymentHistory || []).find(p => p.status === 'pending_verification');
    const pendingPlan = pendingPayment ? pendingPayment.plan : null;
    const isProPending = pendingPlan === 'pro';
    const isEntPending = pendingPlan === 'enterprise';
    const hasAnyPending = !!pendingPlan;

    const latestPayment = paymentHistory?.length > 0 ? paymentHistory[0] : null;
    const wasRejected = latestPayment?.status === 'rejected';

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans animate-in fade-in duration-500 dark:[color-scheme:dark] transition-colors duration-500">
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter mb-8 transition-colors">TENANT SETTINGS</h1>

            {/* TABS */}
            <div className="flex gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
                <button onClick={() => setActiveTab('profile')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}><Store size={16} /> Shop Profile</button>
                <button onClick={() => setActiveTab('subscription')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'subscription' ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}><CreditCard size={16} /> Subscription & Billing</button>
            </div>

            {/* TAB 1: SHOP PROFILE */}
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSave} className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-[2rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800/60 max-w-4xl transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Shop Name</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Phone Number</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Physical Address</label><textarea className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors" rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Base Currency</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 uppercase transition-colors" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Tax Rate (%)</label><input type="number" step="0.01" min="0" max="100" className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors" value={formData.taxRate} onChange={e => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Invoice Prefix</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 uppercase transition-colors" value={formData.billPrefix} onChange={e => setFormData({ ...formData, billPrefix: e.target.value })} /></div>
                    </div>
                    <button type="submit" className="mt-10 px-8 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] flex items-center gap-2 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100 dark:shadow-none transition-all"><Save size={16} /> Save Configuration</button>
                </form>
            )}

            {/* TAB 2: SUBSCRIPTION */}
            {activeTab === 'subscription' && (
                <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">

                    {wasRejected && !hasAnyPending && latestPayment && (
                        <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-center gap-4 font-bold text-sm shadow-sm dark:shadow-none mb-4 animate-in slide-in-from-left-4 duration-300 transition-colors">
                            <XCircle className="text-red-500 dark:text-red-400 shrink-0 transition-colors" size={28} />
                            <div className="flex flex-col">
                                <span className="text-red-800 dark:text-red-400 uppercase tracking-tight font-black transition-colors">Verification Failed</span>
                                <span className="text-red-600 dark:text-red-500 text-xs mt-1 transition-colors">
                                    Reason: <span className="italic">"{latestPayment.rejectionReason || 'Invalid slip'}"</span> — Please upload a valid slip to activate your plan.
                                </span>
                            </div>
                        </div>
                    )}

                    {shopData?.planStatus === 'pending_verification' && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-5 rounded-r-2xl flex items-center gap-3 font-bold text-sm shadow-sm dark:shadow-none transition-colors">
                            <Clock className="text-amber-500 shrink-0" size={24} />
                            <p className="text-amber-800 dark:text-amber-400 transition-colors">Your bank slip is under review. Plan will activate within 1-2 business days.</p>
                        </div>
                    )}

                    {shopData?.planStatus === 'trial' && !hasAnyPending && (
                        <div className={`p-5 rounded-2xl flex items-center gap-3 font-bold text-sm border-l-4 transition-colors ${trialDaysRemaining <= 3 ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-500' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500'}`}>
                            <AlertCircle size={20} />
                            <p>Your SaaS trial ends in {trialDaysRemaining} days. Upgrade to secure your data.</p>
                        </div>
                    )}

                    {/* Current Plan Overview */}
                    <div className="bg-slate-900 dark:bg-slate-950/80 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center transition-colors">
                        <div className="absolute top-0 right-0 opacity-10"><CreditCard size={200} className="-mt-10 -mr-10" /></div>
                        <div className="relative z-10">
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-3 transition-colors">Active Subscription</p>
                            <h2 className="text-5xl font-black uppercase tracking-tighter flex items-center gap-4 transition-colors">
                                {shopData?.subscriptionPlan || 'FREE'}
                                <span className={`px-4 py-1.5 text-xs rounded-full font-black tracking-widest transition-colors ${shopData?.planStatus === 'active' ? 'bg-emerald-500' : shopData?.planStatus === 'pending_verification' ? 'bg-amber-500' : 'bg-red-500'} text-white`}>{shopData?.planStatus || 'ACTIVE'}</span>
                            </h2>
                            {shopData?.planExpiresAt && <p className="text-slate-400 text-xs font-bold mt-4 uppercase tracking-widest transition-colors">Valid until: <span className="text-white">{new Date(shopData.planExpiresAt).toLocaleDateString()}</span></p>}
                        </div>
                    </div>

                    {/* Pricing Comparison Table */}
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-slate-800/60 overflow-hidden shadow-sm dark:shadow-none transition-colors">
                        <div className="grid grid-cols-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 transition-colors">
                            <div className="p-5 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest transition-colors">Platform Features</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl transition-colors ${shopData?.subscriptionPlan === 'free' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' : 'text-slate-800 dark:text-slate-200'}`}>Free</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl transition-colors ${shopData?.subscriptionPlan === 'pro' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' : 'text-slate-800 dark:text-slate-200'}`}>Pro</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl transition-colors ${shopData?.subscriptionPlan === 'enterprise' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' : 'text-slate-800 dark:text-slate-200'}`}>Elite</div>
                        </div>

                        {[
                            { label: 'Monthly Investment', free: 'Rs. 0', pro: 'Rs. 2,999', ent: 'Custom' },
                            { label: 'Inventory Limit', free: '500 Items', pro: '5,000 Items', ent: 'Unlimited' },
                            { label: 'Staff Accounts', free: '2 Users', pro: '10 Users', ent: 'Unlimited' }
                        ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-4 border-b border-slate-50 dark:border-slate-800/50 last:border-none transition-colors">
                                <div className="p-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase transition-colors">{row.label}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700 dark:text-slate-300 transition-colors">{row.free}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700 dark:text-slate-300 transition-colors">{row.pro}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700 dark:text-slate-300 transition-colors">{row.ent}</div>
                            </div>
                        ))}

                        <div className="grid grid-cols-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60 transition-colors">
                            <div className="p-5"></div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isFreeCurrent ? <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 transition-colors"><CheckCircle2 size={12} /> Current</span> : null}
                            </div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isProCurrent ? <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors"><CheckCircle2 size={12} /> Current</span> : (
                                    <button onClick={() => openUpgradeModal('pro')} disabled={hasAnyPending || shopData?.planStatus === 'pending_verification'} className={`px-6 py-3 text-white rounded-[1rem] text-[10px] uppercase tracking-widest font-black transition-all flex items-center gap-2 active:scale-95 shadow-md ${hasAnyPending || shopData?.planStatus === 'pending_verification' ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 shadow-blue-200 dark:shadow-none'}`}>
                                        {isProPending ? <Clock size={14} /> : <ArrowUpCircle size={14} />} {isProPending ? 'Pending' : 'Deploy Pro'}
                                    </button>
                                )}
                            </div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isEntCurrent ? <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors"><CheckCircle2 size={12} /> Current</span> : (
                                    <button onClick={() => openUpgradeModal('enterprise')} disabled={hasAnyPending || shopData?.planStatus === 'pending_verification'} className={`px-6 py-3 text-white rounded-[1rem] text-[10px] uppercase tracking-widest font-black transition-all flex items-center gap-2 active:scale-95 ${hasAnyPending || shopData?.planStatus === 'pending_verification' ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed' : 'bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500'}`}>
                                        {isEntPending ? <Clock size={14} /> : <ArrowUpCircle size={14} />} {isEntPending ? 'Pending' : 'Contact Sales'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financial Payment History */}
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-slate-800/60 p-8 shadow-sm dark:shadow-none transition-colors">
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 tracking-tighter mb-6 uppercase transition-colors">Billing History</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
                                        <th className="pb-2 pl-4">Timestamp</th><th className="pb-2">Tier</th><th className="pb-2">Investment</th><th className="pb-2">Gateway</th><th className="pb-2">Status</th><th className="pb-2 pr-4 text-right">Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(paymentHistory || []).length === 0 ? (
                                        <tr><td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest transition-colors">No financial records found</td></tr>
                                    ) : paymentHistory.map(payment => (
                                        <tr key={payment._id} className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <td className="p-4 rounded-l-2xl text-xs font-bold text-slate-600 dark:text-slate-400">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 text-xs font-black uppercase text-slate-800 dark:text-slate-200">{payment.plan}</td>
                                            <td className="p-4 text-xs font-black text-blue-600 dark:text-blue-400">{payment.currency} {payment.amount.toLocaleString()}</td>
                                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{payment.paymentMethod}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${payment.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : payment.status === 'pending_verification' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : payment.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                                    {payment.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 rounded-r-2xl text-xs text-slate-400 dark:text-slate-500 font-mono text-right flex justify-end gap-2 items-center">
                                                {payment.transactionId || 'N/A'}
                                                {payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" title="View Slip"><UploadCloud size={14} /></a>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ UPGRADE MODAL */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
                    <form onSubmit={handleUpgrade} className="bg-white dark:bg-[#0f172a] rounded-[2rem] md:rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] transition-colors">
                        <div className="p-6 md:p-8 shrink-0 pb-4">
                            <h2 className="text-3xl font-black tracking-tighter mb-2 uppercase text-slate-800 dark:text-slate-100 transition-colors">Deploy {targetPlan}</h2>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 transition-colors">Choose your preferred payment method to proceed.</p>
                        </div>

                        <div className="px-6 md:px-8 space-y-6 overflow-y-auto pb-4">
                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-[1rem] transition-colors overflow-x-auto snap-x">
                                <button type="button" onClick={() => { setPaymentMethod('PayHere'); setUpgradeError(''); }} className={`flex-1 min-w-[130px] snap-start py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentMethod === 'PayHere' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-500 dark:text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Pay Online (Soon)</button>
                                <button type="button" onClick={() => { setPaymentMethod('Online Transfer'); setUpgradeError(''); }} className={`flex-1 min-w-[130px] snap-start py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentMethod === 'Online Transfer' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Bank Transfer</button>
                                <button type="button" onClick={() => { setPaymentMethod('Bank Deposit'); setUpgradeError(''); }} className={`flex-1 min-w-[130px] snap-start py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentMethod === 'Bank Deposit' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Slip Upload</button>
                            </div>

                            {/* 💡 PRO FIX: Coming Soon PayHere Card */}
                            {paymentMethod === 'PayHere' ? (
                                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center transition-colors relative overflow-hidden">
                                        
                                        {/* 🛠️ FIX: Ribbon width and positioning adjusted to prevent text clipping */}
                                        <div className="absolute top-6 -right-12 w-48 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.3em] py-1.5 text-center rotate-45 shadow-sm">
                                            Coming Soon
                                        </div>

                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 mt-2">
                                            🚧 Setup in Progress
                                        </div>
                                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2 opacity-50">
                                            {targetPlan === 'pro' ? 'Rs. 2,999.00' : 'Custom'} <span className="text-sm text-slate-400">/ month</span>
                                        </p>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-5">
                                            Automated online payments via PayHere are currently being configured. Please use Bank Transfer or Slip Upload for now.
                                        </p>
                                        <div className="flex justify-center gap-2 opacity-40 grayscale">
                                            <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded font-black text-[10px] tracking-widest border border-blue-200 dark:border-blue-800/50">VISA</span>
                                            <span className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded font-black text-[10px] tracking-widest border border-red-200 dark:border-red-800/50">MASTERCARD</span>
                                            <span className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded font-black text-[10px] tracking-widest border border-sky-200 dark:border-sky-800/50">AMEX</span>
                                        </div>
                                    </div>
                                </div>
                            ) : paymentMethod === 'Online Transfer' ? (
                                <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Transaction Reference ID</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" placeholder="e.g. TXN-98234234" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Upload Bank Slip</label>
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative group">
                                        <input type="file" id="receiptFile" accept="image/jpeg, image/png, application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                            <UploadCloud size={32} className={`transition-transform ${receiptFile ? "text-emerald-500" : "text-blue-400 dark:text-blue-500 group-hover:scale-110"}`} />
                                            <span className={`text-xs font-bold transition-colors ${receiptFile ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                                                {receiptFile ? receiptFile.name : 'Click to upload JPG, PNG or PDF'}
                                            </span>
                                            {!receiptFile && <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1 transition-colors">Max 5MB</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl text-[10px] text-blue-700 dark:text-blue-400 font-black uppercase tracking-widest leading-relaxed transition-colors">
                                        Upload your bank deposit slip. Our team will verify within 1-2 business days.
                                    </div>
                                </div>
                            )}

                            {upgradeError && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-in fade-in zoom-in transition-colors">
                                    <AlertCircle size={14} /> {upgradeError}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-[2rem] md:rounded-b-[2.5rem] flex gap-3 transition-colors">
                            <button type="button" onClick={() => setShowUpgradeModal(false)} disabled={upgradeLoading} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Cancel</button>
                            
                            {/* 💡 PRO FIX: Disable button if PayHere is selected */}
                            <button 
                                type="submit" 
                                disabled={upgradeLoading || paymentMethod === 'PayHere'} 
                                className={`flex-[2] py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${paymentMethod === 'PayHere' ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none' : 'bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 shadow-slate-900/20 dark:shadow-none'}`}
                            >
                                {upgradeLoading ? <Loader2 className="animate-spin" size={16} /> : (paymentMethod === 'PayHere' ? 'Currently Unavailable' : paymentMethod === 'Online Transfer' ? 'Activate Plan Now' : 'Submit for Verification')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
export default Settings;