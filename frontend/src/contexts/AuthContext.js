import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Firebase is properly configured
    if (!auth || !auth.app || auth.app.options.projectId === 'missing-config') {
      console.warn('Firebase not configured - authentication will not work');
      setLoading(false);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth, 
      (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL
          });
        } else {
          // User is signed out
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase auth state error:', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signUp = async (email, password, name) => {
    if (!auth || !auth.app || auth.app.options.projectId === 'missing-config') {
      return { success: false, error: 'Firebase is not configured. Please set up Firebase first.' };
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update user profile with name
      if (name && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    if (!auth || !auth.app || auth.app.options.projectId === 'missing-config') {
      return { success: false, error: 'Firebase is not configured. Please set up Firebase first.' };
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !auth.app || auth.app.options.projectId === 'missing-config') {
      return { success: false, error: 'Firebase is not configured. Please set up Firebase first.' };
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
