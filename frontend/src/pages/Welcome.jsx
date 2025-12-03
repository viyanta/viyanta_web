import { useNavigate, Link } from "react-router-dom";
import "./Welcome.css";

function Welcome() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    console.log('Sign Up clicked');
    navigate('/signup');
  };
  

  return (
    <div className="welcome-container">
      <div className="welcome-wrapper">
        {/* Left Side - Welcome Content */}
        <div className="welcome-content-section">
          <div className="welcome-card">
            {/* Logo Section */}
            <div className="welcome-logo">
              <div className="welcome-logo-icon">
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
              <div className="welcome-brand">
                <h1 className="welcome-brand-title">AssureLife</h1>
                <p className="welcome-brand-subtitle">Life Insurance Online Portal</p>
              </div>
            </div>

            {/* Welcome Content */}
            <div className="welcome-main-content">
              <h2 className="welcome-title">Welcome!</h2>
              <p className="welcome-subtitle">Choose an option.</p>

              {/* Action Buttons */}
              <div className="welcome-actions">
                <button 
                  type="button"
                  className="welcome-signup-button"
                  onClick={handleSignUp}
                >
                  <svg className="google-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/>
                    <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853"/>
                    <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05"/>
                    <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335"/>
                  </svg>
                  <span>Sign Up</span>
                </button>

                <Link 
                  to="/login"
                  className="welcome-login-button"
                >
                  <svg className="google-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/>
                    <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853"/>
                    <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05"/>
                    <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335"/>
                  </svg>
                  <span>Login</span>
                </Link>
              </div>

              {/* Security Note */}
              <p className="welcome-security-note">
                Secure authentication powered by Google
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Illustration/Branding */}
        <div className="welcome-illustration-section">
          <div className="welcome-illustration-content">
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

export default Welcome

