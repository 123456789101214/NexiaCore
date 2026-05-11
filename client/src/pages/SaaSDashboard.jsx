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
      // If API also rejects, show error
      if(err.response?.status === 403) {
          Swal.fire('Security Alert', 'Unauthorized backend access attempt detected.', 'error');
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
        showCancelButton: true
      });
      if (!value) return;
      rejectionReason = value;
    }

    try {
      await API.put(`/super-admin/payments/${id}/verify`, { action, rejectionReason });
      Swal.fire('Success', `Payment ${action}ed`, 'success');
      loadData();
    } catch (err) {
      Swal.fire('Error', 'Verification failed', 'error');
    }
  };

  const handleToggleShop = async (id) => {
    try {
      await API.put(`/super-admin/shops/${id}/toggle`);
      loadData();
    } catch (error) {
      Swal.fire('Error', 'Failed to toggle status', 'error');
    }
  };

  // 🛑 URL BYPASS WARNING SCREEN 🛑
  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg w-full text-center border-4 border-red-500 animate-in zoom-in-95 duration-300">
          <ShieldAlert size={80} className="text-red-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 px-4">
            Security Violation. You do not have Super Admin privileges to view this area. Your access attempt has been blocked.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex justify-center items-center gap-2"
          >
            <Home size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ⏳ LOADING STATE
  if (loading && !stats) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={48}/></div>;

  // ✅ SUPER ADMIN DASHBOARD UI (Rest of your code remains exactly the same)
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Super Admin</h1>

      <div className="flex gap-2 bg-slate-200 p-1 w-fit rounded-xl">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg ${activeTab==='overview'?'bg-white shadow-sm':'text-slate-500'}`}>Overview</button>
        <button onClick={() => setActiveTab('shops')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg ${activeTab==='shops'?'bg-white shadow-sm':'text-slate-500'}`}>All Shops</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg ${activeTab==='payments'?'bg-white shadow-sm':'text-slate-500'}`}>Pending ({pendingPayments.length})</button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"><Store className="text-blue-500"/><div><p className="text-[10px] font-black uppercase text-slate-400">Total Shops</p><h3 className="text-3xl font-black">{stats.totalShops}</h3></div></div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"><CheckCircle className="text-emerald-500"/><div><p className="text-[10px] font-black uppercase text-slate-400">Active</p><h3 className="text-3xl font-black">{stats.activeShops}</h3></div></div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"><AlertCircle className="text-amber-500"/><div><p className="text-[10px] font-black uppercase text-slate-400">On Trial</p><h3 className="text-3xl font-black">{stats.trialShops}</h3></div></div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-sm text-white flex items-center gap-4"><TrendingUp className="text-emerald-400"/><div><p className="text-[10px] font-black uppercase text-slate-400">MRR (LKR)</p><h3 className="text-3xl font-black">{stats.mrr}</h3></div></div>
        </div>
      )}

      {activeTab === 'shops' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-5">Shop</th><th className="p-5">Plan</th><th className="p-5">Status</th><th className="p-5">Usage</th><th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map(s => (
                <tr key={s._id} className="border-b border-slate-50 last:border-0">
                  <td className="p-5 font-bold">{s.name}<br/><span className="text-xs text-slate-400">{s.phone}</span></td>
                  <td className="p-5 uppercase font-black text-xs">{s.subscriptionPlan}</td>
                  <td className="p-5 text-xs font-bold">{s.planStatus}</td>
                  <td className="p-5 text-xs text-slate-500">{s.productCount} Prod | {s.userCount} Staff</td>
                  <td className="p-5 text-right">
                    <button onClick={() => handleToggleShop(s._id)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">Toggle Access</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {pendingPayments.map(p => (
            <div key={p._id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">{p.shopId.name} <span className="text-xs text-slate-400">({p.shopId.phone})</span></h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-lg">{p.plan}</span>
                <p className="text-sm font-bold mt-2">Rs. {p.amount}</p>
                <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-4 items-center">
                <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 text-xs font-bold hover:underline"><ExternalLink size={14}/> View Slip</a>
                <button onClick={() => handleVerify(p._id, 'reject')} className="px-6 py-3 bg-red-50 text-red-600 font-black uppercase text-xs rounded-xl">Reject</button>
                <button onClick={() => handleVerify(p._id, 'approve')} className="px-6 py-3 bg-emerald-500 text-white font-black uppercase text-xs rounded-xl">Approve</button>
              </div>
            </div>
          ))}
          {pendingPayments.length === 0 && <div className="p-10 text-center text-slate-500 font-bold">No pending verifications.</div>}
        </div>
      )}
    </div>
  );
};
export default SaaSDashboard;