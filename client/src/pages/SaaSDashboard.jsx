import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 💡 NEW: To redirect users
import API from '../services/api';
import useAuthStore from '../store/authStore';
import Swal from 'sweetalert2';
import { ShieldAlert, Store, TrendingUp, AlertCircle, Users, ExternalLink, CheckCircle, XCircle, Loader2, Home } from 'lucide-react';

const SaaSDashboard = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  // 🛡️ STRICT SECURITY GUARD (URL Protection)
  const envAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL?.toLowerCase()?.trim();
  const userEmail = user?.email?.toLowerCase()?.trim();
  const isSuperAdmin = envAdminEmail && userEmail === envAdminEmail;

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, shRes, pRes] = await Promise.all([
        API.get('/super-admin/stats'),
        API.get('/super-admin/shops'),
        API.get('/super-admin/payments/pending')
      ]);
      setStats(sRes.data.data);
      setShops(shRes.data.data);
      setPendingPayments(pRes.data.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        Swal.fire({
          title: 'Security Alert',
          text: 'Unauthorized backend access attempt detected.',
          icon: 'error',
          customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const handleVerify = async (id, action) => {
    let rejectionReason = '';
    if (action === 'reject') {
      const { value } = await Swal.fire({
        title: 'Rejection Reason',
        input: 'text',
        inputPlaceholder: 'Enter reason for rejection...',
        showCancelButton: true,
        customClass: {
          popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]',
          input: 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
        }
      });
      if (!value) return;
      rejectionReason = value;
    }

    try {
      await API.put(`/super-admin/payments/${id}/verify`, { action, rejectionReason });
      Swal.fire({
        title: 'Success',
        text: `Payment ${action}ed`,
        icon: 'success',
        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
      });
      loadData();
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Verification failed',
        icon: 'error',
        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
      });
    }
  };

  const handleToggleShop = async (id) => {
    try {
      await API.put(`/super-admin/shops/${id}/toggle`);
      loadData();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Failed to toggle status',
        icon: 'error',
        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
      });
    }
  };

  const handleDowngrade = async (id, shopName) => {
    // 🛡️ Security & UX: Explicit Confirmation required
    const result = await Swal.fire({
      title: 'Are you absolutely sure?',
      html: `You are about to downgrade <b>${shopName}</b> to the <b>Free</b> plan.<br/><br/>They will immediately lose access to Pro/Enterprise features.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, Downgrade to Free!',
      customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
    });

    if (result.isConfirmed) {
      try {
        await API.put(`/super-admin/shops/${id}/downgrade`);
        Swal.fire({
          title: 'Downgraded!',
          text: 'Shop has been successfully moved to the Free plan.',
          icon: 'success',
          customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
        loadData(); // 💡 මේකෙන් ඔටෝ Table එක රිෆ්‍රෙශ් වෙනවා
      } catch (err) {
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.error || 'Failed to downgrade plan',
          icon: 'error',
          customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
      }
    }
  };

  // 🛑 URL BYPASS WARNING SCREEN 🛑
  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl max-w-lg w-full text-center border-4 border-red-500 animate-in zoom-in-95 duration-300 transition-colors">
          <ShieldAlert size={80} className="text-red-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 mb-2 transition-colors">Access Denied</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 px-4 transition-colors">
            Security Violation. You do not have Super Admin privileges to view this area. Your access attempt has been blocked.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black dark:hover:bg-blue-500 transition-all flex justify-center items-center gap-2 shadow-lg dark:shadow-none"
          >
            <Home size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ⏳ LOADING STATE
  if (loading && !stats) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  // ✅ SUPER ADMIN DASHBOARD UI
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans dark:[color-scheme:dark] transition-colors duration-500">
      <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter transition-colors">Super Admin</h1>

      {/* Tabs Row */}
      <div className="flex gap-2 bg-slate-200 dark:bg-slate-800/60 p-1 w-fit rounded-xl transition-colors">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Overview</button>
        <button onClick={() => setActiveTab('shops')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'shops' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>All Shops</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'payments' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Pending ({pendingPayments.length})</button>
      </div>

      {/* Tab Content: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl transition-colors"><Store size={24} /></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors">Total Shops</p><h3 className="text-3xl font-black text-slate-800 dark:text-white transition-colors">{stats.totalShops}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl transition-colors"><CheckCircle size={24} /></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors">Active</p><h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">{stats.activeShops}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-2xl transition-colors"><AlertCircle size={24} /></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors">On Trial</p><h3 className="text-3xl font-black text-amber-500 dark:text-amber-400 transition-colors">{stats.trialShops}</h3></div>
          </div>
          <div className="bg-slate-900 dark:bg-slate-950/80 p-6 rounded-3xl border dark:border-slate-800/60 shadow-sm text-white flex items-center gap-4 transition-colors">
            <div className="p-3 bg-white/10 dark:bg-emerald-500/20 text-emerald-400 rounded-2xl"><TrendingUp size={24} /></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors">MRR (LKR)</p><h3 className="text-3xl font-black text-emerald-400">Rs. {stats.mrr?.toLocaleString()}</h3></div>
          </div>
        </div>
      )}

      {/* Tab Content: ALL SHOPS */}
      {activeTab === 'shops' && (
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800/60 overflow-hidden transition-colors animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
                  <th className="p-5">Shop</th><th className="p-5">Plan</th><th className="p-5">Status</th><th className="p-5">Usage</th><th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {shops.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-5 font-bold text-slate-800 dark:text-slate-200">{s.name}<br /><span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{s.phone}</span></td>
                    <td className="p-5 uppercase font-black text-xs text-slate-700 dark:text-slate-300">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] ${s.subscriptionPlan === 'pro' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : s.subscriptionPlan === 'enterprise' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {s.subscriptionPlan}
                      </span>
                    </td>
                    <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase ${s.planStatus === 'active' || s.planStatus === 'trial' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {s.planStatus}
                      </span>
                    </td>
                    <td className="p-5 text-xs font-medium text-slate-500 dark:text-slate-400">{s.productCount} Prod | {s.userCount} Staff</td>
                    <td className="p-5 text-right space-x-2 flex justify-end gap-2">
                      {/* 💡 Shop එක දැනටමත් Free නෙමෙයි නම් විතරක් Downgrade Button එක පෙන්නන්න */}
                      {s.subscriptionPlan !== 'free' && (
                        <button
                          onClick={() => handleDowngrade(s._id, s.name)}
                          className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-[10px] uppercase font-black text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all tracking-widest"
                        >
                          Downgrade
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleShop(s._id)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-[10px] uppercase tracking-widest font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Toggle Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: PENDING PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {pendingPayments.map(p => (
            <div key={p._id} className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
              <div className="space-y-2">
                <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 transition-colors">{p.shopId?.name} <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">({p.shopId?.phone})</span></h3>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-lg border dark:border-blue-500/20 transition-colors">{p.plan}</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200 transition-colors">Rs. {p.amount?.toLocaleString()}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">{new Date(p.createdAt).toLocaleDateString()} at {new Date(p.createdAt).toLocaleTimeString()}</p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline bg-blue-50 dark:bg-blue-500/10 px-4 py-3 rounded-xl transition-all"><ExternalLink size={14} /> View Slip</a>
                <button onClick={() => handleVerify(p._id, 'reject')} className="px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black uppercase text-xs tracking-wider rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">Reject</button>
                <button onClick={() => handleVerify(p._id, 'approve')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-colors shadow-md shadow-emerald-200 dark:shadow-none">Approve</button>
              </div>
            </div>
          ))}
          {pendingPayments.length === 0 && (
            <div className="p-16 text-center bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800/60 transition-colors">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <div className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-widest transition-colors">No pending verifications.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SaaSDashboard;