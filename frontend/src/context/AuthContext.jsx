import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, logout } from '../firebase/auth.js';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

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
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [userAccess, setUserAccess] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState(null);

  // Fetch user access data from backend
  const fetchUserAccess = async (email, backendUserId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/email/${email}`);
      const accessData = response.data.access;
      
      setUserAccess(accessData);
      
      // Store UserID in localStorage and state for API calls
      if (backendUserId) {
        localStorage.setItem('user_id', backendUserId);
        setUserId(backendUserId);
      }
      
      // Auto-select first available product
      if (accessData && accessData.products) {
        const availableProducts = Object.entries(accessData.products)
          .filter(([_, hasAccess]) => hasAccess)
          .map(([product, _]) => product);
        
        if (availableProducts.length > 0) {
          // Check if user has previously selected a product
          const savedProduct = localStorage.getItem(`selected_product_${email}`);
          if (savedProduct && availableProducts.includes(savedProduct)) {
            setSelectedProduct(savedProduct);
            console.log(`✓ Restored saved product: ${savedProduct}`);
          } else {
            // Auto-select first available product
            const firstProduct = availableProducts[0];
            setSelectedProduct(firstProduct);
            localStorage.setItem(`selected_product_${email}`, firstProduct);
            console.log(`✓ Auto-selected first product: ${firstProduct}`);
          }
        }
      }
      
      return accessData;
    } catch (error) {
      console.error('Failed to fetch user access:', error);
      return null;
    }
  };

  // Login/register user with backend
  const loginWithBackend = async (authUser) => {
    try {
      console.log('🔄 Logging in to backend:', authUser.email);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: authUser.email,
        name: authUser.displayName || authUser.email
      });
      
      const backendUserId = response.data.UserID;
      localStorage.setItem('user_id', backendUserId);
      setUserId(backendUserId);
      
      console.log('✓ Backend login successful, UserID:', backendUserId);
      
      // Fetch full user access data
      await fetchUserAccess(authUser.email, backendUserId);
      
      return backendUserId;
    } catch (error) {
      console.error('❌ Failed to login with backend:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      if (authUser) {
        // Login with backend and get user access
        await loginWithBackend(authUser);
        
        const userData = {
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || authUser.email,
          photoURL: authUser.photoURL
        };
        setUser(userData);
        console.log('✓ Firebase user authenticated:', userData.email);
        
        // Check if user has previously accepted the agreement
        const hasAcceptedAgreement = localStorage.getItem(`agreement_accepted_${authUser.uid}`);
        setAgreementAccepted(hasAcceptedAgreement === 'true');
      } else {
        setUser(null);
        setUserId(null);
        setUserAccess(null);
        setSelectedProduct(null);
        setAgreementAccepted(false);
        localStorage.removeItem('user_id');
        console.log('No user authenticated');
      }
      setLoading(false);
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
      setUserId(null);
      setUserAccess(null);
      setSelectedProduct(null);
      setAgreementAccepted(false);
      localStorage.removeItem('user_id');
      if (user?.email) {
        localStorage.removeItem(`selected_product_${user.email}`);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const changeProduct = (product) => {
    if (user?.email && userAccess?.products?.[product]) {
      setSelectedProduct(product);
      localStorage.setItem(`selected_product_${user.email}`, product);
    }
  };

  const value = {
    user,
    userId,
    loading,
    userAccess,
    selectedProduct,
    changeProduct,
    isAdmin: userAccess?.isMasterAdmin || false,
    isAuthenticated: !!user,
    agreementAccepted,
    acceptAgreement,
    logout: handleLogout,
    refreshUserAccess: () => user?.email ? fetchUserAccess(user.email, userId) : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
