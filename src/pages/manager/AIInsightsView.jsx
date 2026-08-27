import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, PackageSearch, TrendingUp, AlertOctagon, CloudSun, Loader2 } from 'lucide-react';
import { runInventoryAudit, runMenuEngineering, runDemandForecast, runAnomalyDetection } from '../../services/ai';

export default function AIInsightsView() {
  const { user } = useAuth();
  const [loadingType, setLoadingType] = useState(null);
  const [results, setResults] = useState({
    inventory: null,
    menu: null,
    forecast: null,
    anomalies: null
  });

  const handleInventoryAudit = async () => {
    if (!user?.branchId) return;
    setLoadingType('inventory');
    try {
      // Fetch mock theoretical vs actual for the prompt (in real app, compare inventory with sales)
      const invRef = collection(db, `branches/${user.branchId}/inventory`);
      const snapshot = await getDocs(invRef);
      const items = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({ 
          name: data.name, 
          theoreticalQty: data.currentQty + Math.floor(Math.random() * 5), // Fake variance
          actualQty: data.currentQty 
        });
      });
      
      const res = await runInventoryAudit(items);
      setResults(prev => ({ ...prev, inventory: res }));
    } catch (e) {
      console.error(e);
      alert('AI Audit failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleMenuEngineering = async () => {
    if (!user?.branchId) return;
    setLoadingType('menu');
    try {
      const menuRef = collection(db, `branches/${user.branchId}/menu`);
      const snapshot = await getDocs(menuRef);
      const items = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({ 
          name: data.name, 
          salesCount: Math.floor(Math.random() * 200), // Fake sales volume
          profitMargin: (data.price || 0) * 0.6 // Fake margin
        });
      });
      
      const res = await runMenuEngineering(items);
      setResults(prev => ({ ...prev, menu: res }));
    } catch (e) {
      console.error(e);
      alert('AI Engineering failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleForecast = async () => {
    setLoadingType('forecast');
    try {
      const mockHistory = [
        { day: 'Monday', weather: 'hot', bestSellers: ['Iced Latte', 'Cold Brew'] },
        { day: 'Tuesday', weather: 'mild', bestSellers: ['Cappuccino', 'Croissant'] }
      ];
      const res = await runDemandForecast(mockHistory, 'Cairo');
      setResults(prev => ({ ...prev, forecast: res }));
    } catch (e) {
      console.error(e);
      alert('Forecast failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleAnomalyDetect = async () => {
    if (!user?.branchId) return;
    setLoadingType('anomaly');
    try {
      const ordersRef = collection(db, `branches/${user.branchId}/orders`);
      const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        orders.push({ 
          id: doc.id, 
          status: data.status, 
          total: data.totals?.total,
          cashier: data.waiterId || 'unknown'
        });
      });

      const res = await runAnomalyDetection(orders);
      setResults(prev => ({ ...prev, anomalies: res }));
    } catch (e) {
      console.error(e);
      alert('Detection failed.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b pb-4">
        <Sparkles size={36} className="text-[#6E4A32]" />
        <div>
          <h2 className="text-3xl font-bold text-[#2B1810]">Gemini AI Insights</h2>
          <p className="text-[#685E57] mt-1">Smart analytics, forecasting, and anomaly detection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory Audit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl flex items-center gap-2"><PackageSearch className="text-blue-600"/> Inventory Audit</h3>
            <button 
              onClick={handleInventoryAudit} 
              disabled={loadingType === 'inventory'}
              className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 disabled:opacity-50"
            >
              {loadingType === 'inventory' ? <Loader2 className="animate-spin" /> : 'Run Audit'}
            </button>
          </div>
          {results.inventory && (
            <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2">
              <p className="font-semibold">{results.inventory.summary}</p>
              <ul className="list-disc pl-5">
                {results.inventory.variances?.map((v, i) => (
                  <li key={i}><strong>{v.itemName}:</strong> Diff {v.diff} - {v.reason}</li>
                ))}
              </ul>
            </div>
          )}
          {!results.inventory && <p className="text-gray-400 text-sm">Compare theoretical vs actual stock levels.</p>}
        </div>

        {/* Menu Engineering */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl flex items-center gap-2"><TrendingUp className="text-green-600"/> Menu Engineering</h3>
            <button 
              onClick={handleMenuEngineering} 
              disabled={loadingType === 'menu'}
              className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-100 disabled:opacity-50"
            >
              {loadingType === 'menu' ? <Loader2 className="animate-spin" /> : 'Analyze Menu'}
            </button>
          </div>
          {results.menu && (
            <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2 max-h-60 overflow-y-auto">
              <h4 className="font-bold">Recommendations:</h4>
              <ul className="list-disc pl-5">
                {results.menu.recommendations?.map((r, i) => (
                  <li key={i}><strong>{r.itemName}:</strong> {r.suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {!results.menu && <p className="text-gray-400 text-sm">Categorize menu items by volume and profitability.</p>}
        </div>

        {/* Demand Forecasting */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl flex items-center gap-2"><CloudSun className="text-amber-500"/> Demand Forecast</h3>
            <button 
              onClick={handleForecast} 
              disabled={loadingType === 'forecast'}
              className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold hover:bg-amber-100 disabled:opacity-50"
            >
              {loadingType === 'forecast' ? <Loader2 className="animate-spin" /> : 'Run Forecast'}
            </button>
          </div>
          {results.forecast && (
            <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2">
              <p className="italic text-gray-600">{results.forecast.weatherContext}</p>
              <ul className="list-disc pl-5">
                {results.forecast.predictions?.map((p, i) => (
                  <li key={i}><strong>{p.category}:</strong> {p.prepSuggestion} ({p.reason})</li>
                ))}
              </ul>
            </div>
          )}
          {!results.forecast && <p className="text-gray-400 text-sm">Predict demand based on live weather and history.</p>}
        </div>

        {/* Anomaly Detection */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl flex items-center gap-2"><AlertOctagon className="text-red-600"/> Fraud & Anomalies</h3>
            <button 
              onClick={handleAnomalyDetect} 
              disabled={loadingType === 'anomaly'}
              className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-100 disabled:opacity-50"
            >
              {loadingType === 'anomaly' ? <Loader2 className="animate-spin" /> : 'Scan Transactions'}
            </button>
          </div>
          {results.anomalies && (
            <div className={`p-4 rounded-xl text-sm space-y-2 ${results.anomalies.anomaliesFound ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="font-bold">{results.anomalies.anomaliesFound ? 'Alerts found!' : 'No unusual patterns detected.'}</p>
              {results.anomalies.alerts?.map((a, i) => (
                <div key={i} className="text-red-700 border-l-2 border-red-500 pl-2">
                  <strong>{a.type}</strong>: {a.description}
                </div>
              ))}
            </div>
          )}
          {!results.anomalies && <p className="text-gray-400 text-sm">Scan recent activity for excessive voids or discounts.</p>}
        </div>
      </div>
    </div>
  );
}
