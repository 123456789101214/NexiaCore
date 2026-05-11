import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import useAuthStore from '../store/authStore'; // 💡 PRO FIX: Role-Based Security
import { Search, Plus, Phone, MessageSquare, Edit3, Trash2, Loader2, Users } from 'lucide-react';
import SupplierFormDrawer from '../components/SupplierFormDrawer';
import Swal from 'sweetalert2';

const Suppliers = () => {
    // 🛡️ Security Checking
    const user = useAuthStore((state) => state.user);
    const isManager = user?.role === 'admin' || user?.role === 'owner';

    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // 💡 Loading State
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    useEffect(() => { 
        fetchSuppliers(); 
    }, []);

    const fetchSuppliers = async () => {
        try {
            setIsLoading(true);
            const res = await API.get('/suppliers');
            if (res.data.success) {
                setSuppliers(res.data.data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            Swal.fire('Error', 'Failed to fetch suppliers', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 💡 PRO FIX: Performance caching for Search
    const filteredSuppliers = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(lowerSearch) ||
            s.phone.includes(lowerSearch)
        );
    }, [suppliers, searchTerm]);

    // 💡 PRO FIX: Performance caching for calculations
    const totalPayable = useMemo(() => {
        return suppliers.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    }, [suppliers]);

    // 🛡️ Add Archive/Delete Functionality
    const handleDelete = async (id) => {
        if (!isManager) return;

        const result = await Swal.fire({
            title: 'Archive Supplier?',
            text: "They will be removed from the active list.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Archive!'
        });

        if (result.isConfirmed) {
            try {
                const res = await API.delete(`/suppliers/${id}`);
                if (res.data.success) {
                    Swal.fire({ title: 'Archived!', icon: 'success', timer: 1500, showConfirmButton: false });
                    fetchSuppliers();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to archive supplier', 'error');
            }
        }
    };

    const openWhatsApp = (phone, name) => {
        if (!phone) return;
        const cleanPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
        const message = encodeURIComponent(`Hello ${name}, this is from NexMart...`);

        const url = window.innerWidth > 768
            ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${message}`
            : `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`;

        window.open(url, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium tracking-widest uppercase text-sm">Loading Vendors...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Suppliers</h1>
                    <p className="text-slate-500 font-medium">Manage your vendor network {isManager && 'and credit balances'}</p>
                </div>
                
                {/* 🛡️ PRO FIX: Hide from Cashiers */}
                {isManager && (
                    <button onClick={() => { setEditingSupplier(null); setIsDrawerOpen(true); }}
                        className="flex items-center justify-center w-full md:w-auto gap-2 bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                        <Plus size={20} /> Add Supplier
                    </button>
                )}
            </div>

            {/* Quick Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${isManager ? 'md:col-span-2' : 'md:col-span-3'} relative`}>
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="w-full pl-16 pr-6 py-5 bg-white border-none rounded-[2rem] shadow-sm focus:ring-2 focus:ring-blue-500 text-base md:text-lg font-medium outline-none"
                        placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                
                {/* 🛡️ PRO FIX: Hide Total Debt from Cashiers */}
                {isManager && (
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex flex-col justify-center">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Total Payable</span>
                        <h2 className="text-2xl font-black text-red-600">Rs. {totalPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
                    </div>
                )}
            </div>

            {/* Supplier Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <div key={supplier._id} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl hover:border-blue-100 transition-all group relative flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-xl text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                {supplier.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* 🛡️ PRO FIX: Hide Edit/Delete from Cashiers */}
                            {isManager && (
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditingSupplier(supplier); setIsDrawerOpen(true); }} className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
                                        <Edit3 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(supplier._id)} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-1">{supplier.name}</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{supplier.category} Supplier</p>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={14} /></div>
                                <span className="text-sm">{supplier.phone}</span>
                            </div>
                            
                            {/* 🛡️ PRO FIX: Hide Balance from Cashiers */}
                            {isManager && (
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mt-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Balance</span>
                                    <span className={`font-black ${supplier.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        Rs. {supplier.balance?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-50 mt-auto">
                            <a href={`tel:${supplier.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-50 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
                                <Phone size={16} /> Call
                            </a>
                            <button onClick={() => openWhatsApp(supplier.phone, supplier.name)} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors">
                                <MessageSquare size={16} /> WhatsApp
                            </button>
                        </div>
                    </div>
                ))}

                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-sm">No suppliers found</p>
                    </div>
                )}
            </div>

            {/* Form Drawer (Only rendered if Manager) */}
            {isManager && (
                <SupplierFormDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    onSuccess={fetchSuppliers}
                    editData={editingSupplier}
                />
            )}
        </div>
    );
};

export default Suppliers;