import { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Package, Camera } from 'lucide-react';
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

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined && key !== 'image') {
                data.append(key, formData[key]);
            }
        });

        if (imageFile) {
            data.append('image', imageFile);
        } else if (typeof formData.image === 'string') {
            data.append('imageUrl', formData.image);
        }

        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            const res = editData
                ? await API.put(`/products/${editData._id}`, data, config)
                : await API.post('/products', data, config);

            if (res.data.success) {
                Swal.fire({
                    title: 'Success!', 
                    text: 'Product saved successfully', 
                    icon: 'success',
                    customClass: { popup: 'dark:bg-slate-900 dark:text-white rounded-[2rem]' }
                });
                onSuccess(); 
                onClose();   
            }
        } catch (error) {
            console.error("Save Product Error:", error);

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
                    customClass: { popup: 'rounded-[2rem] shadow-2xl p-6 dark:bg-slate-900 dark:text-white' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (typeof onClose === 'function') onClose(); 
                        navigate('/settings'); 
                    }
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to save product. Check the image format or size.',
                    icon: 'error',
                    customClass: { popup: 'rounded-[2rem] dark:bg-slate-900 dark:text-white' }
                });
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] overflow-hidden transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
            {/* Backdrop: Dark mode එකේදී තව ටිකක් dark වෙනවා */}
            <div className={`absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            
            {/* Drawer Container: White -> Slate-900 */}
            <section className={`absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    
                    {/* Header */}
                    <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{editData ? 'Edit Product' : 'New Product'}</h3>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-6">
                        
                        {/* Product Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Product Name</label>
                            <input type="text" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-100 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="Ex: Munchee Cream Cracker 400g" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Category</label>
                                <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-100 appearance-none transition-all"
                                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="General">General</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Snacks">Snacks</option>
                                    <option value="Grocery">Grocery</option>
                                    <option value="Bakery">Bakery</option>
                                </select>
                            </div>

                            {/* Barcode Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1 transition-colors">Barcode</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="barcode"
                                        value={formData.barcode}
                                        onChange={(e) => {
                                            handleInputChange(e);
                                            lookupBarcode(e.target.value); 
                                        }}
                                        placeholder="Scan here..."
                                        className="w-full pl-5 pr-14 py-4 bg-blue-50/50 dark:bg-blue-500/10 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 dark:text-blue-300 transition-all placeholder:text-blue-300 dark:placeholder:text-blue-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsScannerOpen(true)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white p-2.5 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95"
                                        title="Scan with Camera"
                                    >
                                        <Camera size={18} />
                                    </button>
                                </div>
                                
                                <BarcodeAutoFillBadge
                                    lookupState={lookupState}
                                    onApply={(productData) => {
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
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Buying Price (Cost)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm transition-colors">Rs.</span>
                                    <input type="number" required className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-100 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="0.00" value={formData.buyingPrice} onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })} />
                                </div>
                            </div>

                            {/* Selling Price */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1 transition-colors">Selling Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 dark:text-emerald-400/60 font-bold text-sm transition-colors">Rs.</span>
                                    <input type="number" required className="w-full pl-12 pr-5 py-4 bg-emerald-50/30 dark:bg-emerald-500/10 border-none rounded-[1.25rem] focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 dark:text-emerald-300 transition-all placeholder:text-emerald-300 dark:placeholder:text-emerald-700/50"
                                        placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Stock */}
                            <div className="space-y-2 ">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Stock Qty</label>
                                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 transition-colors">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                        💡 The initial stock for new products is recorded as 0. Please use the **Purchase (GRN)** system to enter stock.
                                    </p>
                                </div>
                            </div>

                            {/* Unit */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Unit</label>
                                <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-100 appearance-none transition-all"
                                    value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                                    <option value="pcs">Pieces (pcs)</option>
                                    <option value="kg">Kilograms (kg)</option>
                                    <option value="pkt">Packets (pkt)</option>
                                    <option value="btl">Bottles (btl)</option>
                                </select>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Product Image</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden transition-colors">
                                    {(formData.image || imagePreview) ? (
                                        <img
                                            src={typeof formData.image === 'string' ? formData.image : imagePreview}
                                            className="w-full h-full object-cover"
                                            alt="Product Preview"
                                        />
                                    ) : (
                                        <Package size={24} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <label className="cursor-pointer bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 shadow-sm dark:shadow-none">
                                    Upload Image
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                        </div>
                    </form>

                    {/* Footer Buttons */}
                    <div className="p-8 border-t dark:border-slate-800 flex gap-4 transition-colors">
                        <button onClick={onClose} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold rounded-2xl">Cancel</button>
                        <button onClick={handleSaveProduct} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg dark:shadow-none transition-all active:scale-95">
                            {editData ? 'UPDATE' : 'SAVE'}
                        </button>
                    </div>
                </div>
            </section>

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(scannedText) => {
                    setFormData(prev => ({ ...prev, barcode: scannedText }));
                    lookupBarcode(scannedText);
                }}
            />
        </div>
    );
};

export default ProductFormDrawer;