import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

// Since we are running locally, we need to set GOOGLE_APPLICATION_CREDENTIALS 
// or use the default credential if we are logged in via gcloud.
// I will assume the Firebase CLI handles authentication for us or we just use default credentials.
// Let's initialize app.
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);

async function seedTestData() {
  console.log('Starting seed...');
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

    try {
      await auth.getUserByEmail('owner1@smartmenu.test');
      console.log('owner1 already exists in auth.');
    } catch (e) {
      const owner1Auth = await auth.createUser({
        email: 'owner1@smartmenu.test',
        password: 'Owner1Pass!',
        displayName: 'Ahmed Hassan (Owner)',
      });
      await auth.setCustomUserClaims(owner1Auth.uid, { role: 'owner', ownerId: owner1Id });
      results.owners.push({ uid: owner1Auth.uid, email: 'owner1@smartmenu.test', ownerId: owner1Id });
    }

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

    // --- Create Licenses ---
    await db.collection('system').doc('licenses').collection('branch-a').doc('config').set({
      status: 'active',
      enabledFeatures: {
        pos: true, kds: true, inventory: true, crm: true,
        'ai-waste': true, 'ai-demand': true, 'ai-report': true,
      },
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // --- Create Station Accounts ---
    // POS station for Branch A
    try {
      await auth.getUserByEmail('pos-brancha@smartmenu.test');
      console.log('pos-brancha already exists in auth.');
    } catch (e) {
      const posA = await auth.createUser({
        email: 'pos-brancha@smartmenu.test',
        password: 'PosA1234!',
        displayName: 'POS - Downtown Café',
      });
      await auth.setCustomUserClaims(posA.uid, { role: 'station', branchId: 'branch-a', stationType: 'pos' });
      results.stations.push({ uid: posA.uid, email: 'pos-brancha@smartmenu.test', branch: 'branch-a', type: 'pos' });
    }

    // --- Create Staff (with hashed PINs) ---
    const staffData = [
      { branchId: 'branch-a', name: 'Mohamed (Manager)', role: 'admin', pin: '1111' },
      { branchId: 'branch-a', name: 'Fatma (Cashier)', role: 'cashier', pin: '2222' },
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

    console.log('Seed successful:', results);
  } catch (error) {
    console.error('Error seeding test data:', error);
  }
}

seedTestData();
