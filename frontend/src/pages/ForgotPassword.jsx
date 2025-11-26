import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendPasswordReset } from "../firebase/auth";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Basic validation
    if (!email) {
      setError("Please enter your email address.");
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
      await sendPasswordReset(email.trim());
      setSuccess(true);
      console.log("Password reset email sent to:", email);
    } catch (err) {
      console.error("Password reset failed:", err);
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      // Handle specific Firebase errors
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
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
    <div className="forgot-password-container">
      <div className="forgot-password-wrapper">
        {/* Left Side - Forgot Password Form */}
        <div className="forgot-password-form-section">
          <div className="forgot-password-card">
            {/* Back Button */}
            <Link to="/login" className="forgot-password-back-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Login
            </Link>

            {/* Logo Section */}
            <div className="forgot-password-logo">
              <div className="forgot-password-logo-icon">
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
              <div className="forgot-password-brand">
                <h1 className="forgot-password-brand-title">AssureLife</h1>
                <p className="forgot-password-brand-subtitle">Life Insurance Online Portal</p>
              </div>
            </div>

            {/* Forgot Password Content */}
            <div className="forgot-password-content">
              <h2 className="forgot-password-title">Forgot Password?</h2>
              <p className="forgot-password-description">
                No worries! Enter your email address and we'll send you a link to reset your password.
              </p>

              {success ? (
                <div className="forgot-password-success-container">
                  <div className="forgot-password-success-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="24" cy="24" r="24" fill="#d4edda"/>
                      <path d="M20 24L22 26L28 20" stroke="#155724" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="forgot-password-success-title">Check Your Email</h3>
                  <p className="forgot-password-success-message">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="forgot-password-success-instructions">
                    Please check your inbox and click on the link to reset your password. 
                    <br />
                    <strong>Important:</strong> If you don't see the email, please check your spam/junk folder. 
                    You may need to add noreply@firebaseapp.com to your contacts to ensure future emails are delivered.
                  </p>
                  <div className="forgot-password-success-actions">
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                      className="forgot-password-resend-button"
                    >
                      Resend Email
                    </button>
                    <Link to="/login" className="forgot-password-back-to-login">
                      Back to Login
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="forgot-password-form">
                  <div className="forgot-password-form-group">
                    <label htmlFor="reset-email" className="forgot-password-form-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="reset-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className={`forgot-password-form-input ${error ? 'error' : ''}`}
                      required
                      disabled={loading}
                    />
                    {error && (
                      <span className="forgot-password-error-message">{error}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="forgot-password-submit-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="button-spinner"></span>
                        <span>Sending...</span>
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              )}

              {/* Login Link */}
              <p className="forgot-password-login-link">
                Remember your password? <Link to="/login">Login</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="forgot-password-illustration-section">
          <div className="forgot-password-illustration-content">
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

export default ForgotPassword

