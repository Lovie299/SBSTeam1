// test-firebase-simple.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCv5Ks-POtiBxtvmYdHUxXj5_DeGvPM0JA",
  authDomain: "silverback-sentry-c6727.firebaseapp.com",
  projectId: "silverback-sentry-c6727",
  storageBucket: "silverback-sentry-c6727.firebasestorage.app",
  messagingSenderId: "454155459151",
  appId: "1:454155459151:web:616bc52feafb6d595c683a",
  measurementId: "G-WMHJFJWTPZ"
};

async function testFirebase() {
  try {
    console.log('🚀 Testing Firebase...');
    
    // Create unique email with timestamp
    const timestamp = Date.now();
    const uniqueEmail = `test_${timestamp}@silverback.com`;
    const password = "test123456";
    
    console.log('📧 Creating user with email:', uniqueEmail);
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    // Create new user
    const userCredential = await createUserWithEmailAndPassword(auth, uniqueEmail, password);
    console.log('✅ User created! ID:', userCredential.user.uid);
    
    // Test Firestore
    const db = getFirestore(app);
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Firebase test successful!',
      userId: userCredential.user.uid,
      email: uniqueEmail,
      timestamp: new Date()
    });
    
    console.log('✅ Firestore write successful!');
    console.log('📄 Document ID:', docRef.id);
    console.log('🎉 Firebase is working perfectly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFirebase();