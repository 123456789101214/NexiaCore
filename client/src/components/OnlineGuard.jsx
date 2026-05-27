import React, { useEffect, useState } from 'react';
import { WifiOff, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Network } from '@capacitor/network';
import useOfflineStore from '../store/offlineStore';

const OnlineGuard = ({ children }) => {
    // Zustand store එකෙන් isOnline ගන්නවා (ඒ වගේම update කරන්න function එකකුත් ඇති කියලා හිතනවා)
    const storeIsOnline = useOfflineStore((state) => state.isOnline);
    const setOnline = useOfflineStore((state) => state.setOnline); // store එකේ මේක නැත්නම් අවුලක් නෑ, පහළ local state එකෙන් වැඩේ වෙනවා.

    // Capacitor එකෙන් එන Network Status එක තියාගන්න Local State එකක් හදාගමු
    const [isOnline, setIsOnline] = useState(storeIsOnline !== undefined ? storeIsOnline : true);
    
    const navigate = useNavigate();

    useEffect(() => {
        // 1. App එක ඕපන් කරපු ගමන් මුලින්ම Network එක චෙක් කරනවා
        const checkInitialNetwork = async () => {
            const status = await Network.getStatus();
            setIsOnline(status.connected);
            if (setOnline) setOnline(status.connected); // Store එකත් update කරනවා
        };
        checkInitialNetwork();

        // 2. App එක පාවිච්චි කර කර ඉද්දි Data Off/On කළොත් ඒක අල්ලගන්නවා (Live Listener)
        const setupListener = async () => {
            const listener = await Network.addListener('networkStatusChange', (status) => {
                console.log("Network status changed! Connected:", status.connected);
                setIsOnline(status.connected);
                if (setOnline) setOnline(status.connected);
            });
            return listener;
        };
        
        let networkListener;
        setupListener().then(listener => { networkListener = listener; });

        // Component එකෙන් අයින් වෙද්දී Listener එක අයින් කරනවා (Memory Leak නොවෙන්න)
        return () => {
            if (networkListener) {
                networkListener.remove();
            }
        };
    }, [setOnline]);

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