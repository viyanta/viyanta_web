import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../utils/Button.jsx'
import { subscribeToAuthChanges, logout } from '../firebase/auth.js'

function Profile({ onMenuClick }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      if (authUser) {
        setUser(authUser);
        console.log('User data:', authUser); // Debug log
        console.log('Profile photo URL:', authUser.photoURL); // Debug log
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleImageError = () => {
    console.log('Image failed to load, falling back to initials');
    setImageError(true);
  };

  // Function to get a higher quality Google profile image
  const getOptimizedImageUrl = (photoURL) => {
    if (!photoURL) return null;
    
    // If it's a Google profile image, try to get a higher quality version
    if (photoURL.includes('googleusercontent.com')) {
      // Remove any existing size and add a larger size
      return photoURL.replace(/=s\d+-c/, '=s256-c');
    }
    return photoURL;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="fade-in" style={{ padding: '1rem' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => {
              console.log('Profile hamburger clicked!');
              if (onMenuClick) {
                onMenuClick();
              } else {
                console.log('onMenuClick is not defined');
              }
            }}
            style={{
              background: 'rgba(63, 114, 175, 0.1)',
              border: '1px solid rgba(63, 114, 175, 0.3)',
              color: 'var(--main-color)',
              borderRadius: '6px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.2)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
          <h1 style={{ margin: 0 }}>User Profile</h1>
        </div>
        <p style={{ fontSize: '1.1rem', marginBottom: '0' }}>
          Manage your account information and preferences.
        </p>
      </div>

      <div className="grid grid-3" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Personal Information</h3>
              <Button 
                variant="outline" 
                size="small"
                icon="✏️"
                onClick={handleEdit}
                disabled
              >
                Edit Profile (Coming Soon)
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginRight: '2rem',
              boxShadow: 'var(--shadow-medium)',
              overflow: 'hidden',
              border: '3px solid var(--border-color)'
            }}>
              {user.photoURL && !imageError ? (
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
                  onLoad={() => console.log('Image loaded successfully')}
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
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}>
                  {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                {user.displayName || 'User'}
              </h2>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--sub-color)', fontWeight: '500' }}>
                Viyanta User
              </p>
              <p style={{ margin: '0', color: 'var(--text-color-light)' }}>
                Document Processing Team
              </p>
              {/* Debug info */}
              {/* <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)', marginTop: '0.5rem' }}>
                <p>Photo URL: <a href={user.photoURL} target="_blank" rel="noopener noreferrer">{user.photoURL || 'Not available'}</a></p>
                <p>Image Error: {imageError ? 'Yes' : 'No'}</p>
              </div> */}
            </div>
          </div>
          
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>
                {user.displayName || 'Not provided'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>
                {user.email}
              </p>
            </div>

            {/* <div className="form-group">
              <label className="form-label">Account Provider</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>
                Google
              </p>
            </div> */}

            {/* <div className="form-group">
              <label className="form-label">User ID</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500', color: 'var(--text-color-light)' }}>
                {user.uid.substring(0, 8)}...
              </p>
            </div> */}

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500', color: 'var(--success-color)' }}>
                ✅ Verified
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Last Sign In</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>
                {user.metadata.lastSignInTime ? 
                  new Date(user.metadata.lastSignInTime).toLocaleDateString() : 
                  'Today'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Account Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button variant="primary" size="small" icon="🔒" disabled>
                Change Password
              </Button>
              <Button variant="outline" size="small" icon="⚙️" disabled>
                Account Settings
              </Button>
              <Button variant="ghost" size="small" icon="📊" disabled>
                Activity Log
              </Button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Account Stats</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-color-light)' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Files Uploaded:</span>
                <strong>0</strong>
              </div>
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Size:</span>
                <strong>0 MB</strong>
              </div>
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Member Since:</span>
                <strong>{user.metadata.creationTime ? 
                  new Date(user.metadata.creationTime).toLocaleDateString() : 
                  'Today'
                }</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Last Login:</span>
                <strong>{user.metadata.lastSignInTime ? 
                  new Date(user.metadata.lastSignInTime).toLocaleDateString() : 
                  'Today'
                }</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button variant="ghost" size="small" icon="❓" disabled>
                Help Center
              </Button>
              <Button variant="ghost" size="small" icon="💬" disabled>
                Contact Support
              </Button>
              <Button 
                variant="error" 
                size="small" 
                icon="🚪"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
