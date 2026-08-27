import Dexie from 'dexie';

export const db = new Dexie('SmartMenuProDB');

db.version(1).stores({
  categories: 'id, branchId, sortOrder, isActive',
  menu: 'id, branchId, categoryId, isActive, isAvailable',
  pending_orders: 'id, branchId, status, createdAt, orderType' // status: 'pending', 'syncing', 'failed'
});

db.version(2).stores({
  categories: 'id, branchId, sortOrder, isActive',
  menu: 'id, branchId, categoryId, isActive, isAvailable',
  pending_orders: 'id, branchId, status, createdAt, orderType',
  customers: 'id, branchId, phone' // Phase 7: Offline customer lookup
});

// Helper functions for offline data management
export const offlineDB = {
  // Save menu snapshot for offline use
  async cacheMenuSnapshot(categories, menuItems) {
    await db.transaction('rw', db.categories, db.menu, async () => {
      await db.categories.clear();
      await db.menu.clear();
      if (categories?.length) await db.categories.bulkPut(categories);
      if (menuItems?.length) await db.menu.bulkPut(menuItems);
    });
  },

  // Save customers snapshot for offline CRM
  async cacheCustomersSnapshot(customers) {
    await db.transaction('rw', db.customers, async () => {
      await db.customers.clear();
      if (customers?.length) await db.customers.bulkPut(customers);
    });
  },

  // Add order to local offline queue
  async queueOrder(orderData) {
    await db.pending_orders.put({
      ...orderData,
      status: 'pending',
      retryCount: 0,
      queuedAt: new Date().toISOString()
    });
  },

  // Get all pending orders that need syncing
  async getPendingOrders() {
    return await db.pending_orders.where('status').anyOf('pending', 'failed').toArray();
  },

  // Mark order as syncing
  async markOrderSyncing(id) {
    await db.pending_orders.update(id, { status: 'syncing' });
  },

  // Mark order as failed
  async markOrderFailed(id, error) {
    const order = await db.pending_orders.get(id);
    if (order) {
      await db.pending_orders.update(id, { 
        status: 'failed', 
        lastError: error,
        retryCount: (order.retryCount || 0) + 1
      });
    }
  },

  // Remove successfully synced order
  async removeSyncedOrder(id) {
    await db.pending_orders.delete(id);
  }
};
