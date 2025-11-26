import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginWithGoogle, loginWithEmailPassword, subscribeToAuthChanges } from "../firebase/auth";
import "./Login.css";

function Login() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRejectionMessage, setShowRejectionMessage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
      console.log("Attempting login with email:", email);
      const userCredential = await loginWithEmailPassword(email.trim(), password);
      console.log("Login successful:", userCredential.user);
      navigate("/insurance-dashboard");  // redirect
    } catch (err) {
      console.error("Email login failed:", err);
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
      setLoading(false);
    }
  };

  // If user is already logged in, redirect to dashboard
  if (user) {
    navigate('/insurance-dashboard');
    return null;
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Login Form */}
        <div className="login-form-section">
          <div className="login-card">
            {/* Back Button */}
            <Link to="/welcome" className="login-back-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </Link>

            {/* Logo Section */}
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="10" fill="url(#gradient)"/>
                  <path d="M20 12L28 18V28H12V18L20 12Z" fill="white" fillOpacity="0.9"/>
                  <path d="M20 16L24 19V26H16V19L20 16Z" fill="white"/>
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#36659b"/>
                      <stop offset="1" stopColor="#3F72AF"/>
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
                    disabled={loading}
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
                    disabled={loading}
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

                <button 
                  type="submit" 
                  className="email-login-button"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
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
                      <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/>
                      <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853"/>
                      <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05"/>
                      <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335"/>
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
                    <path d="M30 5L10 12V28C10 40 18 50 30 55C42 50 50 40 50 28V12L30 5Z" fill="white" fillOpacity="0.9"/>
                    <path d="M30 15L18 20V30C18 38 24 45 30 48C36 45 42 38 42 30V20L30 15Z" fill="white"/>
                  </svg>
                </div>
                <div className="illustration-icon icon-heart">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 40L10 25C5 20 5 12 12 12C16 12 20 15 25 20C30 15 34 12 38 12C45 12 45 20 40 25L25 40Z" fill="white" fillOpacity="0.9"/>
                  </svg>
                </div>
                <div className="illustration-icon icon-home">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 5L5 20V45H20V30H30V45H45V20L25 5Z" fill="white" fillOpacity="0.9"/>
                  </svg>
                </div>
                <div className="illustration-icon icon-car">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 25L15 15H35L40 25V40H35V35H15V40H10V25Z" fill="white" fillOpacity="0.9"/>
                    <circle cx="20" cy="35" r="5" fill="white"/>
                    <circle cx="30" cy="35" r="5" fill="white"/>
                  </svg>
                </div>
                <div className="illustration-icon icon-graduation">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M25 10L5 20L25 30L45 20L25 10Z" fill="white" fillOpacity="0.9"/>
                    <path d="M5 20V35L25 45L45 35V20" stroke="white" strokeWidth="2" fill="none"/>
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
