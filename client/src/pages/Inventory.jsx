import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import ExcelBulkUpload from '../components/ExcelBulkUpload';
import usePlanStore from '../store/planStore';
import { Package, Plus, Search, Edit, Trash2, Barcode, Download, Loader2, Lock, Upload, QrCode } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ProductFormDrawer from '../components/ProductFormDrawer';
import { useNavigate } from 'react-router-dom';
import BulkUploadModal from '../components/BulkUploadModal';
import { useBarcodeAutoFill } from '../hooks/useBarcodeAutoFill';
import BarcodeAutoFillBadge from '../components/BarcodeAutoFillBadge';
import { printBarcodeLabel } from '../utils/generateBarcode';

const Inventory = () => {
    const user = useAuthStore((state) => state.user);
    const isManager = user?.role === 'admin' || user?.role === 'owner';
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const navigate = useNavigate();
    const { lookupState, lookupBarcode, resetLookup } = useBarcodeAutoFill();
    const { hasFeature } = usePlanStore();

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
            Swal.fire({
                title: 'Error',
                text: 'Failed to fetch inventory',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
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
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await API.delete(`/products/${id}`);
                    if (res.data.success) {
                        Swal.fire({
                            title: 'Archived!',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                        });
                        fetchProducts();
                    }
                } catch (error) {
                    Swal.fire({
                        title: 'Error!',
                        text: 'Something went wrong.',
                        icon: 'error',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                    });
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (!isManager) return;

        Swal.fire({
            title: 'Clear Entire Inventory?',
            text: "This will move ALL your active products to archive and delete their cloud images! This cannot be undone.",
            icon: 'warning', // 💡 වෙනස් කළා: Error එකකට වඩා Warning එකක් දෙන එක UX එකට හොඳයි
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Clear All!',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {

                // ━━━ ⏳ 1. SHOW PROFESSIONAL LOADING ANIMATION ━━━
                Swal.fire({
                    title: 'Archiving Products...',
                    html: '<span class="text-sm text-slate-500 dark:text-slate-400">Please wait. Deleting product images from the cloud.<br><b class="text-blue-500">Do not close this window.</b></span>',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl' },
                    didOpen: () => {
                        Swal.showLoading(); // 💡 SweetAlert එකේ අයිකන් එක Spinner එකක් බවට පත් කරනවා
                    }
                });

                // ━━━ 🌐 2. CALL API ━━━
                try {
                    const res = await API.put('/products/bulk-archive-all');
                    if (res.data.success) {
                        // ━━━ ✅ 3. SHOW SUCCESS MESSAGE (This replaces the loading alert) ━━━
                        Swal.fire({
                            title: 'Cleared!',
                            text: res.data.message,
                            icon: 'success',
                            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl' }
                        });
                        fetchProducts();
                    }
                } catch (error) {
                    // ━━━ ❌ 4. SHOW ERROR MESSAGE (This replaces the loading alert) ━━━
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to clear products. Please check your connection.',
                        icon: 'error',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl' }
                    });
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
                    Swal.fire({
                        title: 'Success!',
                        text: res.data.message,
                        icon: 'success',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                    });
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
                        confirmButtonColor: '#2563eb',
                        cancelButtonColor: '#64748b',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl p-6' }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            navigate('/settings');
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Upload Failed',
                        text: 'Excel upload failed. Please check your sheet format.',
                        icon: 'error',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
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
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 transition-colors">
                <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading inventory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 transition-colors duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">Inventory</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Stock tracking and product management</p>
                </div>

                {isManager && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-95"
                            onClick={handleAddNew}
                        >
                            <Plus size={20} /> Add Product
                        </button>

                        {['owner', 'admin'].includes(user?.role) && (
                            <button
                                onClick={() => setShowBulkUpload(true)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${!hasBulkUpload
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-80'
                                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm dark:shadow-none'
                                    }`}
                            >
                                <Upload size={16} />
                                Smart Bulk Upload
                                {!hasFeature('bulkUpload') && (
                                    <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black">PRO</span>
                                )}
                            </button>
                        )}

                        {/* <button
                            onClick={(e) => {
                                if (!hasBulkUpload) {
                                    e.preventDefault();
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Pro Feature Locked',
                                        text: 'Upgrade to Pro or Enterprise to unlock Excel & ZIP Bulk Import.',
                                        confirmButtonText: 'Upgrade to Pro',
                                        confirmButtonColor: '#2563eb',
                                        showCancelButton: true,
                                        cancelButtonText: 'Close',
                                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                                    }).then((result) => {
                                        if (result.isConfirmed) navigate('/settings');
                                    });
                                    return;
                                }
                                setShowBulkUpload(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${!hasBulkUpload
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-80'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm dark:shadow-none'
                                }`}
                        >
                            <Download size={20} /> Import Excel + Images
                            {!hasBulkUpload && <Lock size={14} className="text-amber-500 ml-1" />}
                        </button> */}

                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95"
                        >
                            <Trash2 size={20} /> Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* 🔍 Search Bar - Premium Glassmorphism */}
            <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none transition-colors">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or barcode..."
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* 📋 Table - Premium Glassmorphism */}
            <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm dark:shadow-none overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50 transition-colors">
                            <tr>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Product Details</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                                {isManager && <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Buying</th>}
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selling</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Stock</th>
                                {isManager && <th className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {filteredProducts.map((product) => (
                                <tr key={product._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm dark:shadow-none group-hover:border-blue-200 dark:group-hover:border-blue-500/50 transition-all">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://placehold.co/150?text=No+Image' }} />
                                                ) : (
                                                    <Package size={22} className="text-slate-300 dark:text-slate-500" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 transition-colors">{product.name}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1 transition-colors">
                                                    <Barcode size={10} /> {product.barcode || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-colors">
                                            {product.category}
                                        </span>
                                    </td>
                                    {isManager && <td className="px-6 py-4 font-bold text-blue-600/70 dark:text-blue-400/70 transition-colors">Rs. {product.buyingPrice?.toLocaleString()}</td>}
                                    <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-100 transition-colors">Rs. {product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-black transition-colors ${product.stock <= product.minStockLevel ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                                {product.stock} {product.unit}
                                            </span>
                                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
                                                <div className={`h-full rounded-full transition-colors ${product.stock <= product.minStockLevel ? 'bg-red-500 dark:bg-red-400' : 'bg-emerald-500 dark:bg-emerald-400'}`} style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => handleEdit(product)} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(product._id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => printBarcodeLabel(product, 'NEXIACORE RETAIL')}
                                                    title="Print Barcode Labels"
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                                >
                                                    <QrCode size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium transition-colors">No products found.</div>
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
            {isManager && (
                <BulkUploadModal
                    isOpen={showBulkUpload}
                    onClose={() => setShowBulkUpload(false)}
                    onSuccess={() => { setShowBulkUpload(false); fetchProducts(); }}
                />
            )}

            <ExcelBulkUpload
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                onSuccess={() => { setShowBulkUpload(false); fetchProducts(); }} // fetchProducts function එක කෝල් කරන්න
            />
        </div>
    );
};

export default Inventory;