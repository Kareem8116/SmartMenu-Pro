import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Trash2 } from 'lucide-react';

export default function WasteView() {
  const { user } = useAuth();
  const [wasteLogs, setWasteLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWaste, setNewWaste] = useState({ inventoryId: '', qty: '', reason: '' });

  useEffect(() => {
    fetchData();
  }, [user?.branchId]);

  const fetchData = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      // Fetch waste logs
      const wasteRef = collection(db, `branches/${user.branchId}/waste`);
      const wSnap = await getDocs(wasteRef);
      const wItems = [];
      wSnap.forEach(d => wItems.push({ id: d.id, ...d.data() }));
      setWasteLogs(wItems.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));

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

  const handleLogWaste = async (e) => {
    e.preventDefault();
    if (!user?.branchId || !newWaste.inventoryId || !newWaste.qty) return;

    try {
      const invItem = inventory.find(i => i.id === newWaste.inventoryId);
      const qty = Number(newWaste.qty);
      const cost = (invItem?.costPerUnit || 0) * qty;

      // Add waste log
      const wasteRef = collection(db, `branches/${user.branchId}/waste`);
      const logRef = await addDoc(wasteRef, {
        inventoryId: newWaste.inventoryId,
        itemName: invItem.name,
        qty: qty,
        unit: invItem.unit,
        cost: cost,
        reason: newWaste.reason,
        createdAt: serverTimestamp(),
        loggedBy: user.email
      });

      // Deduct from inventory
      const itemRef = doc(db, `branches/${user.branchId}/inventory`, newWaste.inventoryId);
      await updateDoc(itemRef, {
        currentQty: increment(-qty)
      });

      // Update local state
      setWasteLogs([{
        id: logRef.id,
        inventoryId: newWaste.inventoryId,
        itemName: invItem.name,
        qty: qty,
        unit: invItem.unit,
        cost: cost,
        reason: newWaste.reason,
        createdAt: { toDate: () => new Date() },
        loggedBy: user.email
      }, ...wasteLogs]);
      
      setInventory(prev => prev.map(i => i.id === newWaste.inventoryId ? { ...i, currentQty: i.currentQty - qty } : i));
      
      setIsModalOpen(false);
      setNewWaste({ inventoryId: '', qty: '', reason: '' });
    } catch (err) {
      console.error("Error logging waste", err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Waste Management</h1>
          <p className="text-gray-500">Log spoiled or wasted items to deduct them from inventory.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus size={20} /> Log Waste
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-[#685E57]">Date</th>
              <th className="p-4 font-bold text-[#685E57]">Item</th>
              <th className="p-4 font-bold text-[#685E57]">Quantity</th>
              <th className="p-4 font-bold text-[#685E57]">Cost Lost</th>
              <th className="p-4 font-bold text-[#685E57]">Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : wasteLogs.map(log => (
              <tr key={log.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50 transition-colors">
                <td className="p-4 text-gray-500 text-sm">
                  {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}
                </td>
                <td className="p-4 font-bold text-[#231F1D]">{log.itemName}</td>
                <td className="p-4 font-bold text-red-600">-{log.qty} {log.unit}</td>
                <td className="p-4 font-semibold text-[#6E4A32]">${log.cost?.toFixed(2)}</td>
                <td className="p-4 text-sm text-gray-600">{log.reason}</td>
              </tr>
            ))}
            {!loading && wasteLogs.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No waste logged yet. Good job!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 size={24} /> Log Waste
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <form onSubmit={handleLogWaste} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Select Item</label>
                <select 
                  required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newWaste.inventoryId} onChange={e => setNewWaste({...newWaste, inventoryId: e.target.value})}
                >
                  <option value="">-- Choose Ingredient --</option>
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.name} (Max: {inv.currentQty} {inv.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Quantity Lost</label>
                <input 
                  type="number" step="0.01" required min="0.01"
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newWaste.qty} onChange={e => setNewWaste({...newWaste, qty: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Reason</label>
                <input 
                  type="text" required placeholder="e.g. Spoiled, Dropped, Expired"
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newWaste.reason} onChange={e => setNewWaste({...newWaste, reason: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg">
                  Submit Waste Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
