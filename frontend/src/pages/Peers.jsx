import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import ApiService from '../services/api';
import { LFORMS_LABELS } from '../data/LFORMS_DATA';
import './Peers.css';

const Peers = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();

  // Company selection state
  const [selectedCompany, setSelectedCompany] = useState('');
  const [s3Companies, setS3Companies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companiesError, setCompaniesError] = useState(null);
  
  // Company data state
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [companyDataError, setCompanyDataError] = useState(null);

  // L-Form and comparison state
  const [selectedLForm, setSelectedLForm] = useState('');
  const [comparisonMode, setComparisonMode] = useState('selected'); // 'selected'
  const [selectedCompanies, setSelectedCompanies] = useState([]); // Keep for backward compatibility
  const [selectedPDFs, setSelectedPDFs] = useState([]); // Array of {companyId, companyName, promptName} objects
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // L-Form options from data file
  const lformOptions = LFORMS_LABELS;

  // Fetch companies based on selected L-Form
  useEffect(() => {
    if (selectedLForm) {
      fetchCompaniesByLform(selectedLForm);
    } else {
      // Clear companies when no L-form is selected
      setS3Companies([]);
      setSelectedCompanies([]);
      setSelectedPDFs([]);
    }
  }, [selectedLForm]);

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

  const fetchCompaniesByLform = async (lform) => {
    try {
      setLoadingCompanies(true);
      setCompaniesError(null);
      const response = await ApiService.getCompaniesByLform(lform);
      
      if (response.success) {
        setS3Companies(response.companies);
        setSelectedCompanies([]); // Clear previous selections
        setSelectedPDFs([]); // Clear previous PDF selections
      } else {
        setCompaniesError(response.error || 'Failed to fetch companies for this L-Form');
      }
    } catch (error) {
      setCompaniesError(`Error: ${error.message}`);
      console.error('Failed to fetch companies by L-Form:', error);
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

  // Handle company selection for comparison (deprecated - kept for backward compatibility)
  const handleCompanyToggle = (companyName) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyName)) {
        return prev.filter(name => name !== companyName);
      } else {
        return [...prev, companyName];
      }
    });
  };

  // Handle individual PDF selection
  const handlePDFToggle = (companyId, companyName, pdfName) => {
    const pdfIdentifier = `${companyId}|${pdfName}`;
    setSelectedPDFs(prev => {
      const exists = prev.find(pdf => `${pdf.companyId}|${pdf.pdfName}` === pdfIdentifier);
      if (exists) {
        return prev.filter(pdf => `${pdf.companyId}|${pdf.pdfName}` !== pdfIdentifier);
      } else {
        return [...prev, { companyId, companyName, pdfName }];
      }
    });
  };

  // Check if a PDF is selected
  const isPDFSelected = (companyId, pdfName) => {
    const pdfIdentifier = `${companyId}|${pdfName}`;
    return selectedPDFs.some(pdf => `${pdf.companyId}|${pdf.pdfName}` === pdfIdentifier);
  };

  // Fetch comparison data
  const fetchComparisonData = async () => {
    if (!selectedLForm) {
      setComparisonError('Please select an L-Form first');
      return;
    }

    if (selectedPDFs.length === 0) {
      setComparisonError('Please select at least one PDF for comparison');
      return;
    }

    setLoadingComparison(true);
    setComparisonError(null);

    try {
      const pdfsToCompare = selectedPDFs;

      // Simulate API call - replace with actual API endpoint
      const response = await fetch('/api/peers/comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lform: selectedLForm,
          pdfs: pdfsToCompare
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      } else {
        throw new Error('Failed to fetch comparison data');
      }
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
      setComparisonError(`Error: ${error.message}`);
      setComparisonData(null);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleTabClick = (tab) => {
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
        navigate('/annual-data');
      } else if (tab === 'Documents') {
        navigate('/documents');
    } else if (tab === 'Peers') {
      return; // Stay on current page
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
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="peers-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'clamp(0.5rem, 2vw, 1rem)', 
        marginBottom: 'clamp(1rem, 3vw, 2rem)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => {
            console.log('Peers hamburger clicked!');
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
          lineHeight: '1.2'
        }}>Peers</h1>
      </div>

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
          {/* L-Form Selection and Comparison Mode */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: 'clamp(20px, 4vw, 30px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            <h3 style={{
              fontSize: 'clamp(18px, 3vw, 20px)',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 clamp(15px, 2vw, 20px) 0'
            }}>
              📊 Select L-Form for Comparison
            </h3>

            {/* L-Form Selection */}
            <div style={{
              marginBottom: 'clamp(20px, 3vw, 25px)'
            }}>
              <label style={{
                fontSize: 'clamp(14px, 2vw, 16px)',
                fontWeight: '600',
                color: '#374151',
                marginBottom: 'clamp(8px, 1vw, 12px)',
                display: 'block'
              }}>
                Choose L-Form
              </label>
              <select
                value={selectedLForm}
                onChange={(e) => setSelectedLForm(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'clamp(10px, 2vw, 12px)',
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Select an L-Form...</option>
                {lformOptions.map(lform => (
                  <option key={lform} value={lform}>
                    {lform}
                  </option>
                ))}
              </select>
            </div>


            {/* Company Selection */}
            <div style={{
              marginBottom: 'clamp(20px, 3vw, 25px)'
            }}>
                <label style={{
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 'clamp(8px, 1vw, 12px)',
                  display: 'block'
                }}>
                  Select PDFs ({selectedPDFs.length} selected)
                </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(12px, 2vw, 16px)',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: 'clamp(12px, 2vw, 16px)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  minHeight: '100px'
                }}>
                  {!selectedLForm ? (
                    <div style={{
                      textAlign: 'center',
                      padding: 'clamp(20px, 4vw, 40px)',
                      color: '#6b7280',
                      fontSize: 'clamp(13px, 2vw, 14px)'
                    }}>
                      👆 Please select an L-Form above to view available PDFs
                    </div>
                  ) : loadingCompanies ? (
                    <div style={{
                      textAlign: 'center',
                      padding: 'clamp(20px, 4vw, 40px)',
                      color: '#6b7280',
                      fontSize: 'clamp(13px, 2vw, 14px)'
                    }}>
                      Loading PDFs...
                    </div>
                  ) : s3Companies.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: 'clamp(20px, 4vw, 40px)',
                      color: '#6b7280',
                      fontSize: 'clamp(13px, 2vw, 14px)'
                    }}>
                      No PDFs found for {selectedLForm}
                    </div>
                  ) : (
                    s3Companies.map(company => (
                    <div
                      key={company.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        padding: 'clamp(12px, 2vw, 16px)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: company.pdfs && company.pdfs.length > 0 ? '8px' : '0',
                        fontSize: 'clamp(14px, 2vw, 16px)',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {company.name}
                        {company.pdfs && ` (${company.pdfs.length} PDFs)`}
                      </div>
                      
                      {/* Show PDFs for this company */}
                      {company.pdfs && company.pdfs.length > 0 && (
                        <div style={{
                          marginLeft: '0px',
                          marginTop: '8px',
                          paddingLeft: '12px',
                          borderLeft: '2px solid #d1d5db'
                        }}>
                          <div style={{
                            fontSize: 'clamp(12px, 1.5vw, 13px)',
                            color: '#6b7280',
                            marginBottom: '6px'
                          }}>
                            📄 PDFs:
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {company.pdfs.map((pdf, idx) => {
                              const pdfName = typeof pdf === 'string' ? pdf : pdf.name;
                              const isSelected = isPDFSelected(company.id, pdfName);
                              return (
                                <label
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handlePDFToggle(company.id, company.name, pdfName)}
                                    style={{ marginTop: '2px', margin: 0 }}
                                  />
                                  <div style={{
                                    flex: 1,
                                    fontSize: 'clamp(11px, 1.5vw, 12px)',
                                    color: '#4b5563'
                                  }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                      {pdfName}
                                    </div>
                                    
                                    {/* Show splits for this PDF if available */}
                                    {typeof pdf === 'object' && pdf.splits && pdf.splits.length > 0 && (
                                      <div style={{
                                        marginLeft: '0px',
                                        marginTop: '4px',
                                        paddingTop: '4px',
                                        borderTop: '1px dashed #d1d5db',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                      }}>
                                        <span style={{ fontSize: '10px', color: '#6b7280' }}>Splits:</span>
                                        {pdf.splits.map((split, splitIdx) => (
                                          <div key={splitIdx} style={{
                                            fontSize: '10px',
                                            color: '#6b7280',
                                            paddingLeft: '8px'
                                          }}>
                                            ↳ {split.name} (Pages: {split.pages})
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                  )}
                </div>
            </div>

            {/* Generate Comparison Button */}
            <div style={{
              display: 'flex',
              gap: 'clamp(10px, 2vw, 15px)',
              alignItems: 'center',
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
              <button
                onClick={fetchComparisonData}
                disabled={!selectedLForm || loadingComparison || selectedPDFs.length === 0}
                style={{
                  padding: 'clamp(12px, 2vw, 16px) clamp(20px, 3vw, 24px)',
                  backgroundColor: (!selectedLForm || loadingComparison || selectedPDFs.length === 0) ? '#9ca3af' : '#059862',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  fontWeight: '600',
                  cursor: (!selectedLForm || loadingComparison || selectedPDFs.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minWidth: window.innerWidth <= 768 ? '100%' : 'clamp(180px, 25vw, 220px)',
                  width: window.innerWidth <= 768 ? '100%' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#047857';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#059862';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loadingComparison ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Generating Comparison...
                  </>
                ) : (
                  <>
                    📊 Generate Comparison
                  </>
                )}
              </button>

              {/* Clear Selection Button */}
              <button
                onClick={() => {
                  setSelectedLForm('');
                  setSelectedCompanies([]);
                  setSelectedPDFs([]);
                  setComparisonData(null);
                  setComparisonError(null);
                }}
                style={{
                  padding: 'clamp(12px, 2vw, 16px) clamp(16px, 2vw, 20px)',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  minWidth: window.innerWidth <= 768 ? '100%' : 'auto',
                  width: window.innerWidth <= 768 ? '100%' : 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#4b5563';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6b7280';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🗑️ Clear Selection
              </button>
            </div>

            {/* Error Display */}
            {comparisonError && (
              <div style={{
                marginTop: 'clamp(15px, 2vw, 20px)',
                background: '#fee',
                color: '#dc2626',
                padding: 'clamp(12px, 2vw, 16px)',
                borderRadius: '8px',
                border: '1px solid #fcc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{comparisonError}</span>
                <button
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                  onClick={() => setComparisonError(null)}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Peers Content */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: 'clamp(20px, 4vw, 30px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)', 
              marginBottom: 'clamp(20px, 3vw, 25px)',
              flexWrap: 'wrap'
            }}>
              {/* Hamburger Menu Icon */}
              {/* <button
                onClick={() => {
                  console.log('Peers hamburger clicked!');
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
              </button> */}
              <h3 style={{
                fontSize: 'clamp(20px, 4vw, 24px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                🏢 Peer Analysis & Comparison
              </h3>
            </div>

            {/* Comparison Results */}
            {loadingComparison && (
              <div style={{
                textAlign: 'center',
                padding: 'clamp(40px, 6vw, 60px)',
                color: '#6b7280'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid transparent',
                  borderTop: '4px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto clamp(20px, 3vw, 30px)'
                }}></div>
                <h4 style={{
                  fontSize: 'clamp(18px, 3vw, 22px)',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 'clamp(8px, 1vw, 12px)'
                }}>
                  Generating Comparison...
                </h4>
                <p style={{
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  lineHeight: '1.5',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  Analyzing {selectedLForm} data for {selectedPDFs.length} selected PDFs...
                </p>
              </div>
            )}

            {comparisonData && (
              <div>
                <div style={{
                  marginBottom: 'clamp(20px, 3vw, 25px)',
                  padding: 'clamp(15px, 2vw, 20px)',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9'
                }}>
                  <h4 style={{
                    fontSize: 'clamp(16px, 2vw, 18px)',
                    fontWeight: '600',
                    color: '#0369a1',
                    margin: '0 0 clamp(8px, 1vw, 12px) 0'
                  }}>
                    📊 Comparison Results: {selectedLForm}
                  </h4>
                  <p style={{
                    fontSize: 'clamp(13px, 2vw, 14px)',
                    color: '#0369a1',
                    margin: 0
                  }}>
                    Comparing {selectedPDFs.length} selected PDFs
                  </p>
                </div>

                {/* Comparison Table */}
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white'
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
                      <tr style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#374151',
                          borderRight: '1px solid #e5e7eb',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          Company
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#374151',
                          borderRight: '1px solid #e5e7eb',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          Premium Value (₹ Cr)
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#374151',
                          borderRight: '1px solid #e5e7eb',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          Sum Assured (₹ Cr)
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#374151',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          Policies (Count)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.companies?.map((company, index) => (
                        <tr key={company.name} style={{
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}>
                          <td style={{
                            padding: '12px',
                            fontWeight: '600',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb',
                            fontSize: '14px',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            {company.name}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: '#059862',
                            fontWeight: '600',
                            borderRight: '1px solid #e5e7eb',
                            fontSize: '14px',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            ₹{company.premiumValue?.toLocaleString() || 'N/A'}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: '#3b82f6',
                            fontWeight: '600',
                            borderRight: '1px solid #e5e7eb',
                            fontSize: '14px',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            ₹{company.sumAssured?.toLocaleString() || 'N/A'}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: '#7c3aed',
                            fontWeight: '600',
                            fontSize: '14px',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            {company.policies?.toLocaleString() || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Statistics */}
                <div style={{
                  marginTop: 'clamp(20px, 3vw, 25px)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'clamp(15px, 2vw, 20px)'
                }}>
                  <div style={{
                    padding: 'clamp(15px, 2vw, 20px)',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #22c55e',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 'clamp(24px, 4vw, 32px)',
                      fontWeight: '700',
                      color: '#15803d',
                      marginBottom: 'clamp(4px, 1vw, 8px)'
                    }}>
                      ₹{comparisonData.summary?.totalPremium?.toLocaleString() || '0'}
                    </div>
                    <div style={{
                      fontSize: 'clamp(12px, 2vw, 14px)',
                      color: '#15803d',
                      fontWeight: '600'
                    }}>
                      Total Premium Value
                    </div>
                  </div>

                  <div style={{
                    padding: 'clamp(15px, 2vw, 20px)',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    border: '1px solid #3b82f6',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 'clamp(24px, 4vw, 32px)',
                      fontWeight: '700',
                      color: '#1d4ed8',
                      marginBottom: 'clamp(4px, 1vw, 8px)'
                    }}>
                      ₹{comparisonData.summary?.totalSumAssured?.toLocaleString() || '0'}
                    </div>
                    <div style={{
                      fontSize: 'clamp(12px, 2vw, 14px)',
                      color: '#1d4ed8',
                      fontWeight: '600'
                    }}>
                      Total Sum Assured
                    </div>
                  </div>

                  <div style={{
                    padding: 'clamp(15px, 2vw, 20px)',
                    background: '#faf5ff',
                    borderRadius: '8px',
                    border: '1px solid #7c3aed',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 'clamp(24px, 4vw, 32px)',
                      fontWeight: '700',
                      color: '#6d28d9',
                      marginBottom: 'clamp(4px, 1vw, 8px)'
                    }}>
                      {comparisonData.summary?.totalPolicies?.toLocaleString() || '0'}
                    </div>
                    <div style={{
                      fontSize: 'clamp(12px, 2vw, 14px)',
                      color: '#6d28d9',
                      fontWeight: '600'
                    }}>
                      Total Policies
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Default Placeholder */}
            {!loadingComparison && !comparisonData && (
              <div style={{
                textAlign: 'center',
                padding: 'clamp(40px, 6vw, 60px)',
                color: '#6b7280'
              }}>
                <div style={{
                  fontSize: 'clamp(48px, 8vw, 64px)',
                  marginBottom: 'clamp(16px, 3vw, 24px)'
                }}>
                  🏢
                </div>
                <h4 style={{
                  fontSize: 'clamp(18px, 3vw, 22px)',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 'clamp(8px, 1vw, 12px)'
                }}>
                  Peer Analysis Ready
                </h4>
                <p style={{
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  lineHeight: '1.5',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  Select an L-Form and companies above to generate comprehensive peer analysis and comparison.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Peers;
