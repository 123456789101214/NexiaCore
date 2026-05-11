import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import useAuthStore from '../store/authStore'; // 💡 PRO FIX: Role-Based Security
import { Package, Plus, Search, Edit, Trash2, Barcode, Download, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ProductFormDrawer from '../components/ProductFormDrawer';

const Inventory = () => {
    // 💡 PRO FIX: Security - Role එක ගන්නවා
    const user = useAuthStore((state) => state.user);
    const isManager = user?.role === 'admin' || user?.role === 'owner';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false); // Excel Upload Loading
    const [searchTerm, setSearchTerm] = useState('');
    
    // Drawer States
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

    // 🛡️ Security Guarded Actions
    const handleDelete = async (id) => {
        if (!isManager) return; // Security Check

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
        
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true); // 💡 Start loading spinner

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
                Swal.fire('Error', 'Excel upload failed. Check your format.', 'error');
            } finally {
                setIsUploading(false); // 💡 Stop loading spinner
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // 💡 PRO FIX: Performance - useMemo prevents O(N) recalculations on every render
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory</h2>
                    <p className="text-slate-500 text-sm">Stock tracking and product management</p>
                </div>

                {/* 🛡️ PRO FIX: Only Managers/Owners can see these actions */}
                {isManager && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
                            onClick={handleAddNew}
                        >
                            <Plus size={20} /> Add Product
                        </button>
                        
                        <label className={`flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-2xl font-bold text-sm cursor-pointer hover:bg-emerald-100 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} 
                            {isUploading ? 'Importing...' : 'Import Excel'}
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={isUploading} />
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

            {/* Search */}
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

            {/* Product Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Product Details</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
                                
                                {/* 🛡️ PRO FIX: Hide Buying Price from Cashiers */}
                                {isManager && <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Buying</th>}
                                
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Selling</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Stock</th>
                                
                                {/* 🛡️ PRO FIX: Hide Actions from Cashiers */}
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
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.src = 'https://placehold.co/150?text=No+Image' }}
                                                    />
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
                                    
                                    {/* 🛡️ PRO FIX: Hide Buying Price from Cashiers */}
                                    {isManager && <td className="px-6 py-4 font-bold text-blue-600/70">Rs. {product.buyingPrice?.toLocaleString()}</td>}
                                    
                                    <td className="px-6 py-4 font-black text-slate-800">Rs. {product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-black ${product.stock <= product.minStockLevel ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {product.stock} {product.unit}
                                            </span>
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${product.stock <= product.minStockLevel ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    
                                    {/* 🛡️ PRO FIX: Hide Actions from Cashiers */}
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
                         <div className="p-8 text-center text-slate-400 font-medium">
                             No products found.
                         </div>
                    )}
                </div>
            </div>

            {/* --- SLIDE-OVER DRAWER --- */}
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