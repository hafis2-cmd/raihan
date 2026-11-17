import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// @ts-ignore
import firebaseConfigFromJson from '../firebase-applet-config.json';

const configJson = firebaseConfigFromJson as any;

const resolvedDatabaseId = (() => {
  const envVal = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
  if (typeof envVal === 'string' && envVal.trim() !== '') {
    return envVal.trim();
  }
  const configVal = configJson.firestoreDatabaseId;
  if (typeof configVal === 'string' && configVal.trim() !== '') {
    return configVal.trim();
  }
  return undefined;
})();

const getVal = (envVal: string | undefined, configVal: string | undefined) => {
  if (envVal && envVal.trim() !== '' && !envVal.includes('your_') && !envVal.includes('your-')) {
    return envVal.trim();
  }
  return configVal || '';
};

// Check if a real production API key is configured
const rawApiKey = getVal(import.meta.env.VITE_FIREBASE_API_KEY, configJson.apiKey);
export const isFirebaseConfigured = Boolean(rawApiKey && rawApiKey.trim() !== '' && !rawApiKey.startsWith('AIzaSyMock'));

// Provide safe non-empty development key so Firebase client SDK doesn't throw auth/invalid-api-key at module load time
const activeApiKey = isFirebaseConfigured ? rawApiKey.trim() : 'AIzaSyMockDevKeyForRaihanSystem0000000000';

const firebaseConfig = {
  apiKey: activeApiKey,
  authDomain: getVal(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, configJson.authDomain) || 'raihan-telemed.firebaseapp.com',
  projectId: getVal(import.meta.env.VITE_FIREBASE_PROJECT_ID, configJson.projectId) || 'raihan-telemed',
  storageBucket: getVal(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, configJson.storageBucket) || 'raihan-telemed.firebasestorage.app',
  messagingSenderId: getVal(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, configJson.messagingSenderId) || '123456789012',
  appId: getVal(import.meta.env.VITE_FIREBASE_APP_ID, configJson.appId) || '1:123456789012:web:raihan00000000',
  measurementId: getVal(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, configJson.measurementId),
  firestoreDatabaseId: resolvedDatabaseId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!isFirebaseConfigured) {
    console.info("Raihan Telemedicine: Running with development configuration. Real Firebase credentials can be added in .env or firebase-applet-config.json after development.");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();
