import { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Package, Barcode, Camera } from 'lucide-react';
import Swal from 'sweetalert2';
import BarcodeAutoFillBadge from './BarcodeAutoFillBadge';
import { useBarcodeAutoFill } from '../hooks/useBarcodeAutoFill';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const ProductFormDrawer = ({ isOpen, onClose, onSuccess, editData }) => {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '', barcode: '', category: 'General',
        buyingPrice: '', price: '', stock: 0, unit: 'pcs'
    });
    const { lookupState, lookupBarcode, resetLookup } = useBarcodeAutoFill();
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Edit කරනවා නම් පරණ ඩේටා ලෝඩ් කිරීම
    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name || '',
                barcode: editData.barcode || '',
                category: editData.category || 'General',
                buyingPrice: editData.buyingPrice || '',
                price: editData.price || '',
                stock: editData.stock || '',
                unit: editData.unit || 'pcs'
            });
            setImagePreview(editData.image || 'https://placehold.co/150');
        } else {
            resetForm();
        }
    }, [editData, isOpen]);

    const resetForm = () => {
        setFormData({ name: '', barcode: '', category: 'General', buyingPrice: '', price: '', stock: '', unit: 'pcs' });
        setImageFile(null);
        setImagePreview(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProduct = async (e) => {
        if (e) e.preventDefault();

        // 1. FormData එක හදනවා
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            // 'image' එක මෙතනින් යවන්නේ නෑ, ඒක පල්ලෙහායින් වෙනම හසුරුවනවා
            if (formData[key] !== null && formData[key] !== undefined && key !== 'image') {
                data.append(key, formData[key]);
            }
        });

        // 2. 💡 IMAGE LOGIC FIX: Image File එකක්ද, නැත්නම් AI එකෙන් ආපු URL එකක්ද කියලා බලලා යවනවා
        if (imageFile) {
            // PC එකෙන් අලුත් ෆොටෝ එකක් දැම්මොත්
            data.append('image', imageFile);
        } else if (typeof formData.image === 'string') {
            // AI Auto-Fill එකෙන් String URL එකක් ආවොත්, ඒක 'imageUrl' කියලා Text එකක් විදිහට යවනවා
            data.append('imageUrl', formData.image);
        }

        try {
            // 🛡️ CRITICAL FIX: headers කෑල්ල අනිවාර්යයෙන්ම දාන්න ඕනේ!
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            const res = editData
                ? await API.put(`/products/${editData._id}`, data, config)
                : await API.post('/products', data, config);

            if (res.data.success) {
                Swal.fire('Success!', 'Product saved successfully', 'success');
                onSuccess(); // ඉන්වෙන්ටරි ලිස්ට් එක රිෆ්‍රෙෂ් කරන්න
                onClose();   // ඩ්‍රෝවර් එක වහන්න
            }
        } catch (error) {
            console.error("Save Product Error:", error);

            // 👑 ARCHITECT LEVEL ALERT: මැනුවල් ඇඩ් කරද්දී ලිමිට් පැන්නොත් වදින ඇලර්ට් එක
            if (error.response?.status === 403) {
                Swal.fire({
                    title: '👑 Product Limit Reached',
                    text: error.response?.data?.error || 'You have reached the maximum number of products allowed for your current plan.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '⚡ Upgrade Plan Now',
                    cancelButtonText: 'Maybe Later',
                    confirmButtonColor: '#2563eb',
                    cancelButtonColor: '#64748b',
                    customClass: { popup: 'rounded-[2rem] shadow-2xl p-6' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (typeof onClose === 'function') onClose(); // මුලින්ම Drawer එක වහනවා
                        navigate('/settings'); // ඊටපස්සේ අප්ග්‍රේඩ් පේජ් එකට යවනවා
                    }
                });
            } else {
                // වෙනත් සාමාන්‍ය ඉමේජ් සයිස්/නෙට්වර්ක් අවුලක් ආවොත් විතරක් මේක පෙන්වනවා
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to save product. Check the image format or size.',
                    icon: 'error',
                    customClass: { popup: 'rounded-[2rem]' }
                });
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] overflow-hidden transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            <section className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="p-8 border-b flex items-center justify-between">
                        <h3 className="text-2xl font-black">{editData ? 'Edit Product' : 'New Product'}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-6">
                        {/* Product Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                            <input type="text" required className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 transition-all"
                                placeholder="Ex: Munchee Cream Cracker 400g" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Snacks">Snacks</option>
                                    <option value="Grocery">Grocery</option>
                                    <option value="Bakery">Bakery</option>
                                </select>
                            </div>
                            {/* Barcode (REF USED HERE) */}
                            {/* Barcode Input with Camera Button */}
