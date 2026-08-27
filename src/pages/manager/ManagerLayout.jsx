import { NavLink, Outlet } from 'react-router-dom';
import { Package, BookOpen, Trash2, Truck, ArrowRightLeft, LogOut, Menu, Users, Bell, BarChart3, QrCode, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ManagerLayout() {
  const { user, staffInfo, signOut } = useAuth();

  const navItems = [
    { name: 'Reports', path: '/manager/reports', icon: BarChart3 },
    { name: 'AI Insights', path: '/manager/ai', icon: Sparkles },
    { name: 'QR Generator', path: '/manager/qr', icon: QrCode },
    { name: 'Alerts', path: '/manager/alerts', icon: Bell },
    { name: 'Staff & HR', path: '/manager/staff', icon: Users },
    { name: 'Menu', path: '/manager/menu', icon: Menu },
    { name: 'Inventory', path: '/manager/inventory', icon: Package },
    { name: 'Recipes', path: '/manager/recipes', icon: BookOpen },
    { name: 'Customers', path: '/manager/customers', icon: Users },
    { name: 'Waste', path: '/manager/waste', icon: Trash2 },
    { name: 'Suppliers', path: '/manager/suppliers', icon: Truck },
    { name: 'Transfers', path: '/manager/transfers', icon: ArrowRightLeft },
  ];

  return (
    <div className="flex h-screen bg-[#FAF8F5] text-[#231F1D]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex shrink-0 z-20">
        <div className="p-6 border-b border-gray-100">
          <h1 className="font-bold text-xl text-[#2B1810]">SmartMenu Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Manager Console</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                  isActive 
                    ? 'bg-[#6E4A32] text-white shadow-md' 
                    : 'text-[#685E57] hover:bg-[#F3EBE3] hover:text-[#2B1810]'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F3EBE3] rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-[#6E4A32] text-white flex items-center justify-center font-bold uppercase">
              {staffInfo?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#2B1810] truncate">{staffInfo?.name || 'Manager'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.branchId}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
          <h1 className="font-bold text-lg text-[#2B1810]">Manager Console</h1>
          {/* Mobile menu button could go here */}
        </header>
        
        <div className="flex-1 overflow-y-auto bg-[#FAF8F5] p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
