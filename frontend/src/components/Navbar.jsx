import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { subscribeToAuthChanges, logout } from '../firebase/auth.js'

function Navbar({ onMenuClick }) {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      if (authUser) {
        setImageError(false); // Reset image error when user changes
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Function to get a higher quality Google profile image
  const getOptimizedImageUrl = (photoURL) => {
    if (!photoURL) return null;
    if (photoURL.includes('googleusercontent.com')) {
      return photoURL.replace(/=s\d+-c/, '=s64-c');
    }
    return photoURL;
  };

  return (
    <nav style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '1rem 1rem', 
      backgroundColor: 'var(--main-color)', 
      color: 'var(--text-color)', 
      boxShadow: 'var(--shadow-medium)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Mobile hamburger */}
      <button
        className="show-on-mobile"
        aria-label="Open menu"
        onClick={onMenuClick}
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: 'white',
          borderRadius: '8px',
          padding: '0.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '0.5rem'
        }}
      >
        ☰
      </button>
      <Link 
        to="/" 
        style={{ 
          textDecoration: 'none', 
          color: 'var(--text-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'var(--sub-color)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          📊
        </div>
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.5rem',
          fontWeight: '700',
          color: 'var(--text-color)'
        }}>
          AsureLife
        </h1>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
            color: 'var(--text-color)'
          }}>
            Welcome, {user.displayName || 'User'}
          </div>
        )}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              {user?.photoURL && !imageError ? (
                <img 
                  src={getOptimizedImageUrl(user.photoURL)} 
                  alt="Profile" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={handleImageError}
                  onLoad={() => {}}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--sub-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8rem'
                }}>
                  {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : '👤'}
                </div>
              )}
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '500' }}>
              {user?.displayName?.split(' ')[0] || 'User'}
            </span>
            <span style={{ fontSize: '0.8rem' }}>▼</span>
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-large)',
              minWidth: '200px',
              zIndex: 1001
            }}>
              <Link 
                to="/profile"
                onClick={() => setShowDropdown(false)}
                style={{
                  display: 'block',
                  padding: '0.75rem 1rem',
                  textDecoration: 'none',
                  color: 'var(--text-color-dark)',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--background-color)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                👤 Profile
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  color: 'var(--error-color)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--background-color)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar