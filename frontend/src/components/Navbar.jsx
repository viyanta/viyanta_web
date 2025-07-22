import React from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{ 
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '1rem 2rem', 
      backgroundColor: 'var(--main-color)', 
      color: 'var(--text-color)', 
      boxShadow: 'var(--shadow-medium)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
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
            fontSize: '1.8rem',
            fontWeight: '700',
            color: 'var(--text-color)'
          }}>
            Viyanta
          </h1>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
            color: 'var(--text-color)'
          }}>
            Welcome, Viyanta User
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