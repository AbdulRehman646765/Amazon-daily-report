================================================================================
          FIREBASE API KEY ERROR FIX & COMPLETE SETUP GUIDE (ROMAN URDU)
================================================================================

--------------------------------------------------------------------------------
1. ERROR KYUN AA RAHA HAI? (Reason for "auth/api-key-not-valid")
--------------------------------------------------------------------------------
Yeh error is wajah se aa raha hai kyunke Firebase Authentication chalane ke liye 
Google Firebase Console se real Project Config API Keys ki zaroorat hoti hai.

Abhi app ke `firebase-config.js` file mein dummy placeholder keys lagi hui hain:
   apiKey: "AIzaSyYOUR_API_KEY_HERE"

Jab aap Sign Up ya Login karte hain, Firebase SDK Google servers se batane ki 
koshish karta hai, lekin dummy API key invalid hone ki wajah se Google error return 
karta hai:
"Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)"


--------------------------------------------------------------------------------
2. ISS ERROR KO KAISE SAHI KAREIN (Step-by-Step Solution)
--------------------------------------------------------------------------------

Aapko Firebase Console se 100% FREE Firebase Project ki keys nikal kar app mein 
paste karni hain. Step-by-step tareeqa neeche diya gaya hai:

--------------------------------------------------------------------------------
STEP 1: Firebase Project Banayein (Create Firebase Project)
--------------------------------------------------------------------------------
1. Google Chrome par yeh link kholein:
   https://console.firebase.google.com/

2. Apne Google Account (Gmail) se Login karein.

3. "Create a project" (ya "Add project") button par click karein.

4. Project ka naam rakhein (Jaise: "Daily Work Report") aur Continue karein.

5. Google Analytics chaho to Disable karke "Create Project" par click kar dein.
   (10-15 seconds mein project tayyar ho jayega).


--------------------------------------------------------------------------------
STEP 2: Web App Register Karein Aur API Keys Copy Karein
--------------------------------------------------------------------------------
1. Project Dashboard par aapko icons nazar aayenge: (iOS, Android, Web </>).
   Aap Web Icon `</>` par click karein.

2. App ka Nickname rakhein (Jaise: "WorkReportWeb") aur "Register app" par click karein.

3. Aapke saamne Firebase SDK Configuration code aayega.
   Us mein se yeh values dekhein:

   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456...",
     appId: "1:123456...:web:abcdef..."
   };


--------------------------------------------------------------------------------
STEP 3: Email/Password Authentication Enable Karein (Bohat Zaroori)
--------------------------------------------------------------------------------
1. Left sidebar menu se "Build" > "Authentication" par click karein.

2. "Get Started" button dabayein.

3. "Sign-in method" tab mein "Email/Password" option select karein.

4. Pehla option "Enable" karein aur Save par click kar dein.
   (Ab aapki app mein User Register aur Login ho sakega).


--------------------------------------------------------------------------------
STEP 4: Firestore Database Enable Karein
--------------------------------------------------------------------------------
1. Left sidebar menu se "Build" > "Firestore Database" par click karein.

2. "Create database" par click karein.

3. Location (e.g. us-central) select karke Next karein.

4. "Start in test mode" select karke Enable par click kar dein.

5. Top tab "Rules" mein ja kar project ke `firestore.rules` file wala code paste 
   karke "Publish" dabayein.


--------------------------------------------------------------------------------
STEP 5: Apni Real API Keys App Mein Paste Karein
--------------------------------------------------------------------------------
Ab apni project directory mein `firebase-config.js` file kholein:

`e:\CeraVe invoice editer Test\Report work\firebase-config.js`

Aur apni real Firebase keys ko `defaultFirebaseConfig` mein paste kar dein:

const defaultFirebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

Save karein aur browser refresh karein (`Ctrl + F5`).


--------------------------------------------------------------------------------
3. VERIFICATION & SUCCESS CHECK
--------------------------------------------------------------------------------
Jab aap apni real keys paste kar lenge:

1. Browser mein `index.html` kholein.
2. Sign Up modal mein email, password, full name aur role (Admin ya User) enter karein.
3. Sign Up dabayein — Account bina kisi error ke instantly create ho jayega aur 
   aap logged in ho jayenge!

================================================================================
