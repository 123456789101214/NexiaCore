import { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Package, Barcode } from 'lucide-react';
import Swal from 'sweetalert2';

const ProductFormDrawer = ({ isOpen, onClose, onSuccess, editData }) => {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '', barcode: '', category: 'General',
        buyingPrice: '', price: '', stock: 0, unit: 'pcs'
    });

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
            // null හෝ undefined අගයන් යන්නේ නැති වෙන්න පොඩි check එකක් දාන එක හොඳයි
            if (formData[key] !== null && formData[key] !== undefined) {
                data.append(key, formData[key]);
            }
        });

        // 2. Image File එක තියෙනවා නම් ඒකත් දානවා
        if (imageFile) {
            data.append('image', imageFile);
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
            Swal.fire('Error', 'Failed to save product. Check the image format or size.', 'error');
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
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Barcode</label>
                                <input
                                    type="text"
                                    name="barcode" // මේ නම formData එකේ තියෙන නමට සමාන විය යුතුයි
                                    value={formData.barcode}
                                    onChange={handleInputChange} // දැන් මේක අඳුරගන්න පුළුවන් 🚀
                                    placeholder="Scan Barcode here..."
                                    className="w-full px-5 py-4 bg-blue-50/50 border-none rounded-[1.25rem] focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 transition-all"
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
                                        {/* imagePreview එකේ URL එකක් හරි, local blob එකක් හරි තියෙනවා නම් ඒක පෙන්වනවා */}
                                        {imagePreview ? (
                                            <img src={imagePreview} className="w-full h-full object-cover" />
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
        </div>
    );
};

export default ProductFormDrawer;