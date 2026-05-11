import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import { Check, ChevronRight, Store, Phone, MapPin, User, Mail, Lock, Loader2, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const login           = useAuthStore((state) => state.login);  
    const logout          = useAuthStore((state) => state.logout);

    // 💡 NEW: Flow State (Starts at 0 now)
    const [step, setStep]                       = useState(0); 
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState(null);
    
    // 💡 NEW: Step 0 State (Email OTP)
    const [otpEmail, setOtpEmail]               = useState('');
    const [otpSent, setOtpSent]                 = useState(false);
    const [otpDigits, setOtpDigits]             = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer]               = useState(0);
    const [otpLoading, setOtpLoading]           = useState(false);
    const [verificationToken, setVerificationToken] = useState('');
    const otpInputRefs = useRef([]);

    // Other Steps State
    const [plan, setPlan]                       = useState('free');
    const [shopName, setShopName]               = useState('');
    const [phone, setPhone]                     = useState('');
    const [address, setAddress]                 = useState('');
    const [name, setName]                       = useState('');
    const [password, setPassword]               = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isAuthenticated) setError('__LOGGED_IN__');
    }, [isAuthenticated]);

    const handleLogoutAndRegister = () => { logout(); setError(null); };

    const steps = ['Verify Email', 'Choose Plan', 'Shop Details', 'Owner Account'];
    const plans = [
        {
            value: 'free', name: 'Starter', price: 'Free',
            features: ['Up to 500 Products', '2 Staff Accounts', 'Basic POS', 'GRN Management']
        },
        {
            value: 'pro', name: 'Pro', price: 'Rs. 2,999 / month', popular: true,
            features: ['Up to 5,000 Products', '10 Staff Accounts', 'Full Analytics', 'Priority Support']
        },
        {
            value: 'enterprise', name: 'Enterprise', price: 'Rs. 25,000',
            features: ['Unlimited Products', 'Unlimited Staff', 'Dedicated Support', 'Custom Integrations']
        }
    ];

    // ─── OTP LOGIC ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (otpTimer <= 0) return;
        const interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)) return setError("Please provide a valid email.");
        
        setOtpLoading(true);
        try {
            const res = await API.post('/auth/send-otp', { email: otpEmail });
            if (res.data.success) {
                setOtpSent(true);
                setOtpTimer(60);
                setOtpDigits(['', '', '', '', '', '']);
                setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^[0-9]*$/.test(value)) return;
        const newOtp = [...otpDigits];
        newOtp[index] = value;
        setOtpDigits(newOtp);

        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
        
        // Auto submit if all filled
        if (newOtp.every(d => d !== '') && value) {
            verifyOtpSubmit(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.some(d => !/^[0-9]$/.test(d))) return;
        
        const newOtp = [...otpDigits];
        pastedData.forEach((d, i) => { if (i < 6) newOtp[i] = d; });
        setOtpDigits(newOtp);
        if (newOtp.every(d => d !== '')) verifyOtpSubmit(newOtp.join(''));
    };

    const verifyOtpSubmit = async (fullOtpCode) => {
        setError(null);
        setOtpLoading(true);
        try {
            const res = await API.post('/auth/verify-otp', { email: otpEmail, otp: fullOtpCode });
            if (res.data.success) {
                setVerificationToken(res.data.verificationToken);
                setStep(1); // Advance to Plan Selection
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP');
            setOtpDigits(['', '', '', '', '', '']); // clear on error
            otpInputRefs.current[0]?.focus();
        } finally {
            setOtpLoading(false);
        }
    };

    // ─── MAIN REGISTER LOGIC ────────────────────────────────────────────────
    const handleNext = () => {
        setError(null);
        if (step === 2 && shopName.trim().length < 2) {
            setError("Shop name must be at least 2 characters.");
            return;
        }
        setStep(step + 1);
    };
    
    const handleBack = () => { setError(null); setStep(step - 1); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (isAuthenticated) { setError('__LOGGED_IN__'); return; }
        if (name.trim().length < 2)      return setError("Name must be at least 2 characters.");
        if (password.length < 6)         return setError("Password must be at least 6 characters.");
        if (password !== confirmPassword) return setError("Passwords do not match.");

        setLoading(true);
        try {
            const res = await API.post('/auth/register', {
                shopName, 
                phone, 
                address, 
                plan, 
                name, 
                email: otpEmail, // 💡 USE VERIFIED EMAIL
                password,
                verificationToken // 💡 REQUIRED BY NEW BACKEND GUARD
            });
            if (res.data.success) {
                login(res.data.user, res.data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Already Logged In wall
    if (isAuthenticated || error === '__LOGGED_IN__') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-10 px-8 shadow-xl rounded-3xl border border-slate-100 text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store className="text-amber-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Already Logged In</h2>
                        <p className="text-slate-500 font-medium text-sm mb-8">
                            You are currently logged in to a shop. To register a new shop, you must log out first.
                        </p>
                        <div className="space-y-3">
                            <button onClick={() => navigate('/dashboard')}
                                className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black hover:bg-blue-700 transition-all">
                                Go to My Dashboard
                            </button>
                            <button onClick={handleLogoutAndRegister}
                                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-2xl font-black hover:bg-slate-200 transition-all">
                                <LogOut size={18} /> Log Out & Register New Shop
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
                <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">Set up your Smart POS</h2>

                {/* Progress */}
                <div className="mt-8 mb-8">
                    <div className="flex items-center justify-center space-x-4 md:space-x-8">
                        {steps.map((stepName, index) => {
                            const isActive = step === index;
                            const isDone   = step > index;
                            return (
                                <div key={stepName} className="flex items-center">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border-2 transition-colors ${
                                        isActive ? 'border-blue-600 bg-blue-600 text-white' :
                                        isDone   ? 'border-emerald-500 bg-emerald-500 text-white' :
                                                   'border-slate-300 text-slate-400'
                                    }`}>
                                        {isDone ? <Check size={16} /> : (index + 1)}
                                    </div>
                                    <span className={`ml-3 text-sm font-semibold hidden md:block ${
                                        isActive ? 'text-blue-600' : isDone ? 'text-emerald-500' : 'text-slate-400'
                                    }`}>{stepName}</span>
                                    {index !== steps.length - 1 && <ChevronRight className="ml-4 md:ml-8 text-slate-300" size={20} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-slate-100 min-h-[400px]">

                    {/* STEP 0 — Verify Email */}
                    {step === 0 && (
                        <div className="max-w-md mx-auto py-4">
                            {!otpSent ? (
                                <form onSubmit={handleSendOtp} className="space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800">Verify your email</h2>
                                        <p className="text-sm text-slate-500 mt-2 font-medium">We'll send a 6-digit code to confirm your identity.</p>
                                    </div>
                                    
                                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold text-center">{error}</div>}
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Business Email <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium bg-slate-50" 
                                                placeholder="owner@company.com" />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={otpLoading || !otpEmail} 
                                        className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 flex justify-center items-center gap-2 disabled:opacity-70">
                                        {otpLoading && <Loader2 size={18} className="animate-spin" />}
                                        {otpLoading ? 'Sending...' : 'Send Verification Code'}
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <Mail size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">Check your inbox</h2>
                                        <p className="text-sm text-slate-500 mt-2 font-medium">We sent a 6-digit code to <br/><span className="font-bold text-slate-800">{otpEmail}</span></p>
                                    </div>

                                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}

                                    <div className="flex justify-center gap-2 my-8">
                                        {otpDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => otpInputRefs.current[index] = el}
                                                type="text"
                                                maxLength="1"
                                                value={digit}
                                                onChange={e => handleOtpChange(index, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(index, e)}
                                                onPaste={handleOtpPaste}
                                                className="w-12 h-14 text-center text-2xl font-black text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                                            />
                                        ))}
                                    </div>
                                    
                                    <button onClick={() => verifyOtpSubmit(otpDigits.join(''))} disabled={otpLoading || otpDigits.join('').length !== 6} 
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2">
                                        {otpLoading && <Loader2 size={18} className="animate-spin" />}
                                        Verify Code
                                    </button>

                                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={handleSendOtp} disabled={otpTimer > 0 || otpLoading} className="text-sm font-bold text-slate-700 hover:text-blue-600 disabled:text-slate-400">
                                            {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend Code'}
                                        </button>
                                        <button onClick={() => {setOtpSent(false); setError(null);}} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                                            Use a different email
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 1 — Plan */}
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-8 fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {plans.map((p) => (
                                    <div key={p.value} onClick={() => setPlan(p.value)}
                                        className={`relative cursor-pointer rounded-3xl p-6 border-2 transition-all ${
                                            plan === p.value ? 'border-blue-600 bg-blue-50/30 ring-4 ring-blue-600/10' : 'border-slate-200 hover:border-blue-300'
                                        }`}>
                                        {p.popular && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase py-1 px-3 rounded-full">
                                                Most Popular
                                            </div>
                                        )}
                                        <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                                        <p className="mt-2 text-2xl font-extrabold text-blue-600">{p.price}</p>
                                        <ul className="mt-6 space-y-3">
                                            {p.features.map((f, i) => (
                                                <li key={i} className="flex items-start">
                                                    <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                                                    <span className="ml-3 text-sm text-slate-600 font-medium">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleNext} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors">Continue</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Shop Details */}
                    {step === 2 && (
                        <div className="max-w-lg mx-auto animate-in slide-in-from-right-8 fade-in">
                            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}
                            <div className="space-y-5 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Shop Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} required
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium bg-slate-50" placeholder="SuperMart Plus" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium bg-slate-50" placeholder="077 123 4567" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows="3"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium bg-slate-50" placeholder="123 Main Street..." />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <button onClick={handleBack} className="bg-slate-100 text-slate-700 px-8 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Back</button>
                                <button onClick={handleNext} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors">Continue</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Owner Account */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="max-w-lg mx-auto animate-in slide-in-from-right-8 fade-in">
                            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}
                            <div className="space-y-5 mb-8">
                                
                                {/* 🛡️ VERIFIED EMAIL FIELD (Read-only) */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between items-center">
                                        Email Address <span className="text-emerald-600 flex items-center gap-1 text-xs bg-emerald-50 px-2 py-1 rounded-md"><CheckCircle2 size={14}/> Verified</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                        <input type="email" value={otpEmail} readOnly
                                            className="block w-full pl-10 pr-3 py-3 border border-emerald-200 rounded-2xl bg-emerald-50/50 text-slate-500 font-medium cursor-not-allowed" />
                                    </div>
                                </div>

                                {/* Other Owner Fields */}
                                {[
                                    { label: 'Full Name', value: name, setter: setName, type: 'text', icon: <User className="h-5 w-5 text-slate-400" />, placeholder: 'John Doe' },
                                    { label: 'Password', value: password, setter: setPassword, type: 'password', icon: <Lock className="h-5 w-5 text-slate-400" />, placeholder: '••••••••' },
                                    { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, type: 'password', icon: <Lock className="h-5 w-5 text-slate-400" />, placeholder: '••••••••' },
                                ].map((field) => (
                                    <div key={field.label}>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">{field.label} <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">{field.icon}</div>
                                            <input type={field.type} value={field.value} onChange={(e) => field.setter(e.target.value)} required minLength={field.type === 'password' ? 6 : undefined}
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium bg-slate-50"
                                                placeholder={field.placeholder} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center">
                                <button type="button" onClick={handleBack} className="bg-slate-100 text-slate-700 px-8 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Back</button>
                                <button type="submit" disabled={loading}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70 transition-all">
                                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {loading ? 'Creating...' : 'Create My Shop'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="mt-8 text-center text-sm text-slate-600 font-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">Log in here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;