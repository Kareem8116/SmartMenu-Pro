import { collection, doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';
import { db as dexieDb } from './db';
import { useSyncStore } from '../store/syncStore';

export const customerService = {
  /**
   * Search for a customer by phone number (Offline-First via Dexie)
   */
  async getCustomerByPhone(branchId, phone) {
    if (!branchId || !phone) return null;
    
    // Search Dexie first (works offline & extremely fast)
    const customers = await dexieDb.customers
      .where('branchId')
      .equals(branchId)
      .filter(c => c.phone === phone)
      .toArray();
      
    if (customers.length > 0) {
      return customers[0];
    }
    
    return null;
  },

  /**
   * Add a new customer
   */
  async createCustomer(branchId, customerData) {
    if (!branchId) throw new Error("Branch ID is required");
    
    // Check if phone already exists
    const existing = await this.getCustomerByPhone(branchId, customerData.phone);
    if (existing) {
      throw new Error("Customer with this phone number already exists.");
    }

    const newCustomerRef = doc(collection(firestore, `branches/${branchId}/customers`));
    const newCustomer = {
      ...customerData,
      branchId,
      loyaltyPoints: 0,
      walletBalance: 0,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: serverTimestamp()
    };

    await setDoc(newCustomerRef, newCustomer);
    return { id: newCustomerRef.id, ...newCustomer };
  },

  /**
   * Update customer loyalty points and stats after an order
   */
  async updateCustomerStats(branchId, customerId, orderTotal, pointsEarned) {
    if (!branchId || !customerId) return;
    
    const customerRef = doc(firestore, `branches/${branchId}/customers`, customerId);
    await updateDoc(customerRef, {
      totalOrders: increment(1),
      totalSpent: increment(orderTotal),
      loyaltyPoints: increment(pointsEarned)
    }).catch(err => {
      console.error("Failed to update customer stats:", err);
    });
  }
};
