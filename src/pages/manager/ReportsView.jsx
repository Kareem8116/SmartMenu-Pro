import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Download, TrendingUp, DollarSign, Clock, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [dateRange, setDateRange] = useState('today'); // 'today', 'week', 'month'
  
  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    vatCollected: 0,
    paymentMethods: { cash: 0, card: 0, wallet: 0 },
    peakHours: []
  });

  const fetchReports = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    
    // In a real app, dateRange would filter the query. For now, fetch recent orders.
    const q = query(
      collection(db, `branches/${user.branchId}/orders`),
      orderBy('createdAt', 'desc')
    );
    
    try {
      const snapshot = await getDocs(q);
      const data = [];
      let totalSales = 0;
      let totalOrders = 0;
      let vatCollected = 0;
      const methods = { cash: 0, card: 0, wallet: 0 };
      const hours = Array(24).fill(0);

      snapshot.forEach(docSnap => {
        const order = { id: docSnap.id, ...docSnap.data() };
        data.push(order);
        
        // Only count paid orders
        if (order.status === 'paid' || order.status === 'served') {
          totalOrders++;
          totalSales += (order.totals?.total || 0);
          vatCollected += (order.totals?.tax || 0);
          
          if (order.payments) {
            order.payments.forEach(p => {
              if (methods[p.method] !== undefined) methods[p.method] += p.amount;
            });
          }

          // Peak hours
          const hour = new Date(order.createdAt).getHours();
          if (!isNaN(hour)) {
            hours[hour]++;
          }
        }
      });
      
      const peakHours = hours.map((count, hour) => ({ hour, count })).filter(h => h.count > 0).sort((a,b) => b.count - a.count);

      setOrders(data);
      setStats({ totalSales, totalOrders, vatCollected, paymentMethods: methods, peakHours });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user?.branchId, dateRange]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
      ID: o.id,
      Date: new Date(o.createdAt).toLocaleString(),
      Type: o.orderType,
      Total: o.totals?.total || 0,
      Tax: o.totals?.tax || 0,
      Status: o.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Z-Report-${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-[#2B1810]">Financial Reports & Z-Report</h2>
          <p className="text-[#685E57] mt-2">Analyze sales, taxes, and peak hours</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 font-semibold bg-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button 
            onClick={exportExcel}
            className="bg-[#15803D] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#166534]"
          >
            <Download size={20} /> Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6E4A32]"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-700 rounded-lg"><DollarSign size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Total Revenue</p>
                <p className="text-2xl font-bold text-[#2B1810]">{stats.totalSales.toFixed(2)} EGP</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><FileText size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Total Orders</p>
                <p className="text-2xl font-bold text-[#2B1810]">{stats.totalOrders}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-lg"><TrendingUp size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">VAT Collected</p>
                <p className="text-2xl font-bold text-[#2B1810]">{stats.vatCollected.toFixed(2)} EGP</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-lg"><Clock size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Peak Hour</p>
                <p className="text-2xl font-bold text-[#2B1810]">
                  {stats.peakHours[0] ? `${stats.peakHours[0].hour}:00` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg text-[#2B1810] mb-4">Payment Methods (Z-Report Detail)</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Cash</span>
                  <span className="font-bold">{stats.paymentMethods.cash.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Credit Card</span>
                  <span className="font-bold">{stats.paymentMethods.card.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Wallet / Mobile</span>
                  <span className="font-bold">{stats.paymentMethods.wallet.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-lg text-[#2B1810] mb-4">Peak Hours Analysis</h3>
              <div className="space-y-3">
                {stats.peakHours.slice(0, 5).map(ph => (
                  <div key={ph.hour} className="flex items-center gap-4">
                    <span className="w-16 font-semibold text-gray-600">{ph.hour}:00</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#6E4A32]" 
                        style={{ width: `${(ph.count / stats.peakHours[0].count) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{ph.count} ord.</span>
                  </div>
                ))}
                {stats.peakHours.length === 0 && <p className="text-gray-500">No data available.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
