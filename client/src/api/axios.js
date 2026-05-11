import axios from 'axios';

const API = axios.create({
    // Backend එක රන් වෙන URL එක මෙතනට දාන්න
    baseURL: 'http://localhost:5000/api', 
});

// හැම රික්වෙස්ට් එකකටම ලොගින් ටෝකන් එක ඔටෝමැටිකලි යවන්න මේක ඕනේ වෙනවා
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;