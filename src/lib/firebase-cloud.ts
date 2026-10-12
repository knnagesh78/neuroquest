import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

/** Load Firestore only after sign-in so the public account screen stays smaller. */
let database: Firestore | undefined;
export function getFirebaseDatabase() {
  if (database) return database;
  const { app } = getFirebase();
  const db = getFirestore(app); // Memory-only cache: notes are not persisted to browser disk.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  database = db;
  return database;
}
