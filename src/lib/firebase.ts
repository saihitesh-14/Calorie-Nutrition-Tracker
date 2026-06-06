import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, FoodLog } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize main services with robust long-polling connection for iframe and proxy setups
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Authentication Provider
const googleProvider = new GoogleAuthProvider();

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

// Global Firestore error handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Raised: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test run as mandated by the Firebase skill
export async function testConnectionOnBoot(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection check verified (read resolved/failed gracefully from server).');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is reported as offline.");
    } else {
      console.log("Firebase server ping initiated successfully.");
    }
  }
}

// Sign-in with Google Pop-up (most iframe compatible)
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google provider: ', error);
    throw error;
  }
}

// User Sign-out
export async function logUserOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
    throw error;
  }
}

// User Profile DB Handlers
function sanitizeDbData<T extends object>(data: T): T {
  const clean: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.filter(item => item !== undefined);
      } else if (val !== null && typeof val === 'object') {
        clean[key] = sanitizeDbData(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const path = `users/${userId}`;
  try {
    const payload = sanitizeDbData({
      ...profile,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'users', userId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Food Logs DB Handlers
export async function addFoodLog(userId: string, log: FoodLog): Promise<void> {
  const path = `users/${userId}/logs/${log.id}`;
  try {
    const payload = sanitizeDbData({
      ...log,
      createdAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'users', userId, 'logs', log.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getFoodLogs(userId: string): Promise<FoodLog[]> {
  const path = `users/${userId}/logs`;
  try {
    const logsRef = collection(db, 'users', userId, 'logs');
    const logsQuery = query(logsRef); // Can order or filter if indexing allows
    const querySnapshot = await getDocs(logsQuery);
    const logs: FoodLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data() as FoodLog);
    });
    // Sort logs descending by loggedAt time of meal insertion
    return logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFoodLog(userId: string, logId: string): Promise<void> {
  const path = `users/${userId}/logs/${logId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'logs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
