import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Trash2, Edit2, X, Check, Users, LayoutGrid } from 'lucide-react';

const TABLE_STATUSES = {
  EMPTY: 'empty',
  OCCUPIED: 'occupied',
  BILL_REQUESTED: 'bill_requested',
  RESERVED: 'reserved'
};

const STATUS_COLORS = {
  [TABLE_STATUSES.EMPTY]: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', label: 'Empty' },
  [TABLE_STATUSES.OCCUPIED]: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', label: 'Occupied' },
  [TABLE_STATUSES.BILL_REQUESTED]: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', label: 'Bill Requested' },
  [TABLE_STATUSES.RESERVED]: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', label: 'Reserved' },
};

export default function FloorPlan({ onSelectTable, activeTableId }) {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  useEffect(() => {
    if (!user?.branchId) return;

    const tablesRef = collection(db, `branches/${user.branchId}/tables`);
    const unsub = onSnapshot(tablesRef, (snapshot) => {
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.number || 0) - (b.number || 0));
      setTables(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.branchId]);

  const handleAddTable = async () => {
    if (!newTableNumber || !user?.branchId) return;
    await addDoc(collection(db, `branches/${user.branchId}/tables`), {
      number: parseInt(newTableNumber),
      capacity: parseInt(newTableCapacity) || 4,
      status: TABLE_STATUSES.EMPTY,
      branchId: user.branchId,
      currentOrderId: null,
      createdAt: serverTimestamp()
    });
    setNewTableNumber('');
    setNewTableCapacity(4);
    setShowAddModal(false);
  };

  const handleDeleteTable = async (tableId) => {
    if (!user?.branchId) return;
    await deleteDoc(doc(db, `branches/${user.branchId}/tables`, tableId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E4A32]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Floor Plan Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <LayoutGrid size={20} className="text-[#6E4A32]" />
          <h2 className="font-bold text-lg text-[#2B1810]">Floor Plan</h2>
          <span className="text-xs text-[#685E57] bg-[#F3EFEA] px-2 py-1 rounded-full font-semibold">
            {tables.length} Tables
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Legend */}
          <div className="hidden md:flex items-center gap-3 mr-4">
            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${val.bg} border ${val.border}`}></div>
                <span className="text-xs text-[#685E57]">{val.label}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${isEditMode ? 'bg-[#6E4A32] text-white' : 'bg-[#F3EFEA] text-[#6E4A32] hover:bg-[#E8DFD6]'}`}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </button>
          {isEditMode && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#15803D] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-[#166534]"
            >
              <Plus size={14} /> Add Table
            </button>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-auto p-4 bg-[#FAFAF8]">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#9E948C]">
            <LayoutGrid size={48} className="mb-4 opacity-30" />
            <p className="font-semibold">No tables yet</p>
            <p className="text-sm">Click "Edit" then "Add Table" to start</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {tables.map(table => {
              const status = STATUS_COLORS[table.status] || STATUS_COLORS[TABLE_STATUSES.EMPTY];
              const isActive = activeTableId === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => !isEditMode && onSelectTable(table)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all min-h-[100px] ${
                    isActive 
                      ? 'border-[#6E4A32] bg-[#F3EBE3] shadow-lg scale-105' 
                      : `${status.bg} ${status.border} hover:shadow-md`
                  } ${isEditMode ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                >
                  {isEditMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <span className="text-2xl font-bold text-[#2B1810]">{table.number}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Users size={12} className="text-[#685E57]" />
                    <span className="text-xs text-[#685E57] font-semibold">{table.capacity}</span>
                  </div>
                  <span className={`text-[10px] font-bold mt-1 ${status.text} uppercase tracking-wide`}>
                    {status.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#FAF8F5] border-b border-gray-100">
              <h3 className="font-bold text-lg text-[#2B1810]">Add Table</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#685E57] block mb-1">Table Number</label>
                <input 
                  type="number" min="1"
                  className="w-full bg-[#FAF8F5] border border-gray-200 rounded-lg p-2 outline-none focus:border-[#6E4A32]"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#685E57] block mb-1">Capacity (seats)</label>
                <input 
                  type="number" min="1" max="20"
                  className="w-full bg-[#FAF8F5] border border-gray-200 rounded-lg p-2 outline-none focus:border-[#6E4A32]"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-[#685E57] font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddTable} className="flex-1 py-2 rounded-lg bg-[#6E4A32] text-white font-semibold hover:bg-[#5C3D28]">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
