import React, { useState, useEffect } from 'react';
import { useStats } from '../context/StatsContext.jsx';
import dashboardData from '../data/dashboardData.json';
import companyDistributionData from '../data/companyDistribution.json';
import './InsuranceDashboard.css';

// Chart Component for Monthly Trends
const MonthlyChart = ({ data, title, color, metricType }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const yAxisSteps = 5;
  
  // Use the actual max value for precise scaling
  const actualMaxValue = Math.max(...data.map(d => d.value));
  const displayMaxValue = actualMaxValue; // Use exact max value for perfect scaling
  
  // Calculate dynamic height based on the highest bar
  const maxBarHeight = Math.max(...data.map(d => (d.value / displayMaxValue) * 100));
  const chartHeight = Math.max(100, maxBarHeight + 50); // Reduced minimum height
  
  // Ensure bars are properly scaled to match the Y-axis
  const getBarHeight = (value) => {
    return Math.max(4, (value / displayMaxValue) * (chartHeight - 30));
  };
  
  return (
    <div className="monthly-chart" style={{ minHeight: `${chartHeight}px` }}>
      {/* Y-axis and Chart Container */}
      <div className="chart-container" style={{ height: `${chartHeight - 30}px` }}>
        {/* Y-axis Labels */}
        <div className="y-axis-labels">
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
            const value = displayMaxValue - (i * (displayMaxValue / yAxisSteps));
            return (
              <div key={i} className="y-axis-label">
                {value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
              </div>
            );
          })}
        </div>
        
        {/* Chart Bars */}
        <div className="chart-bars">
          {/* Y-axis Grid Lines */}
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
            <div
              key={i}
              className="y-axis-grid-line"
              style={{
                top: `${(i / yAxisSteps) * 100}%`
              }}
            />
          ))}
          
          {data.map((item, index) => (
            <div key={index} className="bar-container">
              <div 
                className={`bar ${metricType}`}
                style={{
                  height: `${getBarHeight(item.value)}px`
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis Labels Below Chart */}
      <div className="x-axis-labels">
        {data.map((item, index) => (
          <div key={index} className="x-axis-item">
            <div className="month-label">
              {item.month}
            </div>
            <div className="value-label">
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(0)}K` : item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Company Distribution Chart
const CompanyDistributionChart = ({ data, title, color }) => {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage).slice(0, 10); // Reduced to 10 items
  const total = sortedData.reduce((sum, item) => sum + item.percentage, 0);
  
  return (
    <div className="company-distribution-chart">
      <div className="company-boxes">
        {sortedData.map((item, index) => {
          const width = Math.max((item.percentage / total) * 100, 12); // Minimum 12% width
          
          return (
            <div
              key={item.name}
              className="company-box"
              style={{
                backgroundColor: item.color,
                minWidth: `${width}%`,
                flex: `1 1 ${width}%`
              }}
              title={`${item.name}: ${item.percentage}%`}
            >
              <div className="company-name">
                {item.name}
              </div>
              <div className="company-percentage">
                {item.percentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, unit, icon, color, monthlyData, companyData, metricType }) => {
  return (
    <div className={`kpi-card ${metricType}`}>
      {/* KPI Row Layout - Responsive */}
      <div className="kpi-row-layout">
        {/* Left: Metric Info */}
        <div className="metric-info">
          <div className={`metric-icon ${metricType}`}>
            {icon}
          </div>
          <div className="metric-details">
            <h3 className="metric-title">
              {title}
            </h3>
            <div className={`metric-value ${metricType}`}>
              {value.toLocaleString()}
            </div>
            <div className="metric-unit">
              {unit}
            </div>
          </div>
        </div>
        
        {/* Middle: Monthly Trend Chart */}
        <div className="chart-section">
          <MonthlyChart 
            data={monthlyData} 
            title="" 
            color={color}
            metricType={metricType}
          />
        </div>
        
        {/* Right: Company Distribution */}
        <div className="chart-section">
          <CompanyDistributionChart 
            data={companyData} 
            title="" 
            color={color}
          />
        </div>
      </div>
    </div>
  );
};

// Treemap Component
const TreemapSection = ({ title, data, colors }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="treemap-section">
      <h3 className="treemap-title">
        {title}
      </h3>
      <div className="treemap-container">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          const width = Math.max((item.value / total) * 100, 8); // Minimum 8% width
          
          return (
            <div
              key={item.name}
              className="treemap-box"
              style={{
                backgroundColor: colors[index % colors.length],
                minWidth: `${width}%`,
                flex: `1 1 ${width}%`
              }}
              title={`${item.name}: ${percentage}%`}
            >
              <div className="treemap-name">
                {item.name}
              </div>
              <div className="treemap-percentage">
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function InsuranceDashboard({ onMenuClick }) {
  const { stats } = useStats();
  const [activeTab, setActiveTab] = useState('Industry Metrics');
  const [selectedCompany, setSelectedCompany] = useState('HDFC Life');
  const [selectedInfoSection, setSelectedInfoSection] = useState('');
  
  // Get the current company's data
  const currentCompanyData = dashboardData.companies[selectedCompany] || dashboardData.companies['HDFC Life'];

  const tabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News'
  ];

  const sidebarItems = [
    'Industry Metrics', 'Industry Aggregates', 'Economy', 
    'Report Generator', 'Screener', 'IRDAI Monthly Data', 'Products - Life'
  ];

  return (
    <div className="insurance-dashboard">
      {/* Dashboard Header - At the very top */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => {
              console.log('InsuranceDashboard hamburger clicked!');
              if (onMenuClick) {
                onMenuClick();
              } else {
                console.log('onMenuClick is not defined');
              }
            }}
            style={{
              background: 'rgba(63, 114, 175, 0.1)',
              border: '1px solid rgba(63, 114, 175, 0.3)',
              color: 'var(--main-color)',
              borderRadius: '6px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.2)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
          <h1 className="dashboard-title" style={{ margin: 0 }}>
          Insurance Dashboard
        </h1>
        </div>
        <p className="dashboard-subtitle">
          Comprehensive view of key performance indicators and market analysis
        </p>
      </div>

      {/* Top Navigation Bar */}
      <div className="top-navigation">
        {/* Navigation Tabs Only */}
        <div className="navigation-tabs-container">
          {/* Navigation Tabs */}
          <div className="navigation-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Multiple Dropdowns Section */}
        <div className="dropdowns-section">
          {/* Select Company */}
          <div className="dropdown-container">
            <label className="dropdown-label">
              Select Company
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="dropdown-select"
            >
              <option value="">Select a company...</option>
              <option value="HDFC Life">HDFC Life Insurance Company Limited</option>
              <option value="SBI Life">SBI Life Insurance Company Limited</option>
              <option value="ICICI Pru">ICICI Prudential Life Insurance Company Limited</option>
              <option value="LIC">Life Insurance Corporation of India</option>
            </select>
          </div>

          {/* Company Information */}
          <div className="dropdown-container">
            <label className="dropdown-label">
              Company Information
            </label>
            <select
              value={selectedInfoSection}
              onChange={(e) => setSelectedInfoSection(e.target.value)}
              className="dropdown-select"
            >
              <option value="">Select information type...</option>
              {sidebarItems.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Main Dashboard Content */}
        <div className="dashboard-content">
          {/* KPI Rows */}
          <div className="kpi-rows">
            <KPICard
              title="Premium Value"
              value={currentCompanyData.metrics.premiumValue.total}
              unit={currentCompanyData.metrics.premiumValue.unit}
              icon="💰"
              color="#28a745"
              monthlyData={currentCompanyData.metrics.premiumValue.monthlyData}
              companyData={companyDistributionData.premiumValue.companies}
              metricType="premium-value"
            />

            <KPICard
              title="Sum Assured"
              value={currentCompanyData.metrics.sumAssured.total}
              unit={currentCompanyData.metrics.sumAssured.unit}
              icon="🛡️"
              color="#17a2b8"
              monthlyData={currentCompanyData.metrics.sumAssured.monthlyData}
              companyData={companyDistributionData.sumAssured.companies}
              metricType="sum-assured"
            />

            <KPICard
              title="No of Lives"
              value={currentCompanyData.metrics.numberOfLives.total}
              unit={currentCompanyData.metrics.numberOfLives.unit}
              icon="👥"
              color="#ffc107"
              monthlyData={currentCompanyData.metrics.numberOfLives.monthlyData}
              companyData={companyDistributionData.numberOfLives.companies}
              metricType="number-of-lives"
            />

            <KPICard
              title="No of Policies"
              value={currentCompanyData.metrics.numberOfPolicies.total}
              unit={currentCompanyData.metrics.numberOfPolicies.unit}
              icon="📄"
              color="#BD0B50"
              monthlyData={currentCompanyData.metrics.numberOfPolicies.monthlyData}
              companyData={companyDistributionData.numberOfPolicies.companies}
              metricType="number-of-policies"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsuranceDashboard; 