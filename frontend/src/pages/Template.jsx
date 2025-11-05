import React, { useState } from 'react';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';

function Template({ onMenuClick }) {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'fields', name: 'Fields', icon: '📝' },
    { id: 'validation', name: 'Validation', icon: '✅' },
    { id: 'preview', name: 'Preview', icon: '👁️' }
  ];

  return (
    <div style={{
      padding: 'clamp(10px, 3vw, 20px)',
      maxWidth: '100vw',
      overflowX: 'hidden',
      backgroundColor: '#f8f9fa',
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
            Template Definition
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

      {/* Main Layout with Sidebar and Content */}
      <div style={{ 
        display: 'flex', 
        gap: 'clamp(1rem, 3vw, 2rem)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        alignItems: window.innerWidth <= 768 ? 'stretch' : 'flex-start'
      }}>
        {/* Company Information Sidebar - Left side */}
        <CompanyInformationSidebar />

        {/* Right Content Area */}
        <div style={{ 
          flex: 1, 
          minWidth: 0,
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          {/* Template Navigation Tabs */}
          <div style={{
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
            padding: window.innerWidth <= 768 ? '0 0.5rem' : '0 1rem',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              marginBottom: 'clamp(15px, 3vw, 20px)',
              padding: window.innerWidth <= 768 ? '0 0.5rem' : '0 1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(4, auto)',
                gap: 'clamp(8px, 2vw, 12px)',
                width: '100%',
                overflow: 'visible',
                padding: '1rem 0'
              }}>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      padding: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : 'clamp(8px, 2vw, 12px)',
                      fontSize: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : 'clamp(11px, 2.5vw, 13px)',
                      whiteSpace: 'nowrap',
                      width: window.innerWidth <= 768 ? '100%' : 'auto',
                      textAlign: 'center',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeSection === section.id ? 'rgba(63, 114, 175, 0.1)' : 'transparent',
                      color: activeSection === section.id ? 'var(--main-color)' : '#666',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: activeSection === section.id ? '600' : '400',
                      wordWrap: 'break-word',
                      minHeight: window.innerWidth <= 768 ? 'clamp(36px, 8vw, 44px)' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{section.icon}</span>
                    <span>{section.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Template Content Area */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: 'clamp(20px, 4vw, 30px)',
            minHeight: '400px'
          }}>
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  marginBottom: 'clamp(15px, 3vw, 20px)',
                  color: '#333',
                  fontWeight: '600'
                }}>
                  Template Overview
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: 'clamp(15px, 3vw, 20px)',
                  marginBottom: 'clamp(20px, 4vw, 30px)'
                }}>
                  <div style={{
                    padding: 'clamp(15px, 3vw, 20px)',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Template Name</h4>
                    <input
                      type="text"
                      placeholder="Enter template name..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{
                    padding: 'clamp(15px, 3vw, 20px)',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Company</h4>
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select company...</option>
                      <option value="hdfc">HDFC Life</option>
                      <option value="sbi">SBI Life</option>
                      <option value="icici">ICICI Prudential</option>
                    </select>
                  </div>
                </div>
                <div style={{
                  padding: 'clamp(15px, 3vw, 20px)',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Description</h4>
                  <textarea
                    placeholder="Describe the purpose and usage of this template..."
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Fields Section */}
            {activeSection === 'fields' && (
              <div>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  marginBottom: 'clamp(15px, 3vw, 20px)',
                  color: '#333',
                  fontWeight: '600'
                }}>
                  Template Fields
                </h3>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'clamp(15px, 3vw, 20px)'
                }}>
                  <p style={{ margin: 0, color: '#666' }}>
                    Define the data fields to extract from documents
                  </p>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--main-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Add Field
                  </button>
                </div>
                <div style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px 16px',
                    borderBottom: '1px solid #dee2e6',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    Field Configuration
                  </div>
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                    No fields defined yet. Click "Add Field" to get started.
                  </div>
                </div>
              </div>
            )}

            {/* Validation Section */}
            {activeSection === 'validation' && (
              <div>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  marginBottom: 'clamp(15px, 3vw, 20px)',
                  color: '#333',
                  fontWeight: '600'
                }}>
                  Validation Rules
                </h3>
                <div style={{
                  padding: 'clamp(15px, 3vw, 20px)',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Data Validation</h4>
                  <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                    Set up validation rules to ensure data quality and accuracy.
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                    gap: '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Required Fields
                      </label>
                      <input
                        type="text"
                        placeholder="Comma-separated field names"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Data Format Rules
                      </label>
                      <select
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select validation type...</option>
                        <option value="numeric">Numeric only</option>
                        <option value="date">Date format</option>
                        <option value="currency">Currency format</option>
                        <option value="email">Email format</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {activeSection === 'preview' && (
              <div>
                <h3 style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  marginBottom: 'clamp(15px, 3vw, 20px)',
                  color: '#333',
                  fontWeight: '600'
                }}>
                  Template Preview
                </h3>
                <div style={{
                  padding: 'clamp(15px, 3vw, 20px)',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                    Template Preview
                  </h4>
                  <p style={{ margin: '0 0 20px 0', color: '#666' }}>
                    Upload a sample document to see how the template will extract data
                  </p>
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--main-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Upload Sample Document
                  </button>
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
    </div>
  );
}

export default Template;
