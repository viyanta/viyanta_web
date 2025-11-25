import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginWithGoogle } from "../firebase/auth";
import "./SignUp.css";

function SignUp() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms and Conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // For now, we'll use Google authentication
      // In the future, you can store the form data and then authenticate
      await loginWithGoogle();
      // After successful signup, user will be redirected by auth listener
    } catch (error) {
      console.error("Sign up failed:", error);
      setErrors({ submit: 'Sign up failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        {/* Left Side - Sign Up Form */}
        <div className="signup-form-section">
          <div className="signup-card">
            {/* Back Button */}
            <Link to="/welcome" className="signup-back-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </Link>

            {/* Logo Section */}
            <div className="signup-logo">
              <div className="signup-logo-icon">
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
              <div className="signup-brand">
                <h1 className="signup-brand-title">AssureLife</h1>
                <p className="signup-brand-subtitle">Life Insurance Online Portal</p>
              </div>
            </div>

            {/* Sign Up Form */}
            <div className="signup-content">
              <h2 className="signup-title">Create an Account</h2>
              <p className="signup-subtitle">Let's get started</p>

              <form onSubmit={handleSubmit} className="signup-form">
                {/* Full Name Field */}
                <div className="signup-form-group">
                  <label htmlFor="fullName" className="signup-form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your Full Name"
                    className={`signup-form-input ${errors.fullName ? 'error' : ''}`}
                    disabled={loading}
                  />
                  {errors.fullName && (
                    <span className="signup-error-message">{errors.fullName}</span>
                  )}
                </div>

                {/* Email Field */}
                <div className="signup-form-group">
                  <label htmlFor="email" className="signup-form-label">
                    Email Id
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your Email ID"
                    className={`signup-form-input ${errors.email ? 'error' : ''}`}
                    disabled={loading}
                  />
                  {errors.email && (
                    <span className="signup-error-message">{errors.email}</span>
                  )}
                </div>

                {/* Terms and Conditions Checkbox */}
                <div className="signup-terms-group">
                  <label className="signup-terms-checkbox">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.terms;
                            return newErrors;
                          });
                        }
                      }}
                      disabled={loading}
                    />
                    <span className="signup-terms-text">
                      I agree to the <Link to="/terms" className="signup-terms-link">Terms and Conditions</Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <span className="signup-error-message">{errors.terms}</span>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="signup-error-message signup-submit-error">
                    {errors.submit}
                  </div>
                )}

                {/* Sign Up Button - Only visible when terms are accepted */}
                {termsAccepted && (
                  <button
                    type="submit"
                    className="signup-submit-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="button-spinner"></span>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      'Sign Up'
                    )}
                  </button>
                )}
              </form>

              {/* Login Link */}
              <p className="signup-login-link">
                Already have an account? <Link to="/login">Login</Link>
              </p>

              {/* Security Note */}
              <p className="signup-security-note">
                Secure authentication powered by Google
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="signup-illustration-section">
          <div className="signup-illustration-content">
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

export default SignUp

