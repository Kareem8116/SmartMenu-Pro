import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, doc, getDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Coffee, CheckCircle, Star, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { deductInventoryForOrder } from '../../services/inventory';
import ChatbotWidget from '../../components/qr/ChatbotWidget';
import { getUpsellSuggestion } from '../../services/ai';

export default function QRMenu() {
  const { branchId, tableId } = useParams();
  const { i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null); // 'pending', 'preparing', 'ready'
  const [activeOrderId, setActiveOrderId] = useState(null);
  
  const [upsellSuggestion, setUpsellSuggestion] = useState(null);
  const [isUpsellLoading, setIsUpsellLoading] = useState(false);

  // Fetch upsell when cart changes
  useEffect(() => {
    if (cart.length > 0 && isCartOpen && !upsellSuggestion) {
      setIsUpsellLoading(true);
      const simpleCart = cart.map(i => i.name);
      getUpsellSuggestion(simpleCart)
        .then(res => setUpsellSuggestion(res))
        .catch(console.error)
        .finally(() => setIsUpsellLoading(false));
    }
  }, [cart.length, isCartOpen]);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const branchDoc = await getDoc(doc(db, 'branches', branchId));
        if (branchDoc.exists()) {
          setBranchInfo(branchDoc.data());
        }
      } catch (e) {
        console.error("Error fetching branch:", e);
      }
    };
    fetchBranch();

    const menuRef = collection(db, `branches/${branchId}/menu`);
    const q = query(menuRef, where('isActive', '==', true));
    
    // Real-time listener to hide 86'd items immediately
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedItems = [];
      const cats = new Set();
      
      snapshot.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() };
        if (!item.is86ed) {
          fetchedItems.push(item);
          if (item.category) cats.add(item.category);
        }
      });
      
      setItems(fetchedItems);
      const catArray = Array.from(cats);
      setCategories(catArray);
      
      // Keep current active category if it still exists, else default to first
      setActiveCategory(prev => catArray.includes(prev) ? prev : (catArray[0] || ''));
      setLoading(false);
    }, (error) => {
      console.error("Error listening to QR menu:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [branchId]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const newQty = i.qty + delta;
          return newQty > 0 ? { ...i, qty: newQty } : i;
        }
        return i;
      }).filter(i => i.qty > 0);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const orderRef = collection(db, `branches/${branchId}/orders`);
      
      const newOrder = {
        branchId,
        type: 'dine-in',
        tableId,
        tableNumber: tableId,
        status: 'new',
        items: cart.map(item => ({
          ...item,
          quantity: item.qty,
          isDone: false
        })),
        totals: {
          subtotal: cartTotal,
          tax: 0,
          total: cartTotal
        },
        source: 'qr_menu',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(orderRef, newOrder);
      
      // Auto-deduct inventory
      deductInventoryForOrder(branchId, cart);

      setActiveOrderId(docRef.id);
      setOrderStatus('new');
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error("Failed to submit order", err);
      alert("Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [liveOrder, setLiveOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    let unsubscribe;
    if (activeOrderId) {
      const { onSnapshot } = require('firebase/firestore');
      const orderDoc = doc(db, `branches/${branchId}/orders`, activeOrderId);
      unsubscribe = onSnapshot(orderDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLiveOrder(data);
          setOrderStatus(data.status);
        }
      });
    }
    return () => unsubscribe && unsubscribe();
  }, [activeOrderId, branchId]);

  const submitRating = async (stars) => {
    setRating(stars);
    setHasRated(true);
    try {
      const { updateDoc } = require('firebase/firestore');
      const orderDoc = doc(db, `branches/${branchId}/orders`, activeOrderId);
      await updateDoc(orderDoc, { rating: stars });
      
      // If rating is < 3, create a review alert for Phase 10
      if (stars < 3) {
        const alertsRef = collection(db, `branches/${branchId}/alerts`);
        await addDoc(alertsRef, {
          type: 'review',
          text: `New ${stars}-star review on Table ${tableId}`,
          createdAt: serverTimestamp(),
          isRead: false
        });
      }
    } catch (err) {
      console.error("Failed to submit rating", err);
    }
  };

  const handleCallForBill = async () => {
    try {
      const { updateDoc } = require('firebase/firestore');
      const orderDoc = doc(db, `branches/${branchId}/orders`, activeOrderId);
      await updateDoc(orderDoc, { billRequested: true });
      alert("Waiter has been notified for the bill.");
    } catch (err) {
      console.error("Failed to call for bill", err);
    }
  };

  if (activeOrderId && liveOrder) {
    const isCompleted = orderStatus === 'ready' || orderStatus === 'served' || orderStatus === 'paid';
    
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#231F1D] flex flex-col" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-[#2B1810] text-white p-6 text-center shadow-md">
          <h1 className="font-bold text-2xl mb-1">{branchInfo?.name || 'SmartMenu'}</h1>
          <p className="text-gray-300">Table {tableId}</p>
        </div>
        
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-[#6E4A32] mb-2">
              {isCompleted ? 'Enjoy your meal!' : 'Order Received!'}
            </h2>
            <p className="text-gray-500 mb-8">
              {isCompleted ? 'Your order is ready.' : 'We are preparing your order.'}
            </p>
            
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${orderStatus === 'new' ? 'bg-[#B45309] text-white' : 'bg-green-600 text-white'}`}>1</div>
                <div className={`font-semibold ${orderStatus === 'new' ? 'text-black' : 'text-gray-500'}`}>Sent to Kitchen</div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${orderStatus === 'preparing' ? 'bg-[#B45309] text-white' : (isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500')}`}>2</div>
                <div className={`font-semibold ${orderStatus === 'preparing' ? 'text-black' : 'text-gray-500'}`}>Preparing</div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                <div className={`font-semibold ${isCompleted ? 'text-black' : 'text-gray-500'}`}>Ready</div>
              </div>
            </div>

            {isCompleted && !hasRated && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold mb-3 text-sm">How was your experience?</h3>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => submitRating(star)} className="text-gray-300 hover:text-yellow-400 focus:text-yellow-400">
                      <Star size={32} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {hasRated && (
              <div className="mb-8 p-3 text-green-700 bg-green-50 rounded-lg text-sm font-semibold">
                Thank you for your feedback!
              </div>
            )}
            
            <button 
              className="w-full bg-[#FAF8F5] text-[#6E4A32] border border-[#C5B9AE] py-4 rounded-xl font-bold shadow-sm disabled:opacity-50"
              onClick={handleCallForBill}
              disabled={liveOrder.billRequested}
            >
              {liveOrder.billRequested ? 'Waiter is on the way' : 'Call for Bill'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[#2B1810] text-white p-6 shadow-md rounded-b-[2rem]">
        <h1 className="font-bold text-2xl mb-1">{branchInfo?.name || 'Loading...'}</h1>
        <p className="text-gray-300 flex items-center gap-2">
          <Coffee size={16} /> Table {tableId}
        </p>
      </div>

      <div className="px-4 mt-6 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 min-w-max pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-bold transition-colors ${
                activeCategory === cat 
                  ? 'bg-[#B45309] text-white shadow-md' 
                  : 'bg-white text-[#6E4A32] border border-[#C5B9AE]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center p-10 text-gray-500">Loading Menu...</div>
        ) : (
          items.filter(i => i.category === activeCategory).map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Coffee size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-[#231F1D] leading-tight">
                    {i18n.language === 'ar' ? (item.nameAr || item.name) : item.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="font-bold text-[#6E4A32]">{item.price} {branchInfo?.currency || 'EGP'}</div>
                  <button 
                    onClick={() => addToCart(item)}
                    className="bg-[#FAF8F5] text-[#B45309] w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl hover:bg-[#B45309] hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#6E4A32] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </div>
              <span>View Order</span>
            </div>
            <div>{cartTotal.toFixed(2)} {branchInfo?.currency || 'EGP'}</div>
          </button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-xl text-[#231F1D]">Your Order</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-gray-500 hover:text-black font-bold p-2"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-[#FAF8F5] p-3 rounded-xl border border-[#C5B9AE]">
                  <div>
                    <div className="font-bold text-[#231F1D]">{i18n.language === 'ar' ? (item.nameAr || item.name) : item.name}</div>
                    <div className="text-sm text-[#6E4A32] font-semibold">{item.price} x {item.qty}</div>
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-[#C5B9AE] rounded-lg p-1 shadow-sm">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-bold text-gray-600">-</button>
                    <span className="font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-bold text-[#B45309]">+</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t bg-white pb-8">
              {/* Upsell Suggestion Banner */}
              {isUpsellLoading && (
                <div className="mb-4 bg-[#FAF8F5] border border-[#6E4A32] rounded-lg p-3 flex items-center justify-center text-sm text-[#6E4A32]">
                  <Loader2 className="animate-spin mr-2" size={16} /> AI is finding a perfect pairing...
                </div>
              )}
              {upsellSuggestion && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 shadow-sm">
                  <Star className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Chef's Suggestion</h4>
                    <p className="text-amber-800 text-xs mt-1">{upsellSuggestion.pitchMessage}</p>
                    <button 
                      onClick={() => {
                        setActiveCategory(upsellSuggestion.suggestedItemCategory || categories[0]);
                        setIsCartOpen(false);
                      }}
                      className="mt-2 text-xs font-bold text-[#6E4A32] underline"
                    >
                      Browse {upsellSuggestion.suggestedItemCategory}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4 text-lg">
                <span className="font-bold text-gray-500">Total</span>
                <span className="font-bold text-2xl text-[#2B1810]">{cartTotal.toFixed(2)} {branchInfo?.currency || 'EGP'}</span>
              </div>
              <button 
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full bg-[#15803D] hover:bg-[#166534] text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Widget */}
      <ChatbotWidget menuItems={items} />
    </div>
  );
}
