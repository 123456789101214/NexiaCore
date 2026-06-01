import React from 'react';
import { Loader2, Search, AlertTriangle, CheckCircle, Package, X } from 'lucide-react';

const BarcodeAutoFillBadge = ({ lookupState, onApply, onDismiss }) => {
    if (!lookupState.loading && !lookupState.found && !lookupState.notFound && !lookupState.alreadyExists && !lookupState.error) {
        return null;
    }

    if (lookupState.loading) {
        return (
            <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 text-xs font-medium animate-pulse">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                Searching Global Database...
            </div>
        );
    }

    if (lookupState.alreadyExists) {
        return (
            <div className="flex items-start gap-2 mt-2 text-amber-700 dark:text-amber-400 text-xs p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold block">Already in Inventory!</span>
                    "{lookupState.data.name}" is already saved.
                </div>
            </div>
        );
    }

    if (lookupState.found && lookupState.data) {
        const { name, category, image } = lookupState.data;
        return (
            <div className="mt-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-3 flex flex-col gap-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                        {image ? (
                            <img src={image} alt={name} className="w-10 h-10 rounded-lg object-cover border border-emerald-200 dark:border-emerald-700" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-500">
                                <Package size={20} />
                            </div>
                        )}
                        <div>
                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} /> Product Found
                            </div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{name}</div>
                            <div className="text-xs text-slate-500">{category}</div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => onApply(lookupState.data)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                    >
                        Auto-Fill Details
                    </button>
                    <button 
                        type="button"
                        onClick={onDismiss}
                        className="px-3 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    if (lookupState.notFound) {
        return (
            <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Search size={14} className="shrink-0" />
                Not found in global database. Please enter manually.
            </div>
        );
    }

    if (lookupState.error) {
        return <div className="text-red-500 text-xs mt-2 font-medium">{lookupState.error}</div>;
    }

    return null;
};

export default BarcodeAutoFillBadge;