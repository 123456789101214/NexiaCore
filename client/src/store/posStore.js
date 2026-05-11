import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 💡 PRO FIX: Import persist middleware

const usePosStore = create(
    persist(
        (set, get) => ({
            cart: [],

            // 🛒 Add item to cart (or increase qty if exists)
            addToCart: (product) => set((state) => {
                const existingItem = state.cart.find(
                    item => (item.productId || item._id) === (product.productId || product._id)
                );
                
                if (existingItem) {
                    return {
                        cart: state.cart.map(item =>
                            (item.productId || item._id) === (product.productId || product._id)
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        )
                    };
                } else {
                    return { 
                        cart: [...state.cart, { ...product, quantity: 1, productId: product._id || product.productId }] 
                    };
                }
            }),

            // 🔄 Update specific item quantity
            updateQuantity: (id, quantity) => set((state) => ({
                cart: state.cart.map(item =>
                    (item.productId || item._id) === id ? { ...item, quantity } : item
                )
            })),

            // 🗑️ Remove specific item from cart
            removeFromCart: (id) => set((state) => ({
                cart: state.cart.filter(item => (item.productId || item._id) !== id)
            })),

            // 🧹 Clear entire cart (Only called after checkout or manual clear)
            clearCart: () => set({ cart: [] }),

            // 💰 Calculate total amount dynamically
            getTotal: () => {
                return get().cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            }
        }),
        {
            // 🛡️ THE MAGIC: This saves the cart state to the browser's LocalStorage
            name: 'nexmart-pos-cart', 
        }
    )
);

export default usePosStore;