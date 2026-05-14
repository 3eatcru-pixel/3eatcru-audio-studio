import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp, getDocFromServer, or } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Error Handling according to guidelines
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth Actions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Get access token for Google Drive
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      localStorage.setItem('google_drive_token', token);
    }
    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore Actions
export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const d = await getDoc(doc(db, 'users', uid));
    return d.exists() ? d.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const createUserProfile = async (user: User) => {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      settings: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const saveProjectMetadata = async (metadata: any) => {
  const path = `projects/${metadata.id}`;
  try {
    await setDoc(doc(db, 'projects', metadata.id), {
      ...metadata,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserProjects = async (uid: string) => {
  const path = 'projects';
  try {
    const q = query(collection(db, 'projects'), where('ownerId', '==', uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const subscribeToProjects = (uid: string, callback: (projects: any[]) => void) => {
  const q = query(
    collection(db, 'projects'), 
    or(
      where('ownerId', '==', uid),
      where('collaborators', 'array-contains', uid)
    )
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'projects');
  });
};

export const getUserByEmail = async (email: string) => {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// Connection Test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
