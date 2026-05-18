import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, AlertCircle, Plus, X, Loader2 } from 'lucide-react';
import api from '../services/api'; // 💡 අලුත් Service එක පාවිච්චි කළා
import Swal from 'sweetalert2';
import SmartAlerts from '../components/SmartAlerts';
import useAuthStore from '../store/authStore'; // 💡 Role එක ගන්න Store එක ගෙනාවා
import TrialBanner from '../components/TrialBanner';
import SalesChart from '../components/SalesChart';
import FeatureGate from '../components/FeatureGate';
const Dashboard = () => {
  const user = useAuthStore((state) => state.user); // 💡 යූසර්ගේ ඩේටා
  const isManagerOrOwner = user?.role === 'admin' || user?.role === 'owner'; // 💡 Security Check

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '', barcode: '', category: 'General', buyingPrice: '', price: '', stock: '', unit: 'pcs'
  });

  const [summary, setSummary] = useState({
    todaySales: 0, totalOrders: 0, totalProducts: 0, lowStockItems: 0
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/analytics/dashboard-summary');
        setSummary(res.data.data);
      } catch (error) {
        console.error("Summary fetching failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // 🛡️ PRO FIX: Role-Based Stats Array
  // Cashier කෙනෙක්ට Total Revenue/Sales පෙන්නන්නේ නෑ!
  const stats = [
    ...(isManagerOrOwner ? [
      { name: 'Today Sales', value: `Rs. ${summary.todaySales?.toLocaleString() || 0}`, icon: <DollarSign className="text-emerald-600" />, color: 'bg-emerald-50' }
    ] : []),
    { name: 'Total Orders', value: summary.totalOrders?.toString() || '0', icon: <TrendingUp className="text-blue-600" />, color: 'bg-blue-50' },
    { name: 'Total Products', value: summary.totalProducts?.toString() || '0', icon: <Package className="text-amber-600" />, color: 'bg-amber-50' },
    { name: 'Low Stock Items', value: summary.lowStockItems?.toString() || '0', icon: <AlertCircle className="text-red-600" />, color: 'bg-red-50' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/products', formData);
      if (res.data.success) {
        Swal.fire('Success', 'Product Added Successfully!', 'success');
        setIsModalOpen(false);
        setFormData({ name: '', barcode: '', category: 'General', buyingPrice: '', price: '', stock: '', unit: 'pcs' });
        // Optional: Refresh summary or alerts here
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-8 relative">
      <TrialBanner />
      <div className="max-w-[1600px] mx-auto">
        <SmartAlerts />
        
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">{stat.name}</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1 tracking-tight group-hover:text-blue-600 transition-colors">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📈 1. Sales Chart Section (Upgraded to fill space natively) */}
        {isManagerOrOwner && (
            <div className="lg:col-span-2">
              <FeatureGate feature="analytics" featureNameTitle="Advanced Analytics">
                <SalesChart />
                </FeatureGate>
            </div>
        )}

        {/* ⚡ 2. Quick Actions (Full width if cashier, side if owner) */}
        <div className={`bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col ${!isManagerOrOwner ? 'lg:col-span-3' : 'h-full'}`}>
          <div className="mb-6">
             <h3 className="text-lg font-black text-slate-800">Quick Actions</h3>
             <p className="text-sm font-medium text-slate-500 mt-1">Manage your shop operations</p>
          </div>
          
          <div className="space-y-4 mt-auto">
              <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                New Sale (POS)
              </button>
              
              {isManagerOrOwner && (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 bg-slate-50 text-slate-700 font-bold rounded-2xl hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Add New Product
                </button>
              )}
          </div>
        </div>
      </div>

      {/* --- ADD PRODUCT MODAL (කලින් විදිහටම තියෙනවා, but Add Product Button eka disable wenawa submit weddi) --- */}
      {isModalOpen && (
         /* Modal Background */
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           {/* ... UI as before ... */}
              <button disabled={isSubmitting} type="submit" className="w-full flex justify-center items-center gap-2 py-4 mt-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black shadow-xl transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SAVE PRODUCT'}
              </button>
            {/* ... */}
        </div>
      )}
    </div>
  );
};

export default Dashboard;