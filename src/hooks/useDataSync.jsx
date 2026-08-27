import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../services/firebase';
import { offlineDB } from '../services/db';
import { useAuth } from './useAuth';

export function useDataSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.branchId) return;

    let unsubscribeMenu = () => {};
    let unsubscribeCustomers = () => {};

    const syncMenu = async () => {
      try {
        const menuRef = collection(firestore, `branches/${user.branchId}/menu`);
        
        unsubscribeMenu = onSnapshot(menuRef, async (snapshot) => {
          const items = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({ id: doc.id, branchId: user.branchId, ...data });
          });
          
          await offlineDB.cacheMenuSnapshot([], items); 
        });
      } catch (error) {
        console.error("Failed to setup menu sync:", error);
      }
    };

    const syncCustomers = async () => {
      try {
        const custRef = collection(firestore, `branches/${user.branchId}/customers`);
        
        unsubscribeCustomers = onSnapshot(custRef, async (snapshot) => {
          const customers = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            customers.push({ id: doc.id, branchId: user.branchId, ...data });
          });
          
          await offlineDB.cacheCustomersSnapshot(customers); 
        });
      } catch (error) {
        console.error("Failed to setup customers sync:", error);
      }
    };

    syncMenu();
    syncCustomers();

    return () => {
      unsubscribeMenu();
      unsubscribeCustomers();
    };
  }, [user?.branchId]);
}
