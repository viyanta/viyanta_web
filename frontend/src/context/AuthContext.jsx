import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges } from '../firebase/auth.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Admin user configuration - you can modify this list
const ADMIN_EMAILS = [
  'viyanta.insights@gmail.com',
  'vickyrathod7339@gmail.com',
  // Add more admin emails as needed
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setLoading(false);
      if (authUser) {
        const userData = {
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || authUser.email,
          photoURL: authUser.photoURL,
          isAdmin: ADMIN_EMAILS.includes(authUser.email) // Check if user is admin
        };
        setUser(userData);
        console.log('Firebase user authenticated:', userData);
      } else {
        setUser(null);
        console.log('No user authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    isAdmin: user?.isAdmin || false,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
