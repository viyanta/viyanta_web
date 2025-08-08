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
            AssureLife
          </h1>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="hide-on-mobile" style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
            color: 'var(--text-color)'
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
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid rgba(255,255,255,0.2)',
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