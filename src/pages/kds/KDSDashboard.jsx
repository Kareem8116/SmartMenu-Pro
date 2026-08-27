import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import OrderTicket from '../../components/kds/OrderTicket';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio not supported or blocked", e);
  }
};

export default function KDSDashboard() {
  const { t } = useTranslation();
  const { user, staffInfo, signOut } = useAuth();
  const { orders, loading, markAsPreparing, markAsReady, toggleItemDone } = useOrders();
  const [stationFilter, setStationFilter] = useState('all'); // 'all', 'kitchen', 'bar'
  
  const prevNewOrders = useRef(new Set());

  // Split orders by status
  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  // Audio Alert Logic
  useEffect(() => {
    const currentNewIds = new Set(newOrders.map(o => o.id));
    let hasNew = false;
    
    currentNewIds.forEach(id => {
      if (!prevNewOrders.current.has(id)) {
        hasNew = true;
      }
    });
    
    if (hasNew) {
      playBeep();
    }
    
    prevNewOrders.current = currentNewIds;
  }, [newOrders]);

  // Filter function for orders based on station
  const filterOrdersByStation = (ordersList) => {
    if (stationFilter === 'all') return ordersList;
    return ordersList.filter(order => {
      return order.items?.some(item => (item.station || 'kitchen') === stationFilter);
    });
  };

  const filteredNewOrders = filterOrdersByStation(newOrders);
  const filteredPreparingOrders = filterOrdersByStation(preparingOrders);

  return (
    <div className="flex flex-col h-screen w-full bg-[#E8E2DC] overflow-hidden text-[#231F1D]">
      
      {/* Header */}
      <header className="h-16 bg-[#2B1810] text-white flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white text-[#2B1810] rounded-lg flex items-center justify-center font-bold text-lg">
            KDS
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SmartMenu Pro - Kitchen</h1>
            <p className="text-xs text-gray-300">
              {user?.branchId} • {staffInfo?.name || 'Chef'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/30 rounded-lg px-2 py-1">
            <Filter size={16} className="text-gray-300 mr-2" />
            <select 
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
            >
              <option value="all" className="text-black">All Stations</option>
              <option value="kitchen" className="text-black">Kitchen Only</option>
              <option value="bar" className="text-black">Bar Only</option>
            </select>
          </div>
          <div className="text-sm font-semibold hidden md:block bg-black/30 px-3 py-1 rounded-full">
            Active Tickets: {filteredNewOrders.length + filteredPreparingOrders.length}
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <span className="text-sm font-semibold hidden md:inline">{t('common.logout')}</span>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Board */}
      <div className="flex-1 overflow-x-auto p-4 lg:p-6">
        <div className="flex gap-6 h-full min-w-max">
          
          {/* Column 1: New Orders */}
          <div className="w-80 md:w-96 flex flex-col h-full">
            <h2 className="text-lg font-bold text-[#6E4A32] mb-3 flex items-center gap-2">
              <span className="bg-[#B45309] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {filteredNewOrders.length}
              </span>
              New Orders
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pb-10 hide-scrollbar">
              {loading && filteredNewOrders.length === 0 && (
                <div className="text-center text-[#9E948C] mt-10 font-medium">Loading...</div>
              )}
              {!loading && filteredNewOrders.length === 0 && (
                <div className="border-2 border-dashed border-[#C5B9AE] rounded-xl p-8 text-center text-[#9E948C] font-medium">
                  No new orders.
                </div>
              )}
              {filteredNewOrders.map(order => (
                <OrderTicket 
                  key={order.id} 
                  order={order} 
                  onMarkPreparing={markAsPreparing}
                  onMarkReady={markAsReady}
                  onToggleItem={toggleItemDone}
                  stationFilter={stationFilter}
                />
              ))}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="w-80 md:w-96 flex flex-col h-full">
            <h2 className="text-lg font-bold text-[#6E4A32] mb-3 flex items-center gap-2">
              <span className="bg-[#15803D] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {filteredPreparingOrders.length}
              </span>
              Preparing
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pb-10 hide-scrollbar">
              {!loading && filteredPreparingOrders.length === 0 && (
                <div className="border-2 border-dashed border-[#C5B9AE] rounded-xl p-8 text-center text-[#9E948C] font-medium">
                  No orders currently being prepared.
                </div>
              )}
              {filteredPreparingOrders.map(order => (
                <OrderTicket 
                  key={order.id} 
                  order={order} 
                  onMarkPreparing={markAsPreparing}
                  onMarkReady={markAsReady}
                  onToggleItem={toggleItemDone}
                  stationFilter={stationFilter}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
