import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import bcrypt from 'bcryptjs';

// Initialize Firebase Admin
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * createUser — Creates a new user with custom claims
 * 
 * Callable only by Super Admin
 * 
 * @param {string} data.email - User email
 * @param {string} data.password - User password
 * @param {string} data.role - Role: 'owner' | 'station' | 'admin'
 * @param {string} [data.branchId] - Branch ID (for station accounts)
 * @param {string} [data.ownerId] - Owner ID (for owner accounts)
 * @param {string} [data.stationType] - Station type: 'pos' | 'kds' (for station accounts)
 * @param {string} [data.displayName] - Display name
 */
export const createUser = onCall(async (request) => {
  // Verify caller is Super Admin
  if (!request.auth || request.auth.token.role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only Super Admin can create users.');
  }

  const { email, password, role, branchId, ownerId, stationType, displayName } = request.data;

  // Validate required fields
  if (!email || !password || !role) {
    throw new HttpsError('invalid-argument', 'Email, password, and role are required.');
  }

  // Validate role
  const validRoles = ['owner', 'station', 'superadmin'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Station accounts must have branchId and stationType
  if (role === 'station') {
    if (!branchId) throw new HttpsError('invalid-argument', 'branchId is required for station accounts.');
    if (!stationType || !['pos', 'kds'].includes(stationType)) {
      throw new HttpsError('invalid-argument', 'stationType must be "pos" or "kds" for station accounts.');
    }
  }

  // Owner accounts must have ownerId
  if (role === 'owner' && !ownerId) {
    throw new HttpsError('invalid-argument', 'ownerId is required for owner accounts.');
  }

  try {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email,
      disabled: false,
    });

    // Set custom claims
    const claims = { role };
    if (branchId) claims.branchId = branchId;
    if (ownerId) claims.ownerId = ownerId;
    if (stationType) claims.stationType = stationType;

    await auth.setCustomUserClaims(userRecord.uid, claims);

    // Log audit
    await db.collection('system').doc('auditLogs').collection('logs').add({
      action: 'create_user',
      performedBy: request.auth.uid,
      targetUserId: userRecord.uid,
      targetEmail: email,
      role,
      branchId: branchId || null,
      ownerId: ownerId || null,
      stationType: stationType || null,
      timestamp: new Date(),
    });

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      role,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new HttpsError('internal', `Failed to create user: ${error.message}`);
  }
});

/**
 * verifyStaffPIN — Verifies a staff member's PIN
 * 
 * Callable by station accounts
 * 
 * @param {string} data.branchId - Branch ID
 * @param {string} data.pin - 4-digit PIN to verify
 * @returns {{ valid: boolean, staff: { id, name, role } | null }}
 */
export const verifyStaffPIN = onCall(async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  // Must be a station account or higher
  const callerRole = request.auth.token.role;
  if (!['station', 'superadmin'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Only station accounts can verify PINs.');
  }

  const { branchId, pin } = request.data;

  if (!branchId || !pin) {
    throw new HttpsError('invalid-argument', 'branchId and pin are required.');
  }

  // Station account must belong to this branch
  if (callerRole === 'station' && request.auth.token.branchId !== branchId) {
    throw new HttpsError('permission-denied', 'Access denied: wrong branch.');
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
  }

  try {
    // Get all active staff in this branch
    const staffSnapshot = await db
      .collection('branches')
      .doc(branchId)
      .collection('staff')
      .where('isActive', '==', true)
      .get();

    // Check PIN against each staff member
    for (const doc of staffSnapshot.docs) {
      const staffData = doc.data();
      const isMatch = await bcrypt.compare(pin, staffData.pinHash);

      if (isMatch) {
        return {
          valid: true,
          staff: {
            id: doc.id,
            name: staffData.name,
            role: staffData.role,
          },
        };
      }
    }

    return { valid: false, staff: null };
  } catch (error) {
    console.error('Error verifying PIN:', error);
    throw new HttpsError('internal', 'Failed to verify PIN.');
  }
});

/**
 * setCustomClaims — Updates a user's custom claims
 * 
 * Callable only by Super Admin
 * 
 * @param {string} data.uid - Target user's UID
 * @param {object} data.claims - Custom claims to set
 */
