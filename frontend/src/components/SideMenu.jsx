import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext.jsx'
import CompanyInformationSidebar from './CompanyInformationSidebar.jsx'

export default function SideMenu({ isOpen = false, onClose = () => { } }) {
  const location = useLocation()

  const { isAdmin, selectedProduct, user } = useAuth()

  const menuItems = [
    { path: '/insurance-dashboard', label: 'Insurance Dashboard', icon: '🏦', description: 'KPI & Analytics' },
    // { path: '/explorer', label: 'Maker-Checker', icon: '🗂️', description: 'Browse All Users Data' },
    { path: '/insurance-data-demo', label: 'Insurance Data Table', icon: '📊', description: 'Interactive Data Analytics' },
    { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management' },
    { path: '/dmm-l2form', label: 'DMM L2 Form', icon: '📊', description: 'Data Management Module' },
    // { path: '/dashboard', label: 'Legacy Dashboard', icon: '📈', description: 'Original Dashboard' },
    { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings' }
  ]

  // Add Smart Extraction only for admin users
  if (isAdmin) {
    menuItems.splice(1, 0, {
      path: '/smart-extraction',
      label: 'Smart Extraction',
      icon: '🚀',
      description: 'AI-Powered PDF Extraction (Admin Only)'
    }),
      menuItems.splice(1, 0, {
        path: '/explorer',
        label: 'Maker-Checker',
        icon: '🗂️',
        description: 'Browse All Users Data'
      })
  }

  const isActiveRoute = (path) => location.pathname === path

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Sidebar Navigation">
      {/* Mobile-only header */}
      <div className="sidebar__mobile-header">
        <button
          className="sidebar__close-button"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {isAdmin && (
        <div style={{
          marginTop: '1rem',
          marginBottom: '1rem',
          padding: '0.25rem 0.75rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'white',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem',
          marginInline: '1rem'
        }}>
          <span>🔑</span>
          <span>Admin Access</span>
        </div>
      )}
      {selectedProduct && (
        <div style={{
          margin: '1rem',
          padding: '0.5rem',
          background: '#e7f3ff',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#0366d6',
          textAlign: 'center',
          border: '1px solid #0366d6',
          fontWeight: '500'
        }}>
          {selectedProduct.replace(/_/g, ' ')}
        </div>
      )}

      {/* For non-admin users, show CompanyInformationSidebar. For admin users, show the tile menu. */}
      {!isAdmin ? (
        <div className="sidebar__company-info" style={{ flex: 1, overflowY: 'auto' }}>
          <CompanyInformationSidebar variant="integrated" />
        </div>
      ) : (
        <nav className="sidebar__navigation">
          <ul className="sidebar__menu">
            {menuItems.map((item) => (
              <li key={item.path} className="sidebar__menu-item">
                <Link
                  to={item.path}
                  className={`sidebar__menu-link ${isActiveRoute(item.path) ? 'sidebar__menu-link--active' : ''}`}
                  onClick={onClose}
                >
                  <div className={`sidebar__menu-icon ${isActiveRoute(item.path) ? 'sidebar__menu-icon--active' : ''}`}>
                    {item.icon}
                  </div>
                  <div className="sidebar__menu-content">
                    <div className="sidebar__menu-label">
                      {item.label}
                    </div>
                    <div className="sidebar__menu-description">
                      {item.description}
                    </div>
                  </div>
                  {isActiveRoute(item.path) && (
                    <div className="sidebar__menu-indicator" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Quick Stats - Only show for Admin or if needed */}
      {isAdmin && (
        <div className="sidebar__stats">
          <h4 className="sidebar__stats-title">Quick Stats</h4>
          <div className="sidebar__stats-content">
            <div className="sidebar__stats-item">
              <span>📁 Files:</span>
              <strong>{stats.total_files}</strong>
            </div>
            <div className="sidebar__stats-item">
              <span>✅ Processed:</span>
              <strong>{stats.processed_files}</strong>
            </div>
            <div className="sidebar__stats-item">
              <span>⏱️ Last Activity:</span>
              <strong>
                {stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'Never'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
