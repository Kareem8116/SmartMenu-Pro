import { useState } from 'react';
import { X, CreditCard, Banknote, Wallet, Award, Tag, Clock } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', labelAr: 'نقدي', icon: Banknote, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'card', label: 'Card', labelAr: 'كارت', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'wallet', label: 'Wallet', labelAr: 'محفظة', icon: Wallet, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'loyalty', label: 'Loyalty Points', labelAr: 'نقاط', icon: Award, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'coupon', label: 'Coupon', labelAr: 'كوبون', icon: Tag, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'credit', label: 'On Credit', labelAr: 'آجل', icon: Clock, color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

export default function PaymentModal({ isOpen, onClose, totals, customer, onConfirmPayment }) {
  const [payments, setPayments] = useState([]); // Array of { method, amount }
  const [activeMethod, setActiveMethod] = useState(null);
  const [inputAmount, setInputAmount] = useState('');
  const [couponCode, setCouponCode] = useState('');

  if (!isOpen) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totals.total - totalPaid);
  const change = Math.max(0, totalPaid - totals.total);
  const isFullyPaid = totalPaid >= totals.total;

  const addPayment = (method) => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0) return;

    // Validations
    if (method === 'loyalty' && customer) {
      // Can't use more points than available (1 point = 1 EGP for redemption)
      const maxRedeemable = customer.loyaltyPoints || 0;
      if (amount > maxRedeemable) {
        alert(`Customer only has ${maxRedeemable} loyalty points`);
        return;
      }
    }
    if (method === 'wallet' && customer) {
      const maxWallet = customer.walletBalance || 0;
      if (amount > maxWallet) {
        alert(`Customer wallet balance is ${maxWallet} EGP`);
        return;
      }
    }

    setPayments([...payments, { method, amount, couponCode: method === 'coupon' ? couponCode : undefined }]);
    setInputAmount('');
    setCouponCode('');
    setActiveMethod(null);
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!isFullyPaid) return;
    onConfirmPayment(payments, change);
  };

  const handleQuickPay = (method) => {
    // Pay the full remaining amount with one method
    if (remaining <= 0) return;
    setPayments([...payments, { method, amount: remaining }]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-xl text-[#2B1810]">Payment</h2>
            <p className="text-sm text-[#685E57]">Total: <span className="font-bold text-[#2B1810]">{totals.total.toFixed(2)} ج.م</span></p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black p-1">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Payment Methods - Quick Buttons */}
          <div>
            <h3 className="text-xs font-bold text-[#685E57] uppercase tracking-wider mb-2">Quick Pay (Full Amount)</h3>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(0, 3).map(pm => (
                <button
                  key={pm.id}
                  onClick={() => handleQuickPay(pm.id)}
                  disabled={remaining <= 0}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 font-bold text-sm transition-colors disabled:opacity-40 ${pm.color} hover:shadow-md`}
                >
                  <pm.icon size={20} />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Payment - Choose Method */}
          <div>
            <h3 className="text-xs font-bold text-[#685E57] uppercase tracking-wider mb-2">Split / Partial Payment</h3>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setActiveMethod(pm.id === activeMethod ? null : pm.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition-colors ${
                    activeMethod === pm.id ? 'border-[#6E4A32] bg-[#F3EBE3] text-[#2B1810]' : `${pm.color}`
                  }`}
                >
                  <pm.icon size={16} />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input (when a method is selected for partial) */}
          {activeMethod && (
            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#2B1810] capitalize">{activeMethod} Amount</span>
                <span className="text-xs text-[#685E57]">Remaining: {remaining.toFixed(2)} ج.م</span>
              </div>
              {activeMethod === 'coupon' && (
                <input
                  type="text"
                  placeholder="Coupon code"
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#6E4A32]"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              )}
              <div className="flex gap-2">
                <input
                  type="number" min="0" step="0.01"
                  placeholder="Amount"
                  className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#6E4A32]"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => addPayment(activeMethod)}
                  disabled={!inputAmount || parseFloat(inputAmount) <= 0}
                  className="bg-[#6E4A32] text-white px-4 rounded-lg font-bold text-sm hover:bg-[#5C3D28] disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Applied Payments */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#685E57] uppercase tracking-wider mb-2">Applied Payments</h3>
              <div className="space-y-2">
                {payments.map((p, i) => {
                  const pm = PAYMENT_METHODS.find(m => m.id === p.method);
                  return (
                    <div key={i} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        {pm && <pm.icon size={16} className="text-[#685E57]" />}
                        <span className="font-semibold text-sm capitalize">{p.method}</span>
                        {p.couponCode && <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{p.couponCode}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2B1810]">{p.amount.toFixed(2)} ج.م</span>
                        <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-[#FAF8F5] border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#685E57]">Total</span>
            <span className="font-bold text-[#2B1810]">{totals.total.toFixed(2)} ج.م</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#685E57]">Paid</span>
            <span className="font-bold text-green-600">{totalPaid.toFixed(2)} ج.م</span>
          </div>
          {remaining > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-500 font-semibold">Remaining</span>
              <span className="font-bold text-red-500">{remaining.toFixed(2)} ج.م</span>
            </div>
          )}
          {change > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-semibold">Change</span>
              <span className="font-bold text-green-600">{change.toFixed(2)} ج.م</span>
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!isFullyPaid}
            className="w-full mt-2 bg-[#15803D] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#166534] transition-colors shadow-md"
          >
            {isFullyPaid ? 'Confirm Payment' : `${remaining.toFixed(2)} ج.م remaining`}
          </button>
        </div>
      </div>
    </div>
  );
}
