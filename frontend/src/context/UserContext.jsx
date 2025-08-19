import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges } from '../firebase/auth.js';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user'); // Default role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Check if user is admin based on email domain or specific emails
        // You can customize this logic based on your requirements
        const isAdmin = checkIfAdmin(authUser.email);
        setUserRole(isAdmin ? 'admin' : 'user');
      } else {
        setUser(null);
        setUserRole('user');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Function to check if user is admin
  const checkIfAdmin = (email) => {
    if (!email) return false;
    
    // Add your admin email logic here
    // Example 1: Specific admin emails
    const adminEmails = [
      'admin@viyanta.com',
      'viyanta@viyanta.com',
      'viyanta.insights@gmail.com', // Added user's email
      // Add more admin emails as needed
    ];
    
    // Example 2: Admin email domains
    const adminDomains = [
      'viyanta.com',
      'admin.viyanta.com'
    ];
    
    // Check specific emails
    if (adminEmails.includes(email.toLowerCase())) {
      return true;
    }
    
    // Check admin domains
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (adminDomains.includes(emailDomain)) {
      return true;
    }
    
    // Example 3: Check custom claims if you have them set up
    // This would require additional Firebase setup
    
    return false;
  };

  // Function to check if user has specific role
  const hasRole = (requiredRole) => {
    if (requiredRole === 'admin') {
      return userRole === 'admin';
    }
    return true; // Regular users can access non-admin features
  };

  const value = {
    user,
    userRole,
    loading,
    hasRole,
    isAdmin: userRole === 'admin'
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 