import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import API from '../services/api';
import { X, Download, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ImageIcon } from 'lucide-react';

const ExcelBulkUpload = ({ isOpen, onClose, onSuccess }) => {
    const [phase, setPhase] = useState('select'); // 'select', 'uploading', 'done'
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const headers = ['name', 'barcode', 'sku', 'category', 'buyingPrice', 'price', 'stock', 'unit', 'minStockLevel', 'expiryDate', 'imageUrl'];
        const sampleData = [
            {
                name: 'Maggi 2-Minute Noodles Chicken', barcode: '8901725130397', sku: 'MAG-NOOD-001', category: 'Instant Food',
                buyingPrice: 75, price: 95, stock: 48, unit: 'pcs', minStockLevel: 20, expiryDate: '2025-12-31',
                imageUrl: 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing'
            },
            {
                name: 'Anchor Full Cream Milk Powder 400g', barcode: '', sku: 'ANC-MILK-400', category: 'Dairy & Eggs',
                buyingPrice: 520, price: 650, stock: 24, unit: 'pcs', minStockLevel: 10, expiryDate: '',
                imageUrl: ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 55 }];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // 💡 CRITICAL FIX: Array එක හරියටම Excel Blob එකක් බවට පත් කිරීම
        const dataBlob = new Blob([new Uint8Array(buffer)], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        saveAs(dataBlob, 'NexiaCore_Product_Template.xlsx');
    };

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.csv'))) {
            setFile(dropped);
            setError(null);
        } else {
            setError("Please upload a valid .xlsx or .csv file");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setPhase('uploading');
        setError(null);

        const formData = new FormData();
        formData.append('excel', file);

        try {
            const res = await API.post('/products/bulk-upload-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data.results);
            setPhase('done');
        } catch (err) {
            setError(err.response?.data?.error || "Upload failed. Please try again.");
            setPhase('select');
        }
    };

    const handleReset = () => {
        setPhase('select');
        setFile(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <FileSpreadsheet className="text-blue-600" />
                        Smart Bulk Upload
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {/* PHASE 1: SELECT FILE */}
                    {phase === 'select' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
                                <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-3 text-sm flex items-center gap-2">
                                    <Download size={16} /> Step 1: Prepare your data
                                </h3>
                                <p className="text-xs text-blue-600/80 dark:text-blue-300/70 mb-4">
                                    Download our template. Fill in your products. For images, just paste the Google Drive "Anyone with link" share URL into the `imageUrl` column.
                                </p>
                                <button onClick={downloadTemplate} className="text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700 hover:scale-105 transition-transform">
                                    ⬇️ Download Template
                                </button>
                            </div>

                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50'}`}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                                <UploadCloud size={48} className={`mb-4 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
                                {file ? (
                                    <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{file.name}</div>
                                ) : (
                                    <>
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Drag & Drop your Excel file</h4>
                                        <p className="text-xs text-slate-500 font-medium">or click to browse from your computer</p>
                                    </>
                                )}
                            </div>

                            {error && <div className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-xl border border-red-200 dark:border-red-800/50">{error}</div>}

                            <button onClick={handleUpload} disabled={!file} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all flex justify-center items-center gap-2">
                                Upload & Process Products 🚀
                            </button>
                        </div>
                    )}

                    {/* PHASE 2: UPLOADING */}
                    {phase === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in-95">
                            <Loader2 size={64} className="text-blue-600 animate-spin mb-6" />
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Processing...</h3>
                            <p className="text-sm text-slate-500 text-center font-medium">
                                Reading Excel, generating barcodes, and downloading images<br/>from Google Drive to Cloudinary. Please wait!
                            </p>
                        </div>
                    )}

                    {/* PHASE 3: DONE */}
                    {phase === 'done' && result && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-3xl p-6 text-center">
                                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-400 mb-1">Upload Complete!</h3>
                                <p className="text-emerald-600 dark:text-emerald-500 font-bold text-sm">Successfully processed {result.processed} products</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{result.inserted}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500">New Added</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                                    <div className="text-2xl font-black text-blue-600">{result.updated}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500">Updated</div>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="text-2xl font-black text-emerald-600 flex justify-center items-center gap-1"><ImageIcon size={18}/> {result.imagesUploaded}</div>
                                    <div className="text-[10px] uppercase font-bold text-emerald-600/70">Images Saved</div>
                                </div>
                                <div className={`p-4 rounded-2xl text-center border ${result.skipped > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                    <div className={`text-2xl font-black ${result.skipped > 0 ? 'text-red-600' : 'text-slate-400'}`}>{result.skipped}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500">Skipped</div>
                                </div>
                            </div>

                            {result.errorRows && result.errorRows.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 max-h-40 overflow-y-auto">
                                    <h4 className="text-xs font-black text-red-800 dark:text-red-400 flex items-center gap-2 mb-2 uppercase tracking-wider"><AlertCircle size={14}/> Skipped Rows</h4>
                                    {result.errorRows.map((err, idx) => (
                                        <div key={idx} className="text-[11px] text-red-600 dark:text-red-300 font-medium border-b border-red-100 dark:border-red-900/30 last:border-0 py-1">
                                            Row {err.row}: {err.name} — {err.error}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button onClick={handleReset} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors">
                                    Upload Another
                                </button>
                                <button onClick={() => { onSuccess(); onClose(); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                                    Done & Refresh
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExcelBulkUpload;