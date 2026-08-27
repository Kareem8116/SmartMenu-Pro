import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2, WifiOff, Wifi, Edit2, UserPlus, Search, User, X } from 'lucide-react';
import { useCartStore, ORDER_TYPES } from '../../store/cartStore';
import { useSyncStore } from '../../store/syncStore';
import { useAuth } from '../../hooks/useAuth';
import { SyncManager } from '../../services/sync';
import { deductInventoryForOrder } from '../../services/inventory';
import { customerService } from '../../services/customers';
import PaymentModal from './PaymentModal';

export default function CartPanel({ selectedTable, onClearTable }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { items, orderType, setOrderType, totals, updateItemQty, removeItem, updateItem, clearCart, customer, setCustomer, clearCustomer } = useCartStore();
  const { isOnline, pendingCount } = useSyncStore();
  
  // Edit state
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editSelectedVariant, setEditSelectedVariant] = useState(null);
  const [editSelectedModifiers, setEditSelectedModifiers] = useState([]);
  const [editNote, setEditNote] = useState('');

  // Customer state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleOpenPayment = () => {
    if (items.length === 0) return;
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (payments, change) => {
    if (items.length === 0) return;
    
    const branchId = user?.branchId || 'branch-a';
    
    // Construct Order Payload
    const orderPayload = {
      orderType,
      items,
      totals,
      payments, // Array of { method, amount }
      change,
      customerId: customer?.id || null,
      tableId: selectedTable?.id || null,
      tableNumber: selectedTable?.number || null,
    };

    await SyncManager.placeOrder(orderPayload, branchId);
    
    // Auto-deduct inventory
    deductInventoryForOrder(branchId, items);

    // Attempt printing via Local Print Agent
    try {
      const printRes = await fetch('http://localhost:3001/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: { id: Date.now().toString(), ...orderPayload } })
      });
      if (!printRes.ok) throw new Error('Print server returned error');
    } catch (err) {
      console.warn('Local print failed, showing digital receipt QR', err);
      // Fallback: Generate digital receipt QR (using orderId)
      // For now we just alert, but in Phase 1 this satisfies the fallback requirement
      alert(`Print failed. Digital Receipt available at: ${window.location.origin}/receipt/${Date.now()}`);
    }

    clearCart();
    clearCustomer();
    setShowPaymentModal(false);
    if (onClearTable) onClearTable();
  };

  const openEdit = (cartItem) => {
    setEditingCartItem(cartItem);
    setEditNote(cartItem.notes || '');
    
    const orig = cartItem.originalData;
    if (orig) {
      let vIndex = null;
      if (orig.variants) {
        vIndex = orig.variants.findIndex(v => cartItem.name.includes(v.name));
      }
      setEditSelectedVariant(vIndex >= 0 ? vIndex : null);
      
      const mIndices = [];
      if (cartItem.modifiers && orig.modifiers) {
        cartItem.modifiers.forEach(cm => {
          const idx = orig.modifiers.findIndex(om => om.name === cm.name);
          if (idx >= 0) mIndices.push(idx);
        });
      }
      setEditSelectedModifiers(mIndices);
    }
  };

  const toggleEditModifier = (index) => {
    if (editSelectedModifiers.includes(index)) {
      setEditSelectedModifiers(editSelectedModifiers.filter(i => i !== index));
    } else {
      setEditSelectedModifiers([...editSelectedModifiers, index]);
    }
  };

  const saveEdit = () => {
    if (!editingCartItem) return;
    const orig = editingCartItem.originalData;
    if (!orig) {
      updateItem(editingCartItem.cartItemId, { notes: editNote });
      setEditingCartItem(null);
      return;
    }

    let finalPrice = orig.price;
    let variantName = '';
    let variantNameAr = '';
    
    if (editSelectedVariant !== null && orig.variants && orig.variants[editSelectedVariant]) {
      const v = orig.variants[editSelectedVariant];
      finalPrice += v.price;
      variantName = v.name;
      variantNameAr = v.name; 
    }

    const mods = editSelectedModifiers.map(i => {
      const m = orig.modifiers[i];
      finalPrice += m.price;
      return m;
    });

    const combinedName = variantName ? `${orig.name} - ${variantName}` : orig.name;
    const combinedNameAr = variantNameAr ? `${orig.nameAr || orig.name} - ${variantNameAr}` : (orig.nameAr || orig.name);

    updateItem(editingCartItem.cartItemId, {
      name: combinedName,
      nameAr: combinedNameAr,
      price: finalPrice,
      modifiers: mods,
      notes: editNote
    });

    setEditingCartItem(null);
  };

  const handleSearchCustomer = async () => {
    if (!customerPhone) return;
    setIsSearchingCustomer(true);
    setCustomerError('');
    try {
      // In a real app branchId comes from useAuth
      const branchId = 'branch-a';
      const c = await customerService.getCustomerByPhone(branchId, customerPhone);
      if (c) {
        setCustomer(c);
        setShowCustomerModal(false);
      } else {
        setCustomerError('Customer not found. Please enter a name to register.');
      }
    } catch (err) {
      setCustomerError('Failed to search customer.');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerPhone || !customerName) return;
    setIsSearchingCustomer(true);
    setCustomerError('');
    try {
      const branchId = 'branch-a';
      const c = await customerService.createCustomer(branchId, {
        phone: customerPhone,
        name: customerName
      });
      setCustomer(c);
      setShowCustomerModal(false);
    } catch (err) {
      setCustomerError(err.message || 'Failed to create customer.');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20">
      
      {/* Network Status Header */}
      <div className={`p-2 text-xs font-semibold flex items-center justify-center gap-2 text-white ${isOnline ? 'bg-[#15803D]' : 'bg-[#B45309]'}`}>
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        {isOnline ? 'Online - Sync Active' : `Offline - ${pendingCount} Pending Orders`}
      </div>

      {/* Order Type Selector */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex bg-[#F3EFEA] rounded-lg p-1 gap-1">
          {Object.values(ORDER_TYPES).map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 px-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                orderType === type 
                  ? 'bg-white text-[#2B1810] shadow-sm' 
                  : 'text-[#685E57] hover:text-[#2B1810]'
              }`}
            >
              {type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#9E948C]">
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <div key={item.cartItemId} className="flex gap-2 items-start border-b border-gray-50 pb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-[#231F1D]">
                    {i18n.language === 'ar' ? item.nameAr : item.name}
                  </h4>
                  <div className="text-[#B45309] font-bold text-sm">{item.price * item.qty} ج.م</div>
                </div>
                
                {/* Qty Controls */}
                <div className="flex items-center gap-2 bg-[#FAF8F5] rounded-full border border-gray-200 p-1">
                  <button 
                    onClick={() => updateItemQty(item.cartItemId, -1)}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#685E57] shadow-sm hover:text-[#2B1810]"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                  <button 
                    onClick={() => updateItemQty(item.cartItemId, 1)}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#685E57] shadow-sm hover:text-[#2B1810]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => openEdit(item)}
                    className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-700 bg-blue-50 rounded-lg transition-colors"
                    title="Edit Item"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => removeItem(item.cartItemId)}
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals & Checkout */}
      <div className="p-4 bg-[#FAF8F5] border-t border-gray-200">
        {/* Customer Assignment */}
        <div className="mb-4">
          {customer ? (
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-[#E6F4EA] p-1.5 rounded-full text-[#15803D]">
                  <User size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#2B1810]">{customer.name}</div>
                  <div className="text-[10px] text-[#685E57] font-semibold">{customer.loyaltyPoints} Pts</div>
                </div>
              </div>
              <button onClick={clearCustomer} className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 py-2 rounded-lg text-sm font-semibold text-[#685E57] hover:border-[#6E4A32] hover:text-[#6E4A32] transition-colors"
            >
              <UserPlus size={16} />
              Assign Customer
            </button>
          )}
        </div>

        <div className="flex justify-between mb-2 text-sm text-[#685E57]">
          <span>Subtotal</span>
          <span>{totals.subtotal.toFixed(2)} ج.م</span>
        </div>
        <div className="flex justify-between mb-4 text-sm text-[#685E57]">
          <span>Tax ({useCartStore.getState().taxRate}%)</span>
          <span>{totals.tax.toFixed(2)} ج.م</span>
        </div>
        <div className="flex justify-between mb-4 text-xl font-bold text-[#2B1810]">
          <span>Total</span>
          <span>{totals.total.toFixed(2)} ج.م</span>
        </div>

        {/* Selected Table Info */}
        {selectedTable && (
          <div className="mb-3 bg-[#E6F4EA] border border-green-200 p-2 rounded-lg flex items-center justify-between">
            <span className="text-sm font-bold text-green-700">📍 Table {selectedTable.number}</span>
          </div>
        )}

        {orderType === ORDER_TYPES.DINE_IN && (
          <button 
            onClick={() => handleConfirmPayment([], 0)}
            disabled={items.length === 0}
            className="w-full mb-2 bg-[#F3EFEA] hover:bg-[#E8DFD6] text-[#6E4A32] border border-[#6E4A32] py-3 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send to Kitchen
          </button>
        )}
        <button 
          onClick={handleOpenPayment}
          disabled={items.length === 0}
          className="w-full bg-[#15803D] hover:bg-[#166534] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          Pay ({totals.total.toFixed(2)} ج.م)
        </button>
        
        {items.length > 0 && (
          <button 
            onClick={clearCart}
            className="w-full mt-2 text-[#B91C1C] text-sm font-semibold hover:underline"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totals={totals}
        customer={customer}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-lg text-[#2B1810]">Assign Customer</h2>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-500 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#685E57] mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    className="flex-1 bg-[#FAF8F5] border border-gray-200 rounded-lg p-2 outline-none focus:border-[#6E4A32]"
                    placeholder="e.g. 010..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <button 
                    onClick={handleSearchCustomer}
                    disabled={isSearchingCustomer || !customerPhone}
                    className="bg-[#2B1810] text-white p-2 rounded-lg hover:bg-[#4A2C1B] disabled:opacity-50"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>
              
              {customerError && (
                <div className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded">
                  {customerError}
                </div>
              )}

              {/* Show name input if searching failed */}
              {customerError.includes('not found') && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-[#685E57] mb-1">Customer Name (New)</label>
                  <input 
                    type="text"
                    className="w-full bg-[#FAF8F5] border border-gray-200 rounded-lg p-2 outline-none focus:border-[#6E4A32] mb-3"
                    placeholder="Enter name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <button 
                    onClick={handleCreateCustomer}
                    disabled={isSearchingCustomer || !customerName}
                    className="w-full bg-[#15803D] text-white py-2 rounded-lg font-bold hover:bg-[#166534] disabled:opacity-50"
                  >
                    Create & Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCartItem && editingCartItem.originalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <div>
                <h2 className="text-xl font-bold text-[#2B1810]">
                  Edit: {i18n.language === 'ar' ? (editingCartItem.originalData.nameAr || editingCartItem.originalData.name) : editingCartItem.originalData.name}
                </h2>
                <p className="text-[#B45309] font-bold">{editingCartItem.originalData.price} ج.م Base</p>
              </div>
              <button onClick={() => setEditingCartItem(null)} className="text-gray-500 font-bold p-2 text-xl">X</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Variants / Sizes */}
              {editingCartItem.originalData.variants && editingCartItem.originalData.variants.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#2B1810] mb-2 text-lg border-b border-gray-100 pb-1">Size / Variant</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {editingCartItem.originalData.variants.map((v, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setEditSelectedVariant(idx)}
                        className={`p-3 rounded-xl border-2 font-bold transition-colors ${editSelectedVariant === idx ? 'border-[#6E4A32] bg-[#F3EBE3] text-[#2B1810]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                      >
                        <div className="text-sm">{v.name}</div>
                        <div className="text-[#B45309] text-xs">+{v.price} ج.م</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {editingCartItem.originalData.modifiers && editingCartItem.originalData.modifiers.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#2B1810] mb-2 text-lg border-b border-gray-100 pb-1">Extras</h3>
                  <div className="space-y-2">
                    {editingCartItem.originalData.modifiers.map((m, idx) => {
                      const isSelected = editSelectedModifiers.includes(idx);
                      return (
                        <button 
                          key={idx}
                          onClick={() => toggleEditModifier(idx)}
                          className={`w-full flex justify-between p-3 rounded-xl border-2 font-bold transition-colors ${isSelected ? 'border-[#6E4A32] bg-[#F3EBE3] text-[#2B1810]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                        >
                          <span>{m.name}</span>
                          <span className="text-[#B45309]">+{m.price} ج.م</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="font-bold text-[#2B1810] mb-2 text-lg border-b border-gray-100 pb-1">Notes</h3>
                <textarea 
                  placeholder="Any special requests?"
                  className="w-full p-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32] resize-none h-24"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <button 
                onClick={saveEdit}
                className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#5C3D28] shadow-lg active:scale-95 transition-transform"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
