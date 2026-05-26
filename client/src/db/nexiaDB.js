import Dexie from 'dexie';

const db = new Dexie('NexiaCoreDB');

db.version(1).stores({
  // Products cache — for offline POS search
  products: '_id, shopId, name, barcode, sku, category, price, stock, status',

  // Pending orders — created offline, synced when online
  pendingOrders: '++id, shopId, createdAt, syncStatus, billNumber',

  // Customers cache — for credit lookup offline
  customers: '_id, shopId, name, phone, creditBalance',

  // Sync queue — tracks what needs to be sent to server
  syncQueue: '++id, type, data, createdAt, attempts, status'
});

export default db;