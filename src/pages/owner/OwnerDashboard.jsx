import { useState } from 'react';
import { Store, TrendingUp, ShoppingBag, Receipt, AlertCircle, FileText, ChevronDown, BarChart3, Star } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useBranch } from '../../context/BranchContext';

export default function OwnerDashboard() {
  const [dateRange, setDateRange] = useState('today');
  const { data, loading } = useAnalytics(dateRange);
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!activeBranchId) {
    return (
      <div className="flex h-screen w-full bg-[#FAF8F5] items-center justify-center">
        <div className="text-gray-500">No branches assigned to this account.</div>
      </div>
    );
  }

  // Use fetched data or defaults if loading
  const alerts = data?.alerts || [];
  const branchComparison = data?.branchPerformance || [];
  const topItems = data?.topItems || [];
  const comp = data?.comparison || { salesGrowth: 0, ordersGrowth: 0 };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#231F1D]">
      {/* Header - Brand & Branch Switcher */}
      <header className="sticky top-0 bg-[#2A1A14] text-white p-4 md:px-8 z-50 shadow-md rounded-b-2xl md:rounded-b-none flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A453A] text-white rounded-xl flex items-center justify-center font-bold text-lg">
            S
          </div>
          <h1 className="font-bold text-lg tracking-wide">SmartMenu Pro</h1>
        </div>
        
        <div className="relative w-full md:w-auto min-w-[250px]">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full bg-[#1D0F0A] p-3 rounded-xl flex items-center justify-between border border-white/10 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Store size={18} className="text-[#8C7D70]" />
              <div className="text-left">
                <div className="text-[10px] text-[#8C7D70] uppercase font-bold tracking-wider">Viewing</div>
                <div className="text-sm font-semibold truncate max-w-[200px]">
                  {activeBranchId === 'all' ? 'All Branches (Aggregated)' : branches.find(b => b.id === activeBranchId)?.name || 'Loading...'}
                </div>
              </div>
            </div>
            <ChevronDown size={16} className="text-[#8C7D70]" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white text-[#231F1D] rounded-xl shadow-xl overflow-hidden z-50 border border-gray-100">
              {branches.length > 1 && (
                <button
                  onClick={() => { setActiveBranchId('all'); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-bold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  All Branches
                </button>
              )}
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setActiveBranchId(b.id); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* 5. Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl flex gap-3 items-start border shadow-sm ${alert.type === 'review' ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
                {alert.type === 'review' ? <Star className="text-orange-500 shrink-0 mt-0.5" size={20} /> : <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />}
                <div>
                  <p className={`text-sm md:text-base font-bold ${alert.type === 'review' ? 'text-orange-900' : 'text-red-900'}`}>{alert.text}</p>
                  <span className={`text-xs ${alert.type === 'review' ? 'text-orange-600' : 'text-red-600'}`}>{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs text-gray-500 font-bold uppercase mb-1">Today's Sales</div>
              <div className="text-2xl md:text-3xl font-black text-[#2B1810]">
                £{data.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-12 h-12 bg-[#FAF8F5] rounded-xl flex items-center justify-center text-[#B45309]">
              <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500 font-bold uppercase mb-1">Orders</div>
            <div className="text-2xl md:text-3xl font-black text-[#2B1810] flex items-center justify-between">
              {data.orderVolume}
              <div className="w-10 h-10 bg-[#FAF8F5] rounded-xl flex items-center justify-center text-[#15803D]">
                <ShoppingBag size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500 font-bold uppercase mb-1">Avg Order</div>
            <div className="text-2xl md:text-3xl font-black text-[#2B1810] flex items-center justify-between">
              £{data.averageOrderValue.toFixed(1)}
              <div className="w-10 h-10 bg-[#FAF8F5] rounded-xl flex items-center justify-center text-[#4338CA]">
                <Receipt size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-6">
            {/* 4. Quick Comparison */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-base font-bold text-[#2B1810] mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                Quick Comparison
              </h2>
              <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">vs Last Week (Same Day)</div>
                  <div className={`text-lg font-bold ${comp.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comp.salesGrowth > 0 ? '+' : ''}{comp.salesGrowth.toFixed(1)}% Sales
                  </div>
                </div>
                <div className={`text-lg font-bold ${comp.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comp.ordersGrowth > 0 ? '+' : ''}{comp.ordersGrowth.toFixed(1)}% Orders
                </div>
              </div>
            </div>

            {/* 6. Branch Comparison (Only if All Branches selected) */}
            {activeBranchId === 'all' && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-base font-bold text-[#2B1810] mb-4">Branch Performance</h2>
                <div className="space-y-4">
                  {branchComparison.map((branch, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">{branch.name}</span>
                        <span className="font-bold text-[#2B1810]">£{branch.sales.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-[#FAF8F5] rounded-full h-2">
                        <div className="bg-[#B45309] h-2 rounded-full transition-all duration-500" style={{ width: `${(branch.sales / branchComparison[0].sales) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Top Selling Items */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-base font-bold text-[#2B1810] mb-4">Top Selling Items (Now)</h2>
              <div className="space-y-4">
                {topItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-sm font-bold flex items-center justify-center text-[#B45309]">{i+1}</div>
                      <span className="text-base font-semibold text-gray-700 group-hover:text-[#2B1810] transition-colors">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">{item.count} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>

        {/* 3. Unified Daily Report Access */}
        <button className="w-full bg-[#2B1810] text-white p-5 md:p-6 rounded-2xl flex items-center justify-between group hover:bg-[#432C21] transition-all shadow-md hover:shadow-lg mt-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-base md:text-lg">Unified Daily AI Report</div>
              <div className="text-sm text-white/60 mt-0.5">View yesterday's full summary and anomalies</div>
            </div>
          </div>
          <div className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </button>

      </main>
    </div>
  );
}
