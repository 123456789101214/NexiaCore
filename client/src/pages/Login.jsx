import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import api from '../services/api'; // 💡 අපේ අලුත් API Service එක
import useAuthStore from '../store/authStore'; // 💡 Zustand Store එක

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // 💡 PRO FIX: Loading State

    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data.success) {
                loginAction(response.data.user, response.data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                
                {/* Visual Side (Left) - (කලින් විදිහමයි) */}
                <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
                    <h2 className="text-4xl font-bold mb-6">Smart POS SaaS</h2>
                    <p className="text-blue-100 text-lg">Manage your inventory, sales and customers in one clean interface.</p>
                    <div className="mt-12 p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                        <p className="text-sm italic">"The most modern way to handle your business in Sri Lanka."</p>
                    </div>
                </div>

                {/* Form Side (Right) */}
                <div className="md:w-1/2 p-12">
                    <div className="flex flex-col items-center mb-10">
                        <div className="p-3 bg-blue-100 rounded-2xl mb-4">
                            <LogIn className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Welcome Back</h3>
                        <p className="text-slate-500">Log in to your shop dashboard</p>
                    </div>

                    {/* 💡 PRO FIX: Error Message Banner */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                <input 
                                    type="password" 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In to System'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;