import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            // Login වෙද්දී මේක call කරන්නේ
            login: (userData, token) => set({ 
                user: userData, 
                token: token, 
                isAuthenticated: true 
            }),

            // Logout වෙද්දී මේක call කරන්නේ (API එකෙන් 401 ආවත් මේකමයි call වෙන්නේ)
            logout: () => set({ 
                user: null, 
                token: null, 
                isAuthenticated: false 
            }),
        }),
        {
            name: 'nexmart-auth-storage', // LocalStorage එකේ සේව් වෙන නම
        }
    )
);

export default useAuthStore;