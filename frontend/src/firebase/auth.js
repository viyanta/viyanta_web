import app from "./config";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  applyActionCode,
  verifyBeforeUpdateEmail
} from "firebase/auth";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);

export const loginWithEmailPassword = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmailPassword = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const updateUserProfile = (user, profileData) =>
  updateProfile(user, profileData);

export const sendPasswordReset = (email) => {
  // Configure action code settings to improve email deliverability
  const actionCodeSettings = {
    // URL you want to redirect back to after password reset
    url: `${window.location.origin}/login`,
    // This must be true for email link to work
    handleCodeInApp: false,
  };
  
  return sendPasswordResetEmail(auth, email, actionCodeSettings);
};

export const logout = () => signOut(auth);

export const subscribeToAuthChanges = (callback) =>
  onAuthStateChanged(auth, callback);

// Hybrid approach: Try passwordless sign-in first, fallback to email verification if quota exceeded
export const sendLoginLink = async (email) => {
  const actionCodeSettings = {
    // URL you want to redirect back to after clicking the link
    url: `${window.location.origin}/login`,
    // This must be true for email link sign-in
    handleCodeInApp: true,
  };
  
  console.log('📧 Attempting to send login link to:', email);
  console.log('🔗 Redirect URL:', actionCodeSettings.url);
  
  try {
    // Try passwordless sign-in first (preferred method)
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    console.log('✅ Login link sent successfully! (passwordless sign-in)');
    window.localStorage.setItem('emailForSignIn', email);
    return { method: 'passwordless', success: true };
  } catch (error) {
    // If quota exceeded, fallback to email verification
    if (error.code === 'auth/quota-exceeded' || error.code === 'auth/too-many-requests') {
      console.warn('⚠️ Passwordless sign-in quota exceeded. Falling back to email verification...');
      throw new Error('QUOTA_EXCEEDED_FALLBACK');
    }
    // For other errors, throw them
    throw error;
  }
};

// Firebase Email Verification - sends link that user MUST click to complete login
export const sendEmailVerificationLink = async (user, email) => {
  const actionCodeSettings = {
    // URL to redirect after clicking CONTINUE - will auto-login user after verification
    url: `${window.location.origin}/login?emailVerified=true&email=${encodeURIComponent(email)}`,
    // This must be true for email link to work
    handleCodeInApp: true,
  };
  
  console.log('📧 Sending email verification link to:', email);
  console.log('🔗 Redirect URL:', actionCodeSettings.url);
  
  try {
    await sendEmailVerification(user, actionCodeSettings);
    console.log('✅ Email verification link sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

// Legacy function - kept for backward compatibility but uses email verification now
export const sendOTPLink = async (email) => {
  // This is now a wrapper that logs in first, then sends verification
  // We need to login first to get the user object
  try {
    // Note: This requires the user to be logged in first
    // The actual implementation should be in the Login component
    throw new Error('Use sendEmailVerificationLink with logged-in user instead');
  } catch (error) {
    throw error;
  }
};

export const checkEmailLink = () => {
  return isSignInWithEmailLink(auth, window.location.href);
};

export const signInWithOTPLink = async (email) => {
  // Get the email from localStorage if available
  const storedEmail = window.localStorage.getItem('emailForSignIn') || email;
  
  if (!storedEmail) {
    throw new Error('Email not found. Please request a new magic link.');
  }
  
  const result = await signInWithEmailLink(auth, storedEmail, window.location.href);
  // Clear the email from localStorage after successful sign-in
  window.localStorage.removeItem('emailForSignIn');
  return result;
};

export default auth;
