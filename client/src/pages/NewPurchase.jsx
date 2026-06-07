import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { grnService } from '../services/grnService';
import useAuthStore from '../store/authStore';
import { useBarcodeAutoFill } from '../hooks/useBarcodeAutoFill';
import BarcodeAutoFillBadge from '../components/BarcodeAutoFillBadge';
import {
    Search, Plus, Trash2, ShoppingCart, User,
    Calculator, Save, Loader2, FileText, AlertCircle, Camera, ChevronDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const NewPurchase = () => {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    // 🛡️ ROLE GUARD: Level 1 Security
    const isAuthorized = ['owner', 'admin', 'manager'].includes(user?.role);
    const { lookupState, lookupBarcode, resetLookup } = useBarcodeAutoFill();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentInfo, setPaymentInfo] = useState({ paidAmount: 0, paymentType: 'Cash' });
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    useEffect(() => {
        if (!isAuthorized) {
            Swal.fire({
                title: 'Access Denied',
                text: 'Unauthorized module access.',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
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
                Swal.fire({
                    title: 'Sync Error',
                    text: 'Failed to load master records.',
                    icon: 'error',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
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
        if (!selectedSupplier) return Swal.fire({ title: 'Field Required', text: 'Supplier must be selected.', icon: 'warning', customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' } });
        if (cart.length === 0) return Swal.fire({ title: 'List Empty', text: 'Add items to inward.', icon: 'warning', customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' } });

        // Confirm Action (Crucial for SaaS data integrity)
        const result = await Swal.fire({
            title: 'Finalize GRN?',
            text: `Updating inventory for ${cart.length} items. Total: Rs.${totalAmount.toLocaleString()}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Confirm Stock Inward',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
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
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2.5rem]' }
                });
                navigate('/grn-history');
            }
        } catch (error) {
            Swal.fire({
                title: 'Operation Failed',
                text: error.response?.data?.error || 'Inventory update aborted.',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 transition-colors">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Securing Tenant Connection...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto font-sans animate-in fade-in duration-500 transition-colors">
            {/* Left: Entry Area */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 md:p-10 rounded-[3rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800/60 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter flex items-center gap-3 transition-colors">
                                <ShoppingCart className="text-blue-600 dark:text-blue-500" size={32} /> INWARD STOCK
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 ml-1 transition-colors">Goods Received Note (GRN)</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-500/50 transition-all">
                            <FileText size={18} className="text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="SUPPLIER INV #"
                                className="bg-transparent border-none outline-none font-black text-xs text-slate-700 dark:text-slate-200 dark:placeholder-slate-500 w-32 transition-colors"
                                value={supplierInvoiceNumber}
                                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Master Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="relative w-full">
                            {/* Trigger Button */}
                            <button
                                type="button"
                                onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                                className="w-full p-4 md:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] flex items-center justify-between border border-slate-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 group shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <User size={18} className="text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <span className="font-black text-xs md:text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                        {/* තෝරපු කෙනෙක් ඉන්නවද කියලා බලලා එයාගේ නම පෙන්වනවා */}
                                        {selectedSupplier
                                            ? suppliers.find(s => s._id === selectedSupplier)?.name
                                            : 'SELECT SUPPLIER'}
                                    </span>
                                </div>

                                {/* Animated Arrow */}
                                <div className="p-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isSupplierDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                                </div>
                            </button>

                            {/* The Animated Dropdown Menu */}
                            <div className={`absolute z-50 w-full mt-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none overflow-hidden transition-all duration-300 origin-top ${isSupplierDropdownOpen ? 'opacity-100 scale-y-100 translate-y-0 visible' : 'opacity-0 scale-y-95 -translate-y-4 invisible'
                                }`}>
                                <div className="max-h-[280px] overflow-y-auto p-2 scrollbar-hide">

                                    {/* Default / Clear Option */}
                                    <div
                                        onClick={() => { setSelectedSupplier(""); setIsSupplierDropdownOpen(false); }}
                                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-[1.2rem] cursor-pointer transition-colors flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-widest">Clear Selection</span>
                                    </div>

                                    {/* Supplier List Mapping */}
                                    {suppliers.map(s => (
                                        <div
                                            key={s._id}
                                            onClick={() => { setSelectedSupplier(s._id); setIsSupplierDropdownOpen(false); }}
                                            className={`p-3 md:p-4 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-[1.2rem] cursor-pointer transition-all duration-200 flex items-center justify-between group mb-1 ${selectedSupplier === s._id ? 'bg-blue-50 dark:bg-blue-500/20 border border-blue-100 dark:border-blue-500/30' : 'border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Avatar Badge with first letter */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-sm transition-transform duration-300 group-hover:scale-110 ${selectedSupplier === s._id
                                                        ? 'bg-blue-600 text-white shadow-blue-500/30'
                                                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className={`font-black text-xs md:text-sm uppercase tracking-wide ${selectedSupplier === s._id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                                                        }`}>
                                                        {s.name}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Supplier</span>
                                                </div>
                                            </div>

                                            {/* Glowing dot for selected item */}
                                            {selectedSupplier === s._id && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] mr-2 animate-pulse"></div>
                                            )}
                                        </div>
                                    ))}

                                    {/* If no suppliers found */}
                                    {suppliers.length === 0 && (
                                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium text-xs uppercase tracking-widest">
                                            No Suppliers Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Search / Scan Bar in GRN */}
                        <div className="relative group flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none text-slate-800 placeholder-slate-400 transition-all"
                                    placeholder="Scan Barcode or Search Product..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        lookupBarcode(e.target.value);
                                    }}
                                />
                                <div className="absolute top-full left-0 right-0 z-50 mt-2">
                                    <BarcodeAutoFillBadge
                                        lookupState={lookupState}
                                        onApply={(productData) => {
                                            // මේ බඩුව කලින් Cart එකේ තියෙනවද කියලා බලනවා
                                            if (cart.find(item => item.name === productData.name)) {
                                                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Already in list', showConfirmButton: false, timer: 1000 });
                                                return;
                                            }

                                            // සිස්ටම් එකේ නැති අලුත් බඩුවක් නම්, කෙලින්ම නමයි Barcode එකයි එක්ක Cart එකට දානවා
                                            setCart([...cart, {
                                                productId: `NEW_${productData.barcode || Date.now()}`, // අලුත් අයිටම් එකක් කියලා අඳුරගන්න Temp ID එකක් දෙනවා
                                                name: productData.name,
                                                quantity: 1,
                                                unitCost: 0,
                                                sellingPrice: 0,
                                                expiryDate: '',
                                            }]);

                                            setSearchTerm('');
                                            resetLookup();
                                        }}
                                        onDismiss={resetLookup}
                                    />
                                </div>
                            </div>

                            {/* 📷 කැමරා බටන් එක */}
                            <button
                                type="button"
                                onClick={() => setIsScannerOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-[1.5rem] shadow-lg transition-all hover:shadow-xl active:scale-95 flex items-center justify-center"
                            >
                                <Camera size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchTerm && searchResults.length > 0 && (
                        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50/30 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800/30 animate-in zoom-in-95 duration-200 transition-colors">
                            {searchResults.map(product => (
                                <button key={product._id} onClick={() => addToCart(product)}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-2xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg dark:hover:shadow-blue-900/20 transition-all text-left">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase">{product.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Stock On-hand: {product.stock}</span>
                                    </div>
                                    <Plus size={16} className="text-blue-600 dark:text-blue-400" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Cart Table */}
                    <div className="overflow-x-auto pb-4 scrollbar-hide min-h-[300px]">
                        {/* min-w-[900px] ensures the table never squishes below this width! */}
                        <table className="w-full text-left border-separate border-spacing-y-3 min-w-[900px]">
                            <thead>
                                <tr className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
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
                                        <td colSpan="6" className="py-20 text-center opacity-40 dark:opacity-20 transition-colors">
                                            <ShoppingCart size={48} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">No items pending</p>
                                        </td>
                                    </tr>
                                ) : cart.map((item, index) => (
                                    <tr key={item.productId} className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-sm">
                                        <td className="p-4 md:p-5 rounded-l-[1.5rem] border-y border-l border-slate-100 dark:border-slate-700/50">
                                            <p className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase truncate max-w-[200px]">{item.name}</p>
                                        </td>
                                        <td className="p-3 md:p-5 border-y border-slate-100 dark:border-slate-700/50 text-center">
                                            <input type="number" min="1" className="w-16 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                                        </td>
                                        <td className="p-3 md:p-5 border-y border-slate-100 dark:border-slate-700/50">
                                            <input type="number" className="w-24 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs text-blue-600 dark:text-blue-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                value={item.unitCost} onChange={(e) => updateItem(index, 'unitCost', e.target.value)} />
                                        </td>
                                        <td className="p-3 md:p-5 border-y border-slate-100 dark:border-slate-700/50">
                                            <input type="number" className="w-24 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                                value={item.sellingPrice} onChange={(e) => updateItem(index, 'sellingPrice', e.target.value)} />
                                        </td>
                                        <td className="p-3 md:p-5 border-y border-slate-100 dark:border-slate-700/50">
                                            <input type="date" className="w-[130px] p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                value={item.expiryDate} onChange={(e) => updateItem(index, 'expiryDate', e.target.value)} />
                                        </td>
                                        <td className="p-4 md:p-5 rounded-r-[1.5rem] border-y border-r border-slate-100 dark:border-slate-700/50 text-center">
                                            <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="p-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                                                <Trash2 size={16} />
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
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-700/50 relative overflow-hidden group">

                    {/* Decorative Background Elements */}
                    <div className="absolute -top-20 -right-20 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                        <Calculator size={280} />
                    </div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    <h3 className="text-lg md:text-xl font-black mb-8 md:mb-10 flex items-center gap-3 uppercase tracking-wide">
                        <span className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]">01</span>
                        Settlement
                    </h3>

                    <div className="space-y-5 mb-8 md:mb-10 relative z-10 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="flex justify-between items-center text-slate-400 font-black uppercase text-[10px] tracking-widest">
                            <span>Inventory Cost</span>
                            <span>Rs. {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-5 border-t border-slate-800/80">
                            <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-200">TOTAL PAYABLE</span>
                            <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                                Rs. {totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Payment Mode</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Cash', 'Credit', 'Partial'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setPaymentInfo({ ...paymentInfo, paymentType: type })}
                                        className={`py-3.5 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 border ${paymentInfo.paymentType === type
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-200'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {paymentInfo.paymentType === 'Partial' && (
                            <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                                <label className="text-[10px] font-black uppercase text-emerald-400/80 tracking-widest mb-3 block">Amount Paid Today (Rs.)</label>
                                <input
                                    type="number"
                                    className="w-full py-5 px-8 bg-slate-950/50 border border-slate-700 rounded-[1.5rem] font-black text-3xl text-emerald-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
                                    value={paymentInfo.paidAmount || ''}
                                    placeholder="0.00"
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, paidAmount: Number(e.target.value) || 0 })}
                                />
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-800/80 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liability Balance</span>
                            <span className={`text-base md:text-lg font-black px-4 py-1.5 rounded-full ${totalAmount - paymentInfo.paidAmount > 0
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                Rs. {(totalAmount - paymentInfo.paidAmount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveGRN}
                        disabled={cart.length === 0 || isSubmitting}
                        className="w-full mt-10 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-[2rem] shadow-[0_10px_30px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                        <span className="text-sm tracking-wider uppercase">{isSubmitting ? 'Processing...' : 'Save New GRN'}</span>
                    </button>
                </div>
            </div>
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(scannedText) => {
                    setSearchTerm(scannedText);
                    lookupBarcode(scannedText); // AI එකට යවනවා
                }}
            />
        </div>
    );
};

export default NewPurchase;