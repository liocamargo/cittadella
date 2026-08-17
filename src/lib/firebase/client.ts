import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, initializeFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missing.join(", ")}. Revisá .env.local (ver .env.local.example).`
    );
  }
}

function createFirebaseApp(): FirebaseApp {
  assertConfig();
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const auth: Auth = getAuth(firebaseApp);
// ignoreUndefinedProperties: los campos opcionales del formulario (subtítulo,
// notas, etc.) llegan como `undefined` cuando están vacíos, y Firestore
// rechaza esos valores en set()/update() salvo que se ignoren acá.
export const db: Firestore = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true,
});
export const storage: FirebaseStorage = getStorage(firebaseApp);
