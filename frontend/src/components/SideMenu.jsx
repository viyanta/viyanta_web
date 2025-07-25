import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useStats } from '../context/StatsContext.jsx'

function SideMenu() {
  const location = useLocation();
  const { stats } = useStats();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊', description: 'Overview & Analytics' },
    { path: '/explorer', label: 'Explorer', icon: '📁', description: 'Checker and Maker' },
    { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management' },
    { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings' }
  ];

  return (
    <aside style={{ 
      width: '280px', 
      height: 'calc(100vh - 80px)', 
      backgroundColor: 'white', 
      padding: '2rem 1rem',
      borderRight: '1px solid #e9ecef',
      position: 'sticky',
      top: '80px',
      boxShadow: 'var(--shadow-light)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ 
          marginBottom: '0.5rem', 
          color: 'var(--main-color)',
          fontSize: '1.25rem',
          fontWeight: '600'
        }}>
          Navigation
        </h2>
        <p style={{ 
          color: 'var(--text-color-light)', 
          fontSize: '0.875rem',
          margin: 0
        }}>
          Explore your workspace
        </p>
      </div>
      
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menuItems.map((item) => (
            <li key={item.path} style={{ marginBottom: '0.5rem' }}>
              <Link 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  textDecoration: 'none',
                  color: location.pathname === item.path ? 'var(--sub-color)' : 'var(--text-color-dark)',
                  backgroundColor: location.pathname === item.path ? 'rgba(63, 114, 175, 0.1)' : 'transparent',
                  borderRadius: 'var(--border-radius)',
                  border: location.pathname === item.path ? '1px solid var(--sub-color)' : '1px solid transparent',
                  transition: 'var(--transition)',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'var(--background-color)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: location.pathname === item.path ? 'var(--sub-color)' : 'var(--button-color)',
                  borderRadius: 'var(--border-radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  transition: 'var(--transition)'
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '500',
                    fontSize: '1rem',
                    marginBottom: '0.25rem'
                  }}>
                    {item.label}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem',
                    color: 'var(--text-color-light)',
                    opacity: 0.8
                  }}>
                    {item.description}
                  </div>
                </div>
                {location.pathname === item.path && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--sub-color)',
                    borderRadius: '50%'
                  }} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Quick Stats */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: 'var(--background-color)', 
        borderRadius: 'var(--border-radius)',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ 
          marginBottom: '1rem', 
          color: 'var(--main-color)',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          Quick Stats
        </h4>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)' }}>
          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📁 Files:</span>
            <strong>{stats.total_files}</strong>
          </div>
          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>✅ Processed:</span>
            <strong>{stats.processed_files}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>⏱️ Last Activity:</span>
            <strong>{stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'Never'}</strong>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default SideMenu