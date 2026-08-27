import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getOwnerBranches } from '../services/auth';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { user, isOwner } = useAuth();
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
      if (!isOwner || !user?.uid) {
        if (isMounted) {
          setBranches([]);
          setActiveBranchId(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const ownerBranches = await getOwnerBranches(user.uid);
        if (isMounted) {
          setBranches(ownerBranches);
          if (ownerBranches.length > 0) {
            setActiveBranchId(ownerBranches[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load branches", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBranches();

    return () => { isMounted = false; };
  }, [user, isOwner]);

  const activeBranches = activeBranchId === 'all' 
    ? branches 
    : branches.filter(b => b.id === activeBranchId);

  return (
    <BranchContext.Provider value={{ 
      branches, 
      activeBranchId, 
      setActiveBranchId, 
      activeBranches,
      loading 
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
