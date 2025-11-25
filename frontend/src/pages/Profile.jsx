import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../utils/Button.jsx'
import { subscribeToAuthChanges, logout } from '../firebase/auth.js'
import './Profile.css'

function Profile({ onMenuClick }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      if (authUser) {
        setUser(authUser);
        setImageError(false);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (displayName) => {
    if (!displayName) return 'U';
    return displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      {/* Page Header */}
      <div className="profile-page-header">
        <button
          type="button"
          onClick={onMenuClick}
          className="profile-menu-btn"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="profile-header-content">
          <h1 className="profile-page-title">User Profile</h1>
          <p className="profile-page-subtitle">
            Manage your account information, preferences and subscription
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        <div className="profile-card">
          {/* Card Header */}
          <div className="profile-card-header">
            <h2 className="profile-card-title">Personal Information</h2>
            <Button 
              variant="outline" 
              size="small"
              disabled
              className="profile-edit-btn"
            >
              Edit Profile
            </Button>
          </div>

          {/* Profile Section */}
          <div className="profile-section">
            <div className="profile-avatar-container">
              <div className="profile-avatar-wrapper">
                {user.photoURL && !imageError ? (
                  <img 
                    src={user.photoURL}
                    alt="Profile" 
                    className="profile-avatar-img"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="profile-avatar-initials">
                    {getInitials(user.displayName)}
                  </div>
                )}
              </div>
              <Button
                variant="primary"
                size="small"
                onClick={() => navigate('/subscription')}
                className="profile-subscription-btn"
              >
                Subscription
              </Button>
            </div>

            <div className="profile-info">
              <h3 className="profile-name">{user.displayName || 'User'}</h3>
              <p className="profile-role">Viyanta User</p>
              <p className="profile-team">Document Processing Team</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="profile-details">
            <div className="profile-detail-item">
              <label className="profile-detail-label">Full Name</label>
              <p className="profile-detail-value">{user.displayName || 'Not provided'}</p>
            </div>

            <div className="profile-detail-item">
              <label className="profile-detail-label">Email Address</label>
              <p className="profile-detail-value">{user.email}</p>
            </div>

            <div className="profile-detail-item">
              <label className="profile-detail-label">Account Status</label>
              <div className="profile-status">
                <span className="profile-status-icon">✓</span>
                <span className="profile-status-text">Verified</span>
              </div>
            </div>

            <div className="profile-detail-item">
              <label className="profile-detail-label">Last Sign In</label>
              <p className="profile-detail-value">
                {user.metadata.lastSignInTime ? 
                  new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 
                  'Today'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
