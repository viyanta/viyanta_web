import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import BackgroundPage from './BackgroundPage';
// import { useStats } from '../context/StatsContext.jsx';
import { useNavigation } from '../context/NavigationContext';
import ApiService from '../services/api';
import './InsuranceDashboard.css';
import StandardPageLayout from '../components/StandardPageLayout';

// Chart Component for Monthly Trends
const MonthlyChart = ({ data, title, color, metricType }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const yAxisSteps = 5;

  // Use the actual max value for precise scaling
  const actualMaxValue = Math.max(...data.map(d => d.value));
  const displayMaxValue = actualMaxValue; // Use exact max value for perfect scaling

  // Calculate dynamic height based on the highest bar
  const maxBarHeight = Math.max(...data.map(d => (d.value / displayMaxValue) * 100));
  const chartHeight = window.innerWidth <= 768 ? 150 : Math.max(100, maxBarHeight + 50); // Reduced height on mobile

  // Ensure bars are properly scaled to match the Y-axis
  const getBarHeight = (value) => {
    return Math.max(4, (value / displayMaxValue) * (chartHeight - 30));
  };

  return (
    <div className="monthly-chart" style={{
      minHeight: `${chartHeight}px`,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: window.innerWidth <= 768 ? '0.5rem' : '0'
    }}>
      {/* Y-axis and Chart Container */}
      <div className="chart-container" style={{ height: `${chartHeight - 30}px` }}>
        {/* Y-axis Labels */}
        <div className="y-axis-labels">
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
            const value = displayMaxValue - (i * (displayMaxValue / yAxisSteps));
            return (
              <div key={i} className="y-axis-label" style={{
                fontSize: window.innerWidth <= 768 ? 'clamp(9px, 2.5vw, 11px)' : 'clamp(10px, 2.5vw, 12px)'
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
          gap: window.innerWidth <= 768 ? 'clamp(3px, 1vw, 6px)' : 'clamp(4px, 1vw, 8px)',
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
        gap: window.innerWidth <= 768 ? 'clamp(3px, 1vw, 6px)' : 'clamp(4px, 1vw, 8px)',
        justifyContent: data.length > 6 ? 'flex-start' : 'space-around'
      }}>
        {data.map((item, index) => (
          <div key={index} className="x-axis-item" style={{
            flex: data.length > 6 ? '0 0 50px' : '1',
            minWidth: data.length > 6 ? '50px' : 'auto',
            textAlign: 'center'
          }}>
            <div className="month-label" style={{
              fontSize: window.innerWidth <= 768 ? 'clamp(9px, 2.5vw, 11px)' : 'clamp(10px, 2.5vw, 12px)',
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
      overflowX: 'auto',
      padding: window.innerWidth <= 768 ? '0.5rem' : '0'
    }}>
      {/* Summary Header */}
      <div style={{
        fontSize: window.innerWidth <= 768 ? 'clamp(9px, 2.5vw, 11px)' : 'clamp(10px, 2.5vw, 12px)',
        color: '#666',
        marginBottom: window.innerWidth <= 768 ? '6px' : '8px',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {sortedData.length} Companies Found
        {total > 0 && ` • Total: ${total.toFixed(1)}%`}
        {total === 0 && sortedData.length > 0 && ` • All companies found in PDF (0% = no market share data)`}
      </div>

      <div className="company-boxes" style={{
        minWidth: window.innerWidth <= 768 ? '250px' : '300px', // Smaller minimum width on mobile
        maxHeight: window.innerWidth <= 768 ? '150px' : '200px', // Reduced height on mobile
        overflowY: 'auto', // Add scroll for many companies
        gap: window.innerWidth <= 768 ? '2px' : '4px' // Smaller gap on mobile
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
                fontSize: window.innerWidth <= 768 ? 'clamp(7px, 2vw, 9px)' : 'clamp(8px, 2vw, 10px)', // Smaller font on mobile
                padding: window.innerWidth <= 768 ? '2px 4px' : '4px 6px' // Smaller padding on mobile
              }}
              title={`${item.name}: ${item.percentage}%${item.note ? ` - ${item.note}` : ''}`}
            >
              <div className="company-name" style={{
                fontSize: window.innerWidth <= 768 ? 'clamp(7px, 2vw, 9px)' : 'clamp(8px, 2vw, 10px)',
                lineHeight: window.innerWidth <= 768 ? '1.2' : '1.3'
              }}>
                {item.name}
              </div>
              <div className="company-percentage" style={{
                fontSize: window.innerWidth <= 768 ? 'clamp(6px, 1.8vw, 8px)' : 'clamp(7px, 1.8vw, 9px)',
                lineHeight: window.innerWidth <= 768 ? '1.1' : '1.2'
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
      marginBottom: 'clamp(15px, 4vw, 20px)',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
          minWidth: window.innerWidth <= 768 ? '100%' : '200px',
          textAlign: window.innerWidth <= 768 ? 'center' : 'left'
        }}>
          <div className={`metric-icon ${metricType}`} style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            marginBottom: 'clamp(8px, 2vw, 12px)',
            display: 'flex',
            justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-start'
          }}>
            {icon}
          </div>
          <div className="metric-details">
            <h3 className="metric-title" style={{
              fontSize: 'clamp(16px, 4vw, 20px)',
              marginBottom: 'clamp(8px, 2vw, 12px)',
              color: '#333',
              fontWeight: '600'
            }}>
              {title}
            </h3>
            <div className={`metric-value ${metricType}`} style={{
              fontSize: 'clamp(18px, 5vw, 24px)',
              marginBottom: 'clamp(4px, 1vw, 8px)',
              color: color,
              fontWeight: '700'
            }}>
              {value.toLocaleString()}
            </div>
            <div className="metric-unit" style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#666'
            }}>
              {unit}
            </div>
          </div>
        </div>

        {/* Middle: Monthly Trend Chart */}
        <div className="chart-section" style={{
          flex: window.innerWidth <= 768 ? 'none' : '1',
          minHeight: window.innerWidth <= 768 ? '180px' : 'auto',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          <h4 style={{
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            marginBottom: 'clamp(8px, 2vw, 12px)',
            color: '#333',
            textAlign: window.innerWidth <= 768 ? 'center' : 'left'
          }}>
            Monthly Trend
          </h4>
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
          minHeight: window.innerWidth <= 768 ? '150px' : 'auto',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          <h4 style={{
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            marginBottom: 'clamp(8px, 2vw, 12px)',
            color: '#333',
            textAlign: window.innerWidth <= 768 ? 'center' : 'left'
          }}>
            Company Distribution
          </h4>
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
  const { isNavItemActive, selectedSidebarItem } = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [s3Companies, setS3Companies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companiesError, setCompaniesError] = useState(null);

  // New state for company-specific data
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [companyDataError, setCompanyDataError] = useState(null);

  // Handle tab clicks
  const handleTabClick = (tab) => {
    // Only allow clicks on active items
    if (!isNavItemActive(tab)) {
      return;
    }

    if (tab === 'Dashboard') {
      navigate('/dashboard');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Dashboard') {
      // Check if Economy is selected in sidebar
      const selectedSidebar = selectedSidebarItem;
      if (selectedSidebar === 1007) { // Economy
        navigate('/economy-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else if (tab === 'Domestic') {
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      navigate('/economy-international');
    } else {
      setActiveTab(tab);
    }
  };

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

  // Handle URL parameter for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['Dashboard', 'Background', 'L Forms', 'Metrics', 'Analytics', 'Annual Data', 'Documents', 'Peers', 'News', 'Domestic', 'International'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics',
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  return (
    <StandardPageLayout
      title="Insurance Dashboard"
      onMenuClick={() => {
        if (onMenuClick) {
          onMenuClick();
        }
      }}
      sidebar={<CompanyInformationSidebar />}
    >
      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        <span
          className="breadcrumb-link"
          onClick={() => {
            setActiveTab('Dashboard');
            navigate('/dashboard');
          }}
          style={{
            color: '#36659b',
            cursor: 'pointer',
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
          Insurance Dashboard
        </span>
        <span className="breadcrumb-separator" style={{ color: '#999', margin: '0 8px' }}>{'>>'}</span>
        <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>{activeTab}</span>
      </div>

      {/* Show Background Page when Background tab is active */}
      {activeTab === 'Background' ? (
        <BackgroundPage
          selectedInsurer={selectedCompany}
          onTabChange={setActiveTab}
          onInsurerChange={(insurer) => {
            setSelectedCompany(insurer);
            // You can also update the navbar selection if needed
          }}
        />
      ) : (
        <div className="dashboard-content-placeholder" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          {/* Content removed as per user request */}
          Select an item from the sidebar to view details.
        </div>
      )}


    </StandardPageLayout >
  );
}

export default InsuranceDashboard; 