const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// We need a service account key to list users if we are not running inside Firebase Functions.
// But wait, if we are authenticated via ADC (Application Default Credentials), it might work.
// Let's just try initializing the default app.
initializeApp();

async function listUsers() {
  try {
    const listUsersResult = await getAuth().listUsers(10);
    listUsersResult.users.forEach((userRecord) => {
      console.log('User:', userRecord.toJSON());
    });
  } catch (error) {
    console.error('Error listing users:', error.message);
  }
}
listUsers();
