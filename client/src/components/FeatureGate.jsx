import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Zap } from 'lucide-react';
import usePlanStore from '../store/planStore';

export default function FeatureGate({ feature, children, featureNameTitle = "Pro Feature" }) {
    // 💡 STRICT REACTIVITY: Subscribe directly to the specific feature to trigger instant re-renders
    const hasAccess = usePlanStore((state) => state.features?.[feature]);
    const isLoading = usePlanStore((state) => state.isLoading);
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="w-full min-h-[400px] flex items-center justify-center bg-slate-50/50 rounded-[2rem] border border-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-slate-400">Verifying access...</span>
                </div>
            </div>
        );
    }

    // 🔥 Feature එක තියෙනවා නම් විතරක් Page එක Render කරනවා
    if (hasAccess) {
        return <>{children}</>;
    }

    // 🛑 LOCKED STATE: COMPLETELY UNMOUNTS THE PAGE AND SHOWS PAYWALL
    return (
        <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/80 rounded-[2rem] border border-slate-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-white/80 to-white/40"></div>
            
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-amber-200/50 flex flex-col items-center text-center max-w-lg relative z-10 transform transition-transform hover:scale-105 duration-300">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 shadow-inner border border-amber-100">
                    <Lock size={36} className="text-amber-500" />
                </div>
                
                <div className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 flex items-center gap-1.5 shadow-sm">
                    <Zap size={14} className="fill-amber-500 text-amber-500"/> PRO PLAN REQUIRED
                </div>

                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
                    {featureNameTitle} is Locked
                </h3>
                
                <p className="text-sm text-slate-500 font-medium mb-8 px-2 leading-relaxed">
                    You are currently on the <span className="font-bold text-slate-700">Free plan</span>. Upgrade to Pro or Enterprise to unlock this feature and scale your business to the next level.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button 
                        onClick={() => navigate('/settings')}
                        className="flex-1 bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 active:scale-95"
                    >
                        Upgrade to Pro <ArrowRight size={18} />
                    </button>
                    <button 
                        onClick={() => window.open('https://nexia-core.vercel.app/#pricing', '_blank')}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl border border-slate-200 transition-colors active:scale-95"
                    >
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    );
}