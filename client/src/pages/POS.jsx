// FIXED: Feature - Smart Discount UI, Customer Selection, Strict Naya Potha Validation & Offline PWA
import React, { useState, useEffect, useRef, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import usePosStore from '../store/posStore';
import API from '../services/api';
import Swal from 'sweetalert2';
import { ShoppingCart, X, Search, Package, Trash2, Filter, Loader2, Tag, User, AlertCircle, WifiOff, Camera } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import PrintableReceipt from '../components/PrintableReceipt';
import useOfflineStore from '../store/offlineStore';
import db from '../db/nexiaDB';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const POS = () => {
    // 🛡️ Auth & Role
    const user = useAuthStore((state) => state.user);

    // 🌐 Zustand Offline State
    const isOnline = useOfflineStore((state) => state.isOnline);

    // 🛒 Zustand Cart Actions & State
    const cart = usePosStore((state) => state.cart);
    const addToCartAction = usePosStore((state) => state.addToCart);
    const updateQuantity = usePosStore((state) => state.updateQuantity);
    const removeFromCart = usePosStore((state) => state.removeFromCart);
    const clearCartAction = usePosStore((state) => state.clearCart);
    const getTotal = usePosStore((state) => state.getTotal);

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Customer Selection States
    const [customerSearch, setCustomerSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [billData, setBillData] = useState(null);
    const [paymentInfo, setPaymentInfo] = useState({ paid: 0, balance: 0 });

    const barcodeInputRef = useRef(null);
    const componentRef = useRef();
    const scrollRef = useRef(null);

    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Drag to scroll states
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // Load Products & Customers (With Offline Support)
    // Load Products & Customers (With Instant Offline Detection)
    const fetchData = async () => {
        const { isOnline } = useOfflineStore.getState(); // 💡 1. මුලින්ම Offline ද බලනවා

        // 📴 බ්‍රවුසර් එක Offline නම්, API එකට යන්නේ නැතුව කෙලින්ම Cache එකෙන් ගන්නවා
        if (!isOnline) {
            console.log("Offline mode detected, loading directly from cache...");
            const cachedProducts = await db.products.toArray();
            const cachedCustomers = await db.customers.toArray();

            if (cachedProducts.length > 0) {
                const availableProducts = cachedProducts.filter(p => p.status === 'active');
                setProducts(availableProducts);
                setCustomers(cachedCustomers);
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Offline Cache',
                    text: 'Please connect to internet once to cache data for offline use.',
                    confirmButtonText: 'OK'
                });
            }
            setIsLoading(false);
            barcodeInputRef.current?.focus();
            return; // මෙතනින් ෆන්ක්ෂන් එක නතර කරනවා (API එකට යන්නේ නෑ)
        }

        // 🌐 බ්‍රවුසර් එක Online නම් සාමාන්‍ය විදිහට Server එකෙන් ගන්නවා
        try {
            const [productRes, customerRes] = await Promise.all([
                API.get('/products'),
                API.get('/customers')
            ]);

            if (productRes.data.success) {
                const availableProducts = productRes.data.data.filter(p => p.status === 'active');
                setProducts(availableProducts);
            }
            if (customerRes.data.success) {
                setCustomers(customerRes.data.data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('Error', 'Failed to load system data from server', 'error');
        } finally {
            setIsLoading(false);
            barcodeInputRef.current?.focus();
        }
    };

    useEffect(() => {
        fetchData();
    }, [isOnline]);

    useEffect(() => {
        const handleDiscountApplied = () => {
            fetchData(); // Silent background refresh
        };
        window.addEventListener('discountApplied', handleDiscountApplied);
        return () => window.removeEventListener('discountApplied', handleDiscountApplied);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (event) => {
            if (Swal.isVisible()) return;
            const isInputFocused = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
            if (!isInputFocused) {
                barcodeInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const categories = useMemo(() => {
        return ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.barcode?.includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    // Customer Search Filter
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)
        );
    }, [customers, customerSearch]);

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            const barcode = e.target.value.trim();
            if (!barcode) return;

            const product = products.find(p => p.barcode === barcode);
            if (product) {
                handleAddToCart(product);
                setSearchQuery('');
            } else {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Product not found!', showConfirmButton: false, timer: 1500 });
            }
        }
    };

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Out of stock!', showConfirmButton: false, timer: 1000 });
            return;
        }

        const existingItem = cart.find(item => item.productId === product._id);
        if (existingItem && existingItem.quantity >= product.stock) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock limit reached!', showConfirmButton: false, timer: 1000 });
            return;
        }

        const isDiscounted = product.discount?.isActive;
        const activeSellingPrice = isDiscounted ? product.discount.discountedPrice : product.price;

        addToCartAction({
            ...product,
            price: activeSellingPrice,
            originalPrice: product.price,
            hasDiscount: isDiscounted
        });

        if (window.innerWidth < 768) setIsCartOpen(true);
    };

    const handleUpdateQty = (productId, change) => {
        const item = cart.find(i => i.productId === productId);
        if (!item) return;

        const newQty = item.quantity + change;
        const originalProduct = products.find(p => p._id === productId);

        if (newQty > originalProduct?.stock) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock limit!', showConfirmButton: false, timer: 1000 });
            return;
        }

        if (newQty > 0) {
            updateQuantity(productId, newQty);
        } else {
            removeFromCart(productId);
        }
    };

    const clearCart = () => {
        Swal.fire({
            title: 'Clear Cart?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1e293b',
            confirmButtonText: 'Yes, clear it!',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        }).then((result) => {
            if (result.isConfirmed) {
                clearCartAction();
                setSelectedCustomer(null);
                barcodeInputRef.current?.focus();
            }
        });
    };

    const totalAmount = getTotal();

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: () => {
            clearCartAction();
            setBillData(null);
            setSelectedCustomer(null);
            setIsCartOpen(false);
            barcodeInputRef.current?.focus();
            fetchData();
        }
    });

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const paymentOptions = {
            'Cash': 'Cash',
            'Card': 'Card',
            'Bank Transfer': 'Bank Transfer'
        };

        if (selectedCustomer) {
            paymentOptions['Credit'] = 'Credit (Naya Potha)';
        }

        const { value: paymentMethodRaw } = await Swal.fire({
            title: 'Select Payment Method',
            input: 'radio',
            inputOptions: paymentOptions,
            inputValidator: (value) => {
                if (!value) return 'You need to choose a payment method!'
            },
            confirmButtonColor: '#2563eb',
            showCancelButton: true,
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });

        if (!paymentMethodRaw) return;
        const paymentMethod = paymentMethodRaw === 'Credit' ? 'Credit' : paymentMethodRaw;

        if (paymentMethod === 'Credit') {
            const projectedBalance = selectedCustomer.creditBalance + totalAmount;

            if (projectedBalance > selectedCustomer.creditLimit) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Credit Limit Exceeded!',
                    html: `
                        <div class="text-left mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                            <p class="text-slate-700 dark:text-slate-300 mb-1"><b>Allowed Limit:</b> Rs. ${selectedCustomer.creditLimit.toLocaleString()}</p>
                            <p class="text-slate-700 dark:text-slate-300 mb-1"><b>Current Debt:</b> Rs. ${selectedCustomer.creditBalance.toLocaleString()}</p>
                            <p class="text-slate-700 dark:text-slate-300 mb-3"><b>This Bill:</b> Rs. ${totalAmount.toLocaleString()}</p>
                            <div class="border-t border-red-200 dark:border-red-500/20 pt-2">
                                <p class="text-red-600 dark:text-red-400 font-black text-lg">Shortfall: Rs. ${(projectedBalance - selectedCustomer.creditLimit).toLocaleString()}</p>
                            </div>
                        </div>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-3">Please ask the customer to settle their previous debts or use Cash/Card.</p>
                    `,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cancel Checkout',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
        }

        let amountPaid = totalAmount;
        let balance = 0;

        if (paymentMethod === 'Cash') {
            const { value: enteredAmount } = await Swal.fire({
                title: 'Complete Payment (Cash)',
                input: 'number',
                inputLabel: `Total Amount: Rs. ${totalAmount.toLocaleString()}`,
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]', input: 'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700' },
                inputValidator: (value) => {
                    if (!value || value < totalAmount) {
                        return 'Please enter a valid amount!';
                    }
                }
            });

            if (!enteredAmount) return;
            amountPaid = Number(enteredAmount);
            balance = amountPaid - totalAmount;
        } else if (paymentMethod === 'Credit') {
            amountPaid = 0;
            balance = 0;
        }

        setPaymentInfo({ paid: amountPaid, balance: balance });

        try {
            Swal.showLoading();

            const orderData = {
                items: cart.map(item => ({
                    productId: item.productId || item._id,
                    quantity: item.quantity,
                    price: item.price
                })),
                paymentMethod: paymentMethod,
                customerId: selectedCustomer?._id || null,
                customerName: selectedCustomer?.name || 'Walk-in Customer',
                customerPhone: selectedCustomer?.phone || null,
            };

            const { isOnline, saveOfflineOrder } = useOfflineStore.getState();
            let finalBillData = null;

            if (isOnline) {
                try {
                    // 🌐 ONLINE: Try sending to server
                    const res = await API.post('/orders', orderData);
                    if (res.data.success) {
                        finalBillData = res.data.data;
                    }
                } catch (networkError) {
                    if (!networkError.response) {
                        // 🌐 Network error during online mode — fallback to offline
                        console.log("Network failed, saving offline...");
                        finalBillData = await saveOfflineOrder(orderData);
                    } else {
                        // Server returned an error (e.g., 400 Bad Request)
                        throw networkError;
                    }
                }
            } else {
                // 📴 EXPLICITLY OFFLINE: Save directly to IndexedDB
                finalBillData = await saveOfflineOrder(orderData);
            }

            // If we successfully got data (either from API or Offline Store)
            if (finalBillData) {
                setBillData(finalBillData);

                const updatedProducts = products.map(p => {
                    const cartItem = cart.find(c => (c.productId || c._id) === p._id);
                    return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
                });
                setProducts(updatedProducts);

                await Swal.fire({
                    icon: 'success',
                    title: isOnline ? 'Payment Successful!' : 'Saved Offline!',
                    text: paymentMethod === 'Cash'
                        ? `Balance to return: Rs. ${balance.toFixed(2)}`
                        : paymentMethod === 'Credit'
                            ? `Added Rs. ${totalAmount} to ${selectedCustomer?.name}'s debt`
                            : `Paid via ${paymentMethod}`,
                    footer: !isOnline ? 'This sale will automatically sync when you reconnect to the internet.' : '',
                    confirmButtonText: 'Print Receipt',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });

                setTimeout(() => {
                    handlePrint();
                }, 100);
            }

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.error || 'Order processing failed',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 bg-slate-100 dark:bg-slate-950 transition-colors">
                <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Initializing Terminal...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
            {/* 🖥️ Main Section */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header & Search */}
                <div className="p-4 md:p-6 bg-white dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 shrink-0 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2 transition-colors">
                                <Package className="text-blue-600 dark:text-blue-500" /> NexMart POS
                            </h1>
                        </div>
                        <div className="relative w-full lg:w-1/2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Scan Barcode or Type Product Name..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                ref={barcodeInputRef}
                                onKeyDown={handleBarcodeScan}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-[1.5rem] shadow-lg transition-all hover:shadow-xl active:scale-95 flex items-center justify-center"
                        >
                            <Camera size={24} />
                        </button>
                    </div>

                    {/* 💡 Offline Indicator Banner */}
                    {!isOnline && (
                        <div className="mt-4 bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20 px-4 py-3 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <WifiOff size={16} className="animate-pulse shrink-0" />
                            OFFLINE MODE — Sales are saved locally and will sync automatically when connected.
                        </div>
                    )}
                </div>

                {/* Category Filter Bar */}
                <div className="px-6 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 shadow-sm dark:shadow-none select-none shrink-0 transition-colors">
                    <div
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className={`flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 active:cursor-grabbing cursor-grab transition-all`}
                    >
                        <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-xl text-slate-500 dark:text-slate-400 mr-1 shrink-0 transition-colors">
                            <Filter size={16} />
                        </div>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={(e) => {
                                    if (!isDragging) {
                                        setSelectedCategory(cat);
                                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                    }
                                }}
                                className={`px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${selectedCategory === cat
                                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg shadow-slate-200 dark:shadow-none scale-105'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => {
                            const isDiscountActive = product.discount?.isActive;

                            return (
                                <div
                                    key={product._id}
                                    onClick={() => handleAddToCart(product)}
                                    className={`bg-white dark:bg-slate-900/60 p-3 rounded-[2rem] shadow-sm dark:shadow-none backdrop-blur-md hover:shadow-xl dark:hover:shadow-blue-900/20 transition-all cursor-pointer border-2 group flex flex-col relative overflow-hidden ${product.stock <= 0 ? 'opacity-50 grayscale border-red-200 dark:border-red-900 pointer-events-none' : isDiscountActive ? 'border-red-100 dark:border-red-500/30 hover:border-red-400 dark:hover:border-red-500' : 'border-transparent dark:border-slate-800/60 hover:border-blue-500 dark:hover:border-blue-500'}`}
                                >
                                    {isDiscountActive && product.stock > 0 && (
                                        <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-10 shadow-lg flex items-center gap-1">
                                            <Tag size={10} /> {product.discount.percentage}% OFF
                                        </div>
                                    )}

                                    {product.stock <= product.minStockLevel && product.stock > 0 && !isDiscountActive && (
                                        <span className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full z-10">LOW STOCK</span>
                                    )}
                                    {product.stock <= 0 && (
                                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full z-10">OUT OF STOCK</span>
                                    )}

                                    <div className="aspect-square bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] mb-3 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors overflow-hidden">
                                        {product.image && !product.image.includes('placeholder') ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://placehold.co/150?text=No+Image' }} />
                                        ) : (
                                            <Package size={32} className="group-hover:text-blue-500 transition-colors" />
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2 px-1 mb-1 transition-colors">{product.name}</h3>

                                    <div className="mt-auto pt-2 flex flex-col justify-end px-1">
                                        {isDiscountActive ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 line-through decoration-slate-400">Rs. {product.price.toLocaleString()}</span>
                                                <span className="text-red-600 dark:text-red-400 font-black text-sm">Rs. {product.discount.discountedPrice.toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <span className="text-blue-600 dark:text-blue-400 font-black text-sm transition-colors">Rs. {product.price.toLocaleString()}</span>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-400 mt-1">Qty: {product.stock} {product.unit || 'pcs'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-20 transition-colors">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">No products found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 🛒 Cart Section */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-white dark:bg-[#0f172a] shadow-2xl dark:shadow-none transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col border-l border-slate-200 dark:border-slate-800/60 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Cart Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-white dark:bg-[#0f172a] shrink-0 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 dark:bg-blue-500/10 p-2 rounded-xl transition-colors">
                            <ShoppingCart className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none transition-colors">Your Cart</h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{cart.length} items added</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 text-slate-400 dark:text-slate-500"><X size={24} /></button>
                    </div>
                </div>

                {/* 🧑‍🤝‍🧑 Customer Selector UI */}
                <div className="p-4 bg-slate-50 dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800/60 shrink-0 relative transition-colors">
                    {!selectedCustomer ? (
                        <div className="relative">
                            <div className="flex items-center bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all shadow-sm dark:shadow-none">
                                <User size={18} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search by Name or Phone (eg: 071...)"
                                    className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setIsCustomerDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCustomerDropdownOpen(true)}
                                />
                                {customerSearch && (
                                    <button onClick={() => { setCustomerSearch(''); setIsCustomerDropdownOpen(false); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-2">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {isCustomerDropdownOpen && customerSearch && (
                                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(c => (
                                            <div
                                                key={c._id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setIsCustomerDropdownOpen(false);
                                                    setCustomerSearch('');
                                                }}
                                                className="p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors"
                                            >
                                                <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex justify-between items-center">
                                                    <span>{c.name}</span>
                                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">{c.phone}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{c.nic ? `NIC: ${c.nic}` : 'No NIC'}</div>
                                                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                                                        Limit: {c.creditLimit}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-xs text-slate-400 dark:text-slate-500 text-center flex flex-col items-center">
                                            <AlertCircle size={20} className="mb-1 opacity-50" />
                                            No customers found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-blue-600 dark:bg-blue-500/20 p-3 rounded-xl shadow-md shadow-blue-600/20 dark:shadow-none dark:border dark:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-blue-500/20 flex items-center justify-center text-white dark:text-blue-400 font-black text-sm shrink-0 border border-white/30 dark:border-blue-500/30">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-white dark:text-slate-200 leading-tight">{selectedCustomer.name} <span className="text-[10px] font-normal opacity-80">({selectedCustomer.phone})</span></span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-blue-100 dark:text-blue-400 bg-black/20 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">Limit: Rs.{(selectedCustomer.creditLimit / 1000).toFixed(1)}k</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${selectedCustomer.creditBalance > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400 text-white'}`}>
                                            Debt: Rs.{selectedCustomer.creditBalance}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-blue-200 hover:text-white dark:text-blue-400 dark:hover:text-blue-300 bg-black/10 hover:bg-black/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/30 p-1.5 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900/30 transition-colors">
                    {cart.map((item) => {
                        const productInfo = products.find(p => p._id === (item.productId || item._id));
                        const hasValidDiscount = productInfo?.discount?.isActive;
                        const basePrice = productInfo ? productInfo.price : item.price;

                        return (
                            <div key={item.productId || item._id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-none transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-tight pr-4">
                                        {item.name}
                                        {hasValidDiscount && <span className="ml-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Sale</span>}
                                    </h4>
                                    <button onClick={() => removeFromCart(item.productId || item._id)} className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"><X size={14} /></button>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm dark:shadow-none transition-colors">
                                        <button onClick={() => handleUpdateQty(item.productId || item._id, -1)} className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-</button>
                                        <span className="font-black text-xs text-slate-800 dark:text-slate-200 min-w-[12px] text-center">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQty(item.productId || item._id, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-900 dark:bg-blue-600 text-white rounded-xl shadow-sm font-bold hover:bg-black dark:hover:bg-blue-700 transition-colors">+</button>
                                    </div>
                                    <div className="text-right flex flex-col justify-end">
                                        {hasValidDiscount ? (
                                            <>
                                                <span className="text-[10px] font-bold text-slate-400 line-through decoration-slate-400">
                                                    Rs. {(basePrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="font-black text-red-600 dark:text-red-400 text-sm">
                                                    Rs. {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-black text-slate-900 dark:text-slate-100 text-sm transition-colors">
                                                Rs. {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 py-10 transition-colors">
                            <ShoppingCart size={40} className="mb-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                        </div>
                    )}
                </div>

                {/* Checkout Footer */}
                <div className="p-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800/60 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] dark:shadow-none shrink-0 transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-xs tracking-widest">Subtotal</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter transition-colors">Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black text-sm tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        PAY & PRINT RECEIPT
                    </button>
                </div>
            </div>

            {/* Hidden Receipt */}
            <div style={{ display: 'none' }}>
                {billData && (
                    <PrintableReceipt
                        ref={componentRef}
                        cart={cart}
                        total={totalAmount}
                        billNumber={billData.billNumber}
                        user={user}
                        paidAmount={paymentInfo.paid}
                        changeAmount={paymentInfo.balance}
                        paymentMethod={billData.paymentMethod}
                        products={products}
                        customerName={billData.customerName}
                        customerPhone={selectedCustomer?.phone}
                        customerNic={selectedCustomer?.nic}
                    />
                )}
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
export default POS;