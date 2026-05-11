import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { grnService } from '../services/grnService'; 
import useAuthStore from '../store/authStore';
import { 
    Search, Plus, Trash2, ShoppingCart, User, 
    Calculator, Save, Loader2, FileText, AlertCircle 
} from 'lucide-react';
import Swal from 'sweetalert2';

const NewPurchase = () => {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    // 🛡️ ROLE GUARD: Level 1 Security
    const isAuthorized = ['owner', 'admin', 'manager'].includes(user?.role);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentInfo, setPaymentInfo] = useState({ paidAmount: 0, paymentType: 'Cash' });

    useEffect(() => {
        if (!isAuthorized) {
            Swal.fire('Access Denied', 'Unauthorized module access.', 'error');
            navigate('/dashboard');
            return;
        }

        const fetchData = async () => {
            try {
                // SaaS Isolation: Backend filters by req.user.shopId automatically
                const [supplierRes, productRes] = await Promise.all([
                    API.get('/suppliers'),
                    API.get('/products')
                ]);
                
                if (supplierRes.data.success) setSuppliers(supplierRes.data.data);
                if (productRes.data.success) setProducts(productRes.data.data);
            } catch (error) {
                Swal.fire('Sync Error', 'Failed to load master records.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isAuthorized, navigate]);

    // 🔍 High-Performance Product Search
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            (p.barcode && p.barcode.includes(searchTerm)) ||
            (p.sku && p.sku.toLowerCase().includes(lowerTerm))
        ).slice(0, 8); // Performance: Limit search results view
    }, [products, searchTerm]);

    const addToCart = (product) => {
        if (cart.find(item => item.productId === product._id)) {
            return Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Already in list', showConfirmButton: false, timer: 1000 });
        }

        setCart([...cart, {
            productId: product._id,
            name: product.name,
            quantity: 1,
            unitCost: Number(product.buyingPrice) || 0,
            sellingPrice: Number(product.price) || 0,
            expiryDate: '',
        }]);
        setSearchTerm('');
    };

    const updateItem = (index, field, value) => {
        setCart(prev => {
            const newCart = [...prev];
            // 🛡️ Sanitization: Ensure numbers are positive
            if (field === 'expiryDate') {
                newCart[index][field] = value;
            } else {
                const numVal = parseFloat(value);
                newCart[index][field] = numVal < 0 ? 0 : numVal;
            }
            return newCart;
        });
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((acc, item) => acc + (Number(item.unitCost) * Number(item.quantity)), 0);
    }, [cart]);

    // 💰 Auto-balance Logic for SaaS Financials
    useEffect(() => {
        if (paymentInfo.paymentType === 'Cash') {
            setPaymentInfo(prev => ({ ...prev, paidAmount: totalAmount }));
        } else if (paymentInfo.paymentType === 'Credit') {
            setPaymentInfo(prev => ({ ...prev, paidAmount: 0 }));
        }
    }, [paymentInfo.paymentType, totalAmount]);

    const handleSaveGRN = async () => {
        if (!selectedSupplier) return Swal.fire('Field Required', 'Supplier must be selected.', 'warning');
        if (cart.length === 0) return Swal.fire('List Empty', 'Add items to inward.', 'warning');

        // Confirm Action (Crucial for SaaS data integrity)
        const result = await Swal.fire({
            title: 'Finalize GRN?',
            text: `Updating inventory for ${cart.length} items. Total: Rs.${totalAmount.toLocaleString()}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Confirm Stock Inward',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'rounded-[2rem]' }
        });

        if (!result.isConfirmed) return;

        setIsSubmitting(true);
        try {
            // Build 100% Validated Payload
            const payload = {
                supplierId: selectedSupplier,
                supplierInvoiceNumber: supplierInvoiceNumber.trim(),
                items: cart.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: Number(item.quantity),
                    unitCost: Number(item.unitCost),
                    sellingPrice: Number(item.sellingPrice),
                    expiryDate: item.expiryDate || null,
                    subTotal: Number(item.quantity) * Number(item.unitCost)
                })),
                totalAmount: Number(totalAmount),
                paidAmount: Number(paymentInfo.paidAmount),
                paymentType: paymentInfo.paymentType
            };

            const res = await grnService.createGRN(payload);
            
            if (res.data.success) {
                await Swal.fire({ 
                    title: 'SUCCESS!', 
                    text: `Stock Updated. GRN #${res.data.data.grnNumber}`, 
                    icon: 'success', 
                    customClass: { popup: 'rounded-[2.5rem]' } 
                });
                navigate('/grn-history');
            }
        } catch (error) {
            Swal.fire('Operation Failed', error.response?.data?.error || 'Inventory update aborted.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Securing Tenant Connection...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto font-sans animate-in fade-in duration-500">
            {/* Left: Entry Area */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                                <ShoppingCart className="text-blue-600" size={32} /> INWARD STOCK
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-1">Goods Received Note (GRN)</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                             <FileText size={18} className="text-slate-400" />
                             <input 
                                type="text" 
                                placeholder="SUPPLIER INV #" 
                                className="bg-transparent border-none outline-none font-black text-xs text-slate-700 w-32"
                                value={supplierInvoiceNumber}
                                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                             />
                        </div>
                    </div>

                    {/* Master Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="p-5 bg-slate-50 rounded-[1.5rem] flex items-center gap-4 border border-slate-100">
                            <User className="text-slate-400" />
                            <select
                                className="bg-transparent border-none font-black text-sm text-slate-700 w-full outline-none cursor-pointer"
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                            >
                                <option value="">SELECT SOURCE SUPPLIER</option>
                                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none transition-all"
                                placeholder="Scan Barcode or Search Product..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchTerm && searchResults.length > 0 && (
                        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50/30 rounded-[2rem] border border-blue-100 animate-in zoom-in-95 duration-200">
                            {searchResults.map(product => (
                                <button key={product._id} onClick={() => addToCart(product)}
                                    className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all text-left">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-slate-800 uppercase">{product.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Stock On-hand: {product.stock}</span>
                                    </div>
                                    <Plus size={16} className="text-blue-600" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Cart Table */}
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <th className="pb-2 pl-4">Product Name</th>
                                    <th className="pb-2 text-center">Qty</th>
                                    <th className="pb-2">Unit Cost</th>
                                    <th className="pb-2">Selling</th>
                                    <th className="pb-2">Expiry</th>
                                    <th className="pb-2 text-center">Rem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center opacity-20">
                                            <ShoppingCart size={48} className="mx-auto mb-2" />
                                            <p className="text-xs font-black uppercase tracking-widest">No items pending in current GRN</p>
                                        </td>
                                    </tr>
                                ) : cart.map((item, index) => (
                                    <tr key={item.productId} className="bg-slate-50/50 hover:bg-slate-50 transition-all">
                                        <td className="p-5 rounded-l-[1.5rem] border-y border-l border-slate-100">
                                            <p className="font-black text-slate-800 text-xs uppercase">{item.name}</p>
                                        </td>
                                        <td className="p-5 border-y border-slate-100">
                                            <input type="number" min="1" className="w-16 p-2 bg-white border border-slate-200 rounded-xl text-center font-black text-xs outline-none focus:border-blue-500"
                                                value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="p-5 border-y border-slate-100">
                                            <input type="number" className="w-24 p-2 bg-white border border-slate-200 rounded-xl font-black text-xs text-blue-600 outline-none focus:border-blue-500"
                                                value={item.unitCost} onChange={(e) => updateItem(index, 'unitCost', e.target.value)} />
                                        </td>
                                        <td className="p-5 border-y border-slate-100">
                                            <input type="number" className="w-24 p-2 bg-white border border-slate-200 rounded-xl font-black text-xs text-emerald-600 outline-none focus:border-emerald-500"
                                                value={item.sellingPrice} onChange={(e) => updateItem(index, 'sellingPrice', e.target.value)} />
                                        </td>
                                        <td className="p-5 border-y border-slate-100">
                                            <input type="date" className="w-32 p-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-500 outline-none focus:border-blue-500"
                                                value={item.expiryDate} onChange={(e) => updateItem(index, 'expiryDate', e.target.value)} />
                                        </td>
                                        <td className="p-5 rounded-r-[1.5rem] border-y border-r border-slate-100 text-center">
                                            <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right: Summary Area */}
            <div className="space-y-6">
                <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10">
                        <Calculator size={200} />
                    </div>
                    
                    <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase">
                        <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">01</span> Settlement
                    </h3>

                    <div className="space-y-6 mb-10 relative z-10">
                        <div className="flex justify-between items-center text-slate-500 font-black uppercase text-[10px] tracking-widest">
                            <span>Inventory Cost</span>
                            <span>Rs. {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                            <span className="text-2xl font-black tracking-tighter">TOTAL PAYABLE</span>
                            <span className="text-3xl font-black text-blue-400">Rs. {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block">Payment Mode</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'Credit', 'Partial'].map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setPaymentInfo({...paymentInfo, paymentType: type})}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${paymentInfo.paymentType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {paymentInfo.paymentType === 'Partial' && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block">Paid Amount (Rs.)</label>
                                <input
                                    type="number"
                                    className="w-full py-5 px-8 bg-slate-800 border border-slate-700 rounded-[1.5rem] font-black text-2xl text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={paymentInfo.paidAmount}
                                    onChange={(e) => setPaymentInfo({...paymentInfo, paidAmount: Number(e.target.value) || 0})}
                                />
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-800 flex justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Liability Balance</span>
                            <span className={`text-sm font-black ${totalAmount - paymentInfo.paidAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                Rs. {(totalAmount - paymentInfo.paidAmount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveGRN}
                        disabled={cart.length === 0 || isSubmitting}
                        className="w-full mt-12 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                        {isSubmitting ? 'PROCESSING...' : 'SAVE GRN & UPDATE STOCK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewPurchase;