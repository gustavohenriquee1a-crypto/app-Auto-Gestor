import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function getOrCreateFirestore(): Firestore {
  const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? config.firestoreDatabaseId
    : undefined;
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, dbId);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = getOrCreateFirestore();

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection check: Client is currently operating in offline mode or connecting.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}


