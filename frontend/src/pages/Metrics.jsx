import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import './Metrics.css';

function Metrics({ onMenuClick }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [viewMode, setViewMode] = useState('visuals'); // 'data' or 'visuals'

  const tabs = ['Dashboard', 'Domestic Metrics'];

  const handleTabClick = (tab) => {
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      // Stay on current page or navigate to dashboard
      // navigate('/dashboard');
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      navigate('/metrics-domestic');
    }
  };

  return (
    <div className="metrics-page">
      <div className="page-header">
        <button
          onClick={() => {
            if (onMenuClick) {
              onMenuClick();
            }
          }}
          className="hamburger-button"
        >
          ☰
        </button>
        <div>
          <h1>Metrics</h1>
        </div>
      </div>

      <div className="main-content-wrapper">
        <div className="content-layout">
          {/* Left Sidebar */}
          <div className="sidebar-container">
            <CompanyInformationSidebar />
          </div>

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Navigation Tabs */}
            <div className="navigation-tabs-container">
              <div className="navigation-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={`nav-tab active ${activeTab === tab ? 'selected' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* View Toggle */}
            <div className="page-title-section">
              <div className="view-toggle-container">
                <button
                  className={`view-toggle-btn ${viewMode === 'data' ? 'active' : ''}`}
                  onClick={() => setViewMode('data')}
                >
                  Data
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'visuals' ? 'active' : ''}`}
                  onClick={() => setViewMode('visuals')}
                >
                  Visuals
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div>
              {/* Content will be added here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Metrics;
