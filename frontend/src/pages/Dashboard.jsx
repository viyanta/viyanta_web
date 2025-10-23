import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './Dashboard.css';

const Dashboard = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const [selectedFrequency, setSelectedFrequency] = useState('Quarterly');
  const [selectedType, setSelectedType] = useState('Factsheet');
  const [activeView, setActiveView] = useState('Visuals');
  const [selectedCompany, setSelectedCompany] = useState('');

  const frequencyOptions = ['Yearly', 'Quarterly', 'Monthly'];
  const typeOptions = ['Products', 'Business', 'Factsheet', 'People'];

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
    
    if (tab === 'Background') {
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
    } else if (tab === 'Dashboard') {
      // Stay on current page
      return;
    } else {
      // For other tabs, you can add navigation logic later
      console.log(`Clicked ${tab} tab`);
    }
  };

    return (
    <div className="dashboard-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Dashboard Header */}
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div style={{ 
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          {/* Dashboard Title */}
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
                  console.log('Dashboard hamburger clicked!');
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
                Dashboard
              </h1>
            </div>
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              lineHeight: '1.4'
            }}>
              Comprehensive view of key performance indicators and market analysis
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
                  outline: 'none'
                }}
              >
                <option value="">Select Insurer...</option>
                <option value="hdfc">HDFC Life</option>
                <option value="sbi">SBI Life</option>
                <option value="icici">ICICI Prudential</option>
                <option value="lic">LIC</option>
                <option value="bajaj">Bajaj Allianz</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs Only */}
          <div className="navigation-tabs-container" style={{
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            {/* Navigation Tabs */}
            <div className="navigation-tabs" style={{
              display: 'flex',
              gap: tabs.length <= 3 ? 'clamp(15px, 3vw, 20px)' : 'clamp(8px, 2vw, 12px)',
              width: '100%',
              overflowX: 'auto',
              overflowY: 'visible',
              paddingBottom: '5px',
              justifyContent: tabs.length <= 3 ? 'center' : 'flex-start'
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
            </div>

          {/* Breadcrumb and View Toggle */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'clamp(15px, 3vw, 20px)',
            padding: '0 clamp(10px, 3vw, 20px)',
            flexWrap: 'wrap',
            gap: 'clamp(10px, 2vw, 15px)'
          }}>
            <div className="breadcrumb" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(6px, 1.5vw, 8px)',
              fontSize: 'clamp(13px, 2.5vw, 14px)',
              color: '#666',
              flexWrap: 'wrap'
            }}>
              <span>HDFC Life</span>
              <span className="breadcrumb-separator">›</span>
              <span>Dashboard</span>
              <span className="breadcrumb-separator">›</span>
              <span>Insurance</span>
              <span className="breadcrumb-separator">›</span>
              <span>Factsheet</span>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">Yearly</span>
            </div>
            <div className="view-toggle" style={{
              display: 'flex',
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
                    </div>
                        </div>

      {/* Main Content */}
      <div style={{ 
        display: 'flex',
        gap: 'clamp(15px, 3vw, 20px)',
        alignItems: 'flex-start',
        marginTop: 'clamp(5px, 1vw, 10px)',
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
          {/* Selection Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            marginBottom: 'clamp(15px, 3vw, 25px)',
            gap: 'clamp(15px, 3vw, 25px)',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              gap: 'clamp(15px, 3vw, 25px)',
              alignItems: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: 'clamp(140px, 20vw, 180px)'
              }}>
                <label style={{
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  fontWeight: '600',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Select Frequency</label>
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'clamp(8px, 2vw, 12px)',
                    border: '2px solid #28a745',
                    borderRadius: '6px',
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    backgroundColor: 'white',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  {frequencyOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: 'clamp(140px, 20vw, 180px)'
              }}>
                <label style={{
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  fontWeight: '600',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Select Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'clamp(8px, 2vw, 12px)',
                    border: '2px solid #28a745',
                    borderRadius: '6px',
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    backgroundColor: 'white',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  {typeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {activeView === 'Visuals' && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: 'clamp(15px, 3vw, 20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              marginBottom: 'clamp(15px, 3vw, 20px)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(280px, 30vw, 320px), 1fr))',
                gap: 'clamp(15px, 2vw, 20px)',
                marginBottom: 'clamp(15px, 2vw, 20px)'
              }}>
                {/* Scatter Plot */}
                <div style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: 'clamp(12px, 2vw, 15px)',
                  height: 'clamp(180px, 25vw, 200px)',
                  minHeight: '180px'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 clamp(8px, 1vw, 10px) 0',
                    textAlign: 'left'
                  }}>Revenue vs Performance</h3>
                  <div style={{
                    height: 'calc(100% - 30px)',
                        display: 'flex',
                        alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                        <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}>
                <div style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%'
                        }}>
                          <div style={{
                            position: 'absolute',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            top: '30%',
                            left: '20%'
                          }}></div>
                          <div style={{
                            position: 'absolute',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#3b82f6',
                            top: '50%',
                            left: '40%'
                          }}></div>
                    </div>
                <div style={{
                          position: 'absolute',
                          fontSize: '10px',
                          color: '#6b7280'
                        }}>
                          <div style={{
                            top: '5px',
                            right: '5px'
                          }}>$200K</div>
                          <div style={{
                            bottom: '5px',
                            right: '5px'
                          }}>40</div>
                    </div>
                  </div>
                </div>
            </div>
          </div>

                {/* Bar Chart */}
                <div style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: 'clamp(12px, 2vw, 15px)',
                  height: 'clamp(180px, 25vw, 200px)',
                  minHeight: '180px'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 clamp(8px, 1vw, 10px) 0',
                    textAlign: 'left'
                  }}>Profits vs. Month</h3>
                  <div style={{ 
                    height: 'calc(100% - 30px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                      <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}>
                <div style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'end',
                          justifyContent: 'space-around',
                          height: '80%',
                          width: '100%',
                          gap: '4px'
                        }}>
                          <div style={{
                            background: '#3b82f6',
                            width: '20px',
                            borderRadius: '2px 2px 0 0',
                            minHeight: '20px',
                            height: '60%'
                          }}></div>
                          <div style={{
                            background: '#3b82f6',
                            width: '20px',
                            borderRadius: '2px 2px 0 0',
                            minHeight: '20px',
                            height: '80%'
                          }}></div>
                          <div style={{
                            background: '#3b82f6',
                            width: '20px',
                            borderRadius: '2px 2px 0 0',
                            minHeight: '20px',
                            height: '70%'
                          }}></div>
                          <div style={{
                            background: '#3b82f6',
                            width: '20px',
                            borderRadius: '2px 2px 0 0',
                            minHeight: '20px',
                            height: '90%'
                          }}></div>
                          <div style={{
                            background: '#3b82f6',
                            width: '20px',
                            borderRadius: '2px 2px 0 0',
                            minHeight: '20px',
                            height: '75%'
                          }}></div>
                  </div>
                <div style={{ 
                  display: 'flex', 
                          justifyContent: 'space-around',
                          fontSize: '10px',
                          color: '#6b7280',
                          marginTop: '5px',
                          position: 'absolute',
                          bottom: '0',
                          width: '100%'
                        }}>
                          <span>Jan</span>
                          <span>Feb</span>
                          <span>Mar</span>
                          <span>Apr</span>
                          <span>May</span>
                  </div>
                  </div>
                    </div>
                  </div>
                </div>
                
                {/* Pie Chart */}
                <div style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: 'clamp(12px, 2vw, 15px)',
                  height: 'clamp(180px, 25vw, 200px)',
                  minHeight: '180px'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 clamp(8px, 1vw, 10px) 0',
                    textAlign: 'left'
                  }}>Pie Chart</h3>
                  <div style={{
                    height: 'calc(100% - 30px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                  <div style={{ 
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute',
                            width: '50%',
                            height: '50%',
                            top: '0',
                            left: '0',
                            borderRadius: '100% 0 0 0',
                            background: '#14b8a6'
                          }}></div>
                          <div style={{
                            position: 'absolute',
                            width: '50%',
                            height: '50%',
                            top: '0',
                            right: '0',
                            borderRadius: '0 100% 0 0',
                            background: '#d1d5db'
                          }}></div>
                          <div style={{
                            position: 'absolute',
                            width: '50%',
                            height: '50%',
                            bottom: '0',
                            left: '0',
                            borderRadius: '0 0 0 100%',
                            background: '#dc2626'
                          }}></div>
                          <div style={{
                            position: 'absolute',
                            width: '50%',
                            height: '50%',
                            bottom: '0',
                            right: '0',
                            borderRadius: '0 0 100% 0',
                            background: '#f3f4f6'
                          }}></div>
                  </div>
                  </div>
                </div>
              </div>
              </div>
          </div>

              </div>
            )}

          {activeView === 'Data' && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: 'clamp(15px, 3vw, 20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: 'clamp(16px, 3vw, 18px)',
                fontWeight: '600',
                color: '#374151',
                marginBottom: 'clamp(12px, 2vw, 15px)'
              }}>Premium Type Data</h3>
              <div style={{ 
                overflowX: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Particulars</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Units</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Period</th>
                      <th colSpan="5" style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db'
                      }}>Premium Type</th>
                    </tr>
                    <tr>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}></th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}></th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}></th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Group Non-Single Premium</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Individual Single Premium</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Individual Non-Single Premium</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db'
                      }}>Group Yearly Renewable Premium</th>
                      <th style={{
                        background: '#f3f4f6',
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        border: '1px solid #d1d5db'
                      }}>Group Single Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        fontWeight: '500'
                      }}>First Year Premium</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>In Crs</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>Nov 24</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>124.20</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>124.20</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>124.20</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>124.20</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>124.20</td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        fontWeight: '500'
                      }}>No of Policies / Schemes</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>In Nos</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>Nov 24</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>40828282</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>40828282</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>40828282</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>40828282</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>40828282</td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        fontWeight: '500'
                      }}>No. of lives covered under Group Schemes</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>In Nos</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>Nov 24</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>23838373</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>23838373</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>23838373</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>23838373</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>23838373</td>
                    </tr>
                    <tr>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        fontWeight: '500'
                      }}>Sum Assured</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>In Crs</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#6b7280'
                      }}>Nov 24</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>400.25</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>400.25</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>400.25</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRight: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>400.25</td>
                      <td style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        textAlign: 'center'
                      }}>400.25</td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
          )}

                        </div>
                      </div>
      </div>
    );
};
           
export default Dashboard;