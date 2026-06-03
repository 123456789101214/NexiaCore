import React, { useState } from 'react';
import { Smartphone, Download, X, Zap, ShieldCheck, RefreshCcw } from 'lucide-react';

const AppDownloadModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* 🚀 1. NEWLY FIXED BUTTON: GPU-Safe Apple Dynamic Island Button (No Chart Glitches) */}
            <div className={`fixed bottom-6 right-6 z-[90] group flex items-center justify-end transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex items-center p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-full 
                    shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_0_25px_rgba(59,130,246,0.3)] 
                    transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(59,130,246,0.4)] active:scale-95"
                >
                    {/* Gradient Icon Circle */}
                    <div className="relative flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full p-3 shadow-md z-10">
                        <Smartphone size={22} className="text-white transition-transform duration-500 group-hover:rotate-12" />
                    </div>

                    {/* Dynamic Island Expand Animation */}
                    <div className="grid grid-cols-[0fr] group-hover:grid-cols-[1fr] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                        <div className="overflow-hidden">
                            <div className="pl-3 pr-5 whitespace-nowrap flex flex-col justify-center h-full text-left">
                                <span className="text-slate-800 dark:text-white font-black text-sm tracking-tight leading-tight">Install App</span>
                                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest leading-tight">Free Download</span>
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* 🚀 2. SMOOTH POPUP ANIMATION: Animates beautifully on BOTH Open and Close */}
            <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
                
                {/* Backdrop Fade Animation */}
                <div 
                    className={`absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity duration-500 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
                    onClick={() => setIsOpen(false)}
                ></div>

                {/* Modal Scale & Slide Animation (Uses cubic-bezier for the Apple-like bounce) */}
                <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-12'}`}>
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 dark:bg-slate-800/50 text-white dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/20 backdrop-blur-md rounded-full transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    {/* Header Section with Gradient */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="relative z-10 flex justify-center mb-5">
                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30 shadow-xl relative group">
                                <div className="absolute inset-0 bg-white/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                <Smartphone size={48} className="text-white drop-shadow-md relative z-10 transition-transform duration-500 group-hover:scale-110" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                            NexiaCore POS App
                        </h2>
                        <p className="text-blue-100 text-sm font-medium opacity-90">
                            Take your business anywhere, anytime.
                        </p>
                    </div>

                    {/* Features Section */}
                    <div className="p-8">
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                <div className="bg-amber-100 dark:bg-amber-500/10 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-110">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">Lightning Fast</h4>
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Optimized native performance</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                <div className="bg-blue-100 dark:bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110">
                                    <RefreshCcw size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">Real-time Sync</h4>
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Instant updates across all devices</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">Secure Access</h4>
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Safe and encrypted local data</p>
                                </div>
                            </div>
                        </div>

                        <a
                            href="/downloads/NexiaCore_POS_v1.0.1.apk"
                            download="NexiaCore_POS_v1.0.1.apk" 
                            target="_blank"
                            rel="external noopener noreferrer" 
                            onClick={() => setTimeout(() => setIsOpen(false), 1000)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-1 active:scale-95 group"
                        >
                            <Download size={20} className="group-hover:animate-bounce" />
                            Download APK (Free)
                        </a>

                        <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-5">
                            Requires Android 8.0 or higher
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AppDownloadModal;