import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection as realCollection,
  doc as realDoc,
  addDoc as realAddDoc,
  setDoc as realSetDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  limit as realLimit,
  onSnapshot as realOnSnapshot,
  runTransaction as realRunTransaction,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  signOut as realSignOut,
  onAuthStateChanged as realOnAuthStateChanged,
  sendSignInLinkToEmail as realSendSignInLinkToEmail,
  isSignInWithEmailLink as realIsSignInWithEmailLink,
  signInWithEmailLink as realSignInWithEmailLink,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const isRealFirebase = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let realApp: any;
let realDb: any;
let realAuth: any;
let realFunctions: any;

if (isRealFirebase) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  realApp = initializeApp(firebaseConfig);
  realDb = getFirestore(realApp);
  realAuth = getAuth(realApp);
  realFunctions = getFunctions(realApp);
}

class MockFirestoreDb {
  private data: Record<string, Record<string, any>> = {};
  private listeners: Record<string, Set<() => void>> = {};

  constructor() {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem('ecosphere_db_fallback');
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = {};
      }
    }
  }

  save() {
    localStorage.setItem('ecosphere_db_fallback', JSON.stringify(this.data));
    this.triggerListeners();
  }

  private triggerListeners() {
    Object.keys(this.listeners).forEach((collName) => {
      this.listeners[collName].forEach((cb) => cb());
    });
  }

  getCollection(collName: string): Record<string, any> {
    if (!this.data[collName]) {
      this.data[collName] = {};
    }
    return this.data[collName];
  }

  getDoc(collName: string, id: string): any {
    return this.getCollection(collName)[id] || null;
  }

  setDoc(collName: string, id: string, docData: any) {
    const collection = this.getCollection(collName);
    collection[id] = { ...docData, id };
    this.save();
  }

  updateDoc(collName: string, id: string, docData: any) {
    const collection = this.getCollection(collName);
    if (collection[id]) {
      collection[id] = { ...collection[id], ...docData };
      this.save();
    }
  }

  addDoc(collName: string, docData: any): string {
    const id = Math.random().toString(36).substring(2, 15);
    this.setDoc(collName, id, { ...docData, id });
    return id;
  }

  deleteDoc(collName: string, id: string) {
    const collection = this.getCollection(collName);
    delete collection[id];
    this.save();
  }

  addListener(collName: string, callback: () => void) {
    if (!this.listeners[collName]) {
      this.listeners[collName] = new Set();
    }
    this.listeners[collName].add(callback);
  }

  removeListener(collName: string, callback: () => void) {
    if (this.listeners[collName]) {
      this.listeners[collName].delete(callback);
    }
  }

  clearAll() {
    this.data = {};
    this.save();
  }
}

const mockDb = new MockFirestoreDb();

