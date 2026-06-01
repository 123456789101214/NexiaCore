import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, FileArchive, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import API from '../services/api';
import { downloadBulkTemplate } from '../utils/downloadBulkTemplate';

const BulkUploadModal = ({ isOpen, onClose, onSuccess }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [imagesZip, setImagesZip] = useState(null);
    const [step, setStep] = useState('select'); // select, preview, uploading, done
    const [previewData, setPreviewData] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleExcelChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setExcelFile(file);
            setError('');
        }
    };

    const handleZipChange = (e) => {
        const file = e.target.files[0];
        if (file) setImagesZip(file);
    };

    const generatePreview = () => {
        if (!excelFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            setPreviewData(rows);
            setStep('preview');
        };
        reader.readAsArrayBuffer(excelFile);
    };

    const handleUpload = async () => {
        setStep('uploading');
        const formData = new FormData();
        formData.append('excel', excelFile);
        if (imagesZip) formData.append('images', imagesZip);

        try {
            const res = await API.post('/products/bulk-upload-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            setStep('done');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Upload failed');
            setStep('select');
        }
    };

    const resetModal = () => {
        setExcelFile(null);
        setImagesZip(null);
        setPreviewData([]);
        setResult(null);
        setError('');
        setStep('select');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Bulk Upload Products</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    {step === 'select' && (
                        <div className="space-y-6">
                            {/* Excel Section */}
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative hover:bg-slate-50 transition-colors">
                                <input type="file" accept=".xlsx,.csv" onChange={handleExcelChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center text-center">
                                    <FileSpreadsheet size={40} className="text-blue-500 mb-3" />
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Upload Excel File (Required)</h3>
                                    <p className="text-sm text-slate-500 mt-1">{excelFile ? excelFile.name : 'Drag & drop or click to browse'}</p>
                                </div>
                            </div>

                            <button onClick={downloadBulkTemplate} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
                                <Download size={16} /> Download Excel Template
                            </button>

                            {/* ZIP Section */}
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 relative hover:bg-slate-50 transition-colors">
                                <input type="file" accept=".zip" onChange={handleZipChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center text-center">
                                    <FileArchive size={40} className="text-purple-500 mb-3" />
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Upload Images ZIP (Optional)</h3>
                                    <p className="text-sm text-slate-500 mt-1 mb-3">{imagesZip ? imagesZip.name : 'Create a ZIP with all product images'}</p>
                                    <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-left">
                                        <strong>Guide:</strong><br/>
                                        1. Name images exactly as in 'imageFileName' Excel column.<br/>
                                        2. Supported: .jpg, .png, .webp<br/>
                                        3. Select images directly and ZIP them (do not ZIP a folder).
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div>
                            <p className="text-slate-600 mb-4 font-medium">Previewing first 5 of {previewData.length} products:</p>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">Image Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewData.slice(0, 5).map((row, idx) => (
                                            <tr key={idx}>
                                                <td className={`p-3 ${!row.name ? 'text-red-500 font-bold' : ''}`}>{row.name || 'MISSING'}</td>
                                                <td className={`p-3 ${row.price === undefined ? 'text-red-500 font-bold' : ''}`}>{row.price !== undefined ? `Rs.${row.price}` : 'MISSING'}</td>
                                                <td className="p-3 text-slate-500">{row.imageFileName || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
                            <h3 className="text-lg font-bold text-slate-800">Uploading {previewData.length} products...</h3>
                            <p className="text-slate-500 mt-2 text-sm">Please don't close this window.</p>
                        </div>
                    )}

                    {step === 'done' && result && (
                        <div className="text-center py-6">
                            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 mb-6">Upload Complete!</h3>
                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6 text-sm">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="block text-2xl font-black text-slate-800">{result.inserted}</span>
                                    <span className="text-slate-500">New Added</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="block text-2xl font-black text-slate-800">{result.updated}</span>
                                    <span className="text-slate-500">Updated</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                                    <span className="block text-2xl font-black text-slate-800">{result.imagesUploaded}</span>
                                    <span className="text-slate-500">Images Synced to Cloudinary</span>
                                </div>
                            </div>
                            
                            {result.errors?.length > 0 && (
                                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl text-left max-h-32 overflow-y-auto mb-6">
                                    <strong className="block mb-2">⚠️ {result.errors.length} Rows Skipped:</strong>
                                    {result.errors.map((err, i) => (
                                        <div key={i}>Row {err.row}: {err.name} - {err.reason}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                    {step === 'select' && (
                        <button onClick={generatePreview} disabled={!excelFile} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
                            Preview & Upload
                        </button>
                    )}
                    {step === 'preview' && (
                        <>
                            <button onClick={() => setStep('select')} className="text-slate-600 hover:bg-slate-200 px-6 py-2.5 rounded-xl font-semibold transition-colors">Back</button>
                            <button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">Start Upload</button>
                        </>
                    )}
                    {step === 'done' && (
                        <>
                            <button onClick={resetModal} className="text-slate-600 hover:bg-slate-200 px-6 py-2.5 rounded-xl font-semibold transition-colors">Upload Another</button>
                            <button onClick={onSuccess} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">Done</button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default BulkUploadModal;