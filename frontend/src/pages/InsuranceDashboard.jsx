import React, { useState, useEffect } from 'react';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useStats } from '../context/StatsContext.jsx';
import ApiService from '../services/api';
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
    <div className="monthly-chart" style={{ 
      minHeight: `${chartHeight}px`,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Y-axis and Chart Container */}
      <div className="chart-container" style={{ height: `${chartHeight - 30}px` }}>
        {/* Y-axis Labels */}
        <div className="y-axis-labels">
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
            const value = displayMaxValue - (i * (displayMaxValue / yAxisSteps));
            return (
              <div key={i} className="y-axis-label" style={{
                fontSize: 'clamp(10px, 2.5vw, 12px)'
              }}>
                {value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
              </div>
            );
          })}
        </div>
        
        {/* Chart Bars */}
        <div className="chart-bars" style={{
          minWidth: data.length > 6 ? `${data.length * 60}px` : '100%',
          display: 'flex',
          gap: 'clamp(4px, 1vw, 8px)',
          justifyContent: data.length > 6 ? 'flex-start' : 'space-around'
        }}>
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
            <div key={index} className="bar-container" style={{
              flex: data.length > 6 ? '0 0 50px' : '1',
              minWidth: data.length > 6 ? '50px' : 'auto'
            }}>
              <div 
                className={`bar ${metricType}`}
                style={{
                  height: `${getBarHeight(item.value)}px`,
                  width: '100%'
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis Labels Below Chart */}
      <div className="x-axis-labels" style={{
        minWidth: data.length > 6 ? `${data.length * 60}px` : '100%',
        display: 'flex',
        gap: 'clamp(4px, 1vw, 8px)',
        justifyContent: data.length > 6 ? 'flex-start' : 'space-around'
      }}>
        {data.map((item, index) => (
          <div key={index} className="x-axis-item" style={{
            flex: data.length > 6 ? '0 0 50px' : '1',
            minWidth: data.length > 6 ? '50px' : 'auto',
            textAlign: 'center'
          }}>
            <div className="month-label" style={{
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              whiteSpace: 'nowrap'
            }}>
              {item.month}
            </div>
            <div className="value-label" style={{
              fontSize: 'clamp(9px, 2vw, 11px)',
              whiteSpace: 'nowrap'
            }}>
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
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage); // Show all companies found
  const total = sortedData.reduce((sum, item) => sum + item.percentage, 0);
  
  return (
    <div className="company-distribution-chart" style={{
      overflowX: 'auto'
    }}>
      {/* Summary Header */}
      <div style={{
        fontSize: 'clamp(10px, 2.5vw, 12px)',
        color: '#666',
        marginBottom: '8px',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {sortedData.length} Companies Found
        {total > 0 && ` • Total: ${total.toFixed(1)}%`}
        {total === 0 && sortedData.length > 0 && ` • All companies found in PDF (0% = no market share data)`}
      </div>
      
      <div className="company-boxes" style={{
        minWidth: '300px', // Ensure minimum width for mobile
        maxHeight: '200px', // Limit height for many companies
        overflowY: 'auto' // Add scroll for many companies
      }}>
        {sortedData.map((item, index) => {
          const width = Math.max((item.percentage / total) * 100, 8); // Reduced minimum width for more companies
          
          return (
            <div
              key={item.name}
              className="company-box"
              style={{
                backgroundColor: item.color,
                minWidth: `${width}%`,
                flex: `1 1 ${width}%`,
                fontSize: 'clamp(8px, 2vw, 10px)' // Smaller font for more companies
              }}
              title={`${item.name}: ${item.percentage}%${item.note ? ` - ${item.note}` : ''}`}
            >
              <div className="company-name" style={{
                fontSize: 'clamp(8px, 2vw, 10px)'
              }}>
                {item.name}
              </div>
              <div className="company-percentage" style={{
                fontSize: 'clamp(7px, 1.8vw, 9px)'
              }}>
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
    <div className={`kpi-card ${metricType}`} style={{
      padding: 'clamp(15px, 4vw, 20px)',
      marginBottom: 'clamp(15px, 4vw, 20px)'
    }}>
      {/* KPI Row Layout - Responsive */}
      <div className="kpi-row-layout" style={{
        display: 'flex',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        gap: 'clamp(15px, 3vw, 20px)',
        alignItems: 'stretch'
      }}>
        {/* Left: Metric Info */}
        <div className="metric-info" style={{
          flex: window.innerWidth <= 768 ? 'none' : '0 0 200px',
          minWidth: window.innerWidth <= 768 ? '100%' : '200px'
        }}>
          <div className={`metric-icon ${metricType}`} style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            marginBottom: 'clamp(8px, 2vw, 12px)'
          }}>
            {icon}
          </div>
          <div className="metric-details">
            <h3 className="metric-title" style={{
              fontSize: 'clamp(16px, 4vw, 20px)',
              marginBottom: 'clamp(8px, 2vw, 12px)'
            }}>
              {title}
            </h3>
            <div className={`metric-value ${metricType}`} style={{
              fontSize: 'clamp(16px, 4vw, 22px)',
              marginBottom: 'clamp(4px, 1vw, 8px)'
            }}>
              {value.toLocaleString()}
            </div>
            <div className="metric-unit" style={{
              fontSize: 'clamp(12px, 3vw, 14px)'
            }}>
              {unit}
            </div>
          </div>
        </div>
        
        {/* Middle: Monthly Trend Chart */}
        <div className="chart-section" style={{
          flex: window.innerWidth <= 768 ? 'none' : '1',
          minHeight: window.innerWidth <= 768 ? '200px' : 'auto'
        }}>
          <MonthlyChart 
            data={monthlyData} 
            title="" 
            color={color}
            metricType={metricType}
          />
        </div>
        
        {/* Right: Company Distribution */}
        <div className="chart-section" style={{
          flex: window.innerWidth <= 768 ? 'none' : '1',
          minHeight: window.innerWidth <= 768 ? '150px' : 'auto'
        }}>
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
      <h3 className="treemap-title" style={{
        fontSize: 'clamp(16px, 4vw, 20px)',
        marginBottom: 'clamp(10px, 3vw, 15px)'
      }}>
        {title}
      </h3>
      <div className="treemap-container" style={{
        overflowX: 'auto',
        minWidth: '300px'
      }}>
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
              <div className="treemap-name" style={{
                fontSize: 'clamp(10px, 2.5vw, 12px)'
              }}>
                {item.name}
              </div>
              <div className="treemap-percentage" style={{
                fontSize: 'clamp(9px, 2vw, 11px)'
              }}>
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
  const [selectedCompany, setSelectedCompany] = useState('');
  const [s3Companies, setS3Companies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companiesError, setCompaniesError] = useState(null);
  
  // New state for company-specific data
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [companyDataError, setCompanyDataError] = useState(null);

  // Fetch companies from S3 when component mounts
  useEffect(() => {
    fetchS3Companies();
  }, []);

  // Fetch company data when selectedCompany changes
  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyData(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchS3Companies = async () => {
    try {
      setLoadingCompanies(true);
      setCompaniesError(null);
      const response = await ApiService.getS3Companies();
      
      if (response.success) {
        setS3Companies(response.companies);
        // Set first company as default if available
        if (response.companies.length > 0 && !selectedCompany) {
          setSelectedCompany(response.companies[0].name);
        }
      } else {
        setCompaniesError(response.error || 'Failed to fetch companies');
      }
    } catch (error) {
      setCompaniesError(`Error: ${error.message}`);
      console.error('Failed to fetch S3 companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchCompanyData = async (companyName) => {
    try {
      setLoadingCompanyData(true);
      setCompanyDataError(null);
      const response = await ApiService.getCompanyData(companyName);
      
      if (response.success) {
        setCompanyData(response.data);
      } else {
        setCompanyDataError(response.error || 'Failed to fetch company data');
        setCompanyData(null);
      }
    } catch (error) {
      setCompanyDataError(`Error: ${error.message}`);
      console.error('Failed to fetch company data:', error);
      setCompanyData(null);
    } finally {
      setLoadingCompanyData(false);
    }
  };

  // Get the current company's data - now from dynamic API instead of static JSON
  const currentCompanyData = companyData || {
    company_name: selectedCompany || 'Select Company',
    metrics: {
      premiumValue: { total: 0, unit: 'Crs', monthlyData: [] },
      sumAssured: { total: 0, unit: 'Crs', monthlyData: [] },
      numberOfLives: { total: 0, unit: 'Lives', monthlyData: [] },
      numberOfPolicies: { total: 0, unit: 'Policies', monthlyData: [] }
    },
    companyDistribution: {
      premiumValue: [],
      sumAssured: [],
      numberOfLives: [],
      numberOfPolicies: []
    }
  };

  const tabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News'
  ];

  return (
    <div className="insurance-dashboard" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Dashboard Header - At the very top */}
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(0.5rem, 2vw, 1rem)', 
          marginBottom: 'clamp(0.3rem, 2vw, 0.5rem)',
          flexWrap: 'wrap'
        }}>
          {/* Hamburger Menu Icon */}
          <button
            className="hide-hamburger-desktop"
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
              padding: 'clamp(0.4rem, 2vw, 0.5rem)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(0.9rem, 3vw, 1rem)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: 'clamp(32px, 8vw, 36px)',
              minHeight: 'clamp(32px, 8vw, 36px)'
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
          <h1 className="dashboard-title" style={{ 
            margin: 0,
            fontSize: 'clamp(18px, 5vw, 28px)',
            lineHeight: '1.2'
          }}>
            Insurance Dashboard
          </h1>
        </div>
        <p className="dashboard-subtitle" style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          margin: 0
        }}>
          Comprehensive view of key performance indicators and market analysis
        </p>
      </div>

      {/* Main Layout with Sidebar and Content */}
      <div style={{ 
        display: 'flex', 
        gap: 'clamp(1rem, 3vw, 2rem)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Company Information Sidebar - Left side */}
        <CompanyInformationSidebar />

        {/* Right Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Top Navigation Bar */}
          <div className="top-navigation" style={{
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)'
          }}>
            {/* Navigation Tabs Only */}
            <div className="navigation-tabs-container" style={{
              marginBottom: 'clamp(15px, 3vw, 20px)'
            }}>
              {/* Navigation Tabs */}
              <div className="navigation-tabs" style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(3, 1fr)' : 'repeat(9, auto)',
                gap: 'clamp(8px, 2vw, 12px)',
                width: '100%',
                overflow: 'visible'
              }}>
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                    style={{
                      padding: 'clamp(8px, 2vw, 12px)',
                      fontSize: 'clamp(11px, 2.5vw, 13px)',
                      whiteSpace: 'nowrap',
                      width: window.innerWidth <= 768 ? '100%' : 'auto',
                      textAlign: 'center',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: activeTab === tab ? 'var(--main-color)' : '#666',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: activeTab === tab ? '600' : '400',
                      wordWrap: 'break-word',
                      minHeight: window.innerWidth <= 768 ? 'clamp(32px, 8vw, 40px)' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiple Dropdowns Section */}
            <div className="dropdowns-section" style={{
              display: 'flex',
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
              gap: 'clamp(10px, 3vw, 15px)'
            }}>
              {/* Select Company */}
              <div className="dropdown-container" style={{
                minWidth: window.innerWidth <= 768 ? '100%' : '250px'
              }}>
                <label className="dropdown-label" style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  marginBottom: 'clamp(5px, 1.5vw, 8px)',
                  display: 'block'
                }}>
                  Select Company
                </label>
                
                {/* Company Dropdown and Refresh Button Row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-end'
                }}>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="dropdown-select"
                    style={{
                      flex: 1,
                      padding: 'clamp(10px, 2.5vw, 12px)',
                      fontSize: 'clamp(14px, 3vw, 16px)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    disabled={loadingCompanies}
                  >
                    <option value="">
                      {loadingCompanies ? 'Loading companies...' : 'Select a company...'}
                    </option>
                    {s3Companies.map(company => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Refresh Button */}
                  <button
                    onClick={fetchS3Companies}
                    disabled={loadingCompanies}
                    style={{
                      padding: 'clamp(10px, 2.5vw, 12px)',
                      fontSize: 'clamp(14px, 3vw, 16px)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: '#f8f9fa',
                      cursor: loadingCompanies ? 'not-allowed' : 'pointer',
                      color: loadingCompanies ? '#6c757d' : '#495057',
                      minWidth: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Refresh companies from S3"
                  >
                    🔄
                  </button>
                </div>
                
                {/* Error message */}
                {companiesError && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#dc3545',
                    margin: '5px 0 0 0'
                  }}>
                    {companiesError}
                  </p>
                )}
                
                {/* Success message */}
                {!loadingCompanies && !companiesError && s3Companies.length > 0 && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#28a745',
                    margin: '5px 0 0 0'
                  }}>
                    Found {s3Companies.length} companies in S3
                  </p>
                )}
                
                {/* Company Data Loading Indicator */}
                {selectedCompany && loadingCompanyData && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#17a2b8',
                    margin: '5px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>🔄</span> Loading data for {selectedCompany}...
                  </p>
                )}
                
                {/* Company Data Success Message */}
                {selectedCompany && !loadingCompanyData && companyData && !companyDataError && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#28a745',
                    margin: '5px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>✅</span> Data loaded successfully
                  </p>
                )}
                
                {/* Company Data Error Message */}
                {selectedCompany && !loadingCompanyData && companyDataError && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#dc3545',
                    margin: '5px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>⚠️</span> Failed to load data
                  </p>
                )}
                
                {/* No companies message */}
                {!loadingCompanies && !companiesError && s3Companies.length === 0 && (
                  <p style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: '#ffc107',
                    margin: '5px 0 0 0'
                  }}>
                    No companies found in S3. Upload some files first.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* KPI Rows */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'clamp(1rem, 3vw, 2rem)'
          }}>
            {/* Company Data Loading/Error States */}
            {loadingCompanyData && (
              <div style={{
                textAlign: 'center',
                padding: 'clamp(20px, 5vw, 40px)',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '10px' }}>
                  🔄 Loading data for {selectedCompany}...
                </div>
                <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#6c757d' }}>
                  Fetching Premium Value, Sum Assured, and other metrics...
                </div>
              </div>
            )}

            {companyDataError && (
              <div style={{
                textAlign: 'center',
                padding: 'clamp(20px, 5vw, 40px)',
                backgroundColor: '#f8d7da',
                borderRadius: '8px',
                border: '1px solid #f5c6cb',
                color: '#721c24'
              }}>
                <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '10px' }}>
                  ⚠️ Error Loading Company Data
                </div>
                <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', marginBottom: '15px' }}>
                  {companyDataError}
                </div>
                <button
                  onClick={() => fetchCompanyData(selectedCompany)}
                  style={{
                    padding: 'clamp(8px, 2vw, 12px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* KPI Cards - Only show when data is loaded */}
            {!loadingCompanyData && !companyDataError && companyData && (
              <>
                <KPICard
                  title="Premium Value"
                  value={currentCompanyData.metrics.premiumValue.total}
                  unit={currentCompanyData.metrics.premiumValue.unit}
                  icon="💰"
                  color="#28a745"
                  monthlyData={currentCompanyData.metrics.premiumValue.monthlyData}
                  companyData={currentCompanyData.companyDistribution.premiumValue}
                  metricType="premium-value"
                />

                <KPICard
                  title="Sum Assured"
                  value={currentCompanyData.metrics.sumAssured.total}
                  unit={currentCompanyData.metrics.sumAssured.unit}
                  icon="🛡️"
                  color="#17a2b8"
                  monthlyData={currentCompanyData.metrics.sumAssured.monthlyData}
                  companyData={currentCompanyData.companyDistribution.sumAssured}
                  metricType="sum-assured"
                />

                <KPICard
                  title="No of Lives"
                  value={currentCompanyData.metrics.numberOfLives.total}
                  unit={currentCompanyData.metrics.numberOfLives.unit}
                  icon="👥"
                  color="#ffc107"
                  monthlyData={currentCompanyData.metrics.numberOfLives.monthlyData}
                  companyData={currentCompanyData.companyDistribution.numberOfLives}
                  metricType="number-of-lives"
                />

                <KPICard
                  title="No of Policies"
                  value={currentCompanyData.metrics.numberOfPolicies.total}
                  unit={currentCompanyData.metrics.numberOfPolicies.unit}
                  icon="📄"
                  color="#BD0B50"
                  monthlyData={currentCompanyData.metrics.numberOfPolicies.monthlyData}
                  companyData={currentCompanyData.companyDistribution.numberOfPolicies}
                  metricType="number-of-policies"
                />
              </>
            )}

            {/* No Company Selected State */}
            {!selectedCompany && !loadingCompanies && (
              <div style={{
                textAlign: 'center',
                padding: 'clamp(40px, 8vw, 80px)',
                backgroundColor: '#e9ecef',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', marginBottom: '15px', color: '#6c757d' }}>
                  📊 Select a Company
                </div>
                <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6c757d' }}>
                  Choose a company from the dropdown above to view their metrics and data
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsuranceDashboard; 