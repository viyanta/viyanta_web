import React from 'react'
import { Link } from 'react-router-dom'

function Navbar({ onMenuClick }) {
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
      padding: '1rem 1.5rem', 
      backgroundColor: 'var(--main-color)', 
      color: 'var(--text-color)', 
      boxShadow: 'var(--shadow-medium)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
        {/* Left side - Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* AssureLife Logo and Name */}
          <Link 
            to="/" 
            style={{ 
              textDecoration: 'none', 
              color: 'var(--text-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              backgroundColor: 'var(--sub-color)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              📊
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.75rem',
              fontWeight: '700',
              color: 'var(--text-color)',
              letterSpacing: '0.5px'
            }}>
              AssureLife
            </h1>
          </Link>
        </div>
        
        {/* Right side - User info and Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="hide-on-mobile" style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.9rem',
            color: 'var(--text-color)',
            fontWeight: '500'
          }}>
            Welcome, AssureLife User
          </div>
          
          <Link 
            to="/profile" 
            style={{ 
              textDecoration: 'none', 
              color: 'var(--text-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'var(--transition)',
              fontWeight: '500'
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
              backgroundColor: 'var(--sub-color)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              👤
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '500' }}>Profile</span>
          </Link>
        </div>
    </nav>
  )
}

export default Navbar