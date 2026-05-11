import axios from 'axios';
import useAuthStore from '../store/authStore';

// 💡 PRO FIX: .env ෆයිල් එකෙන් API URL එක ගන්නවා (Vite වල import.meta.env පාවිච්චි කරන්නේ)
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: හැම රික්වෙස්ට් එකක් යන්න කලින්ම Token එක අල්ලලා Header එකට දානවා
api.interceptors.request.use(
    (config) => {
        // Zustand store එකෙන් ටෝකන් එක ගන්නවා
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: එන රෙස්පොන්ස් එකේ 401 (Unauthorized) තිබ්බොත් Auto Logout කරනවා
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Unauthorized! Token expired or invalid. Logging out...");
            // Store එකේ තියෙන logout function එක කෝල් කරනවා
            useAuthStore.getState().logout();
            
            // Login පේජ් එකට යවනවා (Optional - Router එක හරහා කරන එක වඩා හොඳයි)
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;