import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  GithubAuthProvider,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

const firebaseOptions: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export const firebaseMissingKeys = requiredFirebaseEnv.filter((key) => !env[key]);
export const firebaseConfigured = firebaseMissingKeys.length === 0;
export const firebaseAuthDomain = (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? null;
export const firebaseProjectId = (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? null;
export const lupiMcpEndpoint =
  (env.VITE_LUPI_MCP_ENDPOINT as string | undefined) ?? 'http://127.0.0.1:8787/mcp';

export const firebaseApp: FirebaseApp | null = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseOptions)
  : null;

function createFirebaseAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseAuth: Auth | null = firebaseApp ? createFirebaseAuth(firebaseApp) : null;
export const firebaseDb: Firestore | null = firebaseApp ? createFirestore(firebaseApp) : null;
export const googleAuthProvider = firebaseAuth ? new GoogleAuthProvider() : null;
export const githubAuthProvider = firebaseAuth ? new GithubAuthProvider() : null;

googleAuthProvider?.setCustomParameters({ prompt: 'select_account' });
githubAuthProvider?.addScope('read:user');
