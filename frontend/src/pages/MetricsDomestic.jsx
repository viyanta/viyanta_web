import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import './EconomyDomestic.css';

const MetricsDomestic = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Domestic Metrics');
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only show Dashboard and Domestic Metrics tabs
  const tabs = ['Dashboard', 'Domestic Metrics'];

  // Sample insurer list
  const insurers = ['HDFC Life', 'ICICI Prudential', 'SBI Life', 'LIC', 'Bajaj Allianz', 'Max Life', 'Kotak Life', 'Aditya Birla Sun Life'];

  const handleTabClick = (tab) => {
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      navigate('/metrics');
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      return; // Stay on current page
    }
  };

  return (
    <div className="economy-domestic-page">
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
        <h1>Metrics - Domestic</h1>
      </div>

      <div className="main-content-wrapper">
        <div className="content-layout">
          {/* Left Sidebar */}
          <div className="sidebar-container">
            <CompanyInformationSidebar />
          </div>

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Breadcrumb */}
            <div className="breadcrumb" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(6px, 1.5vw, 8px)',
              fontSize: 'clamp(13px, 2.5vw, 14px)',
              marginBottom: 'clamp(10px, 2vw, 15px)',
              flexWrap: 'wrap'
            }}>
              <span 
                onClick={() => handleTabClick('Dashboard')}
                style={{ 
                  color: '#36659b', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = 'underline';
                  e.target.style.color = '#2d5280';
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = 'none';
                  e.target.style.color = '#36659b';
                }}
              >
                Metrics
              </span>
              <span className="breadcrumb-separator" style={{ color: '#999' }}>{'>>'}</span>
              <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>Domestic</span>
            </div>

            {/* Navigation Tabs */}
            <div className="navigation-tabs-container">
              <div className="navigation-tabs">
                {tabs.map((tab) => {
                  const isSelected = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => handleTabClick(tab)}
                      className={`nav-tab active ${isSelected ? 'selected' : ''}`}
                    >
                      {tab}
                    </button>
                  );
                })}
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

            {/* Insurer Selection */}
            <div className="filters-section">
              <div className="filter-group">
                <label htmlFor="insurer-select">Insurer Name</label>
                <select
                  id="insurer-select"
                  value={selectedInsurer}
                  onChange={(e) => setSelectedInsurer(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Insurer...</option>
                  {insurers.map((insurer, index) => (
                    <option key={index} value={insurer}>{insurer}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ marginTop: '20px' }}>
              {selectedInsurer ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  {viewMode === 'data' ? (
                    <p>Data view for {selectedInsurer} will be displayed here</p>
                  ) : (
                    <p>Visuals view for {selectedInsurer} will be displayed here</p>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  Please select an insurer to view metrics
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDomestic;