export const setCustomClaims = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only Super Admin can set custom claims.');
  }

  const { uid, claims } = request.data;

  if (!uid || !claims) {
    throw new HttpsError('invalid-argument', 'uid and claims are required.');
  }

  try {
    await auth.setCustomUserClaims(uid, claims);

    // Log audit
    await db.collection('system').doc('auditLogs').collection('logs').add({
      action: 'set_claims',
      performedBy: request.auth.uid,
      targetUserId: uid,
      claims,
      timestamp: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting claims:', error);
    throw new HttpsError('internal', `Failed to set claims: ${error.message}`);
  }
});

/**
 * createStaffMember — Creates a staff member with hashed PIN
 * 
 * Callable by Super Admin or Branch Owner
 * 
 * @param {string} data.branchId - Branch ID
 * @param {string} data.name - Staff name
 * @param {string} data.role - Role: admin | cashier | waiter | chef
 * @param {string} data.pin - 4-digit PIN
 */
export const createStaffMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerRole = request.auth.token.role;
  
  // Must be superadmin or owner of this branch
  if (callerRole !== 'superadmin' && callerRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Only Super Admin or Owner can create staff.');
  }

  const { branchId, name, role, pin } = request.data;

  if (!branchId || !name || !role || !pin) {
    throw new HttpsError('invalid-argument', 'branchId, name, role, and pin are required.');
  }

  const validRoles = ['admin', 'cashier', 'waiter', 'chef'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'PIN must be exactly 4 digits.');
  }

  // If owner, verify they own this branch
  if (callerRole === 'owner') {
    const branchDoc = await db.collection('branches').doc(branchId).get();
    if (!branchDoc.exists || branchDoc.data().ownerId !== request.auth.token.ownerId) {
      throw new HttpsError('permission-denied', 'You do not own this branch.');
    }
  }

  try {
    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Create staff document
    const staffRef = await db
      .collection('branches')
      .doc(branchId)
      .collection('staff')
      .add({
        name,
        role,
        pinHash,
        branchId,
        isActive: true,
        createdAt: new Date(),
      });

    // Log audit
    await db
      .collection('branches')
      .doc(branchId)
      .collection('auditLogs')
      .add({
        action: 'create_staff',
        performedBy: request.auth.uid,
        branchId,
        details: { staffId: staffRef.id, name, role },
        timestamp: new Date(),
      });

    return {
      success: true,
      staffId: staffRef.id,
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    throw new HttpsError('internal', `Failed to create staff: ${error.message}`);
  }
});

/**
 * seedTestData — Creates initial test data for Phase 0 testing
 * 
 * Callable only by Super Admin
 * Creates: 2 owners, 2 branches, station accounts, staff with PINs
 */
