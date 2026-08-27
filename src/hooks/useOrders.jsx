import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToActiveOrders, updateOrderStatus, updateOrderItemStatus } from '../services/orders';

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need a branchId to fetch orders
    if (!user?.branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToActiveOrders(user.branchId, (updatedOrders) => {
      setOrders(updatedOrders);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user?.branchId]);

  // Expose easy-to-use mutators that abstract away the branchId
  const markAsPreparing = async (orderId) => {
    if (!user?.branchId) return;
    await updateOrderStatus(user.branchId, orderId, 'preparing');
  };

  const markAsReady = async (orderId) => {
    if (!user?.branchId) return;
    await updateOrderStatus(user.branchId, orderId, 'ready');
  };

  const toggleItemDone = async (orderId, currentItems, itemIndex, isDone) => {
    if (!user?.branchId) return;
    await updateOrderItemStatus(user.branchId, orderId, currentItems, itemIndex, isDone);
  };

  return {
    orders,
    loading,
    markAsPreparing,
    markAsReady,
    toggleItemDone
  };
}
