import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Deduct inventory based on order items and their recipes
 */
export const deductInventoryForOrder = async (branchId, items) => {
  if (!branchId || !items || items.length === 0) return;

  try {
    // 1. We need to fetch the menu items to get their recipes
    // Since we don't have the recipe in the cart item itself, we fetch the menu
    const menuRef = collection(db, `branches/${branchId}/menu`);
    const menuSnap = await getDocs(menuRef);
    const menuMap = new Map();
    menuSnap.forEach(docSnap => {
      menuMap.set(docSnap.id, docSnap.data());
    });

    // 2. Calculate total inventory deductions
    const deductions = new Map(); // inventoryId -> totalQtyToDeduct

    items.forEach(cartItem => {
      const menuItem = menuMap.get(cartItem.id);
      if (menuItem && menuItem.recipe && Array.isArray(menuItem.recipe)) {
        menuItem.recipe.forEach(recipeIngredient => {
          const invId = recipeIngredient.inventoryId;
          const qtyToDeduct = Number(recipeIngredient.qty) * Number(cartItem.qty);
          
          if (deductions.has(invId)) {
            deductions.set(invId, deductions.get(invId) + qtyToDeduct);
          } else {
            deductions.set(invId, qtyToDeduct);
          }
        });
      }
    });

    // 3. Apply deductions to Firestore
    const promises = [];
    for (const [invId, totalQty] of deductions.entries()) {
      const invRef = doc(db, `branches/${branchId}/inventory`, invId);
      promises.push(
        updateDoc(invRef, {
          currentQty: increment(-totalQty)
        }).catch(err => {
          console.error(`Failed to deduct ${totalQty} from ${invId}`, err);
        })
      );
    }

    await Promise.all(promises);
    console.log("Inventory auto-deducted successfully.");
  } catch (error) {
    console.error("Error in auto-deduction logic:", error);
  }
};
