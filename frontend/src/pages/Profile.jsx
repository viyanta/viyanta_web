import React from 'react'
import Button from '../utils/Button.jsx'

function Profile({ onMenuClick }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState({
    name: 'Viyanta User',
    email: 'viyanta.user@company.com',
    department: 'Data Analytics',
    employeeId: 'EMP001',
    phone: '+91 (555) 123-4567',
    location: 'India,Blr',
    joinDate: 'January 2022',
    role: 'Senior Data Analyst'
  });

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

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
                variant={isEditing ? "success" : "outline"} 
                size="small"
                icon={isEditing ? "💾" : "✏️"}
                onClick={handleEdit}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              backgroundColor: 'var(--sub-color)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              marginRight: '2rem',
              boxShadow: 'var(--shadow-medium)'
            }}>
              {userInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                {userInfo.name}
              </h2>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--sub-color)', fontWeight: '500' }}>
                {userInfo.role}
              </p>
              <p style={{ margin: '0', color: 'var(--text-color-light)' }}>
                {userInfo.department}
              </p>
            </div>
          </div>
          
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              {isEditing ? (
                <input 
                  className="form-input"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                />
              ) : (
                <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>{userInfo.name}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              {isEditing ? (
                <input 
                  className="form-input"
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                />
              ) : (
                <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>{userInfo.email}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              {isEditing ? (
                <input 
                  className="form-input"
                  value={userInfo.department}
                  onChange={(e) => setUserInfo({...userInfo, department: e.target.value})}
                />
              ) : (
                <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>{userInfo.department}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500', color: 'var(--text-color-light)' }}>
                {userInfo.employeeId}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              {isEditing ? (
                <input 
                  className="form-input"
                  type="tel"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                />
              ) : (
                <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>{userInfo.phone}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              {isEditing ? (
                <input 
                  className="form-input"
                  value={userInfo.location}
                  onChange={(e) => setUserInfo({...userInfo, location: e.target.value})}
                />
              ) : (
                <p style={{ margin: 0, padding: '0.75rem 0', fontWeight: '500' }}>{userInfo.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Account Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button variant="primary" size="small" icon="🔒">
                Change Password
              </Button>
              <Button variant="outline" size="small" icon="⚙️">
                Account Settings
              </Button>
              <Button variant="ghost" size="small" icon="📊">
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
                <strong>{userInfo.joinDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Last Login:</span>
                <strong>Today</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button variant="ghost" size="small" icon="❓">
                Help Center
              </Button>
              <Button variant="ghost" size="small" icon="💬">
                Contact Support
              </Button>
              <Button variant="error" size="small" icon="🚪">
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
