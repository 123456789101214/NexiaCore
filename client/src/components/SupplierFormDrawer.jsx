import { useState, useEffect } from 'react';
import API from '../services/api';
import { X, User, Phone, Mail, MapPin, Tag } from 'lucide-react';
import Swal from 'sweetalert2';

const SupplierFormDrawer = ({ isOpen, onClose, onSuccess, editData }) => {
    const [formData, setFormData] = useState({
        name: '', contactPerson: '', phone: '', email: '', address: '', category: 'General', balance: 0
    });

    useEffect(() => {
        if (editData) setFormData(editData);
        else setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', category: 'General', balance: 0 });
    }, [editData, isOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = editData 
                ? await API.put(`/suppliers/${editData._id}`, formData)
                : await API.post('/suppliers', formData);

            if (res.data.success) {
                Swal.fire({ title: 'Saved!', icon: 'success', customClass: { popup: 'rounded-[2rem]' } });
                onSuccess();
                onClose();
            }
        } catch (error) {
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            <section className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black text-slate-800">{editData ? 'Edit Supplier' : 'Add Supplier'}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 space-y-5 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Company Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-4 text-slate-400" size={18} />
                                <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter Supplier Name" 
                                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 ml-1">Phone</label>
                                <input required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500" placeholder="07x xxxxxxx" 
                                    value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 ml-1">Category</label>
                                <select className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500" 
                                    value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                                    <option value="General">General</option>
                                    <option value="Grocery">Grocery</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Dairy">Dairy</option>
                                </select>
                            </div>
                        </div>

                        {/* Balance Field - ණය පොතට වැදගත් */}
                        <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <label className="text-xs font-bold text-blue-600 ml-1">Opening Balance (Rs.)</label>
                            <input type="number" className="w-full px-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" 
                                value={formData.balance} onChange={(e) => setFormData({...formData, balance: e.target.value})} />
                            <p className="text-[10px] text-blue-400 mt-1">* ඔබට මෙම සැපයුම්කරුට ගෙවීමට ඇති හිඟ මුදල</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 ml-1">Address</label>
                            <textarea className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500" placeholder="Business Address" rows="2"
                                value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                        </div>
                    </form>

                    <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white font-black rounded-[1.5rem] mt-6 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100">
                        {editData ? 'UPDATE SUPPLIER' : 'SAVE SUPPLIER'}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default SupplierFormDrawer;