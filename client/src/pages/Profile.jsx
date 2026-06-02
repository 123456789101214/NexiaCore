import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import API from '../services/api';
import Swal from 'sweetalert2';
import { User, Lock, Mail, Shield, Building2, Eye, EyeOff, Save, KeyRound, Copy } from 'lucide-react';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    
    const [activeTab, setActiveTab] = useState('profile');
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    
    // Profile Tab States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    
    // Password Tab States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await API.get('/profile');
                if (res.data.success) {
                    setName(res.data.data.name);
                    setEmail(res.data.data.email);
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
                Swal.fire({ 
                    toast: true, 
                    position: 'top-end', 
                    icon: 'error', 
                    title: 'Could not load profile. Please refresh.', 
                    showConfirmButton: false, 
                    timer: 3000,
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-2xl' }
                });
            }
        };
        fetchProfile();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsProfileLoading(true);
        try {
            const res = await API.put('/profile', { name });
            
            if (res.data.success) {
                const updatedName = res.data.data.name;

                useAuthStore.setState((state) => ({
                    user: { ...state.user, name: updatedName }
                }));

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Profile updated successfully',
                    showConfirmButton: false,
                    timer: 2000,
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-2xl' }
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.error || 'Failed to update profile',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return Swal.fire('Error', 'New passwords do not match!', 'error');
        }
        
        setIsPasswordLoading(true);
        try {
            const res = await API.put('/profile/change-password', {
                currentPassword,
                newPassword
            });
            
            if (res.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Password Changed!',
                    text: res.data.message,
                    confirmButtonColor: '#2563eb',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
                
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                
                logout();
                navigate('/login');
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to change password', 'error');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const getInitials = (nameStr) => {
        if (!nameStr) return 'U';
        const parts = nameStr.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9!@#$%^&*]/.test(pass)) score += 1;
        if (score === 1) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score === 2) return { score, label: 'Fair', color: 'bg-amber-500' };
        if (score >= 3) return { score, label: 'Strong', color: 'bg-emerald-500' };
        return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    };

    const passStrength = getPasswordStrength(newPassword);

    return (
        <div className="p-6 md:p-8 max-w-2xl mx-auto h-[calc(100vh-64px)] overflow-y-auto">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-8">
                Account Settings
            </h1>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors ${
                            activeTab === 'profile' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <User size={18} /> My Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors ${
                            activeTab === 'password' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <KeyRound size={18} /> Change Password
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    {activeTab === 'profile' && (
                        <form onSubmit={handleUpdateProfile} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30">
                                    {getInitials(name)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                            <Shield size={12} /> {user?.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200"
                                            required
                                            minLength={2}
                                            maxLength={60}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 flex justify-between items-center">
                                        Email Address
                                        <span className="text-slate-400 flex items-center gap-1 text-[9px]"><Lock size={10} /> Cannot be changed</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            readOnly
                                            className="w-full pl-11 pr-4 py-3 bg-slate-100/50 dark:bg-slate-800/20 border-none rounded-2xl font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Shop ID</label>
                                    <div className="relative flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                value={user?.shopId || ''}
                                                readOnly
                                                className="w-full pl-11 pr-4 py-3 bg-slate-100/50 dark:bg-slate-800/20 border-none rounded-2xl font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed font-mono text-sm"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(user?.shopId);
                                                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied to clipboard', showConfirmButton: false, timer: 1500, customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-2xl' } });
                                            }}
                                            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-colors shrink-0"
                                            title="Copy Shop ID"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isProfileLoading}
                                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-70"
                            >
                                <Save size={18} /> {isProfileLoading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'password' && (
                        <form onSubmit={handleChangePassword} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                            
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Current Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">New Password</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200"
                                        required
                                        minLength={8}
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {newPassword && (
                                    <div className="flex items-center gap-2 mt-2 ml-1">
                                        <div className="flex gap-1 flex-1">
                                            <div className={`h-1.5 w-full rounded-full transition-colors ${passStrength.score >= 1 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                            <div className={`h-1.5 w-full rounded-full transition-colors ${passStrength.score >= 2 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                            <div className={`h-1.5 w-full rounded-full transition-colors ${passStrength.score >= 3 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest w-12 ${
                                            passStrength.score === 1 ? 'text-red-500' :
                                            passStrength.score === 2 ? 'text-amber-500' :
                                            passStrength.score === 3 ? 'text-emerald-500' : 'text-slate-400'
                                        }`}>{passStrength.label}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Confirm New Password</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200"
                                        required
                                        minLength={8}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isPasswordLoading}
                                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-70"
                            >
                                <Shield size={18} /> {isPasswordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;