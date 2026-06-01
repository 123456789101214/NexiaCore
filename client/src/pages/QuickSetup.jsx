import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { BUSINESS_TEMPLATES } from '../data/businessTemplates';
import { generateProductsWithAI } from '../utils/generateProductsAI';
import { fetchCategoryImages } from '../utils/fetchUnsplashImages';
import { generateAndDownload, downloadExcelOnly } from '../utils/generateExcelZip';
import { Store, Package, Image, Download, ChevronRight, Check, Loader2, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

const QuickSetup = () => {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    
    const hasUnsplash = !!import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    const hasGemini = !!import.meta.env.VITE_GEMINI_API_KEY;

    const [step, setStep] = useState(1);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [useAI, setUseAI] = useState(hasGemini);
    const [includeImages, setIncludeImages] = useState(hasUnsplash);
    
    const [generatedProducts, setGeneratedProducts] = useState([]);
    const [generatedImageMap, setGeneratedImageMap] = useState(new Map());
    
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    if (!['owner', 'admin'].includes(user?.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
                <p className="text-slate-500">Only Owners and Admins can use the Quick Setup Wizard.</p>
            </div>
        );
    }

    const businessData = selectedBusiness ? BUSINESS_TEMPLATES[selectedBusiness] : null;

    const toggleCategory = (catName) => {
        setSelectedCategories(prev => 
            prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
        );
    };

    const handleGenerate = async () => {
        setLoading(true);
        setStep(3);
        let allProducts = [];

        try {
            const categoriesToProcess = businessData.categories.filter(c => selectedCategories.includes(c.name));
            
            // 1. Process Templates & AI
            for (let i = 0; i < categoriesToProcess.length; i++) {
                const cat = categoriesToProcess[i];
                setLoadingMessage(`Generating products for ${cat.name}...`);
                setProgress({ current: i + 1, total: categoriesToProcess.length });
                
                // Add template products
                allProducts = [...allProducts, ...cat.products.map(p => ({ ...p, category: cat.name }))];

                // Add AI products if enabled
                if (useAI && hasGemini) {
                    const aiProducts = await generateProductsWithAI(businessData.label, cat.name, 5);
                    allProducts = [...allProducts, ...aiProducts];
                }
            }

            setGeneratedProducts(allProducts);

            // 2. Fetch Images
            let imageMap = new Map();
            if (includeImages && hasUnsplash) {
                setLoadingMessage('Fetching high-quality product images...');
                imageMap = await fetchCategoryImages(categoriesToProcess, (current, total, catName) => {
                    setLoadingMessage(`Fetching image for ${catName}...`);
                    setProgress({ current, total });
                });
                setGeneratedImageMap(imageMap);
            }

            setLoadingMessage('Packaging your files...');
            await new Promise(r => setTimeout(r, 1000)); // Smooth transition
            
            setStep(4);
        } catch (error) {
            Swal.fire('Error', 'Something went wrong during generation.', 'error');
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    const downloadFullPackage = async () => {
        await generateAndDownload(generatedProducts, generatedImageMap, user?.shopName || 'nexiacore');
        Swal.fire('Success', 'Package Downloaded!', 'success');
    };

    const downloadExcel = () => {
        downloadExcelOnly(generatedProducts, user?.shopName || 'nexiacore');
        Swal.fire('Success', 'Excel Downloaded!', 'success');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-3">
                    <Zap className="text-amber-500 fill-amber-500" /> Quick Setup Wizard
                </h1>
                <p className="text-slate-500">Populate your NexiaCore inventory in 5 minutes.</p>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">1. What type of business do you run?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(BUSINESS_TEMPLATES).map(([key, template]) => (
                            <div 
                                key={key}
                                onClick={() => { setSelectedBusiness(key); setSelectedCategories(template.categories.map(c=>c.name)); }}
                                className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${selectedBusiness === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                            >
                                <div className="text-4xl mb-4">{template.label.split(' ')[0]}</div>
                                <h3 className="font-bold text-slate-800 dark:text-white">{template.label.substring(3)}</h3>
                                <p className="text-xs text-slate-500 mt-2">{template.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button 
                            disabled={!selectedBusiness}
                            onClick={() => setStep(2)}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all"
                        >
                            Continue <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">2. Select Product Categories</h2>
                    <p className="text-slate-500 mb-6">We'll generate realistic Sri Lankan products for these categories.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {businessData?.categories.map((cat) => (
                            <label key={cat.name} className="flex items-start gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <input 
                                    type="checkbox" 
                                    checked={selectedCategories.includes(cat.name)}
                                    onChange={() => toggleCategory(cat.name)}
                                    className="mt-1 w-5 h-5 rounded text-blue-600"
                                />
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</h4>
                                    <span className="text-xs text-slate-500">{cat.products.length} template items</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Sparkles className="text-amber-500" size={18}/> AI-Augmented Extra Products</h4>
                                <p className="text-xs text-slate-500">Gemini AI generates 5 extra realistic products per category.</p>
                                {!hasGemini && <p className="text-xs text-red-500 mt-1">VITE_GEMINI_API_KEY missing in .env</p>}
                            </div>
                            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} disabled={!hasGemini} className="toggle w-6 h-6"/>
                        </label>

                        <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Image className="text-blue-500" size={18}/> Include Real Product Images</h4>
                                <p className="text-xs text-slate-500">Fetches high-quality matching images via Unsplash.</p>
                                {!hasUnsplash && <p className="text-xs text-red-500 mt-1">VITE_UNSPLASH_ACCESS_KEY missing in .env</p>}
                            </div>
                            <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} disabled={!hasUnsplash} className="toggle w-6 h-6"/>
                        </label>
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 px-6 font-bold">Back</button>
                        <button 
                            disabled={selectedCategories.length === 0}
                            onClick={handleGenerate}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30"
                        >
                            Generate Inventory <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 - LOADING */}
            {step === 3 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                        <Loader2 size={64} className="animate-spin text-blue-600 relative z-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{loadingMessage}</h2>
                    <p className="text-slate-500 mb-8">This takes about 30-60 seconds depending on selections.</p>
                    
                    <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-full transition-all duration-300 ease-out"
                            style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-3">{progress.current} / {progress.total} Completed</p>
                </div>
            )}

            {/* STEP 4 - DONE */}
            {step === 4 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">Your inventory is ready! 🎉</h2>
                    
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <Package className="mx-auto text-blue-500 mb-2" />
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{generatedProducts.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Products</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <Store className="mx-auto text-purple-500 mb-2" />
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{selectedCategories.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Categories</div>
                        </div>
                        {includeImages && (
                            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <Image className="mx-auto text-amber-500 mb-2" />
                                <div className="text-2xl font-black text-slate-800 dark:text-white">{generatedImageMap.size}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Images</div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <button 
                            onClick={downloadFullPackage}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                        >
                            <Download size={20} /> Download Complete Package (ZIP)
                        </button>
                        <button 
                            onClick={downloadExcel}
                            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all"
                        >
                            Download Excel Only
                        </button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 p-6 rounded-3xl text-left max-w-2xl mx-auto">
                        <h4 className="font-bold flex items-center gap-2 mb-3"><AlertTriangle size={18}/> How to import this:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm font-medium opacity-90">
                            <li>Go to <b>Inventory</b> module.</li>
                            <li>Click the <b>Import Excel + Images</b> button.</li>
                            <li>Upload the downloaded ZIP file directly.</li>
                            <li>Your products and images will sync automatically!</li>
                        </ol>
                        <button onClick={() => navigate('/inventory')} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-bold text-sm w-full">
                            Go to Inventory →
                        </button>
                    </div>

                    <button onClick={() => { setStep(1); setGeneratedProducts([]); }} className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        Start Over
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuickSetup;