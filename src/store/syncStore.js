import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  isSyncing: false,

  setOnlineStatus: (status) => set({ isOnline: status }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (status) => set({ isSyncing: status }),
}));

// Set up event listeners for network status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnlineStatus(true);
    // Sync logic will be triggered from a separate sync manager service
  });
  
  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnlineStatus(false);
  });
}
