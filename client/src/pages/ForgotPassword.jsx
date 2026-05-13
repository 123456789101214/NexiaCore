import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import Swal from 'sweetalert2';
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(0);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const otpRefs = useRef([]);

    // Timer Logic for OTP Resend
    useEffect(() => {
        let interval;
        if (timer > 0 && step === 2) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer, step]);

    // Handle Email Submission
    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await API.post('/auth/forgot-password', { email });
            setStep(2);
            setTimer(60);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send reset code.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP Input Array Logic
    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) otpRefs.current[index + 1].focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
        if (pastedData) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                if (i < 6) newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            if (pastedData.length === 6) {
                otpRefs.current[5].focus();
                setStep(3); // Auto proceed
            } else {
                otpRefs.current[pastedData.length].focus();
            }
        }
    };

    // Proceed to Step 3 manually from OTP
    const handleVerifyOtpClick = () => {
        if (otp.join('').length === 6) {
            setError(null);
            setStep(3);
        } else {
            setError('Please enter the complete 6-digit code.');
        }
    };

    // Handle Final Password Reset Submission
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            const res = await API.post('/auth/reset-password', {
                email,
                otp: otp.join(''),
                newPassword
            });

            if (res.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password Reset Successful!',
                    text: 'Please log in with your new password.',
                    confirmButtonColor: '#2563eb'
                }).then(() => navigate('/login'));
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Password reset failed.';
            setError(msg);
            
            // Smart routing based on error
            if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('request a new code')) {
                setOtp(['', '', '', '', '', '']);
                setStep(1);
            } else if (msg.toLowerCase().includes('incorrect')) {
                setStep(2);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                
                {/* Progress Indicators */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map((num) => (
                        <div key={num} className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= num ? 'bg-blue-600' : 'bg-slate-200'}`} />
                            {num < 3 && <div className={`w-8 h-[2px] transition-all duration-300 ${step > num ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* ERROR ALERT */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                        {error}
                    </div>
                )}

                {/* STEP 1: EMAIL */}
                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <KeyRound size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">Forgot password?</h2>
                            <p className="text-slate-500 font-medium mt-2">Enter your email and we'll send a reset code.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" 
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !email}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Code'}
                        </button>
                    </form>
                )}

                {/* STEP 2: OTP */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900">Check your inbox</h2>
                            <p className="text-slate-500 font-medium mt-2">Enter the 6-digit code sent to <br/><span className="text-slate-800 font-bold">{email}</span></p>
                        </div>

                        <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => otpRefs.current[index] = el}
                                    type="text"
                                    maxLength="1"
                                    value={digit}
                                    onChange={e => handleOtpChange(index, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(index, e)}
                                    className="w-12 h-14 text-center text-xl font-black bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            ))}
                        </div>

                        <button 
                            onClick={handleVerifyOtpClick}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-lg active:scale-95 transition-all mb-4"
                        >
                            Verify Code
                        </button>

                        <div className="text-center space-y-4 text-sm font-bold">
                            {timer > 0 ? (
                                <p className="text-slate-500">Resend code in {timer}s</p>
                            ) : (
                                <button onClick={handleSendCode} className="text-blue-600 hover:text-blue-800 transition-colors">
                                    Resend Code
                                </button>
                            )}
                            <br />
                            <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 transition-colors">
                                Use a different email
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: NEW PASSWORD */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900">Set new password</h2>
                            <p className="text-slate-500 font-medium mt-2">Choose a strong password for your account.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required 
                                        minLength="6"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" 
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        type="password"
                                        required 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !newPassword || !confirmPassword}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                    <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 mx-auto transition-colors">
                        <ArrowLeft size={16} /> Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;