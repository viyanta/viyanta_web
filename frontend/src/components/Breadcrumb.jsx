import React from 'react';
import { useLocation } from 'react-router-dom';

const Breadcrumb = () => {
  const location = useLocation();

  // Map routes to display names
  const getPageName = (pathname) => {
    const routeMap = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/insurance-dashboard': 'Insurance Dashboard',
      '/insurance-data-demo': 'Insurance Data Table',
      '/lform': 'L Forms',
      '/dmm-l2form': 'DMM L2 Form',
      '/smart-extraction': 'Smart Extraction',
      '/explorer': 'Maker-Checker',
      '/profile': 'Profile',
      '/login': 'Login'
    };

    return routeMap[pathname] || 'Dashboard';
  };

  const currentPage = getPageName(location.pathname);

  return (
    <div className="breadcrumb">
      <span className="breadcrumb__current">{currentPage}</span>
    </div>
  );
};

export default Breadcrumb;
