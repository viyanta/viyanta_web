import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';

function AnnualData({ onMenuClick }) {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Handle tab clicks
  const handleTabClick = (tab) => {
    // Only allow clicks on active items
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      navigate('/dashboard');
    } else if (tab === 'Background') {
      navigate('/insurance-dashboard?tab=Background');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Metrics') {
      navigate('/metrics');
    } else if (tab === 'Analytics') {
      navigate('/analytics');
    } else if (tab === 'Annual Data') {
      return; // Stay on current page
    } else if (tab === 'Documents') {
      navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      navigate('/news');
    } else if (tab === 'Define Template') {
      console.log('Define Template clicked');
    } else if (tab === 'Save Template') {
      console.log('Save Template clicked');
    } else if (tab === 'Screener Inputs') {
      console.log('Screener Inputs clicked');
    } else if (tab === 'Screener Output Sheets') {
      console.log('Screener Output Sheets clicked');
    } else if (tab === 'Child Plans') {
      console.log('Child Plans clicked');
    } else if (tab === 'Investment Plans') {
      console.log('Investment Plans clicked');
    } else if (tab === 'Protection Plans') {
      console.log('Protection Plans clicked');
    } else if (tab === 'Term Plans') {
      console.log('Term Plans clicked');
    } else if (tab === 'New Launches') {
      console.log('New Launches clicked');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  // Sample data for demonstration
  const yearOptions = ['2023', '2022', '2021', '2020', '2019'];
  const companies = ['HDFC Life', 'ICICI Prudential', 'SBI Life', 'LIC', 'Bajaj Allianz'];

  return (
    <div className="annual-data-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Annual Data Header */}
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div style={{ 
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          {/* Annual Data Title */}
          <div style={{ 
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)', 
              marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
              flexWrap: 'wrap'
            }}>
              {/* Hamburger Menu Icon */}
              <button
                onClick={() => {
                  console.log('Annual Data hamburger clicked!');
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
              <h1 style={{
                margin: 0,
                fontSize: 'clamp(18px, 5vw, 28px)',
                lineHeight: '1.2',
                color: '#36659b',
                fontWeight: '700',
                wordBreak: 'break-word'
              }}>
                Annual Data
              </h1>
            </div>
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              lineHeight: '1.4'
            }}>
              Comprehensive annual financial data and analysis
            </p>
          </div>

          {/* Insurer Name Dropdown - Aligned with other dropdowns */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)'
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              minWidth: '200px'
            }}>
              <h3 style={{
                fontSize: '16px',
                marginBottom: '8px',
                color: '#6c757d',
                fontWeight: '600'
              }}>Insurer Name</h3>
              <select
                value={selectedCompany || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCompany(value);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #28a745',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1e7e34';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#28a745';
                }}
              >
                <option value="">Select Insurer</option>
                <option value="HDFC Life">HDFC Life</option>
                <option value="ICICI Prudential">ICICI Prudential</option>
                <option value="SBI Life">SBI Life</option>
                <option value="LIC">LIC</option>
                <option value="Bajaj Allianz">Bajaj Allianz</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="navigation-tabs" style={{
        display: 'flex',
        gap: tabs.length <= 3 ? 'clamp(15px, 3vw, 20px)' : 'clamp(8px, 2vw, 12px)',
        width: '100%',
        overflowX: 'auto',
        overflowY: 'visible',
        paddingBottom: '5px',
        justifyContent: tabs.length <= 3 ? 'center' : 'flex-start',
        padding: '0 clamp(10px, 3vw, 20px)',
        marginBottom: 'clamp(10px, 2vw, 15px)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'}`}
            style={{
              padding: tabs.length <= 3 ? 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 18px)' : 'clamp(6px, 2vw, 8px) clamp(10px, 2vw, 12px)',
              fontSize: tabs.length <= 3 ? 'clamp(13px, 2.5vw, 15px)' : 'clamp(12px, 2.5vw, 13px)',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isNavItemActive(tab) ? 'var(--main-color)' : 'transparent',
              color: isNavItemActive(tab) ? 'white' : '#666',
              fontWeight: isNavItemActive(tab) ? '600' : '400',
              cursor: isNavItemActive(tab) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: tabs.length <= 3 ? '36px' : '32px',
              opacity: isNavItemActive(tab) ? 1 : 0.5
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area with Sidebar */}
      <div style={{
        display: 'flex',
        gap: 'clamp(10px, 2vw, 15px)',
        padding: '0 clamp(10px, 3vw, 20px)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Left Sidebar - Company Information */}
        <div style={{
          flex: '0 0 clamp(200px, 25vw, 220px)',
          minWidth: '200px',
          maxWidth: '220px'
        }}>
          <CompanyInformationSidebar />
        </div>

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0,
          paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)'
        }}>
          {/* Main Content */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'clamp(8px, 2vw, 12px)',
            padding: 'clamp(15px, 4vw, 25px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginTop: 'clamp(10px, 2vw, 15px)'
          }}>

            {/* Selection Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'clamp(15px, 3vw, 20px)',
              marginBottom: 'clamp(20px, 4vw, 30px)'
            }}>
              {/* Company Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  fontWeight: '500',
                  color: '#495057',
                  marginBottom: 'clamp(6px, 1.5vw, 8px)'
                }}>
                  Select Company:
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'clamp(8px, 2vw, 12px)',
                    fontSize: 'clamp(13px, 2.5vw, 14px)',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#495057',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Choose a company...</option>
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  fontWeight: '500',
                  color: '#495057',
                  marginBottom: 'clamp(6px, 1.5vw, 8px)'
                }}>
                  Select Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'clamp(8px, 2vw, 12px)',
                    fontSize: 'clamp(13px, 2.5vw, 14px)',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#495057',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Choose a year...</option>
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Action Button */}
            <div style={{
              textAlign: 'center',
              marginBottom: 'clamp(20px, 4vw, 30px)'
            }}>
              <button
                onClick={() => {
                  if (selectedCompany && selectedYear) {
                    console.log('Generating annual data report for:', { selectedCompany, selectedYear });
                  } else {
                    alert('Please select company and year');
                  }
                }}
                style={{
                  backgroundColor: 'var(--main-color)',
                  color: 'white',
                  border: 'none',
                  padding: 'clamp(10px, 2.5vw, 15px) clamp(20px, 4vw, 30px)',
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  fontWeight: '500',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2c5282';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--main-color)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Generate Annual Data Report
              </button>
            </div>

            {/* Data Display Area */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: 'clamp(15px, 3vw, 20px)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{
                fontSize: 'clamp(16px, 3vw, 18px)',
                fontWeight: '600',
                color: '#2c3e50',
                margin: '0 0 clamp(10px, 2vw, 15px) 0'
              }}>
                Annual Data Summary
              </h3>
              
              {selectedCompany && selectedYear ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'clamp(10px, 2vw, 15px)'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: 'clamp(10px, 2vw, 15px)',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 'clamp(13px, 2.5vw, 14px)', color: '#495057' }}>Company</h4>
                    <p style={{ margin: '0', fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: '500', color: '#2c3e50' }}>{selectedCompany}</p>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: 'clamp(10px, 2vw, 15px)',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 'clamp(13px, 2.5vw, 14px)', color: '#495057' }}>Year</h4>
                    <p style={{ margin: '0', fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: '500', color: '#2c3e50' }}>{selectedYear}</p>
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  color: '#6c757d',
                  textAlign: 'center',
                  margin: '0',
                  fontStyle: 'italic'
                }}>
                  Please select company and year to view annual data summary
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnnualData;