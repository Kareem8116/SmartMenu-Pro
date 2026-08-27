import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutGrid, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDataSync } from '../../hooks/useDataSync';
import { useCartStore } from '../../store/cartStore';
import FloorPlan from '../../components/pos/FloorPlan';
import MenuGrid from '../../components/pos/MenuGrid';
import CartPanel from '../../components/pos/CartPanel';

export default function WaiterDashboard() {
  const { t, i18n } = useTranslation();
  const { user, staffInfo, signOut } = useAuth();
  const { items } = useCartStore();
  const [activeView, setActiveView] = useState('floor'); // 'floor', 'menu', 'cart'
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);

  // Trigger offline data sync
  useDataSync();

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveView('menu'); 
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#FAFAF8] overflow-hidden text-[#231F1D]">
      
      {/* Top Header */}
      <header className="h-14 bg-[#2B1810] text-white flex items-center justify-between px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg leading-tight">SmartMenu</div>
          <div className="text-[10px] text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">
            Waiter • {staffInfo?.name || 'Staff'}
          </div>
        </div>
        
        <button onClick={signOut} className="text-gray-300 hover:text-white p-1">
          <LogOut size={20} />
        </button>
      </header>

      {/* Selected Table Sticky Banner */}
      {selectedTable && (
        <div className="bg-[#E6F4EA] border-b border-green-200 p-2 flex items-center justify-between px-4 text-sm font-bold text-green-800 shadow-sm shrink-0">
          <span>📍 Table {selectedTable.number}</span>
          <button onClick={() => { setSelectedTable(null); setActiveView('floor'); }} className="text-green-600 underline text-xs">
            Change
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'floor' && (
          <div className="absolute inset-0">
            <FloorPlan onSelectTable={handleSelectTable} activeTableId={selectedTable?.id} />
          </div>
        )}

        {activeView === 'menu' && (
          <div className="absolute inset-0 overflow-y-auto">
            {/* Horizontal Categories for mobile */}
            <div className="bg-white border-b border-gray-200 p-2 flex overflow-x-auto gap-2 scrollbar-hide">
              {['all', 'hot drinks', 'cold drinks', 'desserts', 'food'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${
                    activeCategory === cat ? 'bg-[#6E4A32] text-white' : 'bg-[#F3EFEA] text-[#685E57]'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="p-2 pb-24">
              <MenuGrid activeCategory={activeCategory} language={i18n.language} selectedTable={selectedTable} />
            </div>
          </div>
        )}

        {activeView === 'cart' && (
          <div className="absolute inset-0">
            {/* The CartPanel is built for desktop sidebar, but we render it full width here */}
            <div className="w-full h-full [&>div]:w-full [&>div]:border-l-0">
              <CartPanel selectedTable={selectedTable} onClearTable={() => { setSelectedTable(null); setActiveView('floor'); }} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-around shrink-0 pb-safe">
        <button 
          onClick={() => setActiveView('floor')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeView === 'floor' ? 'text-[#6E4A32]' : 'text-gray-400'}`}
        >
          <LayoutGrid size={24} />
          <span className="text-[10px] font-bold mt-1">Tables</span>
        </button>
        
        <button 
          onClick={() => { if(selectedTable) setActiveView('menu'); }}
          className={`flex flex-col items-center justify-center w-full h-full ${!selectedTable ? 'opacity-50' : ''} ${activeView === 'menu' ? 'text-[#6E4A32]' : 'text-gray-400'}`}
        >
          <UtensilsCrossed size={24} />
          <span className="text-[10px] font-bold mt-1">Menu</span>
        </button>
        
        <button 
          onClick={() => setActiveView('cart')}
          className={`relative flex flex-col items-center justify-center w-full h-full ${activeView === 'cart' ? 'text-[#6E4A32]' : 'text-gray-400'}`}
        >
          <div className="relative">
            <ShoppingCart size={24} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {items.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">Cart</span>
        </button>
      </div>

    </div>
  );
}
