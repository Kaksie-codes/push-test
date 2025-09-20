// Firebase Admin Configuration
// You need to replace these with your actual Firebase project credentials

const admin = require('firebase-admin');

// Create Firebase config from environment variables
const createFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  if (!projectId || !privateKey || !clientEmail) {
    console.warn('Missing Firebase environment variables');
    return null;
  }
  
  return {
    type: "service_account",
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };
};

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  try {
    const firebaseConfig = createFirebaseConfig();
    
    if (firebaseConfig) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        projectId: firebaseConfig.project_id
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.error('Firebase Admin initialization failed: Missing configuration');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    console.log('FCM notifications will be disabled');
  }
}

module.exports = admin;