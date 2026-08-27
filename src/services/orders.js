import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Subscribes to all active orders for a specific branch.
 * Active orders are those that have not yet been marked as 'ready', 'served', or 'cancelled'.
 * 
 * @param {string} branchId - The ID of the branch.
 * @param {function} onUpdate - Callback function receiving the array of orders.
 * @returns {function} unsubscribe function.
 */
export const subscribeToActiveOrders = (branchId, onUpdate) => {
  if (!branchId) return () => {};

  const ordersRef = collection(db, `branches/${branchId}/orders`);
  // Listen for 'new' and 'preparing' orders
  const q = query(
    ordersRef,
    where('status', 'in', ['new', 'preparing'])
  );

  return onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach((docSnap) => {
      orders.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // Sort by creation time (oldest first)
    // Fallback to local timestamp if serverTimestamp is still pending
    orders.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    onUpdate(orders);
  }, (error) => {
    console.error("Error listening to orders:", error);
  });
};

/**
 * Updates the overall status of an order.
 * 
 * @param {string} branchId 
 * @param {string} orderId 
 * @param {string} newStatus - 'preparing', 'ready', 'served', 'cancelled'
 */
export const updateOrderStatus = async (branchId, orderId, newStatus) => {
  const orderRef = doc(db, `branches/${branchId}/orders`, orderId);
  const payload = { 
    status: newStatus,
    updatedAt: serverTimestamp() 
  };
  
  // Track timestamps for analytics
  if (newStatus === 'preparing') payload.preparingAt = serverTimestamp();
  if (newStatus === 'ready') payload.readyAt = serverTimestamp();
  
  await updateDoc(orderRef, payload);
};

/**
 * Toggles the 'done' status of a specific item within an order ticket.
 * 
 * @param {string} branchId 
 * @param {string} orderId 
 * @param {Array} currentItems - The current array of items in the order
 * @param {number} itemIndex - The index of the item to toggle
 * @param {boolean} isDone - The new status
 */
export const updateOrderItemStatus = async (branchId, orderId, currentItems, itemIndex, isDone) => {
  const orderRef = doc(db, `branches/${branchId}/orders`, orderId);
  
  // Create a new array with the updated item
  const updatedItems = [...currentItems];
  updatedItems[itemIndex] = {
    ...updatedItems[itemIndex],
    isDone
  };

  await updateDoc(orderRef, { 
    items: updatedItems,
    updatedAt: serverTimestamp()
  });
};
