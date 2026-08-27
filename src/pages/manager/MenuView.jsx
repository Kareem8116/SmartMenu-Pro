import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function MenuView() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // New Item State
  const [newItem, setNewItem] = useState({
    name: '',
    nameAr: '',
    price: '',
    categoryId: 'hot',
    isActive: true,
    variants: [], // { name: 'Large', price: 10 }
    modifiers: [], // { name: 'Extra Shot', price: 15 }
    recipe: []
  });

  useEffect(() => {
    fetchMenu();
  }, [user?.branchId]);

  const fetchMenu = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const menuRef = collection(db, `branches/${user.branchId}/menu`);
      const snap = await getDocs(menuRef);
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setMenuItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!user?.branchId) return;
    try {
      const menuRef = collection(db, `branches/${user.branchId}/menu`);
      const dataToSave = {
        ...newItem,
        price: Number(newItem.price),
        updatedAt: new Date()
      };

      if (editingId) {
        const docRef = doc(db, `branches/${user.branchId}/menu`, editingId);
        await updateDoc(docRef, dataToSave);
        setMenuItems(prev => prev.map(m => m.id === editingId ? { id: editingId, ...dataToSave } : m));
      } else {
        const docRef = await addDoc(menuRef, dataToSave);
        setMenuItems([...menuItems, { id: docRef.id, ...dataToSave }]);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      const docRef = doc(db, `branches/${user.branchId}/menu`, id);
      await deleteDoc(docRef);
      setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name || '',
      nameAr: item.nameAr || '',
      price: item.price || '',
      categoryId: item.categoryId || 'hot',
      isActive: item.isActive ?? true,
      variants: item.variants || [],
      modifiers: item.modifiers || [],
      recipe: item.recipe || []
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setNewItem({
      name: '', nameAr: '', price: '', categoryId: 'hot', isActive: true, variants: [], modifiers: [], recipe: []
    });
  };

  // Modifier Helpers
  const addVariant = () => setNewItem(p => ({ ...p, variants: [...p.variants, { name: '', price: 0 }] }));
  const addModifier = () => setNewItem(p => ({ ...p, modifiers: [...p.modifiers, { name: '', price: 0 }] }));
  
  const updateVariant = (index, field, value) => {
    const v = [...newItem.variants];
    v[index][field] = field === 'price' ? Number(value) : value;
    setNewItem(p => ({ ...p, variants: v }));
  };
  const updateModifier = (index, field, value) => {
    const m = [...newItem.modifiers];
    m[index][field] = field === 'price' ? Number(value) : value;
    setNewItem(p => ({ ...p, modifiers: m }));
  };

  const removeVariant = (index) => setNewItem(p => ({ ...p, variants: p.variants.filter((_, i) => i !== index) }));
  const removeModifier = (index) => setNewItem(p => ({ ...p, modifiers: p.modifiers.filter((_, i) => i !== index) }));

  const filteredMenu = menuItems.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.nameAr?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Menu Management</h1>
          <p className="text-gray-500">Manage real menu items, categories, and modifiers.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#6E4A32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5C3D28]"
        >
          <Plus size={20} /> Add Item
        </button>
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
              <th className="p-4 font-bold text-[#685E57]">Name (EN/AR)</th>
              <th className="p-4 font-bold text-[#685E57]">Category</th>
              <th className="p-4 font-bold text-[#685E57]">Base Price</th>
              <th className="p-4 font-bold text-[#685E57]">Status</th>
              <th className="p-4 font-bold text-[#685E57]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredMenu.map(item => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50">
                <td className="p-4 font-bold text-[#231F1D]">{item.name} <br/><span className="text-sm text-gray-500">{item.nameAr}</span></td>
                <td className="p-4 text-gray-500 capitalize">{item.categoryId}</td>
                <td className="p-4 font-bold text-[#B45309]">{item.price} ج.م</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-[#6E4A32] p-2 hover:bg-[#F3EBE3] rounded-lg">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-[#2B1810]">{editingId ? 'Edit Item' : 'New Menu Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="menuForm" onSubmit={handleSaveItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#6E4A32] mb-1">Name (English)</label>
                    <input type="text" required className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6E4A32] mb-1">Name (Arabic)</label>
                    <input type="text" required className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl text-right" value={newItem.nameAr} onChange={e => setNewItem({...newItem, nameAr: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6E4A32] mb-1">Base Price</label>
                    <input type="number" required className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6E4A32] mb-1">Category</label>
                    <select required className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl" value={newItem.categoryId} onChange={e => setNewItem({...newItem, categoryId: e.target.value})}>
                      <option value="hot">Hot Drinks</option>
                      <option value="cold">Cold Drinks</option>
                      <option value="bakery">Bakery</option>
                      <option value="food">Food</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" checked={newItem.isActive} onChange={e => setNewItem({...newItem, isActive: e.target.checked})} id="isActive" />
                  <label htmlFor="isActive" className="font-bold text-[#2B1810]">Active / Available</label>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-[#2B1810]">Sizes / Variants</h3>
                    <button type="button" onClick={addVariant} className="text-[#B45309] text-sm font-bold">+ Add Size</button>
                  </div>
                  {newItem.variants.map((v, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="text" placeholder="Size Name (e.g. Large)" className="flex-1 p-2 bg-[#FAF8F5] border border-gray-200 rounded-lg" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required />
                      <input type="number" placeholder="Additional Price" className="w-32 p-2 bg-[#FAF8F5] border border-gray-200 rounded-lg" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required />
                      <button type="button" onClick={() => removeVariant(i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-[#2B1810]">Modifiers / Add-ons</h3>
                    <button type="button" onClick={addModifier} className="text-[#B45309] text-sm font-bold">+ Add Modifier</button>
                  </div>
                  {newItem.modifiers.map((m, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="text" placeholder="Modifier (e.g. Extra Shot)" className="flex-1 p-2 bg-[#FAF8F5] border border-gray-200 rounded-lg" value={m.name} onChange={e => updateModifier(i, 'name', e.target.value)} required />
                      <input type="number" placeholder="Price" className="w-32 p-2 bg-[#FAF8F5] border border-gray-200 rounded-lg" value={m.price} onChange={e => updateModifier(i, 'price', e.target.value)} required />
                      <button type="button" onClick={() => removeModifier(i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>

              </form>
            </div>
            <div className="p-6 border-t border-gray-100 bg-white">
              <button form="menuForm" type="submit" className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold hover:bg-[#5C3D28] shadow-lg">
                Save Menu Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
