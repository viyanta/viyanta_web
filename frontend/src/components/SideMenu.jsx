import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useStats } from '../context/StatsContext.jsx'
import { useUser } from '../context/UserContext.jsx'

function SideMenu({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const { stats } = useStats();
  const { hasRole } = useUser();

  const menuItems = [
<<<<<<< HEAD
    { path: '/', label: 'Dashboard', icon: '📊', description: 'Overview & Analytics', role: 'user' },
    { path: '/explorer', label: 'Maker-Checker', icon: '📁', description: 'Maker and Checker', role: 'user' },
    { path: '/smart-extraction', label: 'Smart Extraction', icon: '🚀', description: 'AI-Powered PDF Extraction', role: 'admin' },
    { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management', role: 'user' },
    { path: '/dmm-l2form', label: 'DMM L2 Form', icon: '📊', description: 'Data Management Module', role: 'user' },
    { path: '/insurance-dashboard', label: 'Insurance Dashboard', icon: '🏦', description: 'KPI & Analytics', role: 'user' },
    { path: '/insurance-data-demo', label: 'Insurance Data Table', icon: '📊', description: 'Interactive Data Analytics', role: 'user' },
    { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings', role: 'user' }
=======
    { path: '/', label: 'Dashboard', icon: '📊', description: 'Overview & Analytics' },
    { path: '/explorer', label: 'Maker-Checker (All Users)', icon: '�', description: 'Browse All Users Data' },
    { path: '/smart-extraction', label: 'Smart Extraction', icon: '🚀', description: 'AI-Powered PDF Extraction' },
    { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management' },
    { path: '/dmm-l2form', label: 'DMM L2 Form', icon: '📊', description: 'Data Management Module' },
    { path: '/insurance-dashboard', label: 'Insurance Dashboard', icon: '🏦', description: 'KPI & Analytics' },
    { path: '/insurance-data-demo', label: 'Insurance Data Table', icon: '📊', description: 'Interactive Data Analytics' },
    { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings' }
>>>>>>> e23839e (vikki:the data fetches and display from s3)
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => hasRole(item.role));

  const isActiveRoute = (path) => location.pathname === path;

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

      <div className="sidebar__header">
        <h2 className="sidebar__title">Navigation</h2>
        <p className="sidebar__subtitle">Explore your workspace</p>
      </div>
      
      <nav className="sidebar__navigation">
        <ul className="sidebar__menu">
          {filteredMenuItems.map((item) => (
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

      {/* Quick Stats */}
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
    </aside>
  )
}

export default SideMenu