import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as dexieDb } from '../../services/db';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../hooks/useAuth';

export default function MenuGrid({ activeCategory, language }) {
  const { user } = useAuth();
  const addItem = useCartStore(state => state.addItem);
  
  // Use Dexie for offline-first menu loading
  const menuItems = useLiveQuery(
    () => {
      if (!user?.branchId) return [];
      return dexieDb.menu
        .where('branchId')
        .equals(user.branchId)
        .filter(item => item.isActive)
        .toArray();
    },
    [user?.branchId],
    [] // default value while loading
  );
  
  const loading = menuItems === undefined; // If undefined, it's still loading (though with default [] it might not be undefined, but useLiveQuery returns undefined initially if no default provided. Since we provided [], we can just say loading is false, but let's check if it's empty)
  
  // Modifiers state
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null); // index
  const [selectedModifiers, setSelectedModifiers] = useState([]); // indices
  const [note, setNote] = useState('');

  const handleItemClick = (item) => {
    const hasVariants = item.variants && item.variants.length > 0;
    const hasModifiers = item.modifiers && item.modifiers.length > 0;
    
    if (hasVariants || hasModifiers) {
      setSelectedItem(item);
      setSelectedVariant(hasVariants ? 0 : null);
      setSelectedModifiers([]);
      setNote('');
    } else {
      // Simple item, add directly
      addItem({
        id: item.id,
        name: item.name,
        nameAr: item.nameAr || item.name,
        price: item.price,
        originalData: item
      });
    }
  };

  const toggleModifier = (index) => {
    if (selectedModifiers.includes(index)) {
      setSelectedModifiers(selectedModifiers.filter(i => i !== index));
    } else {
      setSelectedModifiers([...selectedModifiers, index]);
    }
  };

  const handleAddToCart = () => {
    let finalPrice = selectedItem.price;
    let variantName = '';
    let variantNameAr = '';
    
    if (selectedVariant !== null && selectedItem.variants[selectedVariant]) {
      const v = selectedItem.variants[selectedVariant];
      finalPrice += v.price;
      variantName = v.name;
      variantNameAr = v.name; // Assuming same name for demo, or we could add nameAr to variants
    }

    const mods = selectedModifiers.map(i => {
      const m = selectedItem.modifiers[i];
      finalPrice += m.price;
      return m;
    });

    const combinedName = variantName ? `${selectedItem.name} - ${variantName}` : selectedItem.name;
    const combinedNameAr = variantNameAr ? `${selectedItem.nameAr || selectedItem.name} - ${variantNameAr}` : (selectedItem.nameAr || selectedItem.name);

    addItem({
      id: selectedItem.id,
      name: combinedName,
      nameAr: combinedNameAr,
      price: finalPrice,
      modifiers: mods,
      note: note,
      originalData: selectedItem
    });

    setSelectedItem(null);
  };

  const filteredMenu = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.categoryId === activeCategory);

  return (
    <div className="flex-1 bg-[#FAF8F5] p-4 overflow-y-auto relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading Menu...</div>
        ) : filteredMenu.map(item => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="bg-white rounded-xl shadow-sm border border-[#E8E2DC] overflow-hidden hover:shadow-md hover:border-[#6E4A32] transition-all flex flex-col h-32 active:scale-95 touch-manipulation"
          >
            {/* Placeholder for image */}
            <div className="h-16 w-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-gray-400 font-bold uppercase text-xl">
                {(language === 'ar' ? (item.nameAr || item.name) : item.name).substring(0,2)}
              </span>
            </div>
            <div className="p-2 flex-1 flex flex-col justify-between w-full">
              <h3 className="text-sm font-semibold text-[#231F1D] leading-tight line-clamp-2 text-start">
                {language === 'ar' ? (item.nameAr || item.name) : item.name}
              </h3>
              <p className="text-[#B45309] font-bold text-sm text-end w-full">
                {item.price} ج.م
              </p>
            </div>
          </button>
        ))}
      </div>
      
      {!loading && filteredMenu.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-[#9E948C]">
          <p className="text-lg">No items found in this category.</p>
        </div>
      )}

      {/* Modifier Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <div>
                <h2 className="text-xl font-bold text-[#2B1810]">
                  {language === 'ar' ? (selectedItem.nameAr || selectedItem.name) : selectedItem.name}
                </h2>
                <p className="text-[#B45309] font-bold">{selectedItem.price} ج.م Base</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 font-bold p-2 text-xl">X</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Variants / Sizes */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#2B1810] mb-2 text-lg border-b border-gray-100 pb-1">Size / Variant</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.variants.map((v, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedVariant(idx)}
                        className={`p-3 rounded-xl border-2 font-bold transition-colors ${selectedVariant === idx ? 'border-[#6E4A32] bg-[#F3EBE3] text-[#2B1810]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                      >
                        <div className="text-sm">{v.name}</div>
                        <div className="text-[#B45309] text-xs">+{v.price} ج.م</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#2B1810] mb-2 text-lg border-b border-gray-100 pb-1">Extras</h3>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((m, idx) => {
                      const isSelected = selectedModifiers.includes(idx);
                      return (
                        <button 
                          key={idx}
                          onClick={() => toggleModifier(idx)}
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
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <button 
                onClick={handleAddToCart}
                className="w-full bg-[#6E4A32] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#5C3D28] shadow-lg active:scale-95 transition-transform"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
