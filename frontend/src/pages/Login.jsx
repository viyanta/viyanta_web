import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, subscribeToAuthChanges } from "../firebase/auth";
import Button from "../utils/Button.jsx";

function Login() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setUser(user);
      if (user) {
        // Redirect to dashboard after successful login
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // If user is already logged in, redirect to dashboard
  if (user) {
    navigate('/');
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--background-color)'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center',
        padding: '3rem'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            color: 'var(--main-color)', 
            marginBottom: '0.5rem',
            fontSize: '2rem'
          }}>
            Welcome to AssureLife
          </h1>
          <p style={{ 
            color: 'var(--text-color-light)',
            fontSize: '1.0rem'
          }}>
            Insurance Insights. Data Foretold Visually. 
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'var(--main-color)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            fontSize: '2rem',
            color: 'white'
          }}>
            📄
          </div>
        </div>

        <Button 
          variant="primary" 
          size="large" 
          icon="🚀"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>

        <p style={{ 
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-color-light)'
        }}>
          Secure authentication powered by Google
        </p>
      </div>
    </div>
  )
}

export default Login
