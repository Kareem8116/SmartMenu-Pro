import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Search, Edit2, Plus, Trash2 } from 'lucide-react';

export default function RecipesView() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [recipeItems, setRecipeItems] = useState([]); // [{ inventoryId, qty }]
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.branchId]);

  const fetchData = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      // Fetch menu
      const menuRef = collection(db, `branches/${user.branchId}/menu`);
      const menuSnap = await getDocs(menuRef);
      const mItems = [];
      menuSnap.forEach(d => mItems.push({ id: d.id, ...d.data() }));
      setMenuItems(mItems);

      // Fetch inventory
      const invRef = collection(db, `branches/${user.branchId}/inventory`);
      const invSnap = await getDocs(invRef);
      const iItems = [];
      invSnap.forEach(d => iItems.push({ id: d.id, ...d.data() }));
      setInventory(iItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openRecipe = (item) => {
    setSelectedMenu(item);
    setRecipeItems(item.recipe || []);
    setIsModalOpen(true);
  };

  const saveRecipe = async () => {
    try {
      const docRef = doc(db, `branches/${user.branchId}/menu`, selectedMenu.id);
      await updateDoc(docRef, { recipe: recipeItems });
      
      setMenuItems(prev => prev.map(m => m.id === selectedMenu.id ? { ...m, recipe: recipeItems } : m));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving recipe", err);
    }
  };

  const addRecipeItem = (inventoryId) => {
    if (!inventoryId) return;
    if (recipeItems.find(r => r.inventoryId === inventoryId)) return;
    setRecipeItems([...recipeItems, { inventoryId, qty: 1 }]);
  };

  const updateRecipeQty = (inventoryId, newQty) => {
    setRecipeItems(prev => prev.map(r => r.inventoryId === inventoryId ? { ...r, qty: Number(newQty) } : r));
  };

  const removeRecipeItem = (inventoryId) => {
    setRecipeItems(prev => prev.filter(r => r.inventoryId !== inventoryId));
  };

  const filteredMenu = menuItems.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Recipes</h1>
          <p className="text-gray-500">Link menu items to inventory ingredients for auto-deduction.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search menu items..." 
            className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-[#685E57]">Menu Item</th>
              <th className="p-4 font-bold text-[#685E57]">Category</th>
              <th className="p-4 font-bold text-[#685E57]">Recipe Ingredients</th>
              <th className="p-4 font-bold text-[#685E57]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredMenu.map(item => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50 transition-colors">
                <td className="p-4 font-bold text-[#231F1D]">{item.name}</td>
                <td className="p-4 text-gray-500">{item.category}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {item.recipe?.length > 0 ? (
                      item.recipe.map(r => {
                        const invItem = inventory.find(i => i.id === r.inventoryId);
                        return invItem ? (
                          <span key={r.inventoryId} className="bg-[#F3EBE3] text-[#6E4A32] text-xs px-2 py-1 rounded-md font-semibold">
                            {invItem.name} ({r.qty}{invItem.unit})
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-gray-400 italic text-sm">No recipe linked</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => openRecipe(item)}
                    className="text-[#B45309] hover:bg-[#F3EBE3] p-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm"
                  >
                    <Edit2 size={16} /> Edit Recipe
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredMenu.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <div>
                <h2 className="text-xl font-bold text-[#2B1810]">Edit Recipe</h2>
                <p className="text-gray-500 text-sm">Menu Item: {selectedMenu.name}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-2">Add Ingredient</label>
                <div className="flex gap-2">
                  <select 
                    id="ingredientSelect"
                    className="flex-1 p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  >
                    <option value="">-- Select Inventory Item --</option>
                    {inventory.filter(i => !recipeItems.find(r => r.inventoryId === i.id)).map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById('ingredientSelect');
                      if (sel.value) addRecipeItem(sel.value);
                      sel.value = "";
                    }}
                    className="bg-[#6E4A32] text-white px-4 rounded-xl font-bold hover:bg-[#5C3D28]"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#2B1810] mb-3">Recipe Ingredients ({recipeItems.length})</h3>
                {recipeItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 border border-dashed rounded-xl">No ingredients added yet.</div>
                ) : (
                  <div className="space-y-3">
                    {recipeItems.map(ri => {
                      const invItem = inventory.find(i => i.id === ri.inventoryId);
                      if (!invItem) return null;
                      return (
                        <div key={ri.inventoryId} className="flex items-center justify-between bg-[#FAF8F5] p-3 rounded-xl border border-gray-200">
                          <div className="font-bold text-[#2B1810]">{invItem.name}</div>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" step="0.01" 
                              className="w-24 p-2 bg-white border border-gray-200 rounded-lg text-center font-bold"
                              value={ri.qty}
                              onChange={(e) => updateRecipeQty(ri.inventoryId, e.target.value)}
                            />
                            <span className="text-gray-500 font-semibold w-8">{invItem.unit}</span>
                            <button 
                              onClick={() => removeRecipeItem(ri.inventoryId)}
                              className="text-red-400 hover:text-red-600 p-2"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <button 
                onClick={saveRecipe}
                className="w-full bg-[#15803D] text-white py-4 rounded-xl font-bold hover:bg-[#166534] transition-colors shadow-lg"
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
