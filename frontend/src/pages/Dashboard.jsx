import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import './Dashboard.css';

const Dashboard = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [selectedFrequency, setSelectedFrequency] = useState('Quarterly');
  const [selectedType, setSelectedType] = useState('Factsheet');
  const [activeView, setActiveView] = useState('Visuals');
  const [selectedCompany, setSelectedCompany] = useState('');

  const frequencyOptions = ['Yearly', 'Quarterly', 'Monthly'];
  const typeOptions = ['Products', 'Business', 'Factsheet', 'People'];

  const tabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News'
  ];

  // Handle tab clicks
  const handleTabClick = (tab) => {
    if (tab === 'Background') {
      navigate('/insurance-dashboard?tab=Background');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Dashboard') {
      // Stay on current page
      return;
    } else {
      // For other tabs, you can add navigation logic later
      console.log(`Clicked ${tab} tab`);
    }
  };

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
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          {/* Dashboard Title */}
      <div style={{ 
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              color: '#36659b',
              fontSize: 'clamp(18px, 5vw, 28px)',
              fontWeight: '700',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}>
              Dashboard
            </h1>
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)'
            }}>
              Comprehensive view of key performance indicators and market analysis
            </p>
      </div>

          {/* Insurer Name Dropdown - Right side */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
            padding: window.innerWidth <= 768 ? '0 0.5rem' : '0 1rem'
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block'
            }}>
              <select
                value={selectedCompany || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCompany(value);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: '#f8f9fa',
                  color: '#333',
                  minWidth: '150px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Insurer Name</option>
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
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(9, auto)',
              gap: 'clamp(8px, 2vw, 12px)',
              width: '100%',
              overflow: 'visible'
            }}>
              {tabs.map((tab) => (
            <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`nav-tab ${tab === 'Dashboard' ? 'active' : ''}`}
              style={{
                    padding: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : 'clamp(8px, 2vw, 12px)',
                    fontSize: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : 'clamp(11px, 2.5vw, 13px)',
                    whiteSpace: 'nowrap',
                    width: window.innerWidth <= 768 ? '100%' : 'auto',
                    textAlign: 'center',
                borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: tab === 'Dashboard' ? 'var(--main-color)' : '#666',
                    fontWeight: tab === 'Dashboard' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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

          {/* Breadcrumb and View Toggle */}
                  <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            <div className="breadcrumb" style={{
              textAlign: 'left'
            }}>
              <span>HDFC Life</span>
              <br />
              <span>Dashboard</span>
              <span className="breadcrumb-separator">›</span>
              <span>Insurance</span>
              <span className="breadcrumb-separator">›</span>
              <span>Factsheet</span>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">Yearly</span>
                      </div>
            <div className="view-toggle">
              <button
                className={`toggle-btn ${activeView === 'Visuals' ? 'active' : ''}`}
                onClick={() => setActiveView('Visuals')}
              >
                Visuals
              </button>
              <button
                className={`toggle-btn ${activeView === 'Data' ? 'active' : ''}`}
                onClick={() => setActiveView('Data')}
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
        gap: 'clamp(8px, 1.5vw, 12px)',
        alignItems: 'flex-start'
      }}>
        {/* Left Sidebar - Company Information */}
        <CompanyInformationSidebar />

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0
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
                minWidth: '140px'
              }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Select Frequency</label>
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
              style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
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
                minWidth: '140px'
              }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Select Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
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
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                {/* Scatter Plot */}
                <div style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '15px',
                  height: '200px'
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 10px 0',
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
                  borderRadius: '6px',
                  padding: '15px',
                  height: '200px'
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 10px 0',
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
                  borderRadius: '6px',
                  padding: '15px',
                  height: '200px'
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 10px 0',
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
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '15px'
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