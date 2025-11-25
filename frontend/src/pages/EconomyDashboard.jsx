import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './EconomyDashboard.css';

const EconomyDashboard = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isNavItemActive } = useNavigation();
  const [activeTab, setActiveTab] = useState('Dashboard');

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/economy-domestic')) {
      setActiveTab('Domestic');
    } else if (path.includes('/economy-international')) {
      setActiveTab('International');
    } else {
      setActiveTab('Dashboard');
    }
  }, [location.pathname]);

  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      navigate('/economy-dashboard');
    } else if (tab === 'Domestic') {
      setActiveTab('Domestic');
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      setActiveTab('International');
      navigate('/economy-international');
    } else if (tab === 'Background') {
      navigate('/insurance-dashboard?tab=Background');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Metrics') {
      navigate('/metrics');
    } else if (tab === 'Analytics') {
      navigate('/analytics');
    } else if (tab === 'Annual Data') {
      navigate('/annual-data');
    } else if (tab === 'Documents') {
      navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      navigate('/news');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="economy-dashboard-page">
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
        <h1>Economy - Dashboard</h1>
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
                    className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'} ${activeTab === tab ? 'selected' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="dashboard-content">
              {/* Charts Grid - 2x2 Layout */}
              <div className="dashboard-charts-grid">
                {/* Top Left - Bar Chart 1 */}
                <div className="dashboard-chart-card">
                  <h3 className="chart-title">Life Expectancy in years - Male</h3>
                  <div className="chart-container">
                    <div className="bar-chart-horizontal">
                      {[
                        { label: 'USA', value: 380, value2: 40 },
                        { label: 'China', value: 280, value2: 120 },
                        { label: 'Brazil', value: 100, value2: 10 },
                        { label: 'EU', value: 80, value2: 120 },
                        { label: 'Argentina', value: 40, value2: 20 },
                        { label: 'India', value: 30, value2: 100 }
                      ].map((item, index) => (
                        <div key={index} className="bar-chart-row">
                          <div className="bar-label">{item.label}</div>
                          <div className="bar-group">
                            <div 
                              className="bar-primary" 
                              style={{ width: `${(item.value / 400) * 100}%` }}
                            >
                              <span className="bar-value">{item.value}k</span>
                            </div>
                            <div 
                              className="bar-secondary" 
                              style={{ width: `${(item.value2 / 400) * 100}%` }}
                            >
                              <span className="bar-value">{item.value2}k</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Right - Bar Chart 2 */}
                <div className="dashboard-chart-card">
                  <h3 className="chart-title">Life Expectancy in years - Female</h3>
                  <div className="chart-container">
                    <div className="bar-chart-vertical">
                      {[
                        { label: 'Chrome', value: 63.5 },
                        { label: 'Safari', value: 19.8 },
                        { label: 'Firefox', value: 4.2 },
                        { label: 'Edge', value: 4.1 },
                        { label: 'Opera', value: 1.2 },
                        { label: 'IE', value: 0.5 },
                        { label: 'Other', value: 1.4 }
                      ].map((item, index) => (
                        <div key={index} className="bar-item">
                          <div className="bar-wrapper">
                            <div 
                              className="bar-vertical" 
                              style={{ height: `${(item.value / 80) * 100}%` }}
                            >
                              <span className="bar-value-top">{item.value}%</span>
                            </div>
                          </div>
                          <div className="bar-label-bottom">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Left - Treemap */}
                <div className="dashboard-chart-card">
                  <h3 className="chart-title">Average Household Savings</h3>
                  <div className="chart-container">
                    <div className="treemap-container">
                      <div className="treemap-item treemap-large" style={{ backgroundColor: '#4CAF50' }}>
                        <div className="treemap-label">NORD NORGE</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Troms og Finnmark</div>
                          <div className="treemap-sub-item">Nordland</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-medium" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">OSTLANDET</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Innlandet</div>
                          <div className="treemap-sub-item">Vestfold og Telemark</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-medium" style={{ backgroundColor: '#4CAF50' }}>
                        <div className="treemap-label">VESTLANDET</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Vestland</div>
                          <div className="treemap-sub-item">Rogaland</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">SORLANDET</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Agder</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#4CAF50' }}>
                        <div className="treemap-label">More og Romsdal</div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">Trondelag</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Right - Pie Chart */}
                <div className="dashboard-chart-card">
                  <h3 className="chart-title">Gross Financial Savings</h3>
                  <div className="chart-container">
                    <div className="pie-chart-container">
                      {(() => {
                        const radius = 80;
                        const circumference = 2 * Math.PI * radius;
                        const water = 55.0;
                        const fat = 26.7;
                        const protein = 15.5;
                        const other = 2.8;
                        
                        const waterLength = (water / 100) * circumference;
                        const fatLength = (fat / 100) * circumference;
                        const proteinLength = (protein / 100) * circumference;
                        const otherLength = (other / 100) * circumference;
                        
                        return (
                          <svg className="pie-chart" viewBox="0 0 200 200">
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#64B5F6"
                              strokeWidth="40"
                              strokeDasharray={`${waterLength} ${circumference}`}
                              transform="rotate(-90 100 100)"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#BA68C8"
                              strokeWidth="40"
                              strokeDasharray={`${fatLength} ${circumference}`}
                              strokeDashoffset={`-${waterLength}`}
                              transform="rotate(-90 100 100)"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#FF9800"
                              strokeWidth="40"
                              strokeDasharray={`${proteinLength} ${circumference}`}
                              strokeDashoffset={`-${waterLength + fatLength}`}
                              transform="rotate(-90 100 100)"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#E0E0E0"
                              strokeWidth="40"
                              strokeDasharray={`${otherLength} ${circumference}`}
                              strokeDashoffset={`-${waterLength + fatLength + proteinLength}`}
                              transform="rotate(-90 100 100)"
                            />
                          </svg>
                        );
                      })()}
                      <div className="pie-legend">
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#64B5F6' }}></div>
                          <span>Water - 55.0%</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#BA68C8' }}></div>
                          <span>Fat - 26.7%</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                          <span>Protein - 15.5%</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#E0E0E0' }}></div>
                          <span>Other - 2.8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomyDashboard;

