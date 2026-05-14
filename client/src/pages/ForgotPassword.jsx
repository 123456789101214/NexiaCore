import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '../services/api';

// ── Step Progress Indicator ───────────────────────────────────────────────────
const StepIndicator = ({ current }) => {
  const steps = [
    { n: 1, label: 'Email' },
    { n: 2, label: 'Verify' },
    { n: 3, label: 'New Password' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, idx) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                current > s.n
                  ? 'bg-blue-600 text-white'
                  : current === s.n
                  ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {current > s.n ? '✓' : s.n}
            </div>
            <span
              className={`mt-1 text-[10px] font-medium transition-colors duration-300 ${
                current >= s.n ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-16 h-[2px] mx-1 mb-4 transition-all duration-500 ${
                current > s.n + 0 ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]               = useState(1);
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [timer, setTimer]             = useState(0);

  const otpRefs = useRef([]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // ── Auto-focus first OTP box on step 2 ───────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── OTP box handlers (copied from Register.jsx pattern) ──────────────────
  const handleOtpChange = useCallback((idx, val) => {
    const digit = val.replace(/\D/, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((idx, e) => {
    if (e.key === 'Backspace') {
      if (otp[idx]) {
        setOtp(prev => { const n = [...prev]; n[idx] = ''; return n; });
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus();
        setOtp(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
      }
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  }, [otp]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: normalizedEmail });
      setStep(2);
      setTimer(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 resend (from Step 2 UI) ────────────────────────────────────────
  const handleResend = async () => {
    if (timer > 0) return;
    setError(null);
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.toLowerCase().trim() });
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Validate OTP locally → go to Step 3 ──────────────────────────
  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    setError(null);
    const joined = otp.join('');
    if (joined.length !== 6 || !/^\d{6}$/.test(joined)) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setStep(3);
  };

  // Auto-advance when all 6 digits filled
  useEffect(() => {
    if (step === 2 && otp.every(d => d !== '')) {
      handleVerifyOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  // ── Step 3: Submit password reset ─────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: email.toLowerCase().trim(),
        otp: otp.join(''),
        newPassword,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Password Reset!',
        text: 'Your password has been updated. Please log in with your new password.',
        background: '#1e293b',
        color: '#e2e8f0',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Go to Login',
      });

      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. Please try again.';
      setError(msg);

      // Smart redirect based on error type
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('expired') || lowerMsg.includes('not found')) {
        setStep(1);
        setOtp(['', '', '', '', '', '']);
      } else if (lowerMsg.includes('incorrect') || lowerMsg.includes('attempt')) {
        setStep(2);
        setOtp(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Shared card wrapper ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      {/* Subtle background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-600/20 mb-4">
            <KeyRound size={26} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">NexiaCore POS</h1>
          <p className="text-sm text-slate-500 mt-1">Account Recovery</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-3xl p-8 shadow-2xl">
          <StepIndicator current={step} />

          {/* ───── STEP 1: Email ───── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} noValidate>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-100">Forgot your password?</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Enter your account email and we'll send a reset code.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-600
                               rounded-xl pl-10 pr-4 py-3 text-sm outline-none
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                           text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending Code…
                  </span>
                ) : (
                  'Send Reset Code'
                )}
              </button>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* ───── STEP 2: OTP ───── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 mb-3">
                  <ShieldCheck size={22} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Check your inbox</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Enter the 6-digit code sent to
                  <br />
                  <span className="text-blue-400 font-medium">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* OTP boxes */}
              <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-xl border bg-slate-900/60 text-slate-100
                                outline-none transition-all duration-200
                                ${digit
                                  ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                                  : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                }`}
                    style={{ height: '52px' }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.some(d => d === '')}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                           text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                Verify Code
              </button>

              {/* Resend + change email */}
              <div className="mt-5 flex flex-col items-center gap-2 text-sm text-slate-500">
                <div>
                  {timer > 0 ? (
                    <span>Resend code in <span className="text-blue-400 font-semibold">{timer}s</span></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); setOtp(['','','','','','']); }}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-xs"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* ───── STEP 3: New Password ───── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-600/10 border border-green-600/20 mb-3">
                  <Lock size={22} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Set new password</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Choose a strong password for your account.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* New Password */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoFocus
                    className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-600
                               rounded-xl pl-10 pr-10 py-3 text-sm outline-none
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-600
                               rounded-xl pl-10 pr-10 py-3 text-sm outline-none
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Inline match indicator */}
                {confirmPw && (
                  <p className={`mt-1.5 text-xs font-medium ${newPassword === confirmPw ? 'text-green-400' : 'text-red-400'}`}>
                    {newPassword === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                           text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Resetting…
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(null); }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to OTP
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer back link */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}