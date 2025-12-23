import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from 'react-router-dom';

const UtilityIcons = () => {
  const { user, logout } = useAuth();
  const { activeNavItems, activeSubMenuData } = useNavigation();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Get current page name
  const getPageName = (pathname) => {
    // Exact path mapping first
    const path = pathname.split('?')[0]; // Remove query params

    // Map paths to sub-menu names
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/economy-dashboard') return 'Dashboard'; // Economy Dashboard is named "Dashboard" in sub-menus
    if (path === '/economy-domestic') return 'Domestic Metrics';
    if (path === '/economy-international') return 'International Metrics';

    // Industry Metrics Mappings
    if (path === '/industry-metrics-dashboard') return 'Dashboard';
    if (path === '/industry-metrics-domestic') return 'Domestic Metrics';
    if (path === '/industry-metrics-international') return 'International Metrics';

    // IRDAI Monthly Data Mappings
    if (path === '/irdai-monthly-data') return 'Dashboard';
    if (path === '/irdai-monthly-dashboard') return 'Dashboard';
    if (path === '/irdai-companywise') return 'Companywise';
    if (path === '/irdai-premium-wise') return 'Premiumwise';
    if (path === '/irdai-market-share') return 'Marketshare';
    if (path === '/irdai-growth') return 'Growth';
    if (path === '/irdai-monthwise') return 'Monthwise';
    if (path === '/irdai-pvt-vs-public') return 'Pvt Vs. Public';
    if (path === '/irdai-analytics') return 'Analytics';
    if (path === '/irdai-peers') return 'Peers';
    if (path === '/irdai-documents') return 'Documents';

    if (path === '/news') return 'News';
    if (path === '/documents') return 'Documents';

    // Fallback based on route map
    const routeMap = {
      '/': 'Dashboard',
      '/insurance-dashboard': 'Insurance Dashboard',
      '/insurance-data-demo': 'Insurance Data Table',
      '/lform': 'L Forms',
      '/dmm-l2form': 'DMM L2 Form',
      '/smart-extraction': 'Smart Extraction',
      '/explorer': 'Maker-Checker',
      '/profile': 'Profile',
      '/login': 'Login'
    };

    return routeMap[path] || 'Dashboard';
  };

  const currentPage = getPageName(location.pathname);

  // Determine if icons should be visible based on features
  const getFeatures = () => {
    // If we have API data, try to find the current page
    if (activeSubMenuData && activeSubMenuData.length > 0) {
      const subMenu = activeSubMenuData.find(sm => sm.SubMenuName === currentPage);
      if (subMenu && subMenu.features) {
        return subMenu.features;
      }
    }

    // Fallback for pages not in the dynamic menu or if API fails
    // You might want to default to TRUE or FALSE depending on security requirements
    // defaulting to TRUE for now to preserve existing behavior for non-API pages
    return {
      IsExcelDownload: true,
      IsPDFDownload: true,
      IsPrint: true,
      IsLightTheme: true,
      IsSettings: true,
      IsSupportEmail: true,
      IsTalkToUs: true,
      IsLogout: true
    };
  };

  const features = getFeatures();

  // Dark mode is always inactive now
  const isDarkModeInactive = true;

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Excel download functionality
  const handleExcelDownload = () => {
    // Get table data from the current page
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) {
      alert('No table data found to download');
      return;
    }

    // Convert table to CSV format
    const csvContent = Array.from(tables).map(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        return cells.map(cell => `"${cell.textContent.trim()}"`).join(',');
      }).join('\n');
    }).join('\n\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentPage}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // General download functionality
  const handleGeneralDownload = () => {
    // This can be used for general file downloads or data exports
    const data = {
      page: currentPage,
      timestamp: new Date().toISOString(),
      user: user?.displayName || 'User'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentPage}_export.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print functionality
  const handlePrint = () => {
    window.print();
  };

  // Email support functionality
  const handleEmailSupport = () => {
    const subject = `${user?.displayName || 'User'}-${user?.organization || 'Organization'}`;
    const body = `Dear Support Team,\n\nI need assistance with:\n\n\n\nBest regards,\n${user?.displayName || 'User'}`;
    const mailtoLink = `mailto:support@assurelife.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  // Logout functionality
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="utility-icons">
      {/* Excel Download */}
      {features.IsExcelDownload && (
        <button
          className="utility-icon utility-icon--excel"
          onClick={handleExcelDownload}
          title="Download data as Excel/CSV"
          aria-label="Download Excel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="2" fill="#217346" stroke="#217346" strokeWidth="1" />
            <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#1e5f3a" strokeWidth="0.5" />
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">X</text>
            <rect x="4" y="4" width="16" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.7" />
            <line x1="4" y1="6" x2="20" y2="6" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="4" y1="8" x2="20" y2="8" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="4" y1="10" x2="20" y2="10" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="6" y1="4" x2="6" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="8" y1="4" x2="8" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="10" y1="4" x2="10" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="12" y1="4" x2="12" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="14" y1="4" x2="14" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="16" y1="4" x2="16" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
            <line x1="18" y1="4" x2="18" y2="12" stroke="white" strokeWidth="0.2" opacity="0.5" />
          </svg>
        </button>
      )}

      {/* General Download (PDF Download in features?) Mapped to IsPDFDownload for now as general match */}
      {features.IsPDFDownload && (
        <button
          className="utility-icon"
          onClick={handleGeneralDownload}
          title="Download data"
          aria-label="Download"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" />
            <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* Print */}
      {features.IsPrint && (
        <button
          className="utility-icon"
          onClick={handlePrint}
          title="Print page"
          aria-label="Print"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="6,9 6,2 18,2 18,9" stroke="currentColor" strokeWidth="2" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" />
            <rect x="6" y="14" width="12" height="8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* Theme Toggles - Controlled by IsLightTheme flag */}
      {features.IsLightTheme && (
        <>
          {/* Show Sun icon if in Dark Mode (to switch to Light) */}
          {isDarkMode && (
            <button
              className="utility-icon"
              onClick={() => {
                setIsDarkMode(false);
                localStorage.setItem('theme', 'light');
                document.documentElement.setAttribute('data-theme', 'light');
                window.dispatchEvent(new CustomEvent('themeChanged', {
                  detail: { isDarkMode: false }
                }));
              }}
              title="Switch to light mode"
              aria-label="Light mode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
                <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          )}

          {/* Show Moon icon if in Light Mode (to switch to Dark) */}
          {!isDarkMode && (
            <button
              className="utility-icon"
              onClick={() => {
                // If inactive logic applies, keep it, but user didn't mention it.
                // Assuming active.
                if (isDarkModeInactive) return; // Legacy check
                setIsDarkMode(true);
                localStorage.setItem('theme', 'dark');
                document.documentElement.setAttribute('data-theme', 'dark');
                window.dispatchEvent(new CustomEvent('themeChanged', {
                  detail: { isDarkMode: true }
                }));
              }}
              title="Switch to dark mode"
              aria-label="Dark mode"
              style={{
                opacity: isDarkModeInactive ? 0.5 : 1,
                cursor: isDarkModeInactive ? 'not-allowed' : 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Settings */}
      {features.IsSettings && (
        <button
          className="utility-icon"
          title="Settings"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* Email Support */}
      {features.IsSupportEmail && (
        <button
          className="utility-icon utility-icon--email"
          onClick={handleEmailSupport}
          title="Email support"
          aria-label="Email support"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" />
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="utility-icon__text">EMAIL</span>
        </button>
      )}

      {/* Logout */}
      {features.IsTalkToUs && (
        <button
          className="utility-icon"
          onClick={() => {
            // Placeholder for Talk to Us - distinct from Email Support
            // Using mailto with a specific subject or just alert for now as no spec
            const subject = `Talk to Us - ${user?.displayName || 'User'}`;
            const mailtoLink = `mailto:support@assurelife.com?subject=${encodeURIComponent(subject)}`;
            window.open(mailtoLink);
          }}
          title="Talk to Us"
          aria-label="Talk to Us"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="utility-icon__text" style={{ marginLeft: '5px' }}>Talk to Us</span>
        </button>
      )}

      {/* Logout */}
      {features.IsLogout && (
        <button
          className="utility-icon utility-icon--logout"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" />
            <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="utility-icon__text">Logout</span>
        </button>
      )}
    </div>
  );
};

export default UtilityIcons;
