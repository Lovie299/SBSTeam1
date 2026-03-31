// app/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email || 'No user');
      if (user) {
        setUser(user);
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email, password, displayName) => {
    try {
      console.log('Creating user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      console.log('User created successfully:', userCredential.user.uid);
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('Signing in with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential.user.uid);
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await signOut(auth);
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error.message);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);