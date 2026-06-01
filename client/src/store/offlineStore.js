import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import db from '../db/nexiaDB';
import API from '../services/api';

const useOfflineStore = create(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncAt: null,
      pendingOrdersCount: 0,
      isSyncing: false,

      setOnlineStatus: (status) => set({ isOnline: status }),

      cacheProducts: async () => {
        try {
          const res = await API.get('/products?limit=500');
          const products = res.data.data;
          await db.products.clear();
          await db.products.bulkPut(products);
          set({ lastSyncAt: new Date().toISOString() });
          console.log(`✅ Cached ${products.length} products for offline use`);
        } catch (error) {
          console.log('Could not cache products (offline?)');
        }
      },

      cacheCustomers: async () => {
        try {
          const res = await API.get('/customers');
          await db.customers.clear();
          await db.customers.bulkPut(res.data.data);
        } catch (error) {
          console.log('Could not cache customers');
        }
      },

      saveOfflineOrder: async (orderData) => {
        const offlineOrder = {
          ...orderData,
          syncStatus: 'pending',
          offlineId: `OFFLINE-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        await db.pendingOrders.add(offlineOrder);
        const count = await db.pendingOrders.where('syncStatus').equals('pending').count();
        set({ pendingOrdersCount: count });
        return offlineOrder;
      },

      syncPendingOrders: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });

        try {
          const pendingOrders = await db.pendingOrders
            .where('syncStatus').equals('pending')
            .toArray();

          console.log(`Syncing ${pendingOrders.length} pending orders...`);

          for (const order of pendingOrders) {
            try {
              // Max 3 attempts
              if ((order.attempts || 0) >= 3) {
                await db.pendingOrders.update(order.id, { syncStatus: 'failed' })
                continue
              }
              const { id, syncStatus, offlineId, attempts, ...orderPayload } = order;
              await API.post('/orders', orderPayload);
              await db.pendingOrders.update(order.id, { syncStatus: 'synced' });
            } catch (error) {
              if (error.response) {
                // Server error → permanent fail
                await db.pendingOrders.update(order.id, {
                  syncStatus: 'failed',
                  syncError: error.response.data.error
                });
              } else {
                // Network error → increment attempts, retry next time
                await db.pendingOrders.update(order.id, {
                  attempts: (order.attempts || 0) + 1
                });
              }
            }
          }

          const remainingCount = await db.pendingOrders
            .where('syncStatus').equals('pending').count();
          set({ pendingOrdersCount: remainingCount, lastSyncAt: new Date().toISOString() });
        } finally {
          set({ isSyncing: false });
        }
      },

      refreshPendingCount: async () => {
        const count = await db.pendingOrders
          .where('syncStatus').equals('pending').count();
        set({ pendingOrdersCount: count });
      }
    }),
    {
      name: 'nexia-offline-storage',
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        pendingOrdersCount: state.pendingOrdersCount
      })
    }
  )
);

export default useOfflineStore;