import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, ArrowRightLeft } from 'lucide-react';

export default function TransfersView() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({ toBranchId: '', inventoryId: '', qty: '' });

  useEffect(() => {
    fetchData();
  }, [user?.branchId]);

  const fetchData = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      // Mock other branches for now, in reality fetch from 'branches' collection
      setBranches([
        { id: 'branch-b', name: 'Mall Branch' },
        { id: 'branch-c', name: 'Airport Branch' }
      ]);

      const transRef = collection(db, `branches/${user.branchId}/transfers`);
      const tSnap = await getDocs(transRef);
      const tItems = [];
      tSnap.forEach(d => tItems.push({ id: d.id, ...d.data() }));
      setTransfers(tItems.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));

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

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!user?.branchId || !newTransfer.toBranchId || !newTransfer.inventoryId || !newTransfer.qty) return;

    try {
      const invItem = inventory.find(i => i.id === newTransfer.inventoryId);
      const targetBranch = branches.find(b => b.id === newTransfer.toBranchId);
      const qty = Number(newTransfer.qty);

      if (invItem.currentQty < qty) {
        alert("Not enough stock in current branch.");
        return;
      }

      // 1. Deduct from current branch
      const sourceRef = doc(db, `branches/${user.branchId}/inventory`, invItem.id);
      await updateDoc(sourceRef, { currentQty: increment(-qty) });

      // 2. Add to target branch (Assuming same item ID exists, else we'd need to sync or find by name)
      // For Phase 5 scope, we just write to target branch's inventory
      const targetRef = doc(db, `branches/${targetBranch.id}/inventory`, invItem.id);
      try {
        await updateDoc(targetRef, { currentQty: increment(qty) });
      } catch (err) {
        // If it doesn't exist, create it
        const targetInvCol = collection(db, `branches/${targetBranch.id}/inventory`);
        await addDoc(targetInvCol, {
          name: invItem.name, unit: invItem.unit, currentQty: qty, minQty: 0, costPerUnit: invItem.costPerUnit, updatedAt: new Date()
        });
      }

      // 3. Log Transfer
      const transRef = collection(db, `branches/${user.branchId}/transfers`);
      const tData = {
        toBranchId: targetBranch.id,
        toBranchName: targetBranch.name,
        inventoryId: invItem.id,
        itemName: invItem.name,
        qty: qty,
        unit: invItem.unit,
        createdAt: serverTimestamp(),
        status: 'completed'
      };
      const docRef = await addDoc(transRef, tData);
      
      setTransfers([{ id: docRef.id, ...tData, createdAt: { toDate: () => new Date() } }, ...transfers]);
      setInventory(prev => prev.map(i => i.id === invItem.id ? { ...i, currentQty: i.currentQty - qty } : i));
      setIsModalOpen(false);
      setNewTransfer({ toBranchId: '', inventoryId: '', qty: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to create transfer.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Stock Transfers</h1>
          <p className="text-gray-500">Transfer inventory between branches securely.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#6E4A32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5C3D28] transition-colors shadow-sm"
        >
          <ArrowRightLeft size={20} /> New Transfer
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-[#685E57]">Date</th>
              <th className="p-4 font-bold text-[#685E57]">To Branch</th>
              <th className="p-4 font-bold text-[#685E57]">Item</th>
              <th className="p-4 font-bold text-[#685E57]">Qty Transferred</th>
              <th className="p-4 font-bold text-[#685E57]">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : transfers.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50 transition-colors">
                <td className="p-4 text-gray-500 text-sm">
                  {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}
                </td>
                <td className="p-4 font-bold text-[#231F1D]">{t.toBranchName}</td>
                <td className="p-4 font-bold text-[#231F1D]">{t.itemName}</td>
                <td className="p-4 font-bold text-[#B45309]">{t.qty} {t.unit}</td>
                <td className="p-4">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">COMPLETED</span>
                </td>
              </tr>
            ))}
            {!loading && transfers.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No transfers recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-[#2B1810] flex items-center gap-2">
                <ArrowRightLeft size={20} /> New Transfer
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Target Branch</label>
                <select 
                  required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newTransfer.toBranchId} onChange={e => setNewTransfer({...newTransfer, toBranchId: e.target.value})}
                >
                  <option value="">-- Select Destination --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Inventory Item</label>
                <select 
                  required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newTransfer.inventoryId} onChange={e => setNewTransfer({...newTransfer, inventoryId: e.target.value})}
                >
                  <option value="">-- Choose Ingredient --</option>
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.name} (Available: {inv.currentQty} {inv.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Quantity to Transfer</label>
                <input 
                  type="number" step="0.01" required min="0.01"
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newTransfer.qty} onChange={e => setNewTransfer({...newTransfer, qty: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold hover:bg-[#5C3D28] transition-colors shadow-lg">
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
