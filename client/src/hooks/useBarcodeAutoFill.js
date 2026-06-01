import { useState, useCallback, useRef } from 'react';
import API from '../services/api';

export const useBarcodeAutoFill = () => {
    const [lookupState, setLookupState] = useState({
        loading: false,
        found: false,
        notFound: false,
        alreadyExists: false,
        data: null,
        error: null
    });

    const debounceRef = useRef(null);

    const lookupBarcode = useCallback(async (barcode) => {
        setLookupState({ loading: false, found: false, notFound: false, alreadyExists: false, data: null, error: null });

        const clean = barcode?.trim().replace(/\D/g, '');
        if (!clean || clean.length < 8 || clean.length > 14) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setLookupState(prev => ({ ...prev, loading: true }));

            try {
                const res = await API.get(`/products/barcode-lookup/${clean}`);
                const { source, alreadyExists, product } = res.data;

                if (alreadyExists) {
                    setLookupState({ loading: false, found: false, notFound: false, alreadyExists: true, data: product, error: null });
                } else if (source === 'openfoodfacts') {
                    setLookupState({ loading: false, found: true, notFound: false, alreadyExists: false, data: product, error: null });
                } else {
                    setLookupState({ loading: false, found: false, notFound: true, alreadyExists: false, data: product, error: null });
                }
            } catch (error) {
                setLookupState({
                    loading: false, found: false, notFound: false, alreadyExists: false, data: null,
                    error: 'Lookup failed. Enter product details manually.'
                });
            }
        }, 500); // 500ms delay to wait until typing stops
    }, []);

    const resetLookup = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setLookupState({ loading: false, found: false, notFound: false, alreadyExists: false, data: null, error: null });
    }, []);

    return { lookupState, lookupBarcode, resetLookup };
};