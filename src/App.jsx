import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import StationLogin from './pages/auth/StationLogin';
import StaffPIN from './pages/auth/StaffPIN';
import OwnerLogin from './pages/auth/OwnerLogin';
import SuperAdminLogin from './pages/auth/SuperAdminLogin';
import Unauthorized from './pages/auth/Unauthorized';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';
import POSDashboard from './pages/pos/POSDashboard';
import WaiterDashboard from './pages/pos/WaiterDashboard';
import KDSDashboard from './pages/kds/KDSDashboard';
import OwnerDashboard from './pages/owner/OwnerDashboard';

import { BranchProvider } from './context/BranchContext';

// QR Menu
import QRMenu from './pages/qr/QRMenu';

// Manager
import ManagerLayout from './pages/manager/ManagerLayout';
import InventoryView from './pages/manager/InventoryView';
import MenuView from './pages/manager/MenuView';
import RecipesView from './pages/manager/RecipesView';
import WasteView from './pages/manager/WasteView';
import SuppliersView from './pages/manager/SuppliersView';
import TransfersView from './pages/manager/TransfersView';
import CustomersView from './pages/manager/CustomersView';
import AlertsView from './pages/manager/AlertsView';
import EmployeesView from './pages/manager/EmployeesView';
import ReportsView from './pages/manager/ReportsView';
import QRGeneratorView from './pages/manager/QRGeneratorView';
import AIInsightsView from './pages/manager/AIInsightsView';

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<StationLogin />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Customer QR Menu (Public) */}
            <Route path="/menu/:branchId/:tableId" element={<QRMenu />} />

            {/* Station PIN (requires station auth first) */}
            <Route
              path="/pin"
              element={
                <ProtectedRoute allowedRoles={['station']}>
                  <StaffPIN />
                </ProtectedRoute>
              }
            />

            {/* POS Dashboard (requires station + staff PIN) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute 
                  allowedRoles={['station']} 
                  requireStaffPIN={true}
                >
                  <POSDashboard />
                </ProtectedRoute>
              }
            />

            {/* Waiter Mobile Dashboard (requires station + staff PIN) */}
            <Route
              path="/waiter"
              element={
                <ProtectedRoute 
                  allowedRoles={['station']} 
                  requireStaffPIN={true}
                >
                  <WaiterDashboard />
                </ProtectedRoute>
              }
            />

            {/* KDS (requires KDS station + staff PIN) */}
            <Route
              path="/kds"
              element={
                <ProtectedRoute 
                  allowedRoles={['station']} 
                  requiredStationType="kds"
                  requireStaffPIN={true}
                >
                  <KDSDashboard />
                </ProtectedRoute>
              }
            />

            {/* Owner Dashboard */}
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute allowedRoles={['owner', 'superadmin']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Super Admin Dashboard */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Manager Console */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'superadmin']}>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="inventory" replace />} />
              <Route path="reports" element={<ReportsView />} />
              <Route path="ai" element={<AIInsightsView />} />
              <Route path="qr" element={<QRGeneratorView />} />
              <Route path="alerts" element={<AlertsView />} />
              <Route path="staff" element={<EmployeesView />} />
              <Route path="menu" element={<MenuView />} />
              <Route path="inventory" element={<InventoryView />} />
              <Route path="recipes" element={<RecipesView />} />
              <Route path="waste" element={<WasteView />} />
              <Route path="suppliers" element={<SuppliersView />} />
              <Route path="transfers" element={<TransfersView />} />
              <Route path="customers" element={<CustomersView />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </BranchProvider>
    </AuthProvider>
  );
}

export default App;
