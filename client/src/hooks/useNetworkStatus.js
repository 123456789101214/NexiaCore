import { useEffect } from 'react';
import useOfflineStore from '../store/offlineStore';

export const useNetworkStatus = () => {
  const { setOnlineStatus, syncPendingOrders, cacheProducts, cacheCustomers } = useOfflineStore();

  useEffect(() => {
    const handleOnline = async () => {
        // Get FRESH references at call time
        const { setOnlineStatus, syncPendingOrders, cacheProducts } =
            useOfflineStore.getState(); // ← not from hook
        setOnlineStatus(true);
        await syncPendingOrders();
        await cacheProducts();
    };

    const handleOffline = () => {
        useOfflineStore.getState().setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache
    if (navigator.onLine) {
        const { cacheProducts, cacheCustomers } = useOfflineStore.getState();
        cacheProducts();
        cacheCustomers();
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}, []);

  return useOfflineStore((state) => state.isOnline);
};