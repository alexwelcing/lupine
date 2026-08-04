import { useCallback, useSyncExternalStore } from 'react';
import {
  browserLocalPersistence,
  getRedirectResult,
  onIdTokenChanged,
  setPersistence,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type AuthProvider,
  type User,
} from 'firebase/auth';
import {
  firebaseAuth,
  githubAuthProvider,
  googleAuthProvider,
} from './firebase';
import { track, ANALYTICS_EVENTS } from '../analytics';

export type LupiAuthProviderId = 'google' | 'github';

export interface LupiAuthOverrideInput {
  displayName?: string;
  email?: string;
  idToken?: string;
  photoURL?: string;
  uid?: string;
}

export interface FirebaseAuthState {
  authOverrideAvailable: boolean;
  error: string | null;
  idToken: string | null;
  isOverride: boolean;
  loading: boolean;
  refreshToken: () => Promise<string | null>;
  signIn: (provider?: LupiAuthProviderId) => Promise<void>;
  signInWithCustomToken: (customToken: string) => Promise<void>;
  signInWithOverride: (account?: LupiAuthOverrideInput) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
}

interface FirebaseAuthSnapshot {
  error: string | null;
  idToken: string | null;
  isOverride: boolean;
  loading: boolean;
  user: User | null;
}

interface LupiFirebaseAuthDebug {
  clearOverride: () => Promise<void>;
  getState: () => {
    displayName: string | null;
    email: string | null;
    error: string | null;
    hasToken: boolean;
    override: boolean;
    overrideAvailable: boolean;
    loading: boolean;
    uid: string | null;
  };
  overrideSignIn: (account?: LupiAuthOverrideInput) => Promise<void>;
  refreshToken: () => Promise<string | null>;
  signIn: (provider?: LupiAuthProviderId) => Promise<void>;
  signInWithCustomToken: (customToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

declare global {
  interface Window {
    __lupiFirebaseAuth?: LupiFirebaseAuthDebug;
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Firebase authentication failed.';
}

function providerFor(provider: LupiAuthProviderId): AuthProvider | null {
  return provider === 'github' ? githubAuthProvider : googleAuthProvider;
}

const AUTH_OVERRIDE_STORAGE_KEY = 'lupi.authOverride.account';
const AUTH_OVERRIDE_PROVIDER_ID = 'lupi-dev-override';
const AUTH_TIMEOUT_CODE = 'lupi/auth-timeout';
const AUTH_STARTUP_TIMEOUT_MS = 4500;
const TOKEN_TIMEOUT_MS = 6500;
const AUTH_OVERRIDE_DEFAULT_ACCOUNT = {
  displayName: 'Codex Test',
  email: 'codex-test@lupi.local',
  uid: 'codex-internal-test',
};

function writeAuthHintCookie(nextUser: User | null) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (nextUser) {
    document.cookie = `lupi_viewer_auth=1; Max-Age=2592000; Path=/; SameSite=Lax${secure}`;
  } else {
    document.cookie = `lupi_viewer_auth=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  }
}

let authSnapshot: FirebaseAuthSnapshot = {
  error: null,
  idToken: null,
  isOverride: false,
  loading: Boolean(firebaseAuth),
  user: firebaseAuth?.currentUser ?? null,
};

const authSubscribers = new Set<() => void>();
let authObserverStarted = false;
let redirectResultStarted = false;
let authStartupTimer: ReturnType<typeof setTimeout> | null = null;

function getAuthSnapshot() {
  return authSnapshot;
}

function setAuthSnapshot(next: Partial<FirebaseAuthSnapshot>) {
  authSnapshot = { ...authSnapshot, ...next };
  writeAuthHintCookie(authSnapshot.user);
  publishAuthDebugApi();
  authSubscribers.forEach((listener) => listener());
}

function makeAuthTimeout(message: string) {
  return Object.assign(new Error(message), { code: AUTH_TIMEOUT_CODE });
}

function isAuthTimeout(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === AUTH_TIMEOUT_CODE;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(makeAuthTimeout(message)), ms);
    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

function clearAuthStartupTimer() {
  if (!authStartupTimer) return;
  clearTimeout(authStartupTimer);
  authStartupTimer = null;
}

function scheduleAuthStartupFallback() {
  clearAuthStartupTimer();
  authStartupTimer = setTimeout(() => {
    if (!authSnapshot.loading) return;
    setAuthSnapshot({ loading: false });
  }, AUTH_STARTUP_TIMEOUT_MS);
}

function subscribeAuth(listener: () => void) {
  ensureAuthObserver();
  authSubscribers.add(listener);
  return () => {
    authSubscribers.delete(listener);
  };
}

function ensureAuthObserver() {
  hydrateStoredAuthOverride();

  if (!firebaseAuth) {
    if (authSnapshot.loading) setAuthSnapshot({ loading: false });
    return;
  }

  if (!authObserverStarted) {
    authObserverStarted = true;
    if (!authSnapshot.isOverride) {
      setAuthSnapshot({
        error: null,
        loading: true,
        user: firebaseAuth.currentUser,
      });
      scheduleAuthStartupFallback();
    }

    onIdTokenChanged(firebaseAuth, async (nextUser) => {
      if (authSnapshot.isOverride && !nextUser) return;
      if (nextUser) clearAuthOverride();
      clearAuthStartupTimer();

      setAuthSnapshot({
        error: null,
        isOverride: false,
        loading: true,
        user: nextUser,
      });

      if (!nextUser) {
        setAuthSnapshot({ idToken: null, isOverride: false, loading: false });
        return;
      }

      try {
        const nextToken = await withTimeout(
          nextUser.getIdToken(),
          TOKEN_TIMEOUT_MS,
          'Firebase token refresh timed out.',
        );
        setAuthSnapshot({ idToken: nextToken, isOverride: false, loading: false, user: nextUser });
      } catch (nextError) {
        setAuthSnapshot({
          error: isAuthTimeout(nextError) ? null : toErrorMessage(nextError),
          idToken: null,
          isOverride: false,
          loading: false,
          user: nextUser,
        });
      }
    });
  }

  if (!redirectResultStarted) {
    redirectResultStarted = true;
    withTimeout(
      getRedirectResult(firebaseAuth),
      AUTH_STARTUP_TIMEOUT_MS,
      'Firebase redirect check timed out.',
    )
      .then(async (credential) => {
        if (credential?.user) {
          await updateSignedInUser(credential.user);
        }
      })
      .catch((nextError) => {
        if (isAuthTimeout(nextError)) {
          if (!authSnapshot.user && !authSnapshot.idToken) {
            setAuthSnapshot({ loading: false });
          }
          return;
        }
        setAuthSnapshot({
          error: toErrorMessage(nextError),
          loading: false,
        });
      })
      .finally(() => {
        if (!authSnapshot.user && !authSnapshot.idToken) {
          setAuthSnapshot({ loading: false });
        }
      });
  }
}

async function updateSignedInUser(nextUser: User) {
  clearAuthOverride();
  // Activation: a fresh credential resolved (popup success or redirect
  // result). Provider id is the sign-in method — no PII. Token refreshes
  // via onIdTokenChanged do NOT route through here, so this won't double-fire
  // on passive session restores.
  track(ANALYTICS_EVENTS.SIGNUP_COMPLETE, {
    provider: nextUser.providerData[0]?.providerId ?? 'unknown',
  });
  setAuthSnapshot({ error: null, isOverride: false, loading: true, user: nextUser });
  try {
    setAuthSnapshot({
      idToken: await withTimeout(
        nextUser.getIdToken(),
        TOKEN_TIMEOUT_MS,
        'Firebase token refresh timed out.',
      ),
      isOverride: false,
      loading: false,
      user: nextUser,
    });
  } catch (nextError) {
    setAuthSnapshot({
      error: isAuthTimeout(nextError) ? null : toErrorMessage(nextError),
      idToken: null,
      isOverride: false,
      loading: false,
      user: nextUser,
    });
  }
}

function shouldPreferPopupSignIn() {
  if (typeof window === 'undefined') return false;
  const configuredFlow = import.meta.env.VITE_LUPI_AUTH_FLOW;
  if (configuredFlow === 'popup') return true;
  if (configuredFlow === 'redirect') return false;
  return true;
}

function shouldFallbackToRedirect(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
  return code === 'auth/popup-blocked'
    || code === 'auth/operation-not-supported-in-this-environment'
    || code === 'auth/cancelled-popup-request';
}

async function prepareAuthPersistence() {
  if (!firebaseAuth) return;
  await setPersistence(firebaseAuth, browserLocalPersistence).catch(() => undefined);
}

async function startSignIn(providerId: LupiAuthProviderId = 'google') {
  ensureAuthObserver();
  clearAuthStartupTimer();
  const provider = providerFor(providerId);
  if (!firebaseAuth || !provider) {
    setAuthSnapshot({ error: 'Firebase is not configured for this build.', loading: false });
    return;
  }

  // Activation: signup/sign-in flow opened (Save-moment gate). Provider id
  // only — no PII.
  track(ANALYTICS_EVENTS.SIGNUP_START, { provider: providerId });

  setAuthSnapshot({ error: null, loading: true });
  try {
    await prepareAuthPersistence();

    if (shouldPreferPopupSignIn()) {
      try {
        const credential = await signInWithPopup(firebaseAuth, provider);
        await updateSignedInUser(credential.user);
        return;
      } catch (popupError) {
        if (!shouldFallbackToRedirect(popupError)) {
          throw popupError;
        }
      }
    }

    await signInWithRedirect(firebaseAuth, provider);
  } catch (nextError) {
    setAuthSnapshot({
      error: toErrorMessage(nextError),
      loading: false,
    });
  }
}

async function startCustomTokenSignIn(customToken: string) {
  ensureAuthObserver();
  clearAuthStartupTimer();
  if (!firebaseAuth) {
    setAuthSnapshot({ error: 'Firebase is not configured for this build.', loading: false });
    return;
  }

  setAuthSnapshot({ error: null, loading: true });
  try {
    await prepareAuthPersistence();
    const credential = await signInWithCustomToken(firebaseAuth, customToken);
    await updateSignedInUser(credential.user);
  } catch (nextError) {
    setAuthSnapshot({
      error: toErrorMessage(nextError),
      loading: false,
    });
  }
}

async function startOverrideSignIn(account?: LupiAuthOverrideInput) {
  clearAuthStartupTimer();
  if (!authOverrideAvailable()) {
    setAuthSnapshot({
      error: 'Lupi auth override is only available in local dev with VITE_LUPI_AUTH_OVERRIDE_ENABLED=true.',
      loading: false,
    });
    return;
  }

  const nextAccount = normalizeAuthOverrideAccount(account);
  persistAuthOverride(nextAccount);
  setAuthSnapshot({
    error: null,
    idToken: nextAccount.idToken,
    isOverride: true,
    loading: false,
    user: makeAuthOverrideUser(nextAccount),
  });
}

async function endSignIn() {
  if (authSnapshot.isOverride) {
    clearAuthOverride();
    setAuthSnapshot({
      error: null,
      idToken: null,
      isOverride: false,
      loading: false,
      user: firebaseAuth?.currentUser ?? null,
    });
    return;
  }

  if (!firebaseAuth) return;

  setAuthSnapshot({ error: null, loading: true });
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (nextError) {
    setAuthSnapshot({ error: toErrorMessage(nextError) });
  } finally {
    setAuthSnapshot({ loading: false });
  }
}

async function refreshAuthToken() {
  ensureAuthObserver();
  if (authSnapshot.isOverride) return authSnapshot.idToken;

  if (!firebaseAuth?.currentUser) return null;

  setAuthSnapshot({ error: null, loading: true, user: firebaseAuth.currentUser });
  try {
    const freshToken = await withTimeout(
      firebaseAuth.currentUser.getIdToken(true),
      TOKEN_TIMEOUT_MS,
      'Firebase token refresh timed out.',
    );
    setAuthSnapshot({
      idToken: freshToken,
      isOverride: false,
      loading: false,
      user: firebaseAuth.currentUser,
    });
    return freshToken;
  } catch (nextError) {
    setAuthSnapshot({
      error: isAuthTimeout(nextError) ? null : toErrorMessage(nextError),
      loading: false,
    });
    return null;
  }
}

function authOverrideAvailable() {
  if (typeof window === 'undefined') return false;
  return Boolean(import.meta.env.DEV)
    && import.meta.env.VITE_LUPI_AUTH_OVERRIDE_ENABLED === 'true'
    && isLocalDevHost(window.location.hostname);
}

function isLocalDevHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function hydrateStoredAuthOverride() {
  if (authSnapshot.isOverride || !authOverrideAvailable()) return;
  const stored = readStoredAuthOverride();
  if (!stored) return;
  setAuthSnapshot({
    error: null,
    idToken: stored.idToken,
    isOverride: true,
    loading: false,
    user: makeAuthOverrideUser(stored),
  });
}

function readStoredAuthOverride(): Required<Omit<LupiAuthOverrideInput, 'photoURL'>> & { photoURL: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_OVERRIDE_STORAGE_KEY);
    return raw ? normalizeAuthOverrideAccount(JSON.parse(raw) as LupiAuthOverrideInput) : null;
  } catch {
    return null;
  }
}

function persistAuthOverride(account: ReturnType<typeof normalizeAuthOverrideAccount>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_OVERRIDE_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Local override is only a dev convenience; keep the in-memory session alive if storage is blocked.
  }
}

function clearAuthOverride() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_OVERRIDE_STORAGE_KEY);
  } catch {
    // Storage can be blocked in hardened browser contexts.
  }
}

function normalizeAuthOverrideAccount(account?: LupiAuthOverrideInput) {
  const uid = readOverrideString(account?.uid)
    ?? readOverrideString(import.meta.env.VITE_LUPI_AUTH_OVERRIDE_UID)
    ?? AUTH_OVERRIDE_DEFAULT_ACCOUNT.uid;
  const email = readOverrideString(account?.email)
    ?? readOverrideString(import.meta.env.VITE_LUPI_AUTH_OVERRIDE_EMAIL)
    ?? AUTH_OVERRIDE_DEFAULT_ACCOUNT.email;
  const displayName = readOverrideString(account?.displayName)
    ?? readOverrideString(import.meta.env.VITE_LUPI_AUTH_OVERRIDE_DISPLAY_NAME)
    ?? AUTH_OVERRIDE_DEFAULT_ACCOUNT.displayName;
  const photoURL = readOverrideString(account?.photoURL)
    ?? readOverrideString(import.meta.env.VITE_LUPI_AUTH_OVERRIDE_PHOTO_URL)
    ?? null;
  const idToken = readOverrideString(account?.idToken)
    ?? readOverrideString(import.meta.env.VITE_LUPI_AUTH_OVERRIDE_TOKEN)
    ?? makeAuthOverrideToken(uid, email);
  return { displayName, email, idToken, photoURL, uid };
}

function readOverrideString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function makeAuthOverrideToken(uid: string, email: string) {
  if (typeof window === 'undefined') return `lupi-dev-override.${uid}`;
  const payload = window.btoa(JSON.stringify({
    aud: 'lupi-local-dev',
    email,
    firebase: { sign_in_provider: AUTH_OVERRIDE_PROVIDER_ID },
    iat: Math.floor(Date.now() / 1000),
    iss: 'lupi-local-dev',
    sub: uid,
    uid,
  }));
  return `lupi-dev-override.${payload}.local`;
}

function makeAuthOverrideUser(account: ReturnType<typeof normalizeAuthOverrideAccount>): User {
  const now = new Date().toISOString();
  return {
    delete: async () => undefined,
    displayName: account.displayName,
    email: account.email,
    emailVerified: true,
    getIdToken: async () => account.idToken,
    getIdTokenResult: async () => ({
      authTime: now,
      claims: {
        aud: 'lupi-local-dev',
        email: account.email,
        firebase: { sign_in_provider: AUTH_OVERRIDE_PROVIDER_ID },
        sub: account.uid,
        uid: account.uid,
      },
      expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      issuedAtTime: now,
      signInProvider: AUTH_OVERRIDE_PROVIDER_ID,
      signInSecondFactor: null,
      token: account.idToken,
    }),
    isAnonymous: false,
    metadata: {
      creationTime: now,
      lastSignInTime: now,
    },
    phoneNumber: null,
    photoURL: account.photoURL,
    providerData: [{
      displayName: account.displayName,
      email: account.email,
      phoneNumber: null,
      photoURL: account.photoURL,
      providerId: AUTH_OVERRIDE_PROVIDER_ID,
      uid: account.uid,
    }],
    providerId: AUTH_OVERRIDE_PROVIDER_ID,
    reload: async () => undefined,
    refreshToken: account.idToken,
    tenantId: null,
    toJSON: () => ({
      displayName: account.displayName,
      email: account.email,
      emailVerified: true,
      isAnonymous: false,
      photoURL: account.photoURL,
      providerId: AUTH_OVERRIDE_PROVIDER_ID,
      uid: account.uid,
    }),
    uid: account.uid,
  } as unknown as User;
}

function publishAuthDebugApi() {
  if (typeof window === 'undefined') return;
  window.__lupiFirebaseAuth = {
    clearOverride: async () => {
      clearAuthOverride();
      if (authSnapshot.isOverride) {
        setAuthSnapshot({
          error: null,
          idToken: null,
          isOverride: false,
          loading: false,
          user: firebaseAuth?.currentUser ?? null,
        });
      }
    },
    getState: () => ({
      displayName: authSnapshot.user?.displayName ?? null,
      email: authSnapshot.user?.email ?? null,
      error: authSnapshot.error,
      hasToken: Boolean(authSnapshot.idToken),
      loading: authSnapshot.loading,
      override: authSnapshot.isOverride,
      overrideAvailable: authOverrideAvailable(),
      uid: authSnapshot.user?.uid ?? null,
    }),
    overrideSignIn: startOverrideSignIn,
    refreshToken: refreshAuthToken,
    signIn: startSignIn,
    signInWithCustomToken: startCustomTokenSignIn,
    signOut: endSignIn,
  };
}

publishAuthDebugApi();

export function useFirebaseAuth(): FirebaseAuthState {
  ensureAuthObserver();
  const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  const signIn = useCallback((providerId: LupiAuthProviderId = 'google') => startSignIn(providerId), []);
  const signInWithOverride = useCallback((account?: LupiAuthOverrideInput) => startOverrideSignIn(account), []);
  const signOut = useCallback(() => endSignIn(), []);
  const refreshToken = useCallback(() => refreshAuthToken(), []);

  return {
    ...snapshot,
    authOverrideAvailable: authOverrideAvailable(),
    refreshToken,
    signIn,
    signInWithCustomToken: useCallback((customToken: string) => startCustomTokenSignIn(customToken), []),
    signInWithOverride,
    signOut,
  };
}
