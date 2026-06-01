import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertTriangle } from 'lucide-react';

const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
    const [error, setError] = useState('');
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Scanner එක Initialize කිරීම
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" }, // Back Camera එක ඉල්ලනවා
                    {
                        fps: 10, // තත්පරේට ෆ්‍රේම් ගාණ (Performance වලට 10 හොඳයි)
                        qrbox: { width: 250, height: 150 }, // Barcode එක තියන්න ඕන කොටුවේ සයිස් එක
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // ස්කෑන් වුණ ගමන් කැමරාව ඕෆ් කරලා Data එක යවනවා
                        if (scannerRef.current && scannerRef.current.isScanning) {
                            html5QrCode.stop().then(() => {
                                onScan(decodedText);
                                onClose();
                            }).catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // Scanning progress errors (මේවා සාමාන්‍යයි, ඒ නිසා ignore කරනවා)
                    }
                );
            } catch (err) {
                console.error("Camera Error:", err);
                setError('Camera access denied or device not supported. Please check browser permissions.');
            }
        };

        // පොඩි ඩිලේ එකක් දෙනවා UI එක Render වෙන්න
        setTimeout(startScanner, 200);

        // Component එක Close වෙද්දී අනිවාර්යයෙන්ම කැමරාව ඕෆ් කරන්න ඕනේ (නැත්නම් Light එක පත්තු වෙලා තියෙයි)
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isOpen, onScan, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Camera className="text-blue-600" size={20} />
                        Scan Barcode
                    </h2>
                    <button 
                        onClick={() => {
                            if (scannerRef.current && scannerRef.current.isScanning) {
                                scannerRef.current.stop().catch(console.error);
                            }
                            onClose();
                        }} 
                        className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Camera View Area */}
                <div className="p-6 flex flex-col items-center">
                    {error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold w-full">
                            <AlertTriangle size={24} />
                            {error}
                        </div>
                    ) : (
                        <div className="relative w-full rounded-3xl overflow-hidden border-4 border-slate-100 dark:border-slate-800 bg-black">
                            {/* මේ div එක ඇතුලේ තමයි කැමරාව පේන්නේ */}
                            <div id="reader" className="w-full h-full min-h-[300px]"></div>
                            
                            {/* Scanning Animation Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] animate-[scan_2s_ease-in-out_infinite] -translate-y-1/2 z-10 pointer-events-none"></div>
                        </div>
                    )}
                    
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-6 text-center uppercase tracking-widest">
                        Point camera at the barcode
                    </p>
                </div>
            </div>

            {/* Tailwind Custom Animation (අර රතු පාට ලේසර් ලයින් එක උඩ පහළ යන්න) */}
            <style>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(-70px); }
                    50% { transform: translateY(70px); }
                }
            `}</style>
        </div>
    );
};

export default BarcodeScannerModal;