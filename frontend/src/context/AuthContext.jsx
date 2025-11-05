import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, logout } from '../firebase/auth.js';

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
  const [agreementAccepted, setAgreementAccepted] = useState(false);

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
        
        // Check if user has previously accepted the agreement
        const hasAcceptedAgreement = localStorage.getItem(`agreement_accepted_${authUser.uid}`);
        setAgreementAccepted(hasAcceptedAgreement === 'true');
      } else {
        setUser(null);
        setAgreementAccepted(false);
        console.log('No user authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  const acceptAgreement = () => {
    if (user) {
      localStorage.setItem(`agreement_accepted_${user.id}`, 'true');
      setAgreementAccepted(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAgreementAccepted(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = {
    user,
    loading,
    isAdmin: user?.isAdmin || false,
    isAuthenticated: !!user,
    agreementAccepted,
    acceptAgreement,
    logout: handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
