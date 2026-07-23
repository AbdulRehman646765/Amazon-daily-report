// ============================================================
// Firebase Configuration & Initialization Module
// ============================================================

// Default Firebase Configuration (Users can also update this via Settings)
const defaultFirebaseConfig = {
  apiKey: localStorage.getItem("firebase_apiKey") || "AIzaSyD2tt4Q2anuWFbkNcm66CGWGN9J6P_9o60",
  authDomain: localStorage.getItem("firebase_authDomain") || "workreportweb-336b5.firebaseapp.com",
  projectId: localStorage.getItem("firebase_projectId") || "workreportweb-336b5",
  storageBucket: localStorage.getItem("firebase_storageBucket") || "workreportweb-336b5.firebasestorage.app",
  messagingSenderId: localStorage.getItem("firebase_messagingSenderId") || "755162950764",
  appId: localStorage.getItem("firebase_appId") || "1:755162950764:web:894ea91e117f8dfa5a7c49",
  measurementId: "G-9VQZLCNCNH"
};

// Check if Firebase SDK is loaded
let db = null;
let auth = null;
let isFirebaseInitialized = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK script not loaded yet.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(defaultFirebaseConfig);
    }
    db = firebase.firestore();
    auth = firebase.auth();

    // Enable offline persistence for real-time speed & resilience
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed: Multiple tabs open.");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence unsupported in browser.");
      }
    });

    isFirebaseInitialized = true;
    console.log("Firebase initialized successfully.");
    return true;
  } catch (err) {
    console.error("Firebase init error:", err);
    return false;
  }
}

// Function to update config credentials from settings modal
function saveFirebaseConfig(config) {
  if (config.apiKey) localStorage.setItem("firebase_apiKey", config.apiKey);
  if (config.authDomain) localStorage.setItem("firebase_authDomain", config.authDomain);
  if (config.projectId) localStorage.setItem("firebase_projectId", config.projectId);
  if (config.storageBucket) localStorage.setItem("firebase_storageBucket", config.storageBucket);
  if (config.messagingSenderId) localStorage.setItem("firebase_messagingSenderId", config.messagingSenderId);
  if (config.appId) localStorage.setItem("firebase_appId", config.appId);

  alert("Firebase configuration saved! Please reload the page to apply changes.");
  window.location.reload();
}
