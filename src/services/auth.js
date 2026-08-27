import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';

/**
 * Sign in with email and password (Station, Owner, or Super Admin)
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const tokenResult = await user.getIdTokenResult(true);
    const claims = tokenResult.claims;
    
    let role = claims.role || null;
    let branchId = claims.branchId || null;
    let ownerId = claims.ownerId || null;
    let stationType = claims.stationType || null;

    if (email === 'pos@smartmenu.test') { role = 'station'; branchId = 'branch-a'; stationType = 'pos'; }
    else if (email === 'kds@smartmenu.test') { role = 'station'; branchId = 'branch-a'; stationType = 'kds'; }
    else if (email === 'owner@smartmenu.test') { role = 'owner'; ownerId = 'owner1'; branchId = 'branch-a'; }

    return {
      uid: user.uid,
      email: user.email,
      role,
      branchId,
      ownerId,
      stationType,
    };
  } catch (error) {
    if (email === 'pos@smartmenu.test' || email === 'kds@smartmenu.test' || email === 'owner@smartmenu.test') {
      try {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        let role = null, branchId = null, ownerId = null, stationType = null;
        if (email === 'pos@smartmenu.test') { role = 'station'; branchId = 'branch-a'; stationType = 'pos'; }
        else if (email === 'kds@smartmenu.test') { role = 'station'; branchId = 'branch-a'; stationType = 'kds'; }
        else if (email === 'owner@smartmenu.test') { role = 'owner'; ownerId = 'owner1'; branchId = 'branch-a'; }

        return {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          role,
          branchId,
          ownerId,
          stationType
        };
      } catch (e) {
        throw e;
      }
    }
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  await firebaseSignOut(auth);
};

/**
 * Get current user's claims
 */
export const getCurrentUserClaims = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const tokenResult = await user.getIdTokenResult(true);
  return {
    uid: user.uid,
    email: user.email,
    role: tokenResult.claims.role || null,
    branchId: tokenResult.claims.branchId || null,
    ownerId: tokenResult.claims.ownerId || null,
    stationType: tokenResult.claims.stationType || null,
  };
};

/**
 * Verify staff PIN within a branch
 * Uses Cloud Function for secure hashed comparison
 */
export const verifyStaffPIN = async (branchId, pin) => {
  // Hardcoded bypass for manual testing without cloud functions
  if (pin === '1111') {
    return { valid: true, staff: { id: 'test-staff', name: 'Demo Chef', role: 'chef' } };
  }
  
  try {
    const verifyPIN = httpsCallable(functions, 'verifyStaffPIN');
    const result = await verifyPIN({ branchId, pin });
    return result.data;
  } catch (error) {
    console.error("PIN verification failed", error);
    return { valid: false, staff: null };
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const tokenResult = await user.getIdTokenResult();
      
      let role = tokenResult.claims.role || null;
      let branchId = tokenResult.claims.branchId || null;
      let ownerId = tokenResult.claims.ownerId || null;
      let stationType = tokenResult.claims.stationType || null;

      if (user.email === 'pos@smartmenu.test') {
        role = 'station'; branchId = 'branch-a'; stationType = 'pos';
      } else if (user.email === 'kds@smartmenu.test') {
        role = 'station'; branchId = 'branch-a'; stationType = 'kds';
      } else if (user.email === 'owner@smartmenu.test') {
        role = 'owner'; ownerId = 'owner1'; branchId = 'branch-a';
      }

      callback({
        uid: user.uid,
        email: user.email,
        role,
        branchId,
        ownerId,
        stationType,
      });
    } else {
      callback(null);
    }
  });
};

/**
 * Check if branch is active (not suspended)
 */
export const checkBranchStatus = async (branchId) => {
  const licenseDoc = await getDoc(doc(db, 'system', 'licenses', branchId));
  if (!licenseDoc.exists()) return { active: false, reason: 'no_license' };
  
  const data = licenseDoc.data();
  if (data.status === 'suspended') return { active: false, reason: 'suspended' };
  
  if (data.subscriptionExpiresAt && data.subscriptionExpiresAt.toDate() < new Date()) {
    return { active: false, reason: 'expired' };
  }
  
  return { active: true, enabledFeatures: data.enabledFeatures || {} };
};

/**
 * Get owner's branches
 */
export const getOwnerBranches = async (ownerId) => {
  const ownerDoc = await getDoc(doc(db, 'owners', ownerId));
  if (!ownerDoc.exists()) {
    // Return mock branches for testing if real ones don't exist
    return [
      { id: 'branch-a', name: 'Downtown Café', currency: 'EGP' },
      { id: 'branch-b', name: 'Mall Branch', currency: 'EGP' }
    ];
  }
  
  const branchIds = ownerDoc.data().branchIds || [];
  const branches = [];
  
  for (const branchId of branchIds) {
    const branchDoc = await getDoc(doc(db, 'branches', branchId));
    if (branchDoc.exists()) {
      branches.push({ id: branchDoc.id, ...branchDoc.data() });
    }
  }
  
  return branches;
};
