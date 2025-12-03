import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './IndustryMetricsDashboard.css';

const IndustryMetricsDashboard = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isNavItemActive, activeNavItems } = useNavigation();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedPremiumType, setSelectedPremiumType] = useState('');
  const [viewMode, setViewMode] = useState('visuals'); // 'data' or 'visuals'

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International', 'Domestic Metrics', 'International Metrics',
    'Irdai Monthly Data'
  ];

  // Filter to show only active tabs, preserving order from activeNavItems
  const tabs = activeNavItems.filter(tab => allTabs.includes(tab));

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/industry-metrics-domestic')) {
      setActiveTab('Domestic Metrics');
    } else if (path.includes('/industry-metrics-international')) {
      setActiveTab('International Metrics');
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
      navigate('/industry-metrics-dashboard');
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      navigate('/industry-metrics-domestic');
    } else if (tab === 'International Metrics') {
      setActiveTab('International Metrics');
      navigate('/industry-metrics-international');
    } else if (tab === 'Documents') {
      navigate('/documents');
    } else if (tab === 'News') {
      navigate('/news');
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
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'Domestic') {
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      navigate('/economy-international');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  const premiumTypeOptions = [
    'Growth',
    'Premium Collection',
    'Policy Count',
    'Sum Assured',
    'Market Share'
  ];

  return (
    <div className="industry-metrics-dashboard-page">
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
        <h1>Industry Metrics - Dashboard</h1>
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

            {/* Premium Type Selector */}
            <div className="premium-type-selector">
              <label htmlFor="premium-type-select">Select Premium Type Long name:</label>
              <select
                id="premium-type-select"
                value={selectedPremiumType}
                onChange={(e) => setSelectedPremiumType(e.target.value)}
                className="premium-type-dropdown"
              >
                <option value="">Select Premium Type...</option>
                {premiumTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Dashboard Content */}
            <div className="dashboard-content">
              <h2 className="section-title">Industry Metrics</h2>
              
              {viewMode === 'visuals' ? (
              <div className="dashboard-charts-grid">
                {/* Top Left - Bar Chart 1 - Life Expectancy Male */}
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

                {/* Top Right - Bar Chart 2 - Life Expectancy Female */}
                <div className="dashboard-chart-card">
                  <h3 className="chart-title">Life Expectancy in years - Female</h3>
                  <div className="chart-container">
                    <div className="bar-chart-vertical">
                      {[
                        { label: 'China', value: 63.5 },
                        { label: 'India', value: 19.8 },
                        { label: 'Brazil', value: 4.2 },
                        { label: 'EU', value: 4.1 },
                        { label: 'USA', value: 1.2 },
                        { label: 'Argentina', value: 0.5 },
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
                        <div className="treemap-label">Thema og Netværk</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Vurdering</div>
                          <div className="treemap-sub-item">Indsigt</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-medium" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">Viden og Netværk</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Rådgivning</div>
                          <div className="treemap-sub-item">Analyse</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-medium" style={{ backgroundColor: '#4CAF50' }}>
                        <div className="treemap-label">Tjenester</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Digital</div>
                          <div className="treemap-sub-item">Produkter</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">Løsninger</div>
                        <div className="treemap-sub">
                          <div className="treemap-sub-item">Support</div>
                        </div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#4CAF50' }}>
                        <div className="treemap-label">Rådgivning</div>
                      </div>
                      <div className="treemap-item treemap-small" style={{ backgroundColor: '#E0E0E0' }}>
                        <div className="treemap-label">Produkter</div>
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
                        const rådgivning = 55.0;
                        const løsninger = 26.7;
                        const produkter = 19.4;
                        const other = 2.8;
                        
                        const rådgivningLength = (rådgivning / 100) * circumference;
                        const løsningerLength = (løsninger / 100) * circumference;
                        const produkterLength = (produkter / 100) * circumference;
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
                              strokeDasharray={`${rådgivningLength} ${circumference}`}
                              transform="rotate(-90 100 100)"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#BA68C8"
                              strokeWidth="40"
                              strokeDasharray={`${løsningerLength} ${circumference}`}
                              strokeDashoffset={`-${rådgivningLength}`}
                              transform="rotate(-90 100 100)"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#FF9800"
                              strokeWidth="40"
                              strokeDasharray={`${produkterLength} ${circumference}`}
                              strokeDashoffset={`-${rådgivningLength + løsningerLength}`}
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
                              strokeDashoffset={`-${rådgivningLength + løsningerLength + produkterLength}`}
                              transform="rotate(-90 100 100)"
                            />
                          </svg>
                        );
                      })()}
                      <div className="pie-legend">
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#64B5F6' }}></div>
                          <span>Rådgivning - 55.0%</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#BA68C8' }}></div>
                          <span>Løsninger - 26.7%</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                          <span>Produkter - 19.4%</span>
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
              ) : (
              /* Data Table View */
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Country/Region</th>
                      <th>Value</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>USA</td>
                      <td>380k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>China</td>
                      <td>280k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>Brazil</td>
                      <td>100k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>EU</td>
                      <td>80k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>Argentina</td>
                      <td>40k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Male</td>
                      <td>India</td>
                      <td>30k</td>
                      <td>Years</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Female</td>
                      <td>China</td>
                      <td>63.5%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Female</td>
                      <td>India</td>
                      <td>19.8%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Female</td>
                      <td>Brazil</td>
                      <td>4.2%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Female</td>
                      <td>EU</td>
                      <td>4.1%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Life Expectancy - Female</td>
                      <td>USA</td>
                      <td>1.2%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Average Household Savings</td>
                      <td>Thema og Netværk</td>
                      <td>55.0%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Average Household Savings</td>
                      <td>Viden og Netværk</td>
                      <td>26.7%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Average Household Savings</td>
                      <td>Tjenester</td>
                      <td>19.4%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Gross Financial Savings</td>
                      <td>Rådgivning</td>
                      <td>55.0%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Gross Financial Savings</td>
                      <td>Løsninger</td>
                      <td>26.7%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Gross Financial Savings</td>
                      <td>Produkter</td>
                      <td>19.4%</td>
                      <td>Percentage</td>
                    </tr>
                    <tr>
                      <td>Gross Financial Savings</td>
                      <td>Other</td>
                      <td>2.8%</td>
                      <td>Percentage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryMetricsDashboard;