export const seedTestData = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only Super Admin can seed test data.');
  }

  const results = { owners: [], branches: [], stations: [], staff: [] };

  try {
    // --- Create Owner 1 ---
    const owner1Id = 'owner1';
    await db.collection('owners').doc(owner1Id).set({
      name: 'Ahmed Hassan',
      email: 'owner1@test.com',
      phone: '+201001234567',
      branchIds: ['branch-a', 'branch-b'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const owner1Auth = await auth.createUser({
      email: 'owner1@smartmenu.test',
      password: 'Owner1Pass!',
      displayName: 'Ahmed Hassan (Owner)',
    });
    await auth.setCustomUserClaims(owner1Auth.uid, { role: 'owner', ownerId: owner1Id });
    results.owners.push({ uid: owner1Auth.uid, email: 'owner1@smartmenu.test', ownerId: owner1Id });

    // --- Create Owner 2 ---
    const owner2Id = 'owner2';
    await db.collection('owners').doc(owner2Id).set({
      name: 'Sara Ali',
      email: 'owner2@test.com',
      phone: '+201009876543',
      branchIds: ['branch-c'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const owner2Auth = await auth.createUser({
      email: 'owner2@smartmenu.test',
      password: 'Owner2Pass!',
      displayName: 'Sara Ali (Owner)',
    });
    await auth.setCustomUserClaims(owner2Auth.uid, { role: 'owner', ownerId: owner2Id });
    results.owners.push({ uid: owner2Auth.uid, email: 'owner2@smartmenu.test', ownerId: owner2Id });

    // --- Create Branch A (owned by Owner 1) ---
    await db.collection('branches').doc('branch-a').set({
      ownerId: owner1Id,
      name: 'Downtown Café',
      nameAr: 'كافيه وسط البلد',
      address: 'Cairo Downtown',
      phone: '+20221234567',
      currency: 'EGP',
      taxRate: 14,
      timezone: 'Africa/Cairo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    results.branches.push('branch-a');

    // --- Create Branch B (owned by Owner 1) ---
    await db.collection('branches').doc('branch-b').set({
      ownerId: owner1Id,
      name: 'Mall Branch',
      nameAr: 'فرع المول',
      address: 'City Stars Mall',
      phone: '+20229876543',
      currency: 'EGP',
      taxRate: 14,
      timezone: 'Africa/Cairo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    results.branches.push('branch-b');

    // --- Create Branch C (owned by Owner 2) ---
    await db.collection('branches').doc('branch-c').set({
      ownerId: owner2Id,
      name: 'Zamalek Branch',
      nameAr: 'فرع الزمالك',
      address: 'Zamalek, Cairo',
      phone: '+20225551234',
      currency: 'EGP',
      taxRate: 14,
      timezone: 'Africa/Cairo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    results.branches.push('branch-c');

    // --- Create Licenses ---
    for (const branchId of ['branch-a', 'branch-b', 'branch-c']) {
      await db.collection('system').doc('licenses').collection(branchId).doc('config').set({
        status: 'active',
        enabledFeatures: {
          pos: true, kds: true, inventory: true, crm: true,
          'ai-waste': true, 'ai-demand': true, 'ai-report': true,
        },
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // --- Create Station Accounts ---
    // POS station for Branch A
    const posA = await auth.createUser({
      email: 'pos-brancha@smartmenu.test',
      password: 'PosA1234!',
      displayName: 'POS - Downtown Café',
    });
    await auth.setCustomUserClaims(posA.uid, { role: 'station', branchId: 'branch-a', stationType: 'pos' });
    results.stations.push({ uid: posA.uid, email: 'pos-brancha@smartmenu.test', branch: 'branch-a', type: 'pos' });

    // KDS station for Branch A
    const kdsA = await auth.createUser({
      email: 'kds-brancha@smartmenu.test',
      password: 'KdsA1234!',
      displayName: 'KDS - Downtown Café',
    });
    await auth.setCustomUserClaims(kdsA.uid, { role: 'station', branchId: 'branch-a', stationType: 'kds' });
    results.stations.push({ uid: kdsA.uid, email: 'kds-brancha@smartmenu.test', branch: 'branch-a', type: 'kds' });

    // POS station for Branch B
    const posB = await auth.createUser({
      email: 'pos-branchb@smartmenu.test',
      password: 'PosB1234!',
      displayName: 'POS - Mall Branch',
    });
    await auth.setCustomUserClaims(posB.uid, { role: 'station', branchId: 'branch-b', stationType: 'pos' });
    results.stations.push({ uid: posB.uid, email: 'pos-branchb@smartmenu.test', branch: 'branch-b', type: 'pos' });

    // --- Create Staff (with hashed PINs) ---
    const staffData = [
      { branchId: 'branch-a', name: 'Mohamed (Manager)', role: 'admin', pin: '1111' },
      { branchId: 'branch-a', name: 'Fatma (Cashier)', role: 'cashier', pin: '2222' },
      { branchId: 'branch-a', name: 'Ali (Waiter)', role: 'waiter', pin: '3333' },
      { branchId: 'branch-a', name: 'Hassan (Chef)', role: 'chef', pin: '4444' },
      { branchId: 'branch-b', name: 'Nour (Manager)', role: 'admin', pin: '5555' },
      { branchId: 'branch-b', name: 'Youssef (Cashier)', role: 'cashier', pin: '6666' },
    ];

    for (const s of staffData) {
      const pinHash = await bcrypt.hash(s.pin, 10);
      const ref = await db.collection('branches').doc(s.branchId).collection('staff').add({
        name: s.name,
        role: s.role,
        pinHash,
        branchId: s.branchId,
        isActive: true,
        createdAt: new Date(),
      });
      results.staff.push({ id: ref.id, name: s.name, role: s.role, branch: s.branchId, pin: s.pin });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw new HttpsError('internal', `Failed to seed data: ${error.message}`);
  }
});
