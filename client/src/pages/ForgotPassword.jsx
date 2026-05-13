import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError('Email is required.');

    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
      setTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP box handlers (same pattern as Register.jsx) ───────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ── Step 2: Verify OTP (client-side only, no API call) ───────────────────
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError(null);
    const code = otp.join('');
    if (code.length < 6) return setError('Please enter the full 6-digit code.');
    setStep(3);
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setError(null);
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email,
        otp: otp.join(''),
        newPassword,
      });
      await Swal.fire({
        icon: 'success',
        title: 'Password Reset!',
        text: 'Please log in with your new password.',
        confirmButtonColor: '#1e293b',
        timer: 3000,
        timerProgressBar: true,
      });
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password.';
      setError(msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('not found')) {
        setStep(1);
        setOtp(['', '', '', '', '', '']);
      } else if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('attempt')) {
        setStep(2);
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Progress indicator ────────────────────────────────────────────────────
  const steps = ['Email', 'Verify', 'New Password'];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Logo / Brand */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-900 text-white rounded-2xl px-4 py-2 text-lg font-bold tracking-wide">
              NexiaCore
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((label, i) => {
              const idx = i + 1;
              const isActive = step === idx;
              const isDone = step > idx;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}
                    >
                      {isDone ? '✓' : idx}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-10 h-0.5 mb-4 transition-all ${step > idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Forgot your password?</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your account email and we'll send a reset code.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter the 6-digit code sent to{' '}
                  <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>

              {/* 6-box OTP input */}
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 bg-slate-50 transition-all"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Verify Code
              </button>

              {/* Resend */}
              <div className="text-center text-sm text-slate-500">
                {timer > 0 ? (
                  <span>Resend code in <span className="font-semibold text-slate-700">{timer}s</span></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-blue-600 font-semibold hover:underline disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(null); }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Use a different email
              </button>
            </form>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Choose a strong password for your account.
                </p>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(2); setError(null); }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to OTP
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Remember your password?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-semibold text-slate-800 hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
