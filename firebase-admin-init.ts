import "dotenv/config";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let configJson: any = {};
if (fs.existsSync(configPath)) {
  try {
    configJson = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Failed to parse firebase-applet-config.json:", e);
  }
}

let app: admin.app.App | undefined;

if (admin.apps.length === 0) {
  const projectId = configJson.projectId || process.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    app = admin.initializeApp({
      projectId: projectId,
    });
    console.log(`Firebase Admin initialized for project: ${projectId}`);
  } else {
    console.warn("Firebase Admin Project ID is missing. Firebase operations might fail.");
  }
} else {
  app = admin.apps[0] || undefined;
}

export const adminAuth = getAuth(app);
export const adminDb = configJson.firestoreDatabaseId 
  ? getFirestore(app || admin.app(), configJson.firestoreDatabaseId) 
  : getFirestore(app || admin.app());
export { admin };
