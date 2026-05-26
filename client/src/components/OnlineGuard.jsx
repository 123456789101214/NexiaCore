import React from 'react';
import { WifiOff, ShoppingCart } from 'lucide-react';
import useOfflineStore from '../store/offlineStore';
import { useNavigate } from 'react-router-dom';

const OnlineGuard = ({ children }) => {
    const isOnline = useOfflineStore((state) => state.isOnline);
    const navigate = useNavigate();

    // 📴 Offline නම් Page එක වෙනුවට මේ Alert UI එක පෙන්නනවා
    if (!isOnline) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-full mb-6">
                    <WifiOff size={64} className="text-slate-400 dark:text-slate-500" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
                    You are currently offline
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto mb-8 leading-relaxed">
                    This module requires an active internet connection to sync with the server. While offline, you can only use the <strong className="text-slate-700 dark:text-slate-300">POS Terminal</strong> and view cached <strong className="text-slate-700 dark:text-slate-300">Sales History</strong>.
                </p>
                <button 
                    onClick={() => navigate('/pos')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <ShoppingCart size={18} />
                    Return to POS
                </button>
            </div>
        );
    }

    // 🌐 Online නම් අදාළ Page එක සාමාන්‍ය විදිහට ලෝඩ් කරනවා
    return children;
};

export default OnlineGuard;