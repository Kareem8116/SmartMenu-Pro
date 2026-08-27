import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle, Star, MessageSquare } from 'lucide-react';

export default function AlertsView() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.branchId) return;

    // Fetch low ratings (<= 3 stars)
    const q = query(
      collection(db, `branches/${user.branchId}/reviews`),
      where('rating', '<=', 3),
      orderBy('rating', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      setAlerts(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.branchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E4A32]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-[#2B1810]">Manager Alerts</h2>
          <p className="text-[#685E57] mt-2">Immediate attention required for low ratings and critical issues</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-red-50">
          <AlertCircle size={24} className="text-red-600" />
          <h3 className="font-bold text-red-900 text-lg">Critical Feedback (3 Stars or Below)</h3>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-semibold">
            No critical alerts at this time. Great job!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-4 items-start">
                <div className="bg-white border-2 border-red-200 rounded-xl p-3 flex flex-col items-center justify-center w-16 h-16 shrink-0 shadow-sm">
                  <span className="font-bold text-xl text-red-600">{alert.rating}</span>
                  <div className="flex">
                    {[...Array(alert.rating)].map((_, i) => <Star key={i} size={8} fill="currentColor" className="text-red-600" />)}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-[#2B1810]">Table {alert.tableNumber || 'N/A'}</h4>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(alert.createdAt?.seconds * 1000 || alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-[#4A3C31] mt-2 flex gap-3 items-start">
                    <MessageSquare size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="italic">"{alert.comment || 'No comment provided'}"</p>
                  </div>
                  
                  {alert.items && alert.items.length > 0 && (
                    <div className="mt-3 text-xs font-semibold text-gray-500">
                      Problematic Items: {alert.items.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
