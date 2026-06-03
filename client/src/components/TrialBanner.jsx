import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { ShieldAlert, ArrowRight, Clock, CreditCard, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const TrialBanner = () => {
    const { user } = useAuthStore();
    const [subData, setSubData] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    const isManagerOrOwner = user?.role === 'admin' || user?.role === 'owner';

    useEffect(() => {
        if (!isManagerOrOwner) return;

        const fetchSubscriptionStatus = async () => {
            try {
                const res = await API.get('/subscription/trial');
                if (res.data.success) {
                    setSubData(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch SaaS subscription status", error);
            }
        };
        fetchSubscriptionStatus();
    }, [isManagerOrOwner, user?._id]);

    const normalizedStatus = subData?.planStatus?.toLowerCase();
    const { isExpired, trialDaysRemaining, planExpiresAt } = subData || {};
    const now = new Date();

    const dismissKey = subData 
        ? 'banner-dismissed-' + normalizedStatus + '-' + (trialDaysRemaining ?? Math.ceil((new Date(planExpiresAt) - now) / 86400000))
        : null;

    // 🚀 UX FIX: Early return guard includes sessionStorage check to prevent 1-frame flicker
    if (!isManagerOrOwner || !subData || !isVisible || normalizedStatus === 'cancelled' || (dismissKey && sessionStorage.getItem(dismissKey))) {
        return null;
    }

    const handleDismiss = () => {
        if (dismissKey) sessionStorage.setItem(dismissKey, '1');
        setIsVisible(false);
    };

    if (normalizedStatus === 'trial') {
        if (isExpired) {
            return (
                <div className="bg-red-600 px-4 py-3 shadow-lg relative z-50 flex flex-col sm:flex-row justify-center items-center gap-4 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <ShieldAlert size={20} className="animate-pulse" />
                        <span>Your free trial has expired. System features are now restricted.</span>
                    </div>
                    <Link to="/settings" className="flex items-center gap-2 px-5 py-2 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-red-50 transition-all shadow-sm active:scale-95">
                        Upgrade to Pro <ArrowRight size={14} />
                    </Link>
                </div>
            );
        }

        if (trialDaysRemaining > 0 && trialDaysRemaining <= 7) {
            return (
                <div className="bg-amber-500 px-4 py-3 shadow-lg relative z-50 flex flex-col sm:flex-row justify-center items-center gap-4 animate-in slide-in-from-top-2 duration-500 pr-12 sm:pr-4">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <Clock size={20} />
                        <span>Your SaaS trial ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}.</span>
                    </div>
                    <Link to="/settings" className="flex items-center gap-2 px-5 py-2 bg-white text-amber-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-amber-50 transition-all shadow-sm active:scale-95">
                        Secure Your Data <ArrowRight size={14} />
                    </Link>
                    <button onClick={handleDismiss} className="absolute right-4 text-white/80 hover:text-white transition-colors" title="Dismiss">
                        <X size={20} />
                    </button>
                </div>
            );
        }
    }

    if (normalizedStatus === 'active') {
        if (!planExpiresAt) return null;

        const planEnd = new Date(planExpiresAt);
        const daysLeft = Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24));
        const hasExpired = daysLeft <= 0;

        if (hasExpired) {
            return (
                <div className="bg-red-600 px-4 py-3 shadow-lg relative z-50 flex flex-col sm:flex-row justify-center items-center gap-4 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <CreditCard size={20} className="animate-pulse" />
                        <span>Your Enterprise subscription has expired! Please renew to avoid service interruption.</span>
                    </div>
                    <Link to="/settings" className="flex items-center gap-2 px-5 py-2 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-red-50 transition-all shadow-sm active:scale-95">
                        Renew Now <ArrowRight size={14} />
                    </Link>
                </div>
            );
        }

        if (daysLeft <= 7) {
            return (
                <div className="bg-blue-600 px-4 py-3 shadow-lg relative z-50 flex flex-col sm:flex-row justify-center items-center gap-4 animate-in slide-in-from-top-2 duration-500 pr-12 sm:pr-4">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <CreditCard size={20} />
                        <span>Your Enterprise plan renews in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.</span>
                    </div>
                    <Link to="/settings" className="flex items-center gap-2 px-5 py-2 bg-white text-blue-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-blue-50 transition-all shadow-sm active:scale-95">
                        Check Billing <ArrowRight size={14} />
                    </Link>
                    <button onClick={handleDismiss} className="absolute right-4 text-white/80 hover:text-white transition-colors" title="Dismiss">
                        <X size={20} />
                    </button>
                </div>
            );
        }
    }

    return null;
};

export default TrialBanner;