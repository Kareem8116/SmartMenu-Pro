import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute - Guards routes based on authentication and roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} [props.allowedRoles] - Allowed Firebase Auth roles (superadmin, owner, station)
 * @param {string[]} [props.allowedStaffRoles] - Allowed staff roles (admin, cashier, waiter, chef)
 * @param {boolean} [props.requireStaffPIN] - Whether staff PIN authentication is required
 * @param {string} [props.requiredStationType] - Required station type (pos, kds)
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  allowedStaffRoles = [],
  requireStaffPIN = false,
  requiredStationType = null,
}) {
  const { user, staffInfo, loading, isAuthenticated, isStaffAuthenticated } = useAuth();

  // Still loading auth state
  if (loading) {
    return (
      <div className="auth-container">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  // Not authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check Firebase Auth role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check station type
  if (requiredStationType && user.stationType !== requiredStationType) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check if staff PIN is required but not authenticated
  if (requireStaffPIN && !isStaffAuthenticated) {
    return <Navigate to="/pin" replace />;
  }

  // Check staff role (after PIN)
  if (allowedStaffRoles.length > 0 && staffInfo) {
    if (!allowedStaffRoles.includes(staffInfo.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
