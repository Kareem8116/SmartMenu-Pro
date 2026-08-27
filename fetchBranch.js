import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBbub_lj1WtwMFD42QlictX-OuEx_9ZN30",
  authDomain: "smartmenu-pro-1.firebaseapp.com",
  projectId: "smartmenu-pro-1",
  storageBucket: "smartmenu-pro-1.firebasestorage.app",
  messagingSenderId: "1020482061644",
  appId: "1:1020482061644:web:57b722b3823372399dfbe9",
  measurementId: "G-R0404D1TH3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "branches"), limit(1));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log("Branch ID:", doc.id);
  });
}
run();
