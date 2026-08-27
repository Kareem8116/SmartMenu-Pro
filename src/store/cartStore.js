import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export const ORDER_TYPES = {
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
  DRIVE_THRU: 'drive_thru'
};

const calculateTotals = (items, taxRate = 14) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      orderType: ORDER_TYPES.DINE_IN,
      orderInfo: {}, // tableNumber, customerName, customerPhone, etc.
      customer: null, // { id, name, phone, loyaltyPoints }
      taxRate: 14, // Default, should be synced from branch config
      
      // Totals
      totals: { subtotal: 0, tax: 0, total: 0 },

      // Actions
      setCustomer: (customerData) => {
        set({ customer: customerData });
      },
      clearCustomer: () => {
        set({ customer: null });
      },

      setOrderType: (type) => {
        set({ orderType: type });
      },

      setOrderInfo: (info) => {
        set((state) => ({ orderInfo: { ...state.orderInfo, ...info } }));
      },

      setTaxRate: (rate) => {
        set((state) => {
          const totals = calculateTotals(state.items, rate);
          return { taxRate: rate, totals };
        });
      },

      addItem: (product) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.productId === product.id && 
                      JSON.stringify(item.modifiers) === JSON.stringify(product.modifiers) // Match exact modifiers if any
          );

          let newItems = [...state.items];
          
          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].qty += 1;
          } else {
            newItems.push({
              cartItemId: uuidv4(),
              productId: product.id,
              name: product.name,
              nameAr: product.nameAr,
              price: product.price,
              qty: 1,
              notes: product.notes || '',
              modifiers: product.modifiers || []
            });
          }

          return { 
            items: newItems,
            totals: calculateTotals(newItems, state.taxRate)
          };
        });
      },

      updateItemQty: (cartItemId, change) => {
        set((state) => {
          const newItems = state.items.map(item => {
            if (item.cartItemId === cartItemId) {
              const newQty = Math.max(1, item.qty + change);
              return { ...item, qty: newQty };
            }
            return item;
          });
          return { 
            items: newItems,
            totals: calculateTotals(newItems, state.taxRate)
          };
        });
      },

      updateItem: (cartItemId, updatedItem) => {
        set((state) => {
          const newItems = state.items.map(item => {
            if (item.cartItemId === cartItemId) {
              return { ...item, ...updatedItem };
            }
            return item;
          });
          return { 
            items: newItems,
            totals: calculateTotals(newItems, state.taxRate)
          };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => {
          const newItems = state.items.filter(item => item.cartItemId !== cartItemId);
          return { 
            items: newItems,
            totals: calculateTotals(newItems, state.taxRate)
          };
        });
      },

      clearCart: () => {
        set({ items: [], orderInfo: {}, totals: { subtotal: 0, tax: 0, total: 0 } });
      }
    }),
    {
      name: 'smartmenu-cart-storage',
      // Only persist these fields so a refresh doesn't lose the cart
      partialize: (state) => ({ 
        items: state.items, 
        orderType: state.orderType, 
        orderInfo: state.orderInfo, 
        customer: state.customer,
        totals: state.totals 
      }),
    }
  )
);