class MockAuthService {
  currentUser: any = null;
  private listeners: Set<(user: any) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem('ecosphere_auth_fallback');
    if (saved) {
      try {
        const userId = JSON.parse(saved);
        const employee = mockDb.getDoc('employees', userId);
        if (employee) {
          this.currentUser = employee;
        }
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  setCurrentUser(user: any) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('ecosphere_auth_fallback', JSON.stringify(user.id));
    } else {
      localStorage.removeItem('ecosphere_auth_fallback');
    }
    this.notify();
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  addListener(cb: (user: any) => void) {
    this.listeners.add(cb);
    cb(this.currentUser);
    return () => this.listeners.delete(cb);
  }
}

const mockAuth = new MockAuthService();

export const db = isRealFirebase ? realDb : mockDb;
export const auth = isRealFirebase ? realAuth : mockAuth;

export function collection(database: any, name: string) {
  if (isRealFirebase) return realCollection(database, name);
  return { type: 'collection', name };
}

export function doc(databaseOrCollRef: any, pathOrId?: string, ...more: string[]) {
  if (isRealFirebase) {
    if (pathOrId) {
      return realDoc(databaseOrCollRef, pathOrId, ...more);
    } else {
      return realDoc(databaseOrCollRef);
    }
  }

  if (databaseOrCollRef.type === 'collection') {
    const collName = databaseOrCollRef.name;
    const id = pathOrId || Math.random().toString(36).substring(2, 15);
    return { type: 'document', collectionName: collName, id };
  } else {
    const collName = pathOrId!;
    const id = more[0] || Math.random().toString(36).substring(2, 15);
    return { type: 'document', collectionName: collName, id };
  }
}

export async function getDoc(docRef: any) {
  if (isRealFirebase) return await realGetDoc(docRef);
  const data = mockDb.getDoc(docRef.collectionName, docRef.id);
  return {
    id: docRef.id,
    data: () => data,
    exists: () => !!data,
  };
}

export async function getDocs(queryOrRef: any) {
  if (isRealFirebase) return await realGetDocs(queryOrRef);
  const collectionName = queryOrRef.collectionName || queryOrRef.name;
  let items = Object.values(mockDb.getCollection(collectionName));

  if (queryOrRef.type === 'query') {
    for (const c of queryOrRef.constraints) {
      if (c.type === 'where') {
        items = items.filter((item) => {
          const val = item[c.field];
          switch (c.op) {
            case '==':
              return val === c.val;
            case '!=':
              return val !== c.val;
            case '>':
              return val > c.val;
            case '>=':
              return val >= c.val;
            case '<':
              return val < c.val;
            case '<=':
              return val <= c.val;
            case 'array-contains':
              return Array.isArray(val) && val.includes(c.val);
            default:
              return true;
          }
        });
      }
    }
    const orderByConstraints = queryOrRef.constraints.filter(
      (c: any) => c.type === 'orderBy'
    );
    for (const c of orderByConstraints) {
      items.sort((a, b) => {
        const valA = a[c.field];
        const valB = b[c.field];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return c.dir === 'desc' ? 1 : -1;
        if (valA > valB) return c.dir === 'desc' ? -1 : 1;
        return 0;
      });
    }
    const limitConstraint = queryOrRef.constraints.find(
      (c: any) => c.type === 'limit'
    );
    if (limitConstraint) {
      items = items.slice(0, limitConstraint.count);
    }
  }

  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => item,
      exists: () => true,
    })),
    empty: items.length === 0,
    size: items.length,
  };
}

export async function addDoc(collectionRef: any, data: any) {
  if (isRealFirebase) {
    const docRef = await realAddDoc(collectionRef, data);
    return docRef;
  }
  const id = mockDb.addDoc(collectionRef.name, data);
  return { id, type: 'document', collectionName: collectionRef.name };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (isRealFirebase) return await realSetDoc(docRef, data, options);
  if (options?.merge) {
    const current = mockDb.getDoc(docRef.collectionName, docRef.id) || {};
    mockDb.setDoc(docRef.collectionName, docRef.id, { ...current, ...data });
  } else {
    mockDb.setDoc(docRef.collectionName, docRef.id, data);
  }
  return docRef;
}

export async function updateDoc(docRef: any, data: any) {
  if (isRealFirebase) return await realUpdateDoc(docRef, data);
  mockDb.updateDoc(docRef.collectionName, docRef.id, data);
  return docRef;
}

export async function deleteDoc(docRef: any) {
  if (isRealFirebase) return await realDeleteDoc(docRef);
  mockDb.deleteDoc(docRef.collectionName, docRef.id);
}

export function query(collectionRef: any, ...constraints: any[]) {
  if (isRealFirebase) return realQuery(collectionRef, ...constraints);
  return {
    type: 'query',
    collectionName: collectionRef.name,
    constraints,
  };
}

export function where(field: string, op: string, val: any) {
  if (isRealFirebase) return realWhere(field, op as any, val);
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  if (isRealFirebase) return realOrderBy(field, dir);
  return { type: 'orderBy', field, dir };
}

export function limit(count: number) {
  if (isRealFirebase) return realLimit(count);
  return { type: 'limit', count };
}

export function onSnapshot(queryOrDocRef: any, callback: (snapshot: any) => void) {
  if (isRealFirebase) return realOnSnapshot(queryOrDocRef, callback);
  const collectionName = queryOrDocRef.collectionName || queryOrDocRef.name;

  const listener = async () => {
    if (queryOrDocRef.type === 'document') {
      const data = mockDb.getDoc(queryOrDocRef.collectionName, queryOrDocRef.id);
      callback({
        id: queryOrDocRef.id,
        data: () => data,
        exists: () => !!data,
      });
    } else {
      const snap = await getDocs(queryOrDocRef);
      callback(snap);
    }
  };

  mockDb.addListener(collectionName, listener);
  listener();

  return () => {
    mockDb.removeListener(collectionName, listener);
  };
}

