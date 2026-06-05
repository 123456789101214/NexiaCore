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
        confirmButtonText: 'Yes, clear it!',
        cancelButtonText: 'Cancel',
        // 🚀 PRO FIX: අපි Swal එකට කියනවා "ඔයාගේ පරණ Inline Colors පාවිච්චි කරන්න එපා" කියලා
        buttonsStyling: false, 
        customClass: { 
            // Popup එකේ Background එක
            popup: 'bg-white dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]',
            // 🚀 අපේ Primary Blue Button එක (Bootstrap වල `btn btn-primary` වගේ)
            confirmButton: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-black py-2.5 px-6 rounded-xl mx-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95',
            // Cancel Button එක (Bootstrap වල `btn btn-secondary` වගේ)
            cancelButton: 'bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-xl mx-2 shadow-md transition-all active:scale-95'
        }
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

    const paymentOptions = [
        { id: 'Cash', label: 'Cash', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>' },
        { id: 'Card', label: 'Card', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>' },
        { id: 'Bank Transfer', label: 'Bank Tx', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-500"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>' }
    ];

    if (selectedCustomer) {
        paymentOptions.push({ id: 'Credit', label: 'Credit (Naya)', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>' });
    }

    const cardsHtml = `
        <div class="grid grid-cols-2 gap-3 mt-4">
            ${paymentOptions.map((opt, index) => `
                <label class="relative cursor-pointer group">
                    <!-- Hidden Radio Button -->
                    <input type="radio" name="custom_payment_method" value="${opt.id}" class="peer sr-only" ${index === 0 ? 'checked' : ''}>
                    
                    <!-- The Clickable Card -->
                    <div class="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 transition-all hover:shadow-md active:scale-95 duration-200">
                        ${opt.icon}
                        <span class="block text-[13px] font-black text-slate-700 dark:text-slate-300 peer-checked:text-blue-700 dark:peer-checked:text-blue-400 mt-3 tracking-wide uppercase">${opt.label}</span>
                    </div>

                    <!-- The Success Checkmark (Appears when selected) -->
                    <div class="absolute top-3 right-3 opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 duration-300">
                        <div class="bg-blue-600 rounded-full p-1 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    </div>
                </label>
            `).join('')}
        </div>
    `;

    const { value: paymentMethodRaw } = await Swal.fire({
        title: 'Payment Method',
        html: cardsHtml, // Injecting our custom HTML grid
        focusConfirm: false,
        buttonsStyling: false,
        showCancelButton: true,
        confirmButtonText: 'Continue',
        customClass: { 
            popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-[90%] md:w-[28rem]',
            title: 'text-2xl font-black text-slate-800 dark:text-white',
            actions: 'mt-6 w-full flex justify-center gap-4',
            confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 w-64',
            cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-xl transition-all active:scale-95 w-64'
        },
        // 🚀 PRO FIX: SweetAlert preConfirm extracts the value of our custom hidden radio buttons!
        preConfirm: () => {
            const selected = document.querySelector('input[name="custom_payment_method"]:checked');
            if (!selected) {
                Swal.showValidationMessage('Please select a payment method!');
                return false;
            }
            return selected.value;
        }
    });

    if (!paymentMethodRaw) return;
    const paymentMethod = paymentMethodRaw === 'Credit' ? 'Credit' : paymentMethodRaw;

    if (paymentMethod === 'Credit') {
        const projectedBalance = selectedCustomer.creditBalance + totalAmount;

        if (projectedBalance > selectedCustomer.creditLimit) {
            // 2️⃣ PREMIUM CREDIT LIMIT EXCEEDED MODAL
            return Swal.fire({
                icon: 'error',
                title: 'Credit Limit Exceeded!',
                html: `
                    <div class="text-left mt-4 p-5 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">
                        <p class="text-slate-700 dark:text-slate-300 mb-1"><b>Allowed Limit:</b> Rs. ${selectedCustomer.creditLimit.toLocaleString()}</p>
                        <p class="text-slate-700 dark:text-slate-300 mb-1"><b>Current Debt:</b> Rs. ${selectedCustomer.creditBalance.toLocaleString()}</p>
                        <p class="text-slate-700 dark:text-slate-300 mb-3"><b>This Bill:</b> Rs. ${totalAmount.toLocaleString()}</p>
                        <div class="border-t border-red-200 dark:border-red-500/20 pt-3 mt-3">
                            <p class="text-red-600 dark:text-red-400 font-black text-xl">Shortfall: Rs. ${(projectedBalance - selectedCustomer.creditLimit).toLocaleString()}</p>
                        </div>
                    </div>
                    <p class="text-sm font-bold text-slate-500 dark:text-slate-400 mt-4 uppercase tracking-widest">Please settle previous debts</p>
                `,
                buttonsStyling: false,
                confirmButtonText: 'Cancel Checkout',
                customClass: { 
                    popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl',
                    title: 'text-2xl font-black text-slate-800 dark:text-white',
                    confirmButton: 'mt-4 bg-red-500 hover:bg-red-600 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95'
                }
            });
        }
    }

    let amountPaid = totalAmount;
    let balance = 0;
    let referenceNumber = null;

    if (paymentMethod === 'Cash') {
        const { value: enteredAmount } = await Swal.fire({
            title: 'Complete Payment',
            html: `
                <div class="mb-5 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center">
                    <p class="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total to Pay (Cash)</p>
                    <p class="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Rs. ${totalAmount.toLocaleString()}</p>
                </div>
            `,
            input: 'number',
            inputPlaceholder: 'Enter amount received...',
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: 'Confirm Payment',
            customClass: { 
                popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700',
                title: 'text-2xl font-black text-slate-800 dark:text-white mb-2',
                input: 'text-center text-3xl font-black h-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 transition-all',
                actions: 'mt-6 w-full flex justify-center gap-4',
                confirmButton: 'bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95',
                cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-xl transition-all active:scale-95'
            },
            inputValidator: (value) => {
                if (!value || Number(value) < totalAmount) {
                    return 'Please enter a valid amount equal or greater than the total!';
                }
            }
        });

        if (!enteredAmount) return;
        amountPaid = Number(enteredAmount);
        balance = amountPaid - totalAmount;

    } else if (paymentMethod === 'Credit') {
        amountPaid = 0;
        balance = 0;

    } else if (paymentMethod === 'Bank Transfer') {
        // 🚀 PREMIUM: Bank Transfer Reference Input Modal
        const { value: enteredRef } = await Swal.fire({
            title: 'Verify Transfer',
            html: `
                <div class="mb-5 p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex flex-col items-center justify-center">
                    <p class="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Expected Amount</p>
                    <p class="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Rs. ${totalAmount.toLocaleString()}</p>
                </div>
                <p class="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Please check the bank app and enter the Trace/Reference Number below.</p>
            `,
            input: 'text',
            inputPlaceholder: 'e.g. TR-2026-98765...',
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: 'Verify & Confirm',
            customClass: { 
                popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700',
                title: 'text-2xl font-black text-slate-800 dark:text-white mb-2',
                input: 'text-center text-lg font-bold h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-purple-500 dark:focus:border-purple-500 focus:ring-0 transition-all',
                actions: 'mt-6 w-full flex justify-center gap-4',
                confirmButton: 'bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-purple-600/30 transition-all active:scale-95',
                cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-xl transition-all active:scale-95'
            },
            inputValidator: (value) => {
                if (!value || value.trim().length < 3) {
                    return 'Please enter a valid Reference Number!';
                }
            }
        });

        if (!enteredRef) return;
        referenceNumber = enteredRef.trim(); // 🚀 Save the reference number
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
            referenceNumber: referenceNumber, // 🚀 අලුතින් ගත්ත Ref Number එකත් Backend එකට යවනවා
            customerId: selectedCustomer?._id || null,
            customerName: selectedCustomer?.name || 'Walk-in Customer',
            customerPhone: selectedCustomer?.phone || null,
        };

        const { isOnline, saveOfflineOrder } = useOfflineStore.getState();
        let finalBillData = null;

        if (isOnline) {
            try {
                const res = await API.post('/orders', orderData);
                if (res.data.success) {
                    finalBillData = res.data.data;
                }
            } catch (networkError) {
                if (!networkError.response) {
                    finalBillData = await saveOfflineOrder(orderData);
                } else {
                    throw networkError;
                }
            }
        } else {
            finalBillData = await saveOfflineOrder(orderData);
        }

        if (finalBillData) {
            setBillData(finalBillData);

            const updatedProducts = products.map(p => {
                const cartItem = cart.find(c => (c.productId || c._id) === p._id);
                return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
            });
            setProducts(updatedProducts);

            // 🚀 PREMIUM SUCCESS MODAL (Updated to show Ref Number)
            await Swal.fire({
                icon: 'success',
                title: isOnline ? 'Payment Successful!' : 'Saved Offline!',
                html: `
                    <div class="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p class="text-lg font-bold text-slate-700 dark:text-slate-300">
                            ${paymentMethod === 'Cash'
                                ? `Return Balance: <br><span class="text-emerald-500 font-black text-3xl">Rs. ${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>`
                                : paymentMethod === 'Credit'
                                    ? `Added <span class="text-amber-500">Rs. ${totalAmount}</span> to ${selectedCustomer?.name}'s debt`
                                    : paymentMethod === 'Bank Transfer'
                                        ? `Paid securely via <span class="text-purple-500 font-black">Bank Transfer</span><br><span class="text-sm font-bold text-slate-500 dark:text-slate-400 block mt-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg inline-block">Ref: ${referenceNumber}</span>`
                                        : `Paid securely via <span class="text-blue-500">${paymentMethod}</span>`
                            }
                        </p>
                    </div>
                `,
                footer: !isOnline ? '<span class="text-[10px] font-black text-amber-500 uppercase tracking-widest">⚠️ Syncs automatically when online</span>' : '',
                confirmButtonText: 'Print Receipt',
                buttonsStyling: false,
                customClass: { 
                    popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl',
                    title: 'text-2xl font-black text-slate-800 dark:text-white',
                    confirmButton: 'w-64 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-lg',
                    footer: 'border-t-0 pt-0 pb-4'
                }
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
            buttonsStyling: false,
            confirmButtonText: 'Try Again',
            customClass: { 
                popup: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl',
                title: 'text-2xl font-black text-slate-800 dark:text-white',
                confirmButton: 'bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 text-white font-black py-3 px-8 rounded-xl transition-all active:scale-95'
            }
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

                <div className="px-4 py-3 bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800/60 shrink-0">
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 p-3 rounded-[1rem] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                        <Camera size={18} />
                        Scan Next Item
                    </button>
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
            
            {!isCartOpen && cart.length > 0 && (
                <div className="md:hidden fixed bottom-6 left-4 right-[5.5rem] z-40 animate-in slide-in-from-bottom-5">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full group p-[2px] rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-2xl shadow-blue-600/40 transition-all duration-500 hover:scale-[1.02] active:scale-95 overflow-hidden"
                    >
                        {/* Inner Div */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-[2rem] px-3 py-2 transition-all duration-500 group-hover:bg-transparent dark:group-hover:bg-transparent">
                            
                            <div className="flex items-center">
                                {/* Icon with Ping Animation & Floating Badge */}
                                <div className="relative flex items-center justify-center shrink-0">
                                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-20 animate-ping"></span>
                                    <div className="relative bg-blue-50 dark:bg-blue-500/20 p-2.5 rounded-full group-hover:bg-white/20 transition-colors duration-500 shadow-sm">
                                        <ShoppingCart size={18} className="text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-500" />
                                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 border-2 border-white dark:border-slate-900 group-hover:border-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md transition-colors duration-500">
                                            {cart.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Text (Always Visible on Mobile) */}
                                <div className="flex flex-col items-start ml-3">
                                    <span className="text-slate-800 dark:text-slate-100 group-hover:text-white font-black text-xs uppercase tracking-widest transition-colors duration-500 whitespace-nowrap">
                                        View Cart
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 group-hover:text-blue-100 text-[9px] font-bold tracking-wider transition-colors duration-500 whitespace-nowrap">
                                        Checkout 🚀
                                    </span>
                                </div>
                            </div>

                            {/* Total Amount */}
                            <div className="text-right flex flex-col justify-end ml-2">
                                <span className="text-slate-400 dark:text-slate-500 group-hover:text-blue-200 text-[9px] font-black uppercase tracking-widest mb-0.5 transition-colors duration-500 whitespace-nowrap">
                                    Total
                                </span>
                                <span className="text-blue-600 dark:text-blue-400 group-hover:text-white font-black text-sm leading-none transition-colors duration-500 tracking-tighter whitespace-nowrap">
                                    Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                        </div>
                    </button>
                </div>
            )}

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(scannedBarcode) => {
                    // 1. Search Bar එක clear කරනවා
                    setSearchQuery(''); 
                    
                    // 2. Barcode එකෙන් Product එක හොයනවා
                    const foundProduct = products.find(p => p.barcode === scannedBarcode);
                    
                    if (foundProduct) {
                        // 🚀 PRO FIX: Stock එක තියෙනවද කියලා කලින්ම චෙක් කරනවා
                        if (foundProduct.stock <= 0) {
                            Swal.fire({
                                title: 'Out of Stock!',
                                text: `${foundProduct.name} is currently out of stock.`,
                                icon: 'error', // රතු පාටින් Error එකක් දෙනවා
                                timer: 2000,
                                showConfirmButton: false,
                                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                            });
                        } else {
                            // බඩුව තියෙනවා නම් විතරක් Cart එකට දාලා Success Message එක දෙනවා
                            handleAddToCart(foundProduct);
                            
                            Swal.fire({
                                title: 'Added!',
                                text: `${foundProduct.name} added to cart`,
                                icon: 'success', // කොළ පාටින් Success එකක් දෙනවා
                                timer: 1000,
                                showConfirmButton: false,
                                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                            });
                        }
                    } else {
                        // බඩුව Database එකේ නැත්නම්
                        Swal.fire({
                            title: 'Not Found',
                            text: 'Product with this barcode not found in inventory',
                            icon: 'warning',
                            timer: 2000,
                            showConfirmButton: false,
                            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                        });
                    }
                }}
            />
        </div>
    );
};
export default POS;