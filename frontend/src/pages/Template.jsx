import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';

function Template({ onMenuClick }) {
  const navigate = useNavigate();
  const { isNavItemActive, handleSidebarItemClick } = useNavigation();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Template management state
  const [selectedLForm, setSelectedLForm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Define all possible tabs for Template page (same as other pages)
  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Irdai Monthly Data'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Handle tab click navigation
  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    // Navigate to appropriate pages based on tab
    switch(tab) {
      case 'Dashboard':
        navigate('/dashboard');
        break;
      case 'Analytics':
        navigate('/analytics');
        break;
      case 'Documents':
        navigate('/documents');
        break;
      case 'Peers':
        navigate('/peers');
        break;
      case 'News':
        navigate('/news');
        break;
      case 'Metrics':
        navigate('/metrics');
        break;
      case 'Annual Data':
        navigate('/annual-data');
        break;
      case 'L Forms':
        navigate('/lform');
        break;
      case 'Define Template':
        // Stay on current page
        console.log('Define Template clicked');
        break;
      case 'Save Template':
        console.log('Save Template clicked');
        break;
      case 'Irdai Monthly Data':
        // Navigate to IRDAI Monthly Data page if route exists
        console.log('Irdai Monthly Data clicked');
        // navigate('/irdai-monthly-data'); // Uncomment when route is available
        break;
      default:
        console.log(`${tab} clicked`);
    }
  };

  // Company options
  const companyOptions = [
    'HDFC Life',
    'SBI Life',
    'ICICI Prudential',
    'LIC',
    'Bajaj Allianz',
    'Reliance Nippon',
    'Tata AIA',
    'Max Life',
    'Kotak Mahindra',
    'Aditya Birla Sun Life'
  ];

  // L-Form options
  const lformOptions = [
    'L-1 Revenue Account',
    'L-2 Premium Account', 
    'L-3 Claims Account',
    'L-4 Premium Schedule',
    'L-5 Commission Schedule',
    'L-6 Commission Schedule',
    'L-7 Commission Schedule',
    'L-8 Commission Schedule',
    'L-9 Commission Schedule',
    'L-10 Commission Schedule',
    'L-11 Commission Schedule',
    'L-12 Commission Schedule',
    'L-13 Commission Schedule',
    'L-14 Commission Schedule',
    'L-15 Commission Schedule',
    'L-16 Commission Schedule',
    'L-17 Commission Schedule',
    'L-18 Commission Schedule',
    'L-19 Commission Schedule',
    'L-20 Commission Schedule'
  ];

  // Sample field data for L-Forms (you can expand this)
  const getFieldsForLForm = (lform) => {
    const fieldData = {
      'L-1 Revenue Account': [
        'Premium Income', 'Investment Income', 'Other Income', 'Total Revenue',
        'Commission Paid', 'Operating Expenses', 'Net Revenue'
      ],
      'L-2 Premium Account': [
        'Gross Premium', 'Reinsurance Premium', 'Net Premium', 'Premium Receivable',
        'Premium Collected', 'Premium Outstanding', 'Refund Premium'
      ],
      'L-3 Claims Account': [
        'Claims Incurred', 'Claims Paid', 'Claims Outstanding', 'Claims Reserves',
        'Settlement Expenses', 'Legal Expenses', 'Net Claims'
      ],
      'L-4 Premium Schedule': [
        'Policy Number', 'Premium Amount', 'Due Date', 'Payment Status',
        'Premium Mode', 'Policy Term', 'Sum Assured'
      ],
      'L-5 Commission Schedule': [
        'Agent Code', 'Commission Rate', 'Commission Amount', 'Payment Date',
        'Policy Count', 'Premium Volume', 'Commission Status'
      ]
    };
    return fieldData[lform] || ['Field 1', 'Field 2', 'Field 3', 'Field 4', 'Field 5'];
  };

  // Handle field selection
  const handleFieldToggle = (field) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  // Handle template saving
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    if (!selectedCompany) {
      alert('Please select a company');
      return;
    }
    
    const newTemplate = {
      id: Date.now(),
      name: templateName,
      company: selectedCompany,
      lform: selectedLForm,
      fields: selectedFields,
      createdAt: new Date().toISOString()
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    setTemplateName('');
    setShowSaveModal(false);
    setSelectedFields([]);
    setSelectedLForm('');
    setSelectedCompany('');
  };

  console.log('Template component is rendering!');

  return (
    <div style={{
      padding: 'clamp(10px, 3vw, 20px)',
      maxWidth: '100vw',
      overflowX: 'hidden',
      backgroundColor: 'white',
      minHeight: '100vh'
    }}>
      {/* Page Header */}
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
            onClick={() => {
              console.log('Template page hamburger clicked!');
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
          >
            ☰
          </button>
          <h1 style={{ 
            margin: 0,
            fontSize: 'clamp(18px, 5vw, 28px)',
            lineHeight: '1.2',
            color: 'var(--main-color)'
          }}>
            Template
          </h1>
        </div>
        <p style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          margin: 0,
          color: '#666'
        }}>
          Create and manage data extraction templates for insurance documents
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="navigation-tabs-container" style={{
        marginBottom: 'clamp(15px, 3vw, 20px)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
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
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isNavItemActive(tab) ? 'var(--main-color)' : 'transparent',
                color: isNavItemActive(tab) ? 'white' : '#666',
                fontWeight: isNavItemActive(tab) ? '600' : '400',
                cursor: isNavItemActive(tab) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                minHeight: tabs.length <= 3 ? '36px' : '32px',
                opacity: isNavItemActive(tab) ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (isNavItemActive(tab)) {
                  e.target.style.backgroundColor = 'rgba(63, 114, 175, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (isNavItemActive(tab)) {
                  e.target.style.backgroundColor = 'var(--main-color)';
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout with Sidebar and Content */}
      <div style={{
        display: 'flex',
        gap: 'clamp(10px, 2vw, 15px)',
        padding: '0 clamp(10px, 3vw, 20px)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Left Sidebar - Company Information */}
        <CompanyInformationSidebar />

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0,
          paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)'
        }}>

          {/* Template Management Content */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: 'clamp(20px, 4vw, 30px)',
            minHeight: '400px'
          }}>
            {/* Company Selection */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginBottom: '15px',
                color: '#333',
                fontWeight: '600'
              }}>
                Select Company
              </h3>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Choose a company...</option>
                {companyOptions.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* L-Form Selection */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginBottom: '15px',
                color: '#333',
                fontWeight: '600'
              }}>
                Select L-Form
              </h3>
              <select
                value={selectedLForm}
                onChange={(e) => {
                  setSelectedLForm(e.target.value);
                  setSelectedFields([]); // Reset selected fields when L-Form changes
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Choose an L-Form...</option>
                {lformOptions.map(lform => (
                  <option key={lform} value={lform}>{lform}</option>
                ))}
              </select>
            </div>

            {/* Field Selection */}
            {selectedLForm && (
              <div style={{ marginBottom: '30px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(16px, 4vw, 20px)',
                    margin: 0,
                    color: '#333',
                    fontWeight: '600'
                  }}>
                    Select Fields for {selectedLForm}
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: '#666',
                    backgroundColor: '#f8f9fa',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {selectedFields.length} selected
                  </span>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  {getFieldsForLForm(selectedLForm).map(field => (
                    <label
                      key={field}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        border: selectedFields.includes(field) ? '2px solid var(--main-color)' : '1px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: selectedFields.includes(field) ? 'rgba(63, 114, 175, 0.1)' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => handleFieldToggle(field)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{
                        fontSize: '14px',
                        color: selectedFields.includes(field) ? 'var(--main-color)' : '#333',
                        fontWeight: selectedFields.includes(field) ? '500' : 'normal'
                      }}>
                        {field}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Save Template Button */}
                {selectedFields.length > 0 && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'var(--main-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    💾 Save as Template
                  </button>
                )}
              </div>
            )}

            {/* Saved Templates */}
            {templates.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  marginBottom: '15px',
                  color: '#333',
                  fontWeight: '600'
                }}>
                  Saved Templates ({templates.length})
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '15px'
                }}>
                  {templates.map(template => (
                    <div
                      key={template.id}
                      style={{
                        padding: '15px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          color: '#333',
                          fontWeight: '600'
                        }}>
                          {template.name}
                        </h4>
                        <span style={{
                          fontSize: '10px',
                          color: '#666',
                          backgroundColor: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px'
                        }}>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{
                        margin: '0 0 5px 0',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <strong>Company:</strong> {template.company}
                      </p>
                      <p style={{
                        margin: '0 0 10px 0',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <strong>L-Form:</strong> {template.lform}
                      </p>
                      <div style={{
                        fontSize: '12px',
                        color: '#555'
                      }}>
                        <strong>Fields ({template.fields.length}):</strong>
                        <div style={{
                          marginTop: '5px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px'
                        }}>
                          {template.fields.map(field => (
                            <span
                              key={field}
                              style={{
                                backgroundColor: 'white',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                border: '1px solid #ddd'
                              }}
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'clamp(10px, 2vw, 15px)',
            marginTop: 'clamp(20px, 4vw, 30px)',
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <button
              style={{
                padding: 'clamp(10px, 2.5vw, 12px) clamp(15px, 3vw, 20px)',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'clamp(14px, 3vw, 16px)'
              }}
            >
              Cancel
            </button>
            <button
              style={{
                padding: 'clamp(10px, 2.5vw, 12px) clamp(15px, 3vw, 20px)',
                backgroundColor: 'var(--main-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'clamp(14px, 3vw, 16px)'
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              color: '#333',
              fontWeight: '600'
            }}>
              Save Template
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#555'
              }}>
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Template1, Template2, Revenue Template..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                marginBottom: '15px'
              }}>
                <p style={{
                  margin: '0 0 5px 0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#555'
                }}>
                  <strong>Company:</strong> {selectedCompany}
                </p>
                <p style={{
                  margin: '0 0 5px 0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#555'
                }}>
                  <strong>L-Form:</strong> {selectedLForm}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#555'
                }}>
                  <strong>Selected Fields ({selectedFields.length}):</strong>
                </p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {selectedFields.map(field => (
                  <span
                    key={field}
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'white',
                      padding: '4px 8px',
                      margin: '2px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #ddd'
                    }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--main-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Template;
