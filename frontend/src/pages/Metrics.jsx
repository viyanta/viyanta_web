import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';

function Metrics({ onMenuClick }) {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [activeView, setActiveView] = useState('Visuals'); // 'Visuals' or 'Data'

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches',
    'Domestic', 'International', 'Domestic Metrics', 'International Metrics',
    'Irdai Monthly Data'
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
      return; // Stay on current page
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
    } else if (tab === 'Define Template') {
      navigate('/template');
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
    } else if (tab === 'Domestic') {
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      navigate('/economy-international');
    } else if (tab === 'Domestic Metrics') {
      navigate('/industry-metrics-domestic');
    } else if (tab === 'International Metrics') {
      navigate('/industry-metrics-international');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  // Sample data for demonstration
  const metricOptions = ['Revenue Growth', 'Profit Margin', 'Market Share', 'Customer Acquisition Cost', 'Return on Investment', 'Premium Growth', 'Claims Ratio', 'Expense Ratio'];
  const companies = ['HDFC Life', 'ICICI Prudential', 'SBI Life', 'LIC', 'Bajaj Allianz'];

  return (
    <div className="metrics-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Metrics Header */}
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div style={{ 
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          {/* Metrics Title */}
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
                  console.log('Metrics hamburger clicked!');
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
                Metrics
              </h1>
            </div>
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              lineHeight: '1.4'
            }}>
              Comprehensive performance metrics and KPIs analysis
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
              minWidth: window.innerWidth <= 768 ? '100%' : '200px',
              width: window.innerWidth <= 768 ? '100%' : 'auto'
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
                  padding: 'clamp(8px, 2vw, 12px)',
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  border: '2px solid #28a745',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  minHeight: window.innerWidth <= 768 ? '44px' : 'auto'
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

      {/* Toggle Switch */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 'clamp(15px, 3vw, 20px)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div style={{
          background: '#f1f5f9',
          borderRadius: '6px',
          padding: '2px'
        }}>
          <button
            className={`toggle-btn ${activeView === 'Visuals' ? 'active' : ''}`}
            onClick={() => setActiveView('Visuals')}
            style={{
              padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)',
              border: 'none',
              background: activeView === 'Visuals' ? 'white' : 'transparent',
              color: activeView === 'Visuals' ? '#1e40af' : '#64748b',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: 'clamp(12px, 2vw, 13px)',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'Visuals' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Visuals
          </button>
          <button
            className={`toggle-btn ${activeView === 'Data' ? 'active' : ''}`}
            onClick={() => setActiveView('Data')}
            style={{
              padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)',
              border: 'none',
              background: activeView === 'Data' ? 'white' : 'transparent',
              color: activeView === 'Data' ? '#1e40af' : '#64748b',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: 'clamp(12px, 2vw, 13px)',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'Data' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Data
          </button>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div style={{
        display: 'flex',
        gap: window.innerWidth <= 768 ? 'clamp(10px, 2vw, 15px)' : 'clamp(15px, 3vw, 20px)',
        padding: '0 clamp(10px, 3vw, 20px)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        alignItems: window.innerWidth <= 768 ? 'stretch' : 'flex-start'
      }}>
        {/* Left Sidebar - Company Information */}
        <div style={{
          flex: window.innerWidth <= 768 ? 'none' : '0 0 clamp(200px, 25vw, 220px)',
          minWidth: window.innerWidth <= 768 ? 'auto' : '200px',
          maxWidth: window.innerWidth <= 768 ? '100%' : '220px',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          <CompanyInformationSidebar />
        </div>

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0,
          paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
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
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'clamp(15px, 3vw, 20px)',
              marginBottom: 'clamp(20px, 4vw, 30px)'
            }}>
              {/* Metric Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  fontWeight: '500',
                  color: '#495057',
                  marginBottom: 'clamp(6px, 1.5vw, 8px)'
                }}>
                  Select Metric:
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
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
                  <option value="">Choose a metric...</option>
                  {metricOptions.map(metric => (
                    <option key={metric} value={metric}>{metric}</option>
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
                  if (selectedCompany && selectedMetric) {
                    console.log('Generating metrics report for:', { selectedCompany, selectedMetric, activeView });
                  } else {
                    alert('Please select company and metric');
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
                Generate Metrics Report
              </button>
            </div>

            {/* Metrics Display Area */}
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
                {activeView === 'Visuals' ? '📊 Visual Metrics' : '📋 Data Metrics'}
              </h3>
              
              {selectedCompany && selectedMetric ? (
                <div>
                  {/* Selection Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'clamp(10px, 2vw, 15px)',
                    marginBottom: 'clamp(20px, 3vw, 25px)'
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
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 'clamp(13px, 2.5vw, 14px)', color: '#495057' }}>Metric</h4>
                      <p style={{ margin: '0', fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: '500', color: '#2c3e50' }}>{selectedMetric}</p>
                    </div>
                    <div style={{
                      backgroundColor: 'white',
                      padding: 'clamp(10px, 2vw, 15px)',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 'clamp(13px, 2.5vw, 14px)', color: '#495057' }}>View Mode</h4>
                      <p style={{ margin: '0', fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: '500', color: '#2c3e50' }}>{activeView === 'Visuals' ? '📊 Visuals' : '📋 Data'}</p>
                    </div>
                  </div>

                  {/* Content based on view mode */}
                  {activeView === 'Visuals' ? (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: 'clamp(20px, 4vw, 30px)',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{
                        fontSize: 'clamp(16px, 3vw, 18px)',
                        fontWeight: '600',
                        color: '#2c3e50',
                        margin: '0 0 clamp(15px, 3vw, 20px) 0',
                        textAlign: 'center'
                      }}>
                        📊 {selectedMetric} Chart - {selectedCompany}
                      </h4>
                      
                      {/* Chart Container */}
                      <div style={{
                        width: '100%',
                        height: 'clamp(250px, 40vw, 350px)',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: 'clamp(15px, 3vw, 20px)',
                        border: '1px solid #e9ecef',
                        marginBottom: 'clamp(15px, 3vw, 20px)',
                        position: 'relative'
                      }}>
                        {/* Chart Title */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: 'clamp(10px, 2vw, 15px)',
                          fontSize: 'clamp(14px, 2.5vw, 16px)',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          Quarterly Performance Trend
                        </div>
                        
                        {/* Chart Area */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'end',
                          justifyContent: 'space-around',
                          height: 'clamp(180px, 30vw, 250px)',
                          padding: 'clamp(10px, 2vw, 15px)',
                          position: 'relative',
                          overflowX: window.innerWidth <= 768 ? 'auto' : 'visible'
                        }}>
                          {/* Y-axis labels */}
                          <div style={{
                            position: 'absolute',
                            left: '0',
                            top: '0',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            fontSize: 'clamp(10px, 1.5vw, 12px)',
                            color: '#6c757d',
                            paddingRight: 'clamp(5px, 1vw, 8px)'
                          }}>
                            <span>₹3,500 Cr</span>
                            <span>₹3,000 Cr</span>
                            <span>₹2,500 Cr</span>
                            <span>₹2,000 Cr</span>
                            <span>₹1,500 Cr</span>
                          </div>
                          
                          {/* Bars */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'end',
                            justifyContent: window.innerWidth <= 768 ? 'space-between' : 'space-around',
                            width: '100%',
                            height: '100%',
                            paddingLeft: 'clamp(40px, 6vw, 60px)',
                            gap: window.innerWidth <= 768 ? 'clamp(8px, 2vw, 12px)' : '0'
                          }}>
                            {/* Q1 Bar */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'end'
                            }}>
                              <div style={{
                                width: window.innerWidth <= 768 ? 'clamp(25px, 3vw, 35px)' : 'clamp(30px, 4vw, 40px)',
                                height: '70%',
                                backgroundColor: '#3b82f6',
                                borderRadius: '4px 4px 0 0',
                                marginBottom: 'clamp(5px, 1vw, 8px)',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-clamp(20px, 3vw, 25px)',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 'clamp(10px, 1.5vw, 12px)',
                                  fontWeight: '600',
                                  color: '#1e40af',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ₹2,450 Cr
                                </div>
                              </div>
                              <span style={{
                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                fontWeight: '500',
                                color: '#374151'
                              }}>Q1</span>
                            </div>
                            
                            {/* Q2 Bar */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'end'
                            }}>
                              <div style={{
                                width: 'clamp(30px, 4vw, 40px)',
                                height: '76%',
                                backgroundColor: '#10b981',
                                borderRadius: '4px 4px 0 0',
                                marginBottom: 'clamp(5px, 1vw, 8px)',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-clamp(20px, 3vw, 25px)',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 'clamp(10px, 1.5vw, 12px)',
                                  fontWeight: '600',
                                  color: '#059669',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ₹2,680 Cr
                                </div>
                              </div>
                              <span style={{
                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                fontWeight: '500',
                                color: '#374151'
                              }}>Q2</span>
                            </div>
                            
                            {/* Q3 Bar */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'end'
                            }}>
                              <div style={{
                                width: 'clamp(30px, 4vw, 40px)',
                                height: '82%',
                                backgroundColor: '#f59e0b',
                                borderRadius: '4px 4px 0 0',
                                marginBottom: 'clamp(5px, 1vw, 8px)',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-clamp(20px, 3vw, 25px)',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 'clamp(10px, 1.5vw, 12px)',
                                  fontWeight: '600',
                                  color: '#d97706',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ₹2,890 Cr
                                </div>
                              </div>
                              <span style={{
                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                fontWeight: '500',
                                color: '#374151'
                              }}>Q3</span>
                            </div>
                            
                            {/* Q4 Bar */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'end'
                            }}>
                              <div style={{
                                width: 'clamp(30px, 4vw, 40px)',
                                height: '89%',
                                backgroundColor: '#ef4444',
                                borderRadius: '4px 4px 0 0',
                                marginBottom: 'clamp(5px, 1vw, 8px)',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-clamp(20px, 3vw, 25px)',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 'clamp(10px, 1.5vw, 12px)',
                                  fontWeight: '600',
                                  color: '#dc2626',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ₹3,120 Cr
                                </div>
                              </div>
                              <span style={{
                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                fontWeight: '500',
                                color: '#374151'
                              }}>Q4</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Chart Legend */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: 'clamp(15px, 3vw, 20px)',
                          marginTop: 'clamp(10px, 2vw, 15px)',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 6px)' }}>
                            <div style={{ width: 'clamp(12px, 2vw, 16px)', height: 'clamp(12px, 2vw, 16px)', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>Q1 2024</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 6px)' }}>
                            <div style={{ width: 'clamp(12px, 2vw, 16px)', height: 'clamp(12px, 2vw, 16px)', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>Q2 2024</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 6px)' }}>
                            <div style={{ width: 'clamp(12px, 2vw, 16px)', height: 'clamp(12px, 2vw, 16px)', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>Q3 2024</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 6px)' }}>
                            <div style={{ width: 'clamp(12px, 2vw, 16px)', height: 'clamp(12px, 2vw, 16px)', backgroundColor: '#ef4444', borderRadius: '2px' }}></div>
                            <span style={{ fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#6b7280' }}>Q4 2024</span>
                          </div>
                        </div>
                      </div>
                      
                      <p style={{
                        fontSize: 'clamp(12px, 2vw, 14px)',
                        color: '#6c757d',
                        margin: '0',
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}>
                        Interactive chart showing {selectedMetric} trend for {selectedCompany} across quarters
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: 'clamp(20px, 4vw, 30px)',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{
                        fontSize: 'clamp(16px, 3vw, 18px)',
                        fontWeight: '600',
                        color: '#2c3e50',
                        margin: '0 0 clamp(15px, 3vw, 20px) 0'
                      }}>
                        Data Table: {selectedMetric}
                      </h4>
                      <div style={{
                        overflowX: 'auto',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px'
                      }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          borderSpacing: '0',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          tableLayout: 'auto'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Period</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Value</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Change</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Q1 2024</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>₹2,450 Cr</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', color: '#28a745', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>+12.5%</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>📈</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Q2 2024</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>₹2,680 Cr</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', color: '#28a745', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>+9.4%</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>📈</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Q3 2024</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>₹2,890 Cr</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', color: '#28a745', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>+7.8%</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>📈</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Q4 2024</td>
                              <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>₹3,120 Cr</td>
                              <td style={{ padding: '12px', color: '#28a745', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>+8.0%</td>
                              <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>📈</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p style={{
                        fontSize: 'clamp(12px, 2vw, 14px)',
                        color: '#6c757d',
                        margin: 'clamp(10px, 2vw, 15px) 0 0 0',
                        fontStyle: 'italic'
                      }}>
                        Detailed data for {selectedMetric} of {selectedCompany}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  color: '#6c757d',
                  textAlign: 'center',
                  margin: '0',
                  fontStyle: 'italic'
                }}>
                  Please select company and metric to view metrics
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Metrics;
