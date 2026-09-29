import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal @firebase/firestore transient WebChannel retry logs in iframe environments
setLogLevel('silent');

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const resolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || '',
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID ||
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    firebaseConfig.firestoreDatabaseId
};

const app = initializeApp(resolvedFirebaseConfig);

function initDb() {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
      },
      resolvedFirebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
  }
}

export const db = initDb();
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isTransientUnavailableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string })?.code?.toLowerCase() || '';
  return (
    code === 'unavailable' ||
    code.includes('unavailable') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('client is offline') ||
    msg.includes('code=unavailable') ||
    msg.includes('operation could not be completed')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  if (!isTransientUnavailableError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

export function formatReadableFirestoreError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(rawMessage) as FirestoreErrorInfo;
    if (parsed && parsed.error) {
      if (
        parsed.error.toLowerCase().includes('permission') ||
        parsed.error.toLowerCase().includes('insufficient')
      ) {
        return `Erreur Firestore (Règles de sécurité sur "${parsed.path}") : Permissions insuffisantes (${parsed.error}).`;
      }
      return `Erreur Firestore (${parsed.operationType} sur "${parsed.path}") : ${parsed.error}`;
    }
  } catch {
    // Not a JSON error string
  }
  if (
    rawMessage.toLowerCase().includes('permission') ||
    rawMessage.toLowerCase().includes('insufficient')
  ) {
    return `Erreur Firestore (Règles de sécurité) : Écriture ou lecture refusée (${rawMessage}).`;
  }
  return `Erreur Firestore : ${rawMessage}`;
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline') &&
      !isTransientUnavailableError(error)
    ) {
      console.warn('Firestore connection check: operating with local cache.');
    }
  }
}

testConnection();
