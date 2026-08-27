import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from './firebase';
import { offlineDB } from './db';
import { useSyncStore } from '../store/syncStore';
import { customerService } from './customers';

export const SyncManager = {
  // Add a new order (handles offline routing automatically)
  async placeOrder(orderData, branchId) {
    const isOnline = useSyncStore.getState().isOnline;

    const payload = {
      ...orderData,
      branchId,
      status: 'new', // new, preparing, ready, served
      createdAt: new Date().toISOString(),
      // Add serverTimestamp if online, otherwise we rely on the local ISO string
      timestamp: isOnline ? serverTimestamp() : new Date().getTime(),
    };

    if (isOnline) {
      try {
        // Push directly to Firebase
        await addDoc(collection(firestore, `branches/${branchId}/orders`), payload);
        
        // Update table status if applicable
        if (orderData.tableId) {
          const tableRef = doc(firestore, `branches/${branchId}/tables`, orderData.tableId);
          // If the order is fully paid, the table becomes empty, else occupied
          const isFullyPaid = orderData.payments && orderData.payments.reduce((acc, p) => acc + p.amount, 0) >= orderData.totals.total;
          await updateDoc(tableRef, { status: isFullyPaid ? 'empty' : 'occupied' });
        }

        // Phase 7: Update customer loyalty points (1 point per 10 EGP)
        if (orderData.customerId) {
          const pointsEarned = Math.floor(orderData.totals.total / 10);
          await customerService.updateCustomerStats(branchId, orderData.customerId, orderData.totals.total, pointsEarned);
        }

        return { success: true, offline: false };
      } catch (error) {
        console.error("Firebase push failed, falling back to offline queue:", error);
        // Fallback to offline queue
      }
    }

    // Offline / Fallback
    await offlineDB.queueOrder(payload);
    await this.updatePendingCount();
    
    // Attempt sync in background just in case we are actually online but it failed temporarily
    if (isOnline) {
      this.syncPendingOrders();
    }
    
    return { success: true, offline: true };
  },

  // Update the Zustand count for UI
  async updatePendingCount() {
    const pending = await offlineDB.getPendingOrders();
    useSyncStore.getState().setPendingCount(pending.length);
  },

  // Push pending orders to Firebase
  async syncPendingOrders() {
    const state = useSyncStore.getState();
    if (!state.isOnline || state.isSyncing) return;

    const pending = await offlineDB.getPendingOrders();
    if (pending.length === 0) return;

    useSyncStore.getState().setSyncing(true);

    for (const order of pending) {
      try {
        await offlineDB.markOrderSyncing(order.id);
        
        // Push to Firebase
        const { id, queuedAt, status, retryCount, lastError, ...firebasePayload } = order;
        
        await addDoc(collection(firestore, `branches/${order.branchId}/orders`), {
          ...firebasePayload,
          syncedAt: serverTimestamp(),
        });

        // Phase 7: Update customer loyalty points (1 point per 10 EGP)
        if (order.customerId) {
          const pointsEarned = Math.floor(order.totals.total / 10);
          await customerService.updateCustomerStats(order.branchId, order.customerId, order.totals.total, pointsEarned);
        }

        // Remove from local queue
        await offlineDB.removeSyncedOrder(id);
      } catch (error) {
        console.error("Failed to sync order", order.id, error);
        await offlineDB.markOrderFailed(order.id, error.message);
      }
    }

    useSyncStore.getState().setSyncing(false);
    await this.updatePendingCount();
  }
};

// Auto-trigger sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    SyncManager.syncPendingOrders();
  });
}
