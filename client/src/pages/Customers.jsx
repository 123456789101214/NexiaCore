import { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import useAuthStore from '../store/authStore';
import Swal from 'sweetalert2';
import { 
    Plus, Search, UserPlus, CreditCard, X, AlertCircle, 
    Edit, ToggleLeft, ToggleRight, UserMinus, UserCheck, Loader2 
} from 'lucide-react';
import FeatureGate from '../components/FeatureGate';

const Customers = () => {
    const user = useAuthStore((state) => state.user);
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [formData, setFormData] = useState({ name: '', phone: '', nic: '', address: '', creditLimit: 5000 });
    const [paymentData, setPaymentData] = useState({ amount: '', paymentMethod: 'Cash', note: '' });

    const fetchCustomers = async (search = '') => {
        try {
            setIsLoading(true);
            const res = await customerService.getCustomers(search, showInactive);
            setCustomers(res.data.data);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCustomers(searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, showInactive]);

    const handleToggleStatus = async (id, name, currentStatus) => {
        const isActivating = currentStatus === 'inactive';
        const result = await Swal.fire({
            title: isActivating ? 'Reactivate Customer?' : 'Deactivate Customer?',
            text: isActivating ? `Re-enable ${name} for transactions?` : `Deactivate ${name} from POS?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isActivating ? '#10b981' : '#ef4444',
            confirmButtonText: isActivating ? 'Yes, Activate' : 'Yes, Deactivate',
            customClass: { popup: 'rounded-[2rem]' }
        });

        if (result.isConfirmed) {
            try {
                await customerService.toggleCustomerStatus(id);
                Swal.fire({ title: 'Success', text: `Customer is now ${isActivating ? 'Active' : 'Inactive'}`, icon: 'success', customClass: { popup: 'rounded-[2rem]' } });
                fetchCustomers(searchTerm);
            } catch (error) {
                Swal.fire('Error', error.response?.data?.error || 'Action failed', 'error');
            }
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            await customerService.addCustomer(formData);
            Swal.fire({ title: 'Success', text: 'Customer added!', icon: 'success', customClass: { popup: 'rounded-[2rem]' } });
            setIsAddModalOpen(false);
            setFormData({ name: '', phone: '', nic: '', address: '', creditLimit: 5000 });
            fetchCustomers();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to add customer', 'error');
        }
    };

    const handleEditCustomer = async (e) => {
        e.preventDefault();
        try {
            await customerService.updateCustomer(selectedCustomer._id, formData);
            Swal.fire({ title: 'Success', text: 'Updated!', icon: 'success', customClass: { popup: 'rounded-[2rem]' } });
            setIsEditModalOpen(false);
            fetchCustomers();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to update', 'error');
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            await customerService.recordPayment(selectedCustomer._id, paymentData);
            Swal.fire('Success', 'Payment recorded!', 'success');
            setIsPayModalOpen(false);
            setPaymentData({ amount: '', paymentMethod: 'Cash', note: '' });
            fetchCustomers(); 
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Payment failed', 'error');
        }
    };

    const openEditModal = (customer) => {
        setSelectedCustomer(customer);
        setFormData({ name: customer.name, phone: customer.phone, nic: customer.nic || '', address: customer.address || '', creditLimit: customer.creditLimit });
        setIsEditModalOpen(true);
    };

    const canManage = ['owner', 'admin', 'manager'].includes(user?.role);

    return (
        <FeatureGate feature="customerCredit" featureNameTitle="Customer Credit (Naya Potha)">
            <div className="w-full">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Customers & Credit</h2>
                        <p className="text-slate-500 text-sm">Manage your shop's customers and Naya Potha (Credit Ledger)</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowInactive(!showInactive)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${showInactive ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            {showInactive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            <span>{showInactive ? 'Showing All' : 'Active Only'}</span>
                        </button>
                        {canManage && (
                            <button 
                                onClick={() => { setFormData({ name: '', phone: '', nic: '', address: '', creditLimit: 5000 }); setIsAddModalOpen(true); }}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md"
                            >
                                <UserPlus size={20} />
                                <span>Add Customer</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
                    <Search className="text-slate-400" size={24} />
                    <input 
                        type="text" 
                        placeholder="Search by name or phone number..." 
                        className="w-full bg-transparent outline-none text-slate-700 font-medium text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-bold">Customer Info</th>
                                    <th className="p-4 font-bold">Contact</th>
                                    <th className="p-4 font-bold">Limit</th>
                                    <th className="p-4 font-bold">Debt Balance</th>
                                    <th className="p-4 font-bold text-center">Status</th>
                                    <th className="p-4 font-bold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</td></tr>
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan="6" className="p-10 text-center text-slate-500 font-bold">No records found.</td></tr>
                                ) : (
                                    customers.map(customer => (
                                        <tr key={customer._id} className={`hover:bg-slate-50 transition-colors ${customer.status === 'inactive' ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 text-base">{customer.name}</div>
                                                <div className="text-xs text-slate-500 font-bold">{customer.nic || 'NO NIC'}</div>
                                            </td>
                                            <td className="p-4 text-slate-600 font-bold text-sm">{customer.phone}</td>
                                            <td className="p-4 text-slate-500 font-bold text-sm">Rs. {customer.creditLimit.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black ${customer.creditBalance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    Rs. {customer.creditBalance.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {customer.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center items-center gap-2">
                                                    {canManage && customer.status === 'active' && customer.creditBalance > 0 && (
                                                        <button onClick={() => { setSelectedCustomer(customer); setIsPayModalOpen(true); }} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 transition-all shadow-sm">
                                                            <CreditCard size={18} />
                                                        </button>
                                                    )}
                                                    {canManage && (
                                                        <button onClick={() => openEditModal(customer)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 transition-all shadow-sm">
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {canManage && (
                                                        <button onClick={() => handleToggleStatus(customer._id, customer.name, customer.status)} className={`p-2 rounded-lg border transition-all shadow-sm ${customer.status === 'active' ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white'}`}>
                                                            {customer.status === 'active' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                 {/* ADD / EDIT CUSTOMER MODAL */}
                {(isAddModalOpen || isEditModalOpen) && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-black text-xl text-slate-800">
                                    {isEditModalOpen ? 'Edit Customer' : 'Add New Customer'}
                                </h3>
                                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                            </div>
                            <form onSubmit={isEditModalOpen ? handleEditCustomer : handleAddCustomer} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number *</label>
                                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500"
                                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIC (Optional)</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500"
                                            value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credit Limit (Rs.)</label>
                                        <input type="number" min="0" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-blue-600"
                                            value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                                    {isEditModalOpen ? 'Update Customer' : 'Save Customer'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* SETTLE DEBT MODAL */}
                {isPayModalOpen && selectedCustomer && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50">
                                <h3 className="font-black text-xl text-emerald-800 flex items-center gap-2">
                                    <CreditCard size={24} /> Settle Debt
                                </h3>
                                <button onClick={() => setIsPayModalOpen(false)} className="text-emerald-600 hover:text-emerald-800"><X size={24}/></button>
                            </div>
                            <form onSubmit={handlePayment} className="p-6 space-y-4">
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3 mb-4">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold">Outstanding Balance</p>
                                        <p className="text-xl font-black">Rs. {selectedCustomer.creditBalance.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Amount (Rs.) *</label>
                                    <input type="number" min="1" max={selectedCustomer.creditBalance} required 
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-emerald-500 font-black text-2xl text-slate-800"
                                        value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-emerald-500 font-medium"
                                        value={paymentData.paymentMethod} onChange={e => setPaymentData({...paymentData, paymentMethod: e.target.value})}>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                                    Record Payment
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
};

export default Customers;