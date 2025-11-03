import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import './Documents.css';

const Documents = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const { user } = useAuth();

  // State for document extraction workflow
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPDF, setSelectedPDF] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [companyPDFs, setCompanyPDFs] = useState([]);
  const [pdfSplits, setPdfSplits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [splitPdfUrl, setSplitPdfUrl] = useState(null);
  const [isLoadingSplitPdf, setIsLoadingSplitPdf] = useState(false);

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Load companies from database
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load PDFs when company is selected
  useEffect(() => {
    if (selectedCompany) {
      loadCompanyPDFs();
    }
  }, [selectedCompany]);

  // Load splits when PDF is selected
  useEffect(() => {
    if (selectedCompany && selectedPDF) {
      loadPDFSplits();
    }
  }, [selectedCompany, selectedPDF]);

  // Cleanup blob URL on component unmount
  useEffect(() => {
    return () => {
      if (splitPdfUrl) {
        URL.revokeObjectURL(splitPdfUrl);
      }
    };
  }, [splitPdfUrl]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      console.log('Loading companies from database...');
      const response = await apiService.get('/api/companies/');
      console.log('Companies response:', response);
      
      // Extract company names from the response
      const companyNames = response.map(company => company.name);
      setCompanies(companyNames);
      console.log('Companies loaded:', companyNames);
    } catch (error) {
      console.error('Failed to load companies:', error);
      // Fallback to hardcoded companies
      setCompanies([
        'SBI Life', 'HDFC Life', 'ICICI Prudential', 'Bajaj Allianz', 
        'Aditya Birla Sun Life', 'Canara HSBC Life', 'GO Digit Life', 'Shriram Life'
      ]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadCompanyPDFs = async () => {
    try {
      const data = await apiService.getCompanyPDFs(selectedCompany);
      if (data.success) {
        setCompanyPDFs(data.pdfs);
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
      setError(error.message);
      setCompanyPDFs([]);
    }
  };

  const loadPDFSplits = async () => {
    try {
      const data = await apiService.getPDFSplits(selectedCompany, selectedPDF);
      if (data.success) {
        setPdfSplits(data.splits);
      }
    } catch (error) {
      console.error('Error loading splits:', error);
      setError(error.message);
      setPdfSplits([]);
    }
  };

  const handleViewPDF = async () => {
    if (!selectedForm || !selectedCompany || !selectedPDF) {
      setError('Please select a company, PDF, and form first');
      return;
    }

    setIsLoadingSplitPdf(true);
    setError('');
    setSuccess('');

    try {
      // Find the selected split to get the form details
      const selectedSplit = pdfSplits.find(split => split.filename === selectedForm);
      if (!selectedSplit) {
        setError('Selected form not found');
        return;
      }

      // Clean up previous blob URL
      if (splitPdfUrl) {
        URL.revokeObjectURL(splitPdfUrl);
      }

      // Map company name to the format expected by PDF splitter API
      const companyNameMapping = {
        'sbi': 'SBI Life',
        'hdfc': 'HDFC Life', 
        'icici': 'ICICI Prudential',
        'lic': 'LIC'
      };
      
      const mappedCompanyName = companyNameMapping[selectedCompany.toLowerCase()] || selectedCompany;
      
      // Create download URL for the split PDF
      const apiBase = 'http://localhost:8000/api';
      const downloadUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedPDF)}/splits/${encodeURIComponent(selectedForm)}/download`;
      
      console.log('Loading split PDF from URL:', downloadUrl);
      
      // Fetch the PDF file
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        // Create a blob URL for the PDF
        const blob = await response.blob();
        console.log('Blob size:', blob.size, 'bytes');
        
        if (blob.size > 0) {
          const pdfUrl = URL.createObjectURL(blob);
          setSplitPdfUrl(pdfUrl);
          console.log('PDF split loaded successfully, URL:', pdfUrl);
          setSuccess(`PDF loaded successfully! You can now view it below.`);
        } else {
          throw new Error('PDF file is empty');
        }
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to load split PDF:', error);
      setError(`Failed to load PDF: ${error.message}`);
      setSplitPdfUrl(null);
    } finally {
      setIsLoadingSplitPdf(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedForm || !selectedCompany || !selectedPDF) {
      setError('Please select a company, PDF, and form first');
      return;
    }

    setIsLoadingPDF(true);
    setError('');
    setSuccess('');

    try {
      // Find the selected split to get the form details
      const selectedSplit = pdfSplits.find(split => split.filename === selectedForm);
      if (!selectedSplit) {
        setError('Selected form not found');
        return;
      }

      // Map company name to the format expected by PDF splitter API
      const companyNameMapping = {
        'sbi': 'SBI Life',
        'hdfc': 'HDFC Life', 
        'icici': 'ICICI Prudential',
        'lic': 'LIC'
      };
      
      const mappedCompanyName = companyNameMapping[selectedCompany.toLowerCase()] || selectedCompany;
      
      // Create download URL for the split PDF
      const apiBase = 'http://localhost:8000/api';
      const downloadUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedPDF)}/splits/${encodeURIComponent(selectedForm)}/download`;
      
      console.log('Downloading split PDF from URL:', downloadUrl);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${selectedSplit.form_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess(`Downloading ${selectedSplit.form_name}...`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(`Failed to download PDF: ${error.message}`);
    } finally {
      setIsLoadingPDF(false);
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
        return; // Stay on current page
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
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="documents-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
            console.log('Documents hamburger clicked!');
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
        }}>Documents</h1>
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
          {/* Document Extraction Workflow */}
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
                     <h3 style={{
                       fontSize: 'clamp(20px, 4vw, 24px)',
                       fontWeight: '600',
                       color: '#1f2937',
                       margin: 0
                     }}>
                       📄 Document View/Download 
                     </h3>
                   </div>

            {/* Error Display */}
            {error && (
              <div style={{
                background: '#fee',
                color: '#dc2626',
                padding: 'clamp(12px, 2vw, 16px)',
                borderRadius: '8px',
                marginBottom: 'clamp(15px, 2vw, 20px)',
                border: '1px solid #fcc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{error}</span>
                <button
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                  onClick={() => setError('')}
                >
                  ×
                </button>
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div style={{
                background: '#efe',
                color: '#059862',
                padding: 'clamp(12px, 2vw, 16px)',
                borderRadius: '8px',
                marginBottom: 'clamp(15px, 2vw, 20px)',
                border: '1px solid #cfc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span>
                <span>{success}</span>
                <button
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#059862',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                  onClick={() => setSuccess('')}
                >
                  ×
                </button>
              </div>
            )}

            {/* Step 1: Select Company */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: 'clamp(15px, 2vw, 20px)',
              marginBottom: 'clamp(15px, 2vw, 20px)',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{
                fontSize: 'clamp(16px, 3vw, 18px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 clamp(8px, 1vw, 12px) 0'
              }}>
                1️⃣ Select Company:
              </h4>
              <select
                style={{
                  width: '100%',
                  padding: 'clamp(8px, 1.5vw, 12px)',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#374151',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  marginTop: 'clamp(6px, 1vw, 8px)'
                }}
                value={selectedCompany}
                disabled={loadingCompanies}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedPDF('');
                  setSelectedForm('');
                  setError('');
                  setSuccess('');
                }}
              >
                <option value="">
                  {loadingCompanies ? 'Loading companies...' : 'Choose a company...'}
                </option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              {selectedCompany && (
                <div style={{
                  marginTop: 'clamp(6px, 1vw, 8px)',
                  color: '#059862',
                  fontSize: 'clamp(12px, 2vw, 13px)'
                }}>
                  ✅ {selectedCompany}
                </div>
              )}
            </div>


            {/* Step 3: Select PDF File */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: 'clamp(15px, 2vw, 20px)',
              marginBottom: 'clamp(15px, 2vw, 20px)',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{
                fontSize: 'clamp(16px, 3vw, 18px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 clamp(8px, 1vw, 12px) 0'
              }}>
                2️⃣ Select PDF File:
              </h4>
              <select
                style={{
                  width: '100%',
                  padding: 'clamp(8px, 1.5vw, 12px)',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#374151',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  marginTop: 'clamp(6px, 1vw, 8px)'
                }}
                value={selectedPDF}
                onChange={(e) => {
                  setSelectedPDF(e.target.value);
                  setSelectedForm('');
                  setError('');
                  setSuccess('');
                }}
                disabled={!selectedCompany || companyPDFs.length === 0}
              >
                <option value="">Choose a PDF...</option>
                {companyPDFs.map(pdf => (
                  <option key={pdf.pdf_name} value={pdf.pdf_name}>
                    📄 {pdf.pdf_name} ({pdf.total_splits} splits)
                  </option>
                ))}
              </select>
              {selectedPDF && (
                <div style={{
                  marginTop: 'clamp(6px, 1vw, 8px)',
                  color: '#059862',
                  fontSize: 'clamp(12px, 2vw, 13px)'
                }}>
                  ✅ {selectedPDF} - {pdfSplits.length} forms available
                </div>
              )}
              {companyPDFs.length === 0 && selectedCompany && (
                <div style={{
                  marginTop: 'clamp(6px, 1vw, 8px)',
                  fontSize: 'clamp(11px, 1.8vw, 12px)',
                  color: '#6b7280'
                }}>
                  💡 No PDFs found for {selectedCompany}. Please upload a PDF first.
                </div>
              )}
            </div>

            {/* Step 3: Select Form */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: 'clamp(15px, 2vw, 20px)',
              marginBottom: 'clamp(15px, 2vw, 20px)',
              border: '1px solid #e2e8f0'
            }}>
                     <h4 style={{
                       fontSize: 'clamp(16px, 3vw, 18px)',
                       fontWeight: '600',
                       color: '#1f2937',
                       margin: '0 0 clamp(8px, 1vw, 12px) 0'
                     }}>
                       3️⃣ Select Form to View/Download:
                     </h4>
              <select
                style={{
                  width: '100%',
                  padding: 'clamp(8px, 1.5vw, 12px)',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#374151',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  marginTop: 'clamp(6px, 1vw, 8px)'
                }}
                value={selectedForm}
                onChange={(e) => {
                  setSelectedForm(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                disabled={!selectedPDF || pdfSplits.length === 0}
              >
                <option value="">Choose a form...</option>
                {pdfSplits.map(split => (
                  <option key={split.filename} value={split.filename}>
                    📋 {split.form_name} (Pages {split.start_page}-{split.end_page})
                  </option>
                ))}
              </select>
              {selectedForm && (
                <div style={{
                  marginTop: 'clamp(6px, 1vw, 8px)',
                  color: '#059862',
                  fontSize: 'clamp(12px, 2vw, 13px)'
                }}>
                  ✅ Selected: {pdfSplits.find(s => s.filename === selectedForm)?.form_name}
                </div>
              )}
              {pdfSplits.length === 0 && selectedPDF && (
                <div style={{
                  marginTop: 'clamp(6px, 1vw, 8px)',
                  fontSize: 'clamp(11px, 1.8vw, 12px)',
                  color: '#6b7280'
                }}>
                  💡 No split forms found. The PDF may not have been processed yet.
                </div>
              )}
            </div>

            {/* Step 4: View/Download PDF */}
            {selectedForm && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: 'clamp(15px, 2vw, 20px)',
                marginBottom: 'clamp(15px, 2vw, 20px)',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{
                  fontSize: 'clamp(16px, 3vw, 18px)',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 clamp(8px, 1vw, 12px) 0'
                }}>
                  4️⃣ View/Download PDF:
                </h4>
                
                {selectedForm && (
                  <div style={{
                    marginBottom: 'clamp(12px, 2vw, 16px)',
                    padding: 'clamp(10px, 1.5vw, 12px)',
                    background: '#e8f5e8',
                    borderRadius: '6px',
                    border: '1px solid #4caf50'
                  }}>
                    <div style={{
                      fontSize: 'clamp(13px, 2vw, 14px)',
                      fontWeight: '600',
                      color: '#2e7d32',
                      marginBottom: 'clamp(4px, 1vw, 6px)'
                    }}>
                      📄 Selected Form: {pdfSplits.find(s => s.filename === selectedForm)?.form_name}
                    </div>
                    <div style={{
                      fontSize: 'clamp(11px, 1.8vw, 12px)',
                      color: '#388e3c'
                    }}>
                      Pages: {pdfSplits.find(s => s.filename === selectedForm)?.start_page}-{pdfSplits.find(s => s.filename === selectedForm)?.end_page}
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: 'clamp(10px, 2vw, 15px)',
                  flexWrap: 'wrap'
                }}>
                  <button
                    style={{
                      padding: 'clamp(10px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
                      backgroundColor: isLoadingSplitPdf ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: 'clamp(13px, 2vw, 14px)',
                      fontWeight: '600',
                      cursor: isLoadingSplitPdf ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isLoadingSplitPdf ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={handleViewPDF}
                    disabled={isLoadingSplitPdf}
                  >
                    {isLoadingSplitPdf ? (
                      <>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        👁️ View PDF
                      </>
                    )}
                  </button>

                  <button
                    style={{
                      padding: 'clamp(10px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
                      backgroundColor: isLoadingPDF ? '#9ca3af' : '#059862',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: 'clamp(13px, 2vw, 14px)',
                      fontWeight: '600',
                      cursor: isLoadingPDF ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isLoadingPDF ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={handleDownloadPDF}
                    disabled={isLoadingPDF}
                  >
                    {isLoadingPDF ? (
                      <>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        📥 Download PDF
                      </>
                    )}
                  </button>
                </div>

                <div style={{
                  marginTop: 'clamp(8px, 1vw, 12px)',
                  fontSize: 'clamp(11px, 1.8vw, 12px)',
                  color: '#6b7280'
                }}>
                  💡 View loads the PDF below, Download saves it to your device
                </div>

                {/* PDF Viewer */}
                {splitPdfUrl && (
                  <div style={{
                    marginTop: 'clamp(15px, 2vw, 20px)',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: '70vh',
                    backgroundColor: '#fff'
                  }}>
                    <div style={{
                      padding: 'clamp(8px, 1vw, 12px)',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      fontSize: 'clamp(12px, 2vw, 13px)',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      📄 PDF Viewer - {pdfSplits.find(s => s.filename === selectedForm)?.form_name}
                    </div>
                    <iframe
                      src={splitPdfUrl}
                      style={{
                        width: '100%',
                        height: 'calc(100% - 40px)',
                        border: 'none'
                      }}
                      title={`PDF Split: ${pdfSplits.find(s => s.filename === selectedForm)?.form_name}`}
                      onError={(e) => {
                        console.error('PDF iframe error:', e);
                        // Fallback to object tag
                        const iframe = e.target;
                        const container = iframe.parentElement;
                        const object = document.createElement('object');
                        object.data = splitPdfUrl;
                        object.type = 'application/pdf';
                        object.style.width = '100%';
                        object.style.height = 'calc(100% - 40px)';
                        object.style.border = 'none';
                        container.replaceChild(object, iframe);
                      }}
                    />
                  </div>
                )}

                {isLoadingSplitPdf && (
                  <div style={{
                    marginTop: 'clamp(15px, 2vw, 20px)',
                    textAlign: 'center',
                    padding: 'clamp(20px, 3vw, 30px)',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '3px solid transparent',
                      borderTop: '3px solid var(--main-color)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto clamp(10px, 2vw, 15px)'
                    }}></div>
                    <div style={{
                      fontSize: 'clamp(14px, 2vw, 16px)',
                      color: '#6c757d'
                    }}>
                      Loading PDF...
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
