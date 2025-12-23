import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { subscribeToAuthChanges, logout } from '../firebase/auth.js'

import { useAuth } from '../context/AuthContext';

function Navbar({ onMenuClick }) {
  const { user: authContextUser, selectedProduct } = useAuth(); // Get user from context if available, but keep local state for now to minimize refactor risk
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setIsLoading(false);
      if (authUser) setImageError(false);
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = (displayName) => {
    if (!displayName) return '👤';
    return displayName.split(' ').map(n => n[0]).join('');
  };

  const getProductTitle = () => {
    if (!selectedProduct) return 'AssureLife v0.1';

    // Format product string: digits_life -> Digits Life
    // This handles both snake_case and generic strings
    const formatted = selectedProduct
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Specific overrides if needed
    if (formatted.toLowerCase().includes('digit')) return 'Digits Life v0.1';

    return `${formatted} v0.1`;
  };

  if (isLoading) {
    return (
      <nav className="navbar navbar--loading">
        <div className="navbar__left">
          <div className="navbar__logo">
            <div className="navbar__logo-icon">📊</div>
            <h1 className="navbar__brand">{getProductTitle()}</h1>
          </div>
        </div>
        <div className="navbar__loading">Loading...</div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      {/* Left group: menu + brand */}
      <div className="navbar__left">
        <div className="navbar__logo">
          <div className="navbar__logo-icon">📊</div>
          <h1 className="navbar__brand">{getProductTitle()}</h1>
        </div>
      </div>

      {/* Right side - User info and Profile */}
      <div className="navbar__user-section">
        {user && (
          <div className="navbar__welcome hide-on-mobile">
            Welcome, {user.displayName || 'User'}
          </div>
        )}

        <div className="navbar__profile" ref={dropdownRef}>
          <button
            className="navbar__profile-button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isLoading}
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <div className="navbar__profile-avatar">
              {user?.photoURL && !imageError ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="navbar__profile-image"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="navbar__profile-initials">
                  {getUserInitials(user?.displayName)}
                </div>
              )}
            </div>
            <span className="navbar__profile-name">
              {user?.displayName?.split(' ')[0] || 'User'}
            </span>
            <span className="navbar__profile-arrow">▼</span>
          </button>

          {showDropdown && (
            <div className="navbar__dropdown" role="menu">
              <Link
                to="/profile"
                className="navbar__dropdown-item"
                onClick={() => setShowDropdown(false)}
                role="menuitem"
              >
                👤 Profile
              </Link>
              <button
                className="navbar__dropdown-item navbar__dropdown-item--logout"
                onClick={handleLogout}
                disabled={isLoading}
                role="menuitem"
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