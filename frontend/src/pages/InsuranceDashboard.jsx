import React, { useState, useEffect } from 'react';
import { useStats } from '../context/StatsContext.jsx';
import dashboardData from '../data/dashboardData.json';
import companyDistributionData from '../data/companyDistribution.json';


// Chart Component for Monthly Trends
const MonthlyChart = ({ data, title, color }) => {
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
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '6px', 
      padding: '0.5rem',
      border: '1px solid #e9ecef',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      minHeight: `${chartHeight}px`,
      transition: 'all 0.2s ease',
      overflow: 'hidden'
    }}>
      {/* Y-axis and Chart Container */}
      <div style={{ 
        display: 'flex', 
        height: `${chartHeight - 30}px`,
        position: 'relative'
      }}>
        {/* Y-axis Labels */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '40px',
          paddingRight: '0.25rem',
          fontSize: '0.55rem',
          color: '#666',
          fontWeight: '500'
        }}>
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
            const value = displayMaxValue - (i * (displayMaxValue / yAxisSteps));
            return (
              <div key={i} style={{ textAlign: 'right' }}>
                {value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
              </div>
            );
          })}
        </div>
        
        {/* Chart Bars */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'end', 
          gap: '0.1rem',
          paddingLeft: '0.1rem',
          paddingRight: '0.1rem',
          position: 'relative',
          justifyContent: 'space-between'
        }}>
          {/* Y-axis Grid Lines */}
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(i / yAxisSteps) * 100}%`,
                height: '1px',
                backgroundColor: '#e9ecef',
                zIndex: 1
              }}
            />
          ))}
          
          {data.map((item, index) => (
            <div key={index} style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
              maxWidth: '50px'
            }}>
              <div style={{
                width: '70%',
                height: `${getBarHeight(item.value)}px`,
                backgroundColor: color,
                borderRadius: '3px 3px 0 0',
                minHeight: '4px',
                transition: 'all 0.2s ease'
              }} />
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis Labels Below Chart */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        paddingLeft: '40px',
        paddingRight: '0.25rem'
      }}>
        {data.map((item, index) => (
          <div key={index} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            maxWidth: '50px'
          }}>
            <div style={{ 
              fontSize: '0.6rem', 
              color: '#666',
              textAlign: 'center'
            }}>
              {item.month}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              color: '#333'
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
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage).slice(0, 10); // Reduced to 10 items
  const total = sortedData.reduce((sum, item) => sum + item.percentage, 0);
  
  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '6px', 
      padding: '0.5rem',
      border: '1px solid #e9ecef',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        minHeight: '100px',
        padding: '0.2rem'
      }}>
        {sortedData.map((item, index) => {
          const width = Math.max((item.percentage / total) * 100, 12); // Minimum 12% width
          
          return (
            <div
              key={item.name}
              style={{
                backgroundColor: item.color,
                padding: '0.5rem 0.3rem',
                borderRadius: '4px',
                minWidth: `${width}%`,
                flex: `1 1 ${width}%`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: '600',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '30px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
              title={`${item.name}: ${item.percentage}%`}
            >
              <div style={{
                fontWeight: 'bold',
                fontSize: '0.6rem',
                marginBottom: '0.2rem',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '100%',
                lineHeight: '1.1'
              }}>
                {item.name}
              </div>
              <div style={{
                fontSize: '0.55rem',
                opacity: 0.95,
                fontWeight: '500'
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
const KPICard = ({ title, value, unit, icon, color, monthlyData, companyData }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      border: `2px solid ${color}20`,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      position: 'relative',
      transform: 'translateZ(0)'
    }}>
      {/* KPI Row Layout - Responsive */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        alignItems: 'stretch',
        padding: '0.5rem 0',
        position: 'relative'
      }}>
        {/* Left: Metric Info */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          padding: '0.5rem',
          flexWrap: 'wrap',
          minHeight: '80px',
          position: 'relative'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            backgroundColor: color,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            color: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            flexShrink: 0
          }}>
            {icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.3rem', 
              color: '#36659b', 
              fontWeight: '600',
              marginBottom: '0.4rem',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: color,
              marginBottom: '0.2rem',
              lineHeight: '1',
              wordBreak: 'break-word'
            }}>
              {value.toLocaleString()}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#666',
              fontWeight: '500'
            }}>
              {unit}
            </div>
          </div>
        </div>
        
        {/* Middle: Monthly Trend Chart */}
        <div style={{ 
          height: '100%',
          padding: '0.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minHeight: '180px',
          position: 'relative'
        }}>
          <MonthlyChart 
            data={monthlyData} 
            title="" 
            color={color}
          />
        </div>
        
        {/* Right: Company Distribution */}
        <div style={{ 
          height: '100%',
          padding: '0.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minHeight: '180px',
          position: 'relative'
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
    <div style={{
      marginBottom: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{
        margin: '0 0 1rem 0',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#36659b'
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        minHeight: '120px'
      }}>
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          const width = Math.max((item.value / total) * 100, 8); // Minimum 8% width
          
          return (
            <div
              key={item.name}
              style={{
                backgroundColor: colors[index % colors.length],
                padding: '0.5rem',
                borderRadius: '4px',
                minWidth: `${width}%`,
                flex: `1 1 ${width}%`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '500',
                position: 'relative',
                overflow: 'hidden'
              }}
              title={`${item.name}: ${percentage}%`}
            >
              <div style={{
                fontWeight: 'bold',
                fontSize: '0.7rem',
                marginBottom: '0.25rem',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {item.name}
              </div>
              <div style={{
                fontSize: '0.65rem',
                opacity: 0.9
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

function InsuranceDashboard() {
  const [selectedCompany, setSelectedCompany] = useState('HDFC Life');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedInfoSection, setSelectedInfoSection] = useState('Industry Metrics');
  
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
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '0',
      marginTop: '0',
      top: '0',
      left: '0',
      right: '0'
    }}>
      {/* Dashboard Header - At the very top */}
      <div style={{ 
        padding: '1.5rem 1.5rem 1rem 1.5rem',
        backgroundColor: 'white'
      }}>
        <h1 style={{ 
          margin: '0 0 0.5rem 0', 
          color: '#36659b',
          fontSize: '2rem',
          fontWeight: '700',
          wordBreak: 'break-word'
        }}>
          Insurance Dashboard
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#666',
          fontSize: '1rem',
          lineHeight: '1.4'
        }}>
          Comprehensive view of key performance indicators and market analysis
        </p>
      </div>

      {/* Top Navigation Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '0 1rem',
        position: 'sticky',
        top: '0',
        zIndex: 999,
        transform: 'translateZ(0)',
        marginTop: '0',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Navigation Tabs Only */}
        <div style={{
          display: 'flex',
          gap: '0',
          alignItems: 'center',
          padding: '0 1.5rem'
        }}>
          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '0',
            flex: 1,
            padding: '0.5rem 0'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  backgroundColor: activeTab === tab ? '#36659b' : 'transparent',
                  color: activeTab === tab ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: activeTab === tab ? '600' : '500',
                  borderBottom: 'none',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderRadius: '6px 6px 0 0',
                  marginRight: '0.25rem'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Multiple Dropdowns Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'white',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          {/* Select Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600', 
              color: '#36659b',
              whiteSpace: 'nowrap'
            }}>
              Select Company
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '0.75rem',
                minWidth: '180px',
                cursor: 'pointer'
              }}
            >
              <option value="">Select a company...</option>
              <option value="HDFC Life">HDFC Life Insurance Company Limited</option>
              <option value="SBI Life">SBI Life Insurance Company Limited</option>
              <option value="ICICI Pru">ICICI Prudential Life Insurance Company Limited</option>
              <option value="LIC">Life Insurance Corporation of India</option>
            </select>
          </div>

          {/* Company Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600', 
              color: '#36659b',
              whiteSpace: 'nowrap'
            }}>
              Company Information
            </label>
            <select
              value={selectedInfoSection}
              onChange={(e) => setSelectedInfoSection(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '0.75rem',
                minWidth: '180px',
                cursor: 'pointer'
              }}
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
      <div style={{ 
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        zIndex: 1,
        marginTop: '0',
        paddingTop: '0'
      }}>
        {/* Main Dashboard Content */}
        <div style={{ 
          flex: 1, 
          padding: '1rem',
          backgroundColor: 'white',
          position: 'relative'
        }}>

          {/* KPI Rows */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <KPICard
              title="Premium Value"
              value={currentCompanyData.metrics.premiumValue.total}
              unit={currentCompanyData.metrics.premiumValue.unit}
              icon="💰"
              color="#28a745"
              monthlyData={currentCompanyData.metrics.premiumValue.monthlyData}
              companyData={companyDistributionData.premiumValue.companies}
            />

            <KPICard
              title="Sum Assured"
              value={currentCompanyData.metrics.sumAssured.total}
              unit={currentCompanyData.metrics.sumAssured.unit}
              icon="🛡️"
              color="#17a2b8"
              monthlyData={currentCompanyData.metrics.sumAssured.monthlyData}
              companyData={companyDistributionData.sumAssured.companies}
            />

            <KPICard
              title="No of Lives"
              value={currentCompanyData.metrics.numberOfLives.total}
              unit={currentCompanyData.metrics.numberOfLives.unit}
              icon="👥"
              color="#ffc107"
              monthlyData={currentCompanyData.metrics.numberOfLives.monthlyData}
              companyData={companyDistributionData.numberOfLives.companies}
            />

            <KPICard
              title="No of Policies"
              value={currentCompanyData.metrics.numberOfPolicies.total}
              unit={currentCompanyData.metrics.numberOfPolicies.unit}
              icon="📄"
              color="#BD0B50"
              monthlyData={currentCompanyData.metrics.numberOfPolicies.monthlyData}
              companyData={companyDistributionData.numberOfPolicies.companies}
            />
          </div>

        


        </div>
      </div>
    </div>
  );
}

export default InsuranceDashboard; 