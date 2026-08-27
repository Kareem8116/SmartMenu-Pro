import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutGrid, UtensilsCrossed, Settings, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useDataSync } from '../../hooks/useDataSync';
import FloorPlan from '../../components/pos/FloorPlan';
import CategorySidebar from '../../components/pos/CategorySidebar';
import MenuGrid from '../../components/pos/MenuGrid';
import CartPanel from '../../components/pos/CartPanel';

export default function POSDashboard() {
  const { t, i18n } = useTranslation();
  const { user, staffInfo, signOut } = useAuth();
  const { orders } = useOrders();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeView, setActiveView] = useState('floor'); // 'floor' or 'menu'
  const [selectedTable, setSelectedTable] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hubIp, setHubIp] = useState(localStorage.getItem('localHubIp') || 'localhost:3001');

  // Trigger offline data sync
  useDataSync();

  const billRequests = orders.filter(o => o.billRequested && o.status !== 'paid');

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveView('menu'); // Switch to menu view after selecting a table
  };

  const saveSettings = () => {
    localStorage.setItem('localHubIp', hubIp);
    setShowSettings(false);
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-[#231F1D]">
      
      {/* Show Category Sidebar only when in menu view */}
      {activeView === 'menu' && (
        <CategorySidebar 
          activeCategory={activeCategory} 
          onSelectCategory={setActiveCategory}
          language={i18n.language}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2B1810] text-white rounded-lg flex items-center justify-center font-bold text-lg">
              S
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-[#2B1810]">SmartMenu Pro</h1>
              <p className="text-xs text-[#685E57]">
                {user?.branchId} • {staffInfo?.name || 'Cashier'}
                {selectedTable && <span className="ml-2 text-[#6E4A32] font-bold">• Table {selectedTable.number}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-[#F3EFEA] rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveView('floor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeView === 'floor' ? 'bg-white text-[#2B1810] shadow-sm' : 'text-[#685E57]'
                }`}
              >
                <LayoutGrid size={14} />
                Tables
              </button>
              <button
                onClick={() => setActiveView('menu')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeView === 'menu' ? 'bg-white text-[#2B1810] shadow-sm' : 'text-[#685E57]'
                }`}
              >
                <UtensilsCrossed size={14} />
                Menu
              </button>
            </div>

            <button 
              onClick={() => setShowSettings(true)}
              className="text-[#685E57] hover:bg-[#F3EFEA] p-2 rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>
            
            <button 
              onClick={signOut}
              className="flex items-center gap-2 text-[#685E57] hover:text-[#B91C1C] transition-colors p-2 rounded-lg hover:bg-[#FEF2F2]"
            >
              <span className="text-sm font-semibold hidden md:inline">{t('common.logout')}</span>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Bill Requests Alert */}
        {billRequests.length > 0 && (
          <div className="bg-red-50 border-b border-red-100 p-3 flex flex-col gap-2 shadow-inner">
            {billRequests.map(order => (
              <div key={order.id} className="flex justify-between items-center text-red-800 bg-white p-2 rounded-lg shadow-sm">
                <div className="font-bold">
                  🔔 Table {order.tableNumber || 'Unknown'} requested the bill!
                </div>
                <div className="text-sm font-semibold opacity-75">
                  Order #{order.id.slice(-4).toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content: Floor Plan OR Menu Grid */}
        {activeView === 'floor' ? (
          <FloorPlan 
            onSelectTable={handleSelectTable}
            activeTableId={selectedTable?.id}
          />
        ) : (
          <MenuGrid 
            activeCategory={activeCategory} 
            language={i18n.language}
            selectedTable={selectedTable}
          />
        )}
      </div>

      {/* Cart Panel */}
      <CartPanel selectedTable={selectedTable} onClearTable={() => setSelectedTable(null)} />
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-lg text-[#2B1810]">Local Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-bold text-[#685E57] mb-2">Local Hub IP:Port</label>
              <input 
                type="text" 
                value={hubIp}
                onChange={e => setHubIp(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-gray-200 rounded-lg p-2 outline-none focus:border-[#6E4A32] mb-4"
                placeholder="e.g. 192.168.1.10:3001"
              />
              <p className="text-xs text-gray-500 mb-4">Required for offline syncing and printing. Runs on the main cashier PC.</p>
              <button 
                onClick={saveSettings}
                className="w-full bg-[#6E4A32] text-white py-3 rounded-lg font-bold hover:bg-[#5C3D28]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