export async function runTransaction(
  database: any,
  callback: (transaction: any) => Promise<any>
) {
  if (isRealFirebase) return await realRunTransaction(database, callback);

  const transaction = {
    get: async (docRef: any) => {
      const data = mockDb.getDoc(docRef.collectionName, docRef.id);
      return {
        id: docRef.id,
        data: () => data,
        exists: () => !!data,
      };
    },
    update: (docRef: any, data: any) => {
      mockDb.updateDoc(docRef.collectionName, docRef.id, data);
    },
    set: (docRef: any, data: any) => {
      mockDb.setDoc(docRef.collectionName, docRef.id, data);
    },
    delete: (docRef: any) => {
      mockDb.deleteDoc(docRef.collectionName, docRef.id);
    },
  };

  try {
    const result = await callback(transaction);
    mockDb.save();
    return result;
  } catch (e) {
    mockDb.save();
    throw e;
  }
}

export async function signInWithEmailAndPassword(
  authInstance: any,
  email: string,
  pass: string
) {
  if (isRealFirebase) return await realSignInWithEmailAndPassword(authInstance, email, pass);

  const employees = Object.values(mockDb.getCollection('employees'));
  const found = employees.find((emp: any) => emp.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    throw new Error('AuthError: User not found in employees collection.');
  }
  mockAuth.setCurrentUser(found);
  return { user: found };
}

export async function createUserWithEmailAndPassword(
  authInstance: any,
  email: string,
  pass: string
) {
  if (isRealFirebase) return await realCreateUserWithEmailAndPassword(authInstance, email, pass);

  const existing = Object.values(mockDb.getCollection('employees')).find(
    (emp: any) => emp.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    throw new Error('AuthError: Email already exists.');
  }

  const newEmp = {
    id: Math.random().toString(36).substring(2, 15),
    name: email.split('@')[0],
    email,
    departmentId: 'ops-1',
    role: 'Employee' as const,
    status: 'Active' as const,
    xp: 0,
    points: 0,
    badgeIds: [],
    joinedAt: new Date().toISOString(),
  };

  mockDb.setDoc('employees', newEmp.id, newEmp);
  mockAuth.setCurrentUser(newEmp);
  return { user: newEmp };
}

export async function signOut(authInstance: any) {
  if (isRealFirebase) return await realSignOut(authInstance);
  mockAuth.setCurrentUser(null);
}

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (isRealFirebase) {
    return realOnAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = realDoc(realDb, 'employees', firebaseUser.uid);
          const docSnap = await realGetDoc(docRef);
          if (docSnap.exists()) {
            callback({ ...firebaseUser, ...docSnap.data() });
          } else {
            callback(firebaseUser);
          }
        } catch (e) {
          callback(firebaseUser);
        }
      } else {
        callback(null);
      }
    });
  }
  return mockAuth.addListener(callback);
}

export async function sendSignInLinkToEmail(authInstance: any, email: string, actionCodeSettings: any) {
  if (isRealFirebase) return await realSendSignInLinkToEmail(authInstance, email, actionCodeSettings);
  
  // Local fallback simulation
  const employees = Object.values(mockDb.getCollection('employees'));
  const found = employees.find((emp: any) => emp.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    throw new Error('AuthError: User email not found in seeded database. Please reset & seed first.');
  }

  // Construct fake magic link containing oobCode for verification
  const link = `${actionCodeSettings.url}?apiKey=mock-api-key&mode=signIn&oobCode=mock-code-${found.id}`;
  
  // Show standard notification/prompt to simulate receipt of the email link
  console.log(`[Firebase Link Sent to ${email}]: ${link}`);
  
  // Store sign-in link info in a custom localStorage key so the client can simulate opening it
  window.localStorage.setItem('mockSignInLink', link);
  return true;
}

export function isSignInWithEmailLink(authInstance: any, url: string) {
  if (isRealFirebase) return realIsSignInWithEmailLink(authInstance, url);
  return url.includes('oobCode=mock-code-');
}

