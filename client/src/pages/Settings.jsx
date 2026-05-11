import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Swal from 'sweetalert2';
import { Store, CreditCard, Save, AlertCircle, ArrowUpCircle, CheckCircle2, Loader2, Clock, UploadCloud, XCircle } from 'lucide-react'; // 🛡️ FIX: Added XCircle to prevent crash

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
            Swal.fire('Error', 'Failed to load shop settings.', 'error');
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
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Settings saved securely', showConfirmButton: false, timer: 2000 });
            }
        } catch (error) {
            Swal.fire('Update Failed', error.response?.data?.error || 'Failed to update settings', 'error');
        }
    };

    const handleUpgrade = async (e) => {
        e.preventDefault();
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

            Swal.fire('Success', res.data.message, 'success');
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
            return Swal.fire('File Too Large', 'Maximum file size allowed is 5MB', 'warning');
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

    // 🛡️ GAP 1 FIX: Safely check for latest rejected payment
    const latestPayment = paymentHistory?.length > 0 ? paymentHistory[0] : null;
    const wasRejected = latestPayment?.status === 'rejected';

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans animate-in fade-in duration-500">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-8">TENANT SETTINGS</h1>

            {/* TABS */}
            <div className="flex gap-6 mb-8 border-b border-slate-200">
                <button onClick={() => setActiveTab('profile')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}><Store size={16} /> Shop Profile</button>
                <button onClick={() => setActiveTab('subscription')} className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'subscription' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}><CreditCard size={16} /> Subscription & Billing</button>
            </div>

            {/* TAB 1: SHOP PROFILE */}
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSave} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop Name</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label><textarea className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Currency</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none uppercase" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Rate (%)</label><input type="number" step="0.01" min="0" max="100" className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: parseFloat(e.target.value) || 0})} /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Prefix</label><input type="text" className="w-full mt-2 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none uppercase" value={formData.billPrefix} onChange={e => setFormData({...formData, billPrefix: e.target.value})} /></div>
                    </div>
                    <button type="submit" className="mt-10 px-8 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] flex items-center gap-2 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100"><Save size={16} /> Save Configuration</button>
                </form>
            )}

            {/* TAB 2: SUBSCRIPTION */}
            {activeTab === 'subscription' && (
                <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                    
                    {/* 🛡️ REJECTION BANNER */}
                    {wasRejected && !hasAnyPending && latestPayment && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-center gap-4 font-bold text-sm shadow-sm mb-4 animate-in slide-in-from-left-4 duration-300">
                            <XCircle className="text-red-500 shrink-0" size={28} />
                            <div className="flex flex-col">
                                <span className="text-red-800 uppercase tracking-tight font-black">Verification Failed</span>
                                <span className="text-red-600 text-xs mt-1">
                                    Reason: <span className="italic">"{latestPayment.rejectionReason || 'Invalid slip'}"</span> — Please upload a valid slip to activate your plan.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 🛡️ PENDING VERIFICATION BANNER */}
                    {shopData?.planStatus === 'pending_verification' && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-2xl flex items-center gap-3 font-bold text-sm shadow-sm">
                            <Clock className="text-amber-500 shrink-0" size={24} />
                            <p className="text-amber-800">Your bank slip is under review. Plan will activate within 1-2 business days.</p>
                        </div>
                    )}
                    
                    {shopData?.planStatus === 'trial' && !hasAnyPending && (
                        <div className={`p-5 rounded-2xl flex items-center gap-3 font-bold text-sm border-l-4 ${trialDaysRemaining <= 3 ? 'bg-red-50 text-red-700 border-red-500' : 'bg-amber-50 text-amber-800 border-amber-500'}`}>
                            <AlertCircle size={20} />
                            <p>Your SaaS trial ends in {trialDaysRemaining} days. Upgrade to secure your data.</p>
                        </div>
                    )}

                    {/* Current Plan Overview */}
                    <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="absolute top-0 right-0 opacity-10"><CreditCard size={200} className="-mt-10 -mr-10" /></div>
                        <div className="relative z-10">
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-3">Active Subscription</p>
                            <h2 className="text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
                                {shopData?.subscriptionPlan || 'FREE'}
                                <span className={`px-4 py-1.5 text-xs rounded-full font-black tracking-widest ${shopData?.planStatus === 'active' ? 'bg-emerald-500' : shopData?.planStatus === 'pending_verification' ? 'bg-amber-500' : 'bg-red-500'} text-white`}>{shopData?.planStatus || 'ACTIVE'}</span>
                            </h2>
                            {shopData?.planExpiresAt && <p className="text-slate-400 text-xs font-bold mt-4 uppercase tracking-widest">Valid until: <span className="text-white">{new Date(shopData.planExpiresAt).toLocaleDateString()}</span></p>}
                        </div>
                    </div>

                    {/* Pricing Comparison Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100">
                            <div className="p-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Platform Features</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl ${shopData?.subscriptionPlan === 'free' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-800'}`}>Free</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl ${shopData?.subscriptionPlan === 'pro' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-800'}`}>Pro</div>
                            <div className={`p-5 font-black text-center uppercase tracking-tighter text-xl ${shopData?.subscriptionPlan === 'enterprise' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-800'}`}>Elite</div>
                        </div>
                        
                        {[
                            { label: 'Monthly Investment', free: 'Rs. 0', pro: 'Rs. 2,999', ent: 'Custom' },
                            { label: 'Inventory Limit', free: '500 Items', pro: '5,000 Items', ent: 'Unlimited' },
                            { label: 'Staff Accounts', free: '2 Users', pro: '10 Users', ent: 'Unlimited' }
                        ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-4 border-b border-slate-50 last:border-none">
                                <div className="p-5 text-xs font-bold text-slate-500 uppercase">{row.label}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700">{row.free}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700">{row.pro}</div>
                                <div className="p-5 text-sm font-black text-center text-slate-700">{row.ent}</div>
                            </div>
                        ))}
                        
                        {/* Call to Actions */}
                        <div className="grid grid-cols-4 bg-slate-50/50 border-t border-slate-100">
                            <div className="p-5"></div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isFreeCurrent ? <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Current</span> : null}
                            </div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isProCurrent ? <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Current</span> : (
                                    <button onClick={() => openUpgradeModal('pro')} disabled={hasAnyPending || shopData?.planStatus === 'pending_verification'} className={`px-6 py-3 text-white rounded-[1rem] text-[10px] uppercase tracking-widest font-black transition-all flex items-center gap-2 active:scale-95 shadow-md ${(hasAnyPending || shopData?.planStatus === 'pending_verification') ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                                        {isProPending ? <Clock size={14} /> : <ArrowUpCircle size={14} />} {isProPending ? 'Pending' : 'Deploy Pro'}
                                    </button>
                                )}
                            </div>
                            <div className="p-5 text-center flex justify-center items-center">
                                {isEntCurrent ? <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Current</span> : (
                                    <button onClick={() => openUpgradeModal('enterprise')} disabled={hasAnyPending || shopData?.planStatus === 'pending_verification'} className={`px-6 py-3 text-white rounded-[1rem] text-[10px] uppercase tracking-widest font-black transition-all flex items-center gap-2 active:scale-95 ${(hasAnyPending || shopData?.planStatus === 'pending_verification') ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black'}`}>
                                        {isEntPending ? <Clock size={14} /> : <ArrowUpCircle size={14} />} {isEntPending ? 'Pending' : 'Contact Sales'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financial Payment History */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                        <h3 className="font-black text-lg text-slate-800 tracking-tighter mb-6 uppercase">Billing History</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="pb-2 pl-4">Timestamp</th><th className="pb-2">Tier</th><th className="pb-2">Investment</th><th className="pb-2">Gateway</th><th className="pb-2">Status</th><th className="pb-2 pr-4 text-right">Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(paymentHistory || []).length === 0 ? (
                                        <tr><td colSpan="6" className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No financial records found</td></tr>
                                    ) : paymentHistory.map(payment => (
                                        <tr key={payment._id} className="bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <td className="p-4 rounded-l-2xl text-xs font-bold text-slate-600">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 text-xs font-black uppercase text-slate-800">{payment.plan}</td>
                                            <td className="p-4 text-xs font-black text-blue-600">{payment.currency} {payment.amount.toLocaleString()}</td>
                                            <td className="p-4 text-xs font-bold text-slate-600">{payment.paymentMethod}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${payment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' : payment.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {payment.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 rounded-r-2xl text-xs text-slate-400 font-mono text-right flex justify-end gap-2 items-center">
                                                {payment.transactionId || 'N/A'}
                                                {payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="View Slip"><UploadCloud size={14}/></a>}
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleUpgrade} className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 shrink-0 pb-4">
                            <h2 className="text-3xl font-black tracking-tighter mb-2 uppercase text-slate-800">Deploy {targetPlan}</h2>
                            <p className="text-xs font-bold text-slate-400">Choose your preferred payment method to proceed.</p>
                        </div>
                        
                        <div className="px-6 md:px-8 space-y-6 overflow-y-auto pb-4">
                            <div className="flex bg-slate-100 p-1 rounded-[1rem]">
                                <button type="button" onClick={() => {setPaymentMethod('Online Transfer'); setUpgradeError('');}} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentMethod === 'Online Transfer' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Online Transfer</button>
                                <button type="button" onClick={() => {setPaymentMethod('Bank Deposit'); setUpgradeError('');}} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentMethod === 'Bank Deposit' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Bank Deposit</button>
                            </div>

                            {paymentMethod === 'Online Transfer' ? (
                                <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Reference ID</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="e.g. TXN-98234234" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Bank Slip</label>
                                    <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:bg-slate-100 transition-colors relative group">
                                        <input type="file" id="receiptFile" accept="image/jpeg, image/png, application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                            <UploadCloud size={32} className={receiptFile ? "text-emerald-500" : "text-blue-400 group-hover:scale-110 transition-transform"} />
                                            <span className={`text-xs font-bold ${receiptFile ? "text-emerald-600" : "text-slate-500"}`}>
                                                {receiptFile ? receiptFile.name : 'Click to upload JPG, PNG or PDF'}
                                            </span>
                                            {!receiptFile && <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Max 5MB</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] text-blue-700 font-black uppercase tracking-widest leading-relaxed">
                                        Upload your bank deposit slip. Our team will verify within 1-2 business days.
                                    </div>
                                </div>
                            )}

                            {upgradeError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-in fade-in zoom-in">
                                    <AlertCircle size={14} /> {upgradeError}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 shrink-0 border-t border-slate-100 bg-slate-50/50 rounded-b-[2rem] md:rounded-b-[2.5rem] flex gap-3">
                            <button type="button" onClick={() => setShowUpgradeModal(false)} disabled={upgradeLoading} className="flex-1 py-4 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={upgradeLoading} className="flex-[2] py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                {upgradeLoading ? <Loader2 className="animate-spin" size={16}/> : (paymentMethod === 'Online Transfer' ? 'Activate Plan Now' : 'Submit for Verification')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Settings;