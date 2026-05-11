import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';

const TrialBanner = () => {
    const [trialData, setTrialData] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchTrialStatus = async () => {
            try {
                // Backend එකෙන් Trial Status එක ගන්නවා
                const res = await API.get('/subscription/trial');
                if (res.data.success) {
                    setTrialData(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch SaaS trial status", error);
            }
        };
        fetchTrialStatus();
    }, []);

    // ඩේටා නැත්නම්, හරි ප්ලෑන් එක Active/Cancelled නම් බැනර් එක පෙන්වන්නේ නැහැ
    if (!trialData || !isVisible || trialData.planStatus === 'active' || trialData.planStatus === 'cancelled') {
        return null;
    }

    const { isExpired, trialDaysRemaining } = trialData;

    // 🔴 Trial එක ඉවර වෙලා නම් (Urgent State)
    if (isExpired) {
        return (
            <div className="bg-red-600 px-4 py-3 shadow-md relative z-50 flex flex-col sm:flex-row justify-center items-center gap-3 animate-in slide-in-from-top-full duration-500">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <AlertCircle size={18} className="animate-pulse" />
                    <span>Your free trial has expired. System features are now limited.</span>
                </div>
                <Link 
                    to="/settings" 
                    className="flex items-center gap-2 px-4 py-1.5 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-red-50 transition-colors shadow-sm"
                >
                    Upgrade to Pro <ArrowRight size={14} />
                </Link>
            </div>
        );
    }

    // 🟠 Trial එක තාම තියෙනවා නම් (Warning State)
    return (
        <div className="bg-amber-500 px-4 py-3 shadow-md relative z-50 flex flex-col sm:flex-row justify-center items-center gap-3 animate-in slide-in-from-top-full duration-500">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Clock size={18} />
                <span>Your SaaS trial ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}.</span>
            </div>
            <Link 
                to="/settings" 
                className="flex items-center gap-2 px-4 py-1.5 bg-white text-amber-600 font-black text-xs uppercase tracking-widest rounded-full hover:bg-amber-50 transition-colors shadow-sm"
            >
                Secure Your Data <ArrowRight size={14} />
            </Link>
        </div>
    );
};

export default TrialBanner;