import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, signOut as authSignOut } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null); // PIN-authenticated staff
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((userData) => {
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('demo_mode');
    await authSignOut();
    setUser(null);
    setStaffInfo(null);
  };

  const setStaff = (staff) => {
    setStaffInfo(staff);
  };

  const clearStaff = () => {
    setStaffInfo(null);
  };

  const value = {
    user,
    staffInfo,
    loading,
    signOut,
    setStaff,
    clearStaff,
    // Computed helpers
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'superadmin',
    isOwner: user?.role === 'owner',
    isStation: user?.role === 'station',
    isPOS: user?.role === 'station' && user?.stationType === 'pos',
    isKDS: user?.role === 'station' && user?.stationType === 'kds',
    isStaffAuthenticated: !!staffInfo,
    staffRole: staffInfo?.role || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