<div className="space-y-2">
    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Barcode</label>
    <div className="relative">
        <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={(e) => {
                handleInputChange(e);
                lookupBarcode(e.target.value); 
            }}
            placeholder="Scan Barcode here..."
            className="w-full pl-5 pr-14 py-4 bg-blue-50/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 transition-all"
        />
        {/* 📷 කැමරා බටන් එක */}
        <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95"
            title="Scan with Camera"
        >
            <Camera size={18} />
        </button>
    </div>

    {/* AI Auto-Fill Badge (කලින් තිබ්බ එකමයි) */}
    <BarcodeAutoFillBadge
                                    lookupState={lookupState}
                                    onApply={(productData) => {
                                        // Badge එකේ Auto-Fill එබුවම Form එක ඉබේම පිරෙනවා
                                        setFormData(prev => ({
                                            ...prev,
                                            barcode: productData.barcode || prev.barcode,
                                            name: productData.name || prev.name,
                                            category: productData.category || prev.category,
                                            image: productData.image || prev.image
                                        }));
                                        resetLookup();
                                    }}
                                    onDismiss={resetLookup}
                                />

</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Buying Price */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buying Price (Cost)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                                    <input type="number" required className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                                        placeholder="0.00" value={formData.buyingPrice} onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })} />
                                </div>
                            </div>
                            {/* Selling Price */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Selling Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold text-sm">Rs.</span>
                                    <input type="number" required className="w-full pl-12 pr-5 py-4 bg-emerald-50/30 border-none rounded-[1.25rem] focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                                        placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Stock */}
                            <div className="space-y-2 ">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Qty</label>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-xs text-amber-700 font-medium">
                                        💡 The initial stock for new products is recorded as 0. Please use the **Purchase (GRN)** system to enter stock.
                                    </p>
                                </div>
                            </div>
                            {/* Unit */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                                    value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                                    <option value="pcs">Pieces (pcs)</option>
                                    <option value="kg">Kilograms (kg)</option>
                                    <option value="pkt">Packets (pkt)</option>
                                    <option value="btl">Bottles (btl)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                                        {/* 💡 අලුත් ලොජික් එක: API URL එකක්ද (String) නැත්නම් Local Preview එකක්ද කියලා බලලා පෙන්වනවා */}
                                        {(formData.image || imagePreview) ? (
                                            <img
                                                src={typeof formData.image === 'string' ? formData.image : imagePreview}
                                                className="w-full h-full object-cover"
                                                alt="Product Preview"
                                            />
                                        ) : (
                                            <Package size={24} className="text-slate-300" />
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all">
                                        Upload Image
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="p-8 border-t flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-slate-50 font-bold rounded-2xl">Cancel</button>
                        <button onClick={handleSaveProduct} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">
                            {editData ? 'UPDATE' : 'SAVE'}
                        </button>
                    </div>
                </div>
            </section>
            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(scannedText) => {
                    // කැමරාවෙන් ස්කෑන් වුණ ගමන් Form එකට Data එක දාලා API එකටත් යවනවා! 🚀
                    setFormData(prev => ({ ...prev, barcode: scannedText }));
                    lookupBarcode(scannedText);
                }}
            />
        </div>
    );
};

export default ProductFormDrawer;