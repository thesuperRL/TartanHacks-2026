import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// These values should be set in your .env file
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Validate Firebase configuration
const requiredConfigKeys = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingKeys = requiredConfigKeys.filter(key => {
  const value = process.env[key];
  return !value || 
         value.includes('your_') || 
         value.includes('123456789') ||
         value === 'your_firebase_api_key' ||
         value === 'your-project.firebaseapp.com' ||
         value === 'your-project-id' ||
         value === 'your-project.appspot.com';
});

let app;

if (missingKeys.length > 0) {
  console.error('❌ Firebase configuration is missing or incomplete!');
  console.error('Missing or invalid keys:', missingKeys);
  console.error('\n📝 To fix this:');
  console.error('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.error('2. Create a project and get your config');
  console.error('3. Add the following to frontend/.env:');
  console.error('   REACT_APP_FIREBASE_API_KEY=your_api_key');
  console.error('   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com');
  console.error('   REACT_APP_FIREBASE_PROJECT_ID=your-project-id');
  console.error('   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com');
  console.error('   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id');
  console.error('   REACT_APP_FIREBASE_APP_ID=your_app_id');
  console.error('4. Restart the frontend server');
  console.error('\nSee FIREBASE_SETUP.md for detailed instructions.\n');
  
  // Create a dummy config to prevent app crash, but it won't work
  const dummyConfig = {
    apiKey: 'missing-config',
    authDomain: 'missing-config',
    projectId: 'missing-config',
    storageBucket: 'missing-config',
    messagingSenderId: 'missing-config',
    appId: 'missing-config'
  };
  
  try {
    app = initializeApp(dummyConfig);
  } catch (e) {
    // If initialization fails, we'll handle it in components
    console.error('Firebase initialization failed:', e);
  }
} else {
  // Initialize Firebase with valid config
  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    console.log('📋 Configuration check:');
    console.log('   Project ID:', firebaseConfig.projectId);
    console.log('   Auth Domain:', firebaseConfig.authDomain);
    console.log('   API Key:', firebaseConfig.apiKey?.substring(0, 10) + '...');
    
    // Warn if config values look suspicious
    if (firebaseConfig.projectId && firebaseConfig.projectId.length < 5) {
      console.warn('⚠️  Project ID seems too short. Please verify it matches Firebase Console.');
    }
    if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes('.firebaseapp.com')) {
      console.warn('⚠️  Auth Domain should end with .firebaseapp.com');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
