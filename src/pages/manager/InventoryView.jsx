import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Search, Plus, Edit2, AlertTriangle, ScanLine } from 'lucide-react';

export default function InventoryView() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', barcode: '', currentQty: 0, minQty: 0, unit: '', costPerUnit: 0 });

  useEffect(() => {
    fetchInventory();
  }, [user?.branchId]);

  const fetchInventory = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const invRef = collection(db, `branches/${user.branchId}/inventory`);
      const snapshot = await getDocs(invRef);
      const items = [];
      snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
      setInventory(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user?.branchId || !newItem.name || !newItem.unit) return;
    
    try {
      const invRef = collection(db, `branches/${user.branchId}/inventory`);
      const docRef = await addDoc(invRef, {
        ...newItem,
        currentQty: Number(newItem.currentQty),
        minQty: Number(newItem.minQty),
        costPerUnit: Number(newItem.costPerUnit),
        updatedAt: new Date()
      });
      setInventory([...inventory, { id: docRef.id, ...newItem }]);
      setIsModalOpen(false);
      setNewItem({ name: '', barcode: '', currentQty: 0, minQty: 0, unit: '', costPerUnit: 0 });
    } catch (err) {
      console.error("Error adding item", err);
    }
  };

  const filtered = inventory.filter(i => 
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.barcode?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Inventory</h1>
          <p className="text-gray-500">Manage raw materials and track stock levels.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#6E4A32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5C3D28] transition-colors shadow-sm"
        >
          <Plus size={20} /> Add Item
        </button>
      </div>

      {inventory.some(i => i.currentQty <= i.minQty) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 text-lg">Low Stock Alerts</h3>
            <p className="text-red-700 text-sm">
              You have {inventory.filter(i => i.currentQty <= i.minQty).length} item(s) running low on stock. Please restock soon.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or scan barcode..." 
            className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-[#FAF8F5] text-[#2B1810] border border-gray-200 px-4 rounded-xl flex items-center gap-2 font-bold hover:bg-gray-50 transition-colors">
          <ScanLine size={20} /> Scan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-[#685E57]">Item Name</th>
              <th className="p-4 font-bold text-[#685E57]">Barcode</th>
              <th className="p-4 font-bold text-[#685E57]">Stock Level</th>
              <th className="p-4 font-bold text-[#685E57]">Unit Cost</th>
              <th className="p-4 font-bold text-[#685E57]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50 transition-colors">
                <td className="p-4 font-bold text-[#231F1D]">{item.name}</td>
                <td className="p-4 text-gray-500 font-mono text-sm">{item.barcode || '-'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${item.currentQty <= item.minQty ? 'text-red-600' : 'text-[#231F1D]'}`}>
                      {item.currentQty} {item.unit}
                    </span>
                    {item.currentQty <= item.minQty && (
                      <AlertTriangle size={16} className="text-red-500" title="Low Stock" />
                    )}
                  </div>
                </td>
                <td className="p-4 font-semibold text-[#6E4A32]">${item.costPerUnit || 0}</td>
                <td className="p-4">
                  <button className="text-gray-400 hover:text-[#6E4A32] p-2 rounded-lg hover:bg-[#F3EBE3] transition-colors">
                    <Edit2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-[#2B1810]">Add Inventory Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Item Name</label>
                <input 
                  type="text" required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Barcode (Optional)</label>
                  <input 
                    type="text"
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Unit (e.g. Kg, L)</label>
                  <input 
                    type="text" required
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Initial Qty</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newItem.currentQty} onChange={e => setNewItem({...newItem, currentQty: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Min Alert Qty</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newItem.minQty} onChange={e => setNewItem({...newItem, minQty: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Cost Per Unit</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newItem.costPerUnit} onChange={e => setNewItem({...newItem, costPerUnit: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold hover:bg-[#5C3D28] transition-colors shadow-lg">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