export async function signInWithEmailLink(authInstance: any, email: string, url: string) {
  if (isRealFirebase) return await realSignInWithEmailLink(authInstance, email, url);

  const match = url.match(/oobCode=mock-code-([a-zA-Z0-9\-]+)/);
  if (!match) {
    throw new Error('AuthError: Invalid or malformed mock login code.');
  }
  const employeeId = match[1];
  const employee = mockDb.getDoc('employees', employeeId);
  if (!employee) {
    throw new Error('AuthError: Mock employee could not be found.');
  }
  if (employee.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('AuthError: Security check failed. Email mismatch.');
  }

  mockAuth.setCurrentUser(employee);
  return { user: employee };
}

export function clearMockDatabase() {
  if (!isRealFirebase) {
    mockDb.clearAll();
  }
}

export async function callEsgAI(taskType: string, payload: any): Promise<any> {
  if (isRealFirebase) {
    const callEsgAIProxy = httpsCallable(realFunctions, 'callEsgAI');
    const result = await callEsgAIProxy({ taskType, payload });
    return result.data;
  }

  // Local simulated fallback heuristics based on taskType
  if (taskType === 'categorizeTransaction') {
    const text = (payload.description || '').toLowerCase();
    let quantity = 1;
    let factorId = 'ef-electricity'; // default
    let scope = 2;

    const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(liters|liter|kwh|km|m3|l|units)/i);
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
    } else {
      const genericNumberMatch = text.match(/(\d+(?:\.\d+)?)/);
      if (genericNumberMatch) {
        quantity = parseFloat(genericNumberMatch[1]);
      }
    }

    if (text.includes('diesel') || text.includes('fuel') || text.includes('oil')) {
      factorId = 'ef-diesel';
      scope = 1;
    } else if (text.includes('electricity') || text.includes('power') || text.includes('grid')) {
      factorId = 'ef-electricity';
      scope = 2;
    } else if (text.includes('flight') || text.includes('air') || text.includes('travel') || text.includes('plane')) {
      factorId = 'ef-air';
      scope = 3;
    } else if (text.includes('gas') || text.includes('natural gas') || text.includes('heating')) {
      factorId = 'ef-gas';
      scope = 1;
    }

    return {
      quantity,
      emissionFactorId: factorId,
      scope,
      confidence: 0.92,
      explanation: `Parsed keyword matches to map activity onto scope ${scope} factor.`
    };
  }

  if (taskType === 'generateSummaryAndForecast') {
    const { environmental = 90, social = 41, governance = 97 } = payload.overall || {};
    
    const forecast = {
      environmental: { direction: 'up', change: '+2%' },
      social: { direction: 'up', change: '+4%' },
      governance: { direction: 'stable', change: '0%' }
    };

    const text = `The overall ESG index shows steady progress at ${((environmental * 0.4 + social * 0.3 + governance * 0.3)).toFixed(0)} points. Environmental pillar is robust with active emissions auditing matching Scope targets. Social engagement shows volunteer rate expansion. Compliance actions are fully structured under active audit cycles.`;

    return {
      summary: text,
      forecast,
      timestamp: new Date().toISOString()
    };
  }

  if (taskType === 'suggestSeverity') {
    const text = (payload.description || '').toLowerCase();
    let severity = 'Medium';
    let explanation = 'Issue shows standard regulatory gap matching medium severity remediation timescales.';

    if (text.includes('leak') || text.includes('spill') || text.includes('hazardous') || text.includes('chemical') || text.includes('injury')) {
      severity = 'Critical';
      explanation = 'Environmental or safety hazard detected that requires immediate shutdown or emergency escalation.';
    } else if (text.includes('missing') || text.includes('no fire drill') || text.includes('failure to record') || text.includes('absent')) {
      severity = 'High';
      explanation = 'Systemic governance gap that violates major legal obligations or corporate safety mandates.';
    } else if (text.includes('review') || text.includes('outdated') || text.includes('update') || text.includes('label')) {
      severity = 'Low';
      explanation = 'Minor administrative discrepancy that does not compromise overall process integrity.';
    }

    return {
      severity,
      explanation,
      confidence: 0.88
    };
  }

  throw new Error(`Unknown AI ESG Task Type: ${taskType}`);
}

