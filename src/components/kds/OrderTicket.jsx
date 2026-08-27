import { useState, useEffect } from 'react';
import { Clock, CheckSquare, Square, Check, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Utility to format elapsed time
const getElapsedMinutes = (timestamp) => {
  if (!timestamp) return 0;
  // Handle both Firestore serverTimestamp and local JS timestamps
  const time = typeof timestamp.toDate === 'function' ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
  const diffMs = Date.now() - time;
  return Math.floor(diffMs / 60000);
};

export default function OrderTicket({ order, onMarkPreparing, onMarkReady, onToggleItem, stationFilter = 'all' }) {
  const { t, i18n } = useTranslation();
  const [elapsedMins, setElapsedMins] = useState(() => getElapsedMinutes(order.createdAt));

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMins(getElapsedMinutes(order.createdAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Calculate target prep time based on items, defaulting to 15 mins
  const targetPrepTime = order.items?.reduce((max, item) => {
    return Math.max(max, item.prepTime || 15);
  }, 15) || 15;

  // Determine card color based on threshold (Green -> Yellow -> Red)
  let headerColor = 'bg-[#15803D]'; // Default Green (Good)
  let timerColor = 'text-green-700 font-bold';
  let badgeColor = 'bg-green-100 text-green-800';

  if (elapsedMins >= targetPrepTime) {
    headerColor = 'bg-red-700';
    timerColor = 'text-red-600 font-bold animate-pulse';
    badgeColor = 'bg-red-100 text-red-800';
  } else if (elapsedMins >= targetPrepTime * 0.75) {
    // 75% of prep time elapsed -> Yellow warning
    headerColor = 'bg-yellow-600';
    timerColor = 'text-yellow-600 font-bold';
    badgeColor = 'bg-yellow-100 text-yellow-800';
  }

  const isPreparing = order.status === 'preparing';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[400px]">
      
      {/* Header */}
      <div className={`${headerColor} text-white p-3 flex justify-between items-center`}>
        <div className="font-bold text-lg">#{order.id.slice(-4).toUpperCase()}</div>
        <div className="text-xs font-semibold uppercase tracking-wider bg-black/20 px-2 py-1 rounded">
          {order.orderType?.replace('_', ' ')}
        </div>
      </div>

      {/* Meta Info */}
      <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
        <div className="flex items-center gap-1.5 text-sm">
          <Clock size={16} className={timerColor} />
          <span className={timerColor}>{elapsedMins}m ago</span>
        </div>
        {order.tableNumber && (
          <div className="text-sm font-bold text-[#6E4A32]">
            Table {order.tableNumber}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 bg-white">
        <ul className="space-y-3">
          {order.items?.map((item, idx) => {
            if (stationFilter !== 'all' && (item.station || 'kitchen') !== stationFilter) {
              return null; // Hide item if it belongs to another station
            }
            const isDone = item.isDone || false;
            return (
              <li 
                key={item.cartItemId || idx} 
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => onToggleItem(order.id, order.items, idx, !isDone)}
              >
                <div className="mt-0.5 shrink-0 text-[#B45309]">
                  {isDone ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-300 group-hover:text-gray-400" />}
                </div>
                <div>
                  <div className={`font-semibold text-sm transition-colors ${isDone ? 'line-through text-gray-400' : 'text-[#231F1D]'}`}>
                    <span className="font-bold mr-2 text-[#6E4A32]">{item.qty}x</span>
                    {i18n.language === 'ar' ? item.nameAr : item.name}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-red-500 font-medium mt-1">
                      * {item.notes}
                    </div>
                  )}
                  {item.modifiers?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 pl-6">
                      {item.modifiers.join(', ')}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-gray-100 bg-[#FAF8F5]">
        {!isPreparing ? (
          <button
            onClick={() => onMarkPreparing(order.id)}
            className="w-full flex items-center justify-center gap-2 bg-[#6E4A32] hover:bg-[#5C3D28] text-white py-3 rounded-lg font-bold transition-colors"
          >
            <Play size={18} />
            Start Preparing
          </button>
        ) : (
          <button
            onClick={() => onMarkReady(order.id)}
            className="w-full flex items-center justify-center gap-2 bg-[#15803D] hover:bg-[#166534] text-white py-3 rounded-lg font-bold transition-colors"
          >
            <Check size={18} />
            Mark as Ready
          </button>
        )}
      </div>

    </div>
  );
}
