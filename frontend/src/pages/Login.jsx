import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  loginWithGoogle,
  loginWithEmailPassword,
  subscribeToAuthChanges,
  sendOTPLink,
  checkEmailLink,
  signInWithOTPLink,
  sendEmailVerificationLink,
  sendLoginLink,
  logout
} from "../firebase/auth";
import auth from "../firebase/auth";
import "./Login.css";

function Login() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRejectionMessage, setShowRejectionMessage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is returning from email verification (after clicking CONTINUE)
    const handleEmailVerificationReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const emailVerified = urlParams.get('emailVerified');
      const verifiedEmail = urlParams.get('email');

      // Check if coming from email verification CONTINUE button
      if (emailVerified === 'true' && verifiedEmail) {
        setLoading(true);
        try {
          console.log('✅ Email verification completed. Email:', verifiedEmail);

          // Check if password was already verified (user came from login flow)
          const pendingEmail = window.localStorage.getItem('pendingLoginEmail');
          const pendingPassword = window.localStorage.getItem('pendingLoginPassword');
          const passwordVerified = window.localStorage.getItem('passwordVerified');
          const timestamp = window.localStorage.getItem('pendingVerificationTimestamp');

          // Check if verification request is not too old (within 1 hour)
          const isRecent = timestamp && (Date.now() - parseInt(timestamp)) < 3600000; // 1 hour

          if (pendingEmail && pendingPassword && passwordVerified === 'true' &&
            pendingEmail === verifiedEmail && isRecent) {
            // Password was verified earlier - automatically log them in now
            console.log('🔄 Auto-logging in user after email verification...');

            try {
              // Decode password and log them in
              const password = atob(pendingPassword); // Base64 decode

              // Log them in with email and password
              await loginWithEmailPassword(verifiedEmail, password);
              console.log('✅ User automatically logged in after email verification!');

              // Clear stored data immediately after login
              window.localStorage.removeItem('pendingLoginEmail');
              window.localStorage.removeItem('pendingLoginPassword');
              window.localStorage.removeItem('passwordVerified');
              window.localStorage.removeItem('pendingVerificationTimestamp');

              // Clear URL parameters
              window.history.replaceState({}, document.title, '/login');

              setSuccessMessage("✅ Email verified! Logging you in...");

              // Redirect to dashboard - auth state change will handle this
              setTimeout(() => {
                navigate('/insurance-dashboard', { replace: true });
              }, 500);
              return;
            } catch (loginErr) {
              console.error("❌ Auto-login failed after email verification:", loginErr);
              setError("Email verified but auto-login failed. Please enter your password to complete login.");
              setEmail(verifiedEmail);
              // Clear stored password on error
              window.localStorage.removeItem('pendingLoginPassword');
            }
          } else {
            // Normal email verification (not from login flow) or expired
            if (!isRecent && timestamp) {
              setError("Email verification link expired. Please login again.");
              window.localStorage.removeItem('pendingLoginEmail');
              window.localStorage.removeItem('pendingLoginPassword');
              window.localStorage.removeItem('passwordVerified');
              window.localStorage.removeItem('pendingVerificationTimestamp');
            } else {
              setSuccessMessage("Email verified! Please log in with your email and password.");
              setEmail(verifiedEmail);
            }
          }

          // Clear URL parameters
          window.history.replaceState({}, document.title, '/login');
        } catch (err) {
          console.error("Error handling email verification return:", err);
          setError("Failed to process email verification. Please try logging in again.");
          window.localStorage.removeItem('pendingLoginEmail');
          window.localStorage.removeItem('pendingLoginPassword');
          window.localStorage.removeItem('passwordVerified');
          window.localStorage.removeItem('pendingVerificationTimestamp');
        } finally {
          setLoading(false);
        }
      }
    };

    // Check for direct verification action code in URL
    const handleDirectVerification = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const oobCode = urlParams.get('oobCode');

      if (mode === 'verifyEmail' && oobCode) {
        setLoading(true);
        try {
          // Import applyActionCode to verify the email
          const { applyActionCode } = await import('firebase/auth');

          // Apply the verification code to verify email
          await applyActionCode(auth, oobCode);
          console.log('✅ Email verified successfully via action code!');

          // After verification, redirect to login with verified flag to auto-login
          const pendingEmail = window.localStorage.getItem('pendingLoginEmail');
          if (pendingEmail) {
            // Redirect to login page with verification flag - will auto-login
            window.location.href = `/login?emailVerified=true&email=${encodeURIComponent(pendingEmail)}`;
          } else {
            window.location.href = '/login?emailVerified=true';
          }
        } catch (err) {
          console.error("Email verification failed:", err);
          setError("Failed to verify email. The link may have expired. Please try logging in again.");
          window.localStorage.removeItem('pendingLoginEmail');
          window.localStorage.removeItem('passwordVerified');
        } finally {
          setLoading(false);
        }
      }
    };

    // Check for passwordless sign-in links (primary method)
    const handlePasswordlessSignIn = async () => {
      try {
        if (checkEmailLink()) {
          setLoading(true);
          try {
            const storedEmail = window.localStorage.getItem('emailForSignIn');
            if (storedEmail) {
              console.log('🔗 Passwordless sign-in link detected. Signing in...');
              await signInWithOTPLink(storedEmail);
              console.log('✅ Successfully signed in with passwordless link!');
              setSuccessMessage("Successfully signed in! Redirecting to app...");

              // Force navigation to dashboard (auth state change should handle this, but ensure it happens)
              setTimeout(() => {
                navigate('/insurance-dashboard');
              }, 500);
            } else {
              console.error('❌ No stored email found for passwordless sign-in');
              setError("Email not found. Please request a new login link.");
            }
          } catch (err) {
            console.error("❌ Passwordless sign-in failed:", err);
            console.error("Error code:", err.code);
            console.error("Error message:", err.message);
            setError(`Failed to sign in with login link: ${err.message || 'Unknown error'}. Please try again.`);
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error checking email link:", err);
        // Don't break the component if checkEmailLink fails
      }
    };

    // Run all handlers with error handling to prevent breaking the component
    try {
      handleEmailVerificationReturn().catch(err => {
        console.error("Error in handleEmailVerificationReturn:", err);
      });
      handleDirectVerification().catch(err => {
        console.error("Error in handleDirectVerification:", err);
      });
      handlePasswordlessSignIn().catch(err => {
        console.error("Error in handlePasswordlessSignIn:", err);
      });
    } catch (err) {
      console.error("Error in useEffect handlers:", err);
    }

    // Check if user came from agreement rejection
    if (location.state?.fromAgreementRejection) {
      setShowRejectionMessage(true);
    }

    // Check if user came from successful signup
    if (location.state?.signupSuccess) {
      setShowSignupSuccess(true);
      // Pre-fill email if provided
      if (location.state?.email) {
        setEmail(location.state.email);
      }
      // Clear the state after showing message
      window.history.replaceState({}, document.title);
    }

    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      if (authUser) {
        // Redirect to dashboard after successful login
        navigate('/insurance-dashboard');
      }
    });
    return unsubscribe;
  }, [navigate, location.state]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setShowRejectionMessage(false);
    setError("");
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      setError("Google login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowRejectionMessage(false);
    setSuccessMessage("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Verify email and password are correct
      console.log("Verifying email and password:", email);
      const userCredential = await loginWithEmailPassword(email.trim(), password);
      const user = userCredential.user;

      // Step 2: Store password temporarily (encrypted in memory) for auto-login after email verification
      // We'll use this to log them in after they click the email link
      const tempPassword = password; // Store temporarily for auto-login after email verification

      // Step 3: Send email verification link
      console.log("Password verified. Sending email verification link to:", email);
      try {
        // Send email verification link
        await sendEmailVerificationLink(user, email.trim());

        // Step 4: ALWAYS log out user - they MUST click email link to complete login
        await logout();

        // Step 5: Store email and password (temporarily) for auto-login after email verification
        // Password will be cleared after successful login
        window.localStorage.setItem('pendingLoginEmail', email.trim());
        window.localStorage.setItem('pendingLoginPassword', btoa(tempPassword)); // Base64 encode (not secure but temporary)
        window.localStorage.setItem('passwordVerified', 'true');
        window.localStorage.setItem('pendingVerificationTimestamp', Date.now().toString());

        setOtpSent(true);
        setSuccessMessage(`Password verified! Email verification link sent to ${email}. Please check your inbox (and spam folder) and click the link to complete login and access the app.`);
        console.log("✅ Success message displayed. Email should arrive in 1-5 minutes.");
      } catch (linkError) {
        // If email verification fails, log out and show error
        await logout();
        window.localStorage.removeItem('pendingLoginEmail');
        window.localStorage.removeItem('pendingLoginPassword');
        window.localStorage.removeItem('passwordVerified');
        window.localStorage.removeItem('pendingVerificationTimestamp');

        console.error("❌ FAILED to send email verification link:", linkError);
        console.error("Error code:", linkError.code);
        console.error("Error message:", linkError.message);

        if (linkError.code === 'auth/too-many-requests' || linkError.code === 'auth/quota-exceeded') {
          setError('⚠️ Daily quota exceeded for email verification. Please wait until tomorrow or upgrade Firebase plan.');
        } else if (linkError.code === 'auth/invalid-email') {
          setError('Invalid email address. Please check your email and try again.');
        } else {
          setError(`❌ Failed to send verification link. Error: ${linkError.code || 'Unknown'}. Check browser console (F12) for details.`);
        }
        return;
      }
    } catch (err) {
      console.error("Login verification failed:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);

      let errorMessage = "Invalid email or password";

      // Handle specific Firebase errors
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. If you don\'t have an account, please sign up first.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.code === 'auth/internal-error') {
        errorMessage = 'An internal error occurred. Please try again later.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password authentication is not enabled. Please contact support.';
      } else {
        errorMessage = `Login failed: ${err.message || 'Unknown error'}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    setShowRejectionMessage(false);

    try {
      await sendOTPLink(email);
      setOtpSent(true);
      setSuccessMessage(`Magic link sent to ${email}! Please check your inbox and click the link to sign in.`);
    } catch (err) {
      console.error("Failed to send OTP link:", err);
      let errorMessage = "Failed to send magic link. Please try again.";

      if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Login Form */}
        <div className="login-form-section">
          <div className="login-card">
            {/* Back Button */}
            <Link to="/welcome" className="login-back-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>

            {/* Logo Section */}
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="10" fill="url(#gradient)" />
                  <path d="M20 12L28 18V28H12V18L20 12Z" fill="white" fillOpacity="0.9" />
                  <path d="M20 16L24 19V26H16V19L20 16Z" fill="white" />
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#36659b" />
                      <stop offset="1" stopColor="#3F72AF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="login-brand">
                <h1 className="login-brand-title">AssureLife</h1>
                <p className="login-brand-subtitle">Life Insurance Online Portal</p>
              </div>
            </div>

            {/* Login Content */}
            <div className="login-content">
              <h2 className="login-title">Login</h2>
              <p className="login-description">
                If you are already a member. You can easily login.
              </p>

              {/* Rejection Message */}
              {showRejectionMessage && (
                <div className="login-rejection-message">
                  <strong>Agreement Required:</strong> You must accept the User License Agreement to access the application. Please sign in again and accept the terms.
                </div>
              )}

              {/* Signup Success Message */}
              {showSignupSuccess && (
                <div className="login-success-message">
                  <strong>Account Created Successfully!</strong> Please log in with your email and password to continue.
                </div>
              )}

              {/* Info Message */}
              {!otpSent && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#e7f3ff',
                  borderRadius: '4px',
                  border: '1px solid #b3d9ff'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#0066cc',
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    🔐 <strong>Secure Login:</strong> Enter your email and password. We'll verify your credentials and send a magic link to your email. Click the link to complete login.
                  </p>
                </div>
              )}

              {/* Email/Password Login Form */}
              <form className="email-login-form" onSubmit={handleEmailLogin}>
                <div className="email-login-form-group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="email-login-input"
                    required
                    disabled={loading || otpSent}
                  />
                </div>

                <div className="email-login-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="password" style={{ fontSize: '0.875rem', color: '#666' }}>Password</label>
                    <Link
                      to="/forgot-password"
                      className="forgot-password-link"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    id="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="email-login-input"
                    required
                    disabled={loading || otpSent}
                  />
                </div>

                {error && (
                  <div className="email-login-error-container">
                    <p className="email-login-error">{error}</p>
                    {(error.includes('Invalid email or password') || error.includes('No account found')) && (
                      <p className="email-login-help">
                        Don't have an account? <Link to="/signup" className="email-login-link">Sign up here</Link>
                      </p>
                    )}
                  </div>
                )}

                {successMessage && (
                  <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px',
                    border: '1px solid #c3e6cb'
                  }}>
                    <p style={{ color: '#28a745', fontSize: '0.875rem', margin: 0 }}>
                      {successMessage}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="email-login-button"
                  disabled={loading || otpSent}
                >
                  {loading ? (otpSent ? "Link Sent!" : "Verifying...") : otpSent ? "Link Sent! Check Email" : "Login"}
                </button>

                {otpSent && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#666',
                      textAlign: 'center',
                      marginBottom: '0.25rem'
                    }}>
                      ✅ Password verified! Check your email inbox for the magic link.
                    </p>
                    <p style={{
                      fontSize: '0.7rem',
                      color: '#999',
                      textAlign: 'center',
                      margin: 0
                    }}>
                      Click the link in your email to complete login and open the app.
                    </p>
                  </div>
                )}
              </form>

              {/* Divider */}
              <div className="login-divider">
                <span>OR</span>
              </div>

              {/* Google Login Button */}
              <button
                className="google-login-button"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="google-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4" />
                      <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853" />
                      <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05" />
                      <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Security Note */}
              <p className="login-security-note">
                Secure authentication powered by Firebase
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Illustration/Branding */}
        <div className="login-illustration-section">
          <div className="login-illustration-content">
            <div className="illustration-main">
              <div className="illustration-icon-container">
                <div className="illustration-icon icon-shield">
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 5L10 12V28C10 40 18 50 30 55C42 50 50 40 50 28V12L30 5Z" fill="white" fillOpacity="0.9" />
                    <path d="M30 15L18 20V30C18 38 24 45 30 48C36 45 42 38 42 30V20L30 15Z" fill="white" />
                  </svg>
                </div>
                <div className="illustration-icon icon-heart">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 40L10 25C5 20 5 12 12 12C16 12 20 15 25 20C30 15 34 12 38 12C45 12 45 20 40 25L25 40Z" fill="white" fillOpacity="0.9" />
                  </svg>
                </div>
                <div className="illustration-icon icon-home">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 5L5 20V45H20V30H30V45H45V20L25 5Z" fill="white" fillOpacity="0.9" />
                  </svg>
                </div>
                <div className="illustration-icon icon-car">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 25L15 15H35L40 25V40H35V35H15V40H10V25Z" fill="white" fillOpacity="0.9" />
                    <circle cx="20" cy="35" r="5" fill="white" />
                    <circle cx="30" cy="35" r="5" fill="white" />
                  </svg>
                </div>
                <div className="illustration-icon icon-graduation">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 10L5 20L25 30L45 20L25 10Z" fill="white" fillOpacity="0.9" />
                    <path d="M5 20V35L25 45L45 35V20" stroke="white" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>
              <div className="illustration-center">
                <div className="illustration-family">
                  <div className="family-member member-1"></div>
                  <div className="family-member member-2"></div>
                  <div className="family-member member-3"></div>
                  <div className="family-member member-4"></div>
                </div>
                <div className="illustration-hands-bg"></div>
              </div>
            </div>
            <div className="illustration-text">
              <h3>Insurance Data Analytics</h3>
              <p>Transform insurance data into actionable insights and visual intelligence</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
