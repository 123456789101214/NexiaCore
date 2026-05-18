import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import usePlanStore from '../store/planStore'; // 🔥 Store එක ගත්තා
import { Package, Plus, Search, Edit, Trash2, Barcode, Download, Loader2, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ProductFormDrawer from '../components/ProductFormDrawer';
import { useNavigate } from 'react-router-dom';

const Inventory = () => {
    const user = useAuthStore((state) => state.user);
    const isManager = user?.role === 'admin' || user?.role === 'owner';

    const navigate = useNavigate();
    
    // 💡 STRICT REACTIVITY: මේකෙන් කෙලින්ම feature එකේ true/false අගය ගන්නවා. 
    // Data ආපු ගමන් UI එක ඉබේම Update වෙනවා!
    const hasBulkUpload = usePlanStore((state) => state.features?.bulkUpload);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchProducts = async () => {
        try {
            const res = await API.get('/products');
            if (res.data.success) {
                setProducts(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            Swal.fire('Error', 'Failed to fetch inventory', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleAddNew = () => {
        setEditingProduct(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (id) => {
        if (!isManager) return;

        Swal.fire({
            title: 'Are you sure?',
            text: "This product will be moved to archive!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, archive it!',
            customClass: { popup: 'rounded-[2rem] shadow-2xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await API.delete(`/products/${id}`);
                    if (res.data.success) {
                        Swal.fire({ title: 'Archived!', icon: 'success', timer: 1500, showConfirmButton: false });
                        fetchProducts();
                    }
                } catch (error) {
                    Swal.fire('Error!', 'Something went wrong.', 'error');
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (!isManager) return;

        Swal.fire({
            title: 'Clear Entire Inventory?',
            text: "This will move ALL your active products to archive! This cannot be undone easily.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Clear All!',
            customClass: { popup: 'rounded-[2rem]' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await API.put('/products/bulk-archive-all');
                    if (res.data.success) {
                        Swal.fire('Cleared!', res.data.message, 'success');
                        fetchProducts();
                    }
                } catch (error) {
                    Swal.fire('Error!', 'Failed to clear products.', 'error');
                }
            }
        });
    };

const handleExcelUpload = (e) => {
    if (!isManager) return;
    if (!hasBulkUpload) return; // 🛡️ Extra Security Check

    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            const res = await API.post('/products/bulk-upload', { products: jsonData });
            if (res.data.success) {
                Swal.fire('Success!', res.data.message, 'success');
                fetchProducts(); 
            }
        } catch (error) {
            console.error("Excel upload error:", error);
            
            // 👑 ARCHITECT LEVEL ALERT: බල්ක් අප්ලෝඩ් එකේදී ලිමිට් පැන්නොත් වදින ඇලර්ට් එක
            if (error.response?.status === 403) {
                Swal.fire({
                    title: '👑 Plan Limit Exceeded',
                    text: error.response?.data?.error || 'Your excel import contains items that exceed your remaining product limit.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '🚀 Upgrade to Pro',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#2563eb', // ලස්සන බ්ලූ කලර් බටන් එක
                    cancelButtonColor: '#64748b',
                    customClass: { popup: 'rounded-[2rem] shadow-2xl p-6' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigate('/settings'); // කෙලින්ම අප්ග්‍රේඩ් පේජ් එකට යවනවා
                    }
                });
            } else {
                // වෙනත් සාමාන්‍ය එක්සෙල් ෆෝමැට් අවුලක් ආවොත් විතරක් මේක පෙන්වනවා
                Swal.fire({
                    title: 'Upload Failed',
                    text: 'Excel upload failed. Please check your sheet format.',
                    icon: 'error',
                    customClass: { popup: 'rounded-[2rem]' }
                });
            }
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

    const filteredProducts = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return products.filter(p => {
            const name = p?.name ? String(p.name).toLowerCase() : "";
            const barcode = p?.barcode ? String(p.barcode).toLowerCase() : "";
            return name.includes(search) || barcode.includes(search);
        });
    }, [products, searchTerm]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading inventory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory</h2>
                    <p className="text-slate-500 text-sm">Stock tracking and product management</p>
                </div>

                {isManager && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
                            onClick={handleAddNew}
                        >
                            <Plus size={20} /> Add Product
                        </button>
                        
                        {/* 🛑 PRO FIX: Reactivity Fixed Bulk Upload Label */}
                        <label 
                            onClick={(e) => {
                                if (!hasBulkUpload) {
                                    e.preventDefault(); 
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Pro Feature Locked',
                                        text: 'Upgrade to Pro or Enterprise to unlock Excel Bulk Import.',
                                        confirmButtonText: 'Upgrade to Pro',
                                        confirmButtonColor: '#0f172a',
                                        showCancelButton: true,
                                        cancelButtonText: 'Close',
                                        customClass: { popup: 'rounded-[2rem]' }
                                    }).then((result) => {
                                        if (result.isConfirmed) navigate('/settings'); 
                                    });
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                                !hasBulkUpload 
                                    ? 'bg-slate-100 text-slate-400 opacity-80' 
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm'
                            }`}
                        >
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} 
                            {isUploading ? 'Importing...' : 'Import Excel'}
                            
                            {!hasBulkUpload && <Lock size={14} className="text-amber-500 ml-1" />}
                            
                            {hasBulkUpload && (
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={isUploading} />
                            )}
                        </label>

                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 bg-red-50 text-red-500 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all active:scale-95"
                        >
                            <Trash2 size={20} /> Clear All
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or barcode..."
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Product Details</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
                                {isManager && <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Buying</th>}
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Selling</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Stock</th>
                                {isManager && <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map((product) => (
                                <tr key={product._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-200 transition-all">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://placehold.co/150?text=No+Image' }} />
                                                ) : (
                                                    <Package size={22} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{product.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                    <Barcode size={10} /> {product.barcode || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                            {product.category}
                                        </span>
                                    </td>
                                    {isManager && <td className="px-6 py-4 font-bold text-blue-600/70">Rs. {product.buyingPrice?.toLocaleString()}</td>}
                                    <td className="px-6 py-4 font-black text-slate-800">Rs. {product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-black ${product.stock <= product.minStockLevel ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {product.stock} {product.unit}
                                            </span>
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${product.stock <= product.minStockLevel ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => handleEdit(product)} className="p-2.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(product._id)} className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                         <div className="p-8 text-center text-slate-400 font-medium">No products found.</div>
                    )}
                </div>
            </div>

            {isManager && (
                <ProductFormDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    onSuccess={fetchProducts}
                    editData={editingProduct}
                />
            )}
        </div>
    );
};

export default Inventory;