import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Check, Truck } from 'lucide-react';

export default function SuppliersView() {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newPO, setNewPO] = useState({ supplierId: '', inventoryId: '', qty: '', cost: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchData();
  }, [user?.branchId]);

  const fetchData = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const posRef = collection(db, `branches/${user.branchId}/purchaseOrders`);
      const poSnap = await getDocs(posRef);
      const pItems = [];
      poSnap.forEach(d => pItems.push({ id: d.id, ...d.data() }));
      setPurchaseOrders(pItems.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));

      const suppRef = collection(db, `branches/${user.branchId}/suppliers`);
      const suppSnap = await getDocs(suppRef);
      const sItems = [];
      suppSnap.forEach(d => sItems.push({ id: d.id, ...d.data() }));
      setSuppliers(sItems);

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

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!user?.branchId || !newSupplier.name) return;
    try {
      const suppRef = collection(db, `branches/${user.branchId}/suppliers`);
      const docRef = await addDoc(suppRef, newSupplier);
      setSuppliers([...suppliers, { id: docRef.id, ...newSupplier }]);
      setIsSupplierModalOpen(false);
      setNewSupplier({ name: '', phone: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!user?.branchId || !newPO.supplierId || !newPO.inventoryId || !newPO.qty) return;
    try {
      const posRef = collection(db, `branches/${user.branchId}/purchaseOrders`);
      const supp = suppliers.find(s => s.id === newPO.supplierId);
      const inv = inventory.find(i => i.id === newPO.inventoryId);
      
      const poData = {
        supplierId: supp.id,
        supplierName: supp.name,
        inventoryId: inv.id,
        itemName: inv.name,
        qty: Number(newPO.qty),
        unit: inv.unit,
        cost: Number(newPO.cost),
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(posRef, poData);
      setPurchaseOrders([{ id: docRef.id, ...poData, createdAt: { toDate: () => new Date() } }, ...purchaseOrders]);
      setIsModalOpen(false);
      setNewPO({ supplierId: '', inventoryId: '', qty: '', cost: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceivePO = async (po) => {
    try {
      const poRef = doc(db, `branches/${user.branchId}/purchaseOrders`, po.id);
      await updateDoc(poRef, { status: 'received', receivedAt: serverTimestamp() });
      
      const invRef = doc(db, `branches/${user.branchId}/inventory`, po.inventoryId);
      await updateDoc(invRef, { currentQty: increment(po.qty) });

      setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'received' } : p));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#2B1810]">Purchase Orders</h1>
          <p className="text-gray-500">Manage suppliers and track incoming stock.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSupplierModalOpen(true)}
            className="bg-white text-[#6E4A32] border border-[#6E4A32] px-5 py-2.5 rounded-xl font-bold hover:bg-[#F3EBE3] transition-colors shadow-sm"
          >
            Add Supplier
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#6E4A32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5C3D28] transition-colors shadow-sm"
          >
            <Plus size={20} /> Create PO
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-[#685E57]">Date</th>
              <th className="p-4 font-bold text-[#685E57]">Supplier</th>
              <th className="p-4 font-bold text-[#685E57]">Item</th>
              <th className="p-4 font-bold text-[#685E57]">Qty</th>
              <th className="p-4 font-bold text-[#685E57]">Total Cost</th>
              <th className="p-4 font-bold text-[#685E57]">Status</th>
              <th className="p-4 font-bold text-[#685E57]">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : purchaseOrders.map(po => (
              <tr key={po.id} className="border-b border-gray-50 hover:bg-[#FAF8F5]/50 transition-colors">
                <td className="p-4 text-gray-500 text-sm">
                  {po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                </td>
                <td className="p-4 font-bold text-[#231F1D]">{po.supplierName}</td>
                <td className="p-4 font-bold text-[#231F1D]">{po.itemName}</td>
                <td className="p-4 font-bold text-green-600">+{po.qty} {po.unit}</td>
                <td className="p-4 font-semibold text-[#6E4A32]">${po.cost?.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${po.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {po.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {po.status === 'pending' && (
                    <button 
                      onClick={() => handleReceivePO(po)}
                      className="bg-green-600 text-white p-2 rounded-lg font-bold flex items-center gap-1 text-xs hover:bg-green-700"
                    >
                      <Check size={14} /> Receive
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && purchaseOrders.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No purchase orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-[#2B1810]">Add Supplier</h2>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Supplier Name</label>
                <input 
                  type="text" required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Phone Number</label>
                <input 
                  type="text" required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold hover:bg-[#5C3D28] transition-colors shadow-lg">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="text-xl font-bold text-[#2B1810]">Create Purchase Order</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black font-bold">X</button>
            </div>
            <form onSubmit={handleCreatePO} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Supplier</label>
                <select 
                  required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newPO.supplierId} onChange={e => setNewPO({...newPO, supplierId: e.target.value})}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6E4A32] mb-1">Inventory Item</label>
                <select 
                  required
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                  value={newPO.inventoryId} onChange={e => setNewPO({...newPO, inventoryId: e.target.value})}
                >
                  <option value="">-- Select Item --</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Quantity</label>
                  <input 
                    type="number" step="0.01" required min="0.01"
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newPO.qty} onChange={e => setNewPO({...newPO, qty: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#6E4A32] mb-1">Total Cost</label>
                  <input 
                    type="number" step="0.01" required min="0"
                    className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32]"
                    value={newPO.cost} onChange={e => setNewPO({...newPO, cost: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold hover:bg-[#5C3D28] transition-colors shadow-lg">
                  Submit PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
