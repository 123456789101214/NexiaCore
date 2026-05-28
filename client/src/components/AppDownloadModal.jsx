import React, { useState } from 'react';
import { Smartphone, Download, X, Zap, Wifi, ShieldCheck, RefreshCcw } from 'lucide-react';

const AppDownloadModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) return (
        // Next-Level Animated Floating Button
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 group p-[2px] rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-2xl shadow-blue-600/40 transition-all duration-500 hover:scale-105 hover:shadow-indigo-500/50 active:scale-95 z-50 overflow-hidden"
        >
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-full px-4 py-3 transition-all duration-500 group-hover:bg-transparent dark:group-hover:bg-transparent">

                {/* Icon with Ping Animation */}
                <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-20 animate-ping"></span>
                    <Smartphone size={24} className="text-blue-600 dark:text-blue-400 group-hover:text-white relative z-10 transition-colors duration-500" />
                </div>

                {/* Smooth Expanding Text */}
                <div className="flex flex-col items-start overflow-hidden max-w-0 group-hover:max-w-[120px] group-hover:ml-3 transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100">
                    <span className="text-white font-black text-sm whitespace-nowrap leading-tight">
                        Install App
                    </span>
                    <span className="text-blue-100 text-[10px] whitespace-nowrap font-medium">
                        Fast & Secure Access
                    </span>
                </div>

            </div>
        </button>
    );

    return (
        // Premium Modal Body
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">

                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Header Section with Gradient */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex justify-center mb-4">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/30 shadow-xl relative group">
                            {/* Inner glowing effect on hover */}
                            <div className="absolute inset-0 bg-white/30 rounded-2xl blur group-hover:blur-md transition-all"></div>
                            <Smartphone size={48} className="text-white drop-shadow-md relative z-10" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                        NexiaCore POS App
                    </h2>
                    <p className="text-blue-100 text-sm font-medium">
                        Take your business anywhere, anytime.
                    </p>
                </div>

                {/* Features Section */}
                <div className="p-6">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-default">
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600 dark:text-green-400">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Lightning Fast</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Optimized native performance</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-default">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                                <RefreshCcw size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Real-time Sync</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Instant updates across all your devices</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-default">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600 dark:text-purple-400">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Secure Access</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Safe and encrypted local data</p>
                            </div>
                        </div>
                    </div>

                    {/* Download Button */}
                    <a 
    href="/downloads/NexiaCore_POS_v1.0.apk" 
    download="NexiaCore_POS_v1.0.apk"
    target="_blank" 
    rel="external noopener noreferrer" // ⚠️ මේකෙන් කියන්නේ React එකට මේක අල්ලන්න එපා කියලා
    onClick={() => setTimeout(() => setIsOpen(false), 1000)}
    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-slate-900/20 dark:shadow-white/20 hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 group"
>
    <Download size={20} className="group-hover:animate-bounce" />
    Download APK (Free)
</a>

                    <p className="text-center text-[11px] text-slate-400 mt-4 font-medium">
                        Requires Android 8.0 or higher.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AppDownloadModal;