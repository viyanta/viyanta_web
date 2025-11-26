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
  sendPasswordResetEmail
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

export default auth;
