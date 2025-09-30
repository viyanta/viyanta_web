import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const PDFSplitterWorkflow = ({ user }) => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPDF, setSelectedPDF] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [companyPDFs, setCompanyPDFs] = useState([]);
  const [pdfSplits, setPdfSplits] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Load companies from database
  useEffect(() => {
    loadCompanies();
  }, []);

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

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedCompany || !user?.id) {
      setError('Please select a company and file to upload');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiService.uploadAndSplitPDF(uploadFile, selectedCompany, user.id);

      if (data.success) {
        setSuccess(`PDF uploaded and split into ${data.data.total_splits} files successfully!`);
        setUploadFile(null);
        // Refresh the PDFs list
        loadCompanyPDFs();
      } else {
        setError(data.detail || 'Upload failed');
      }
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractForm = async () => {
    if (!selectedForm || !user?.id) {
      setError('Please select a form to extract and ensure you are logged in');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);
    setExtractedData(null);
    setError('');
    setSuccess('');

    try {
      // Find the selected split
      const selectedSplit = pdfSplits.find(split => split.filename === selectedForm);
      if (!selectedSplit) {
        setError('Selected form not found');
        return;
      }

      console.log('Starting form extraction:', {
        company: selectedCompany,
        pdf: selectedPDF,
        split: selectedForm,
        user: user.id
      });

      // First check if extraction already exists
      try {
        const existingData = await apiService.getExtractedData(selectedCompany, selectedPDF, selectedForm);
        if (existingData.success) {
          console.log('Found existing extraction data');
          setExtractedData(existingData);
          setSuccess(`Form ${selectedSplit.form_name} data loaded successfully!`);
          return;
        }
      } catch (existingError) {
        console.log('No existing extraction found, proceeding with new extraction');
      }

      // Perform new extraction
      const extractionResult = await apiService.extractFormData(
        selectedCompany, 
        selectedPDF, 
        selectedForm, 
        user.id
      );

      if (extractionResult.success) {
        console.log('Extraction completed successfully');
        setExtractedData(extractionResult);
        setSuccess(`Form ${selectedSplit.form_name} extracted and corrected successfully!`);
      } else {
        setExtractionError(extractionResult.detail || 'Extraction failed');
      }

    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError(`Extraction failed: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Clear extraction data when form changes
  const clearExtractionData = () => {
    setExtractedData(null);
    setExtractionError(null);
    setIsExtracting(false);
  };

  const cardStyle = {
    background: 'var(--card-background)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
    marginBottom: '1.5rem'
  };

  const stepStyle = {
    background: 'var(--bg-color)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    border: '1px solid var(--border-color)'
  };

  const buttonStyle = {
    background: 'var(--main-color)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    minWidth: '120px'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    background: 'var(--bg-color)',
    color: 'black',
    fontSize: '14px',
    marginTop: '0.5rem'
  };

  const fileInputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px dashed var(--border-color)',
    borderRadius: '8px',
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '14px',
    marginTop: '0.5rem',
    cursor: 'pointer'
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-color-dark)' }}>
        📄 PDF Splitter & Form Extractor
      </h2>

      {error && (
        <div style={{
          background: '#fee',
          color: 'var(--error-color)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #fcc'
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#efe',
          color: '#059862',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #cfc'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Step 1: Select Company */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          1️⃣ Select Company:
        </h3>
        <select
          style={selectStyle}
          value={selectedCompany}
          disabled={loadingCompanies}
          onChange={(e) => {
            setSelectedCompany(e.target.value);
            setSelectedPDF('');
            setSelectedForm('');
            setError('');
            setSuccess('');
            // Clear extraction data when company changes
            clearExtractionData();
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
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            ✅ {selectedCompany}
          </div>
        )}
      </div>

      {/* Step 2: Upload PDF */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          2️⃣ Upload PDF:
        </h3>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setUploadFile(e.target.files[0])}
          style={fileInputStyle}
          disabled={!selectedCompany}
        />
        {uploadFile && (
          <div style={{ marginTop: '0.5rem', fontSize: '14px', color: 'var(--text-color)' }}>
            Selected: {uploadFile.name}
          </div>
        )}
        <button
          style={{
            ...buttonStyle,
            marginTop: '0.75rem',
            opacity: (!uploadFile || !selectedCompany || isUploading) ? 0.6 : 1
          }}
          onClick={handleFileUpload}
          disabled={!uploadFile || !selectedCompany || isUploading}
        >
          {isUploading ? '📤 Uploading...' : '📤 Upload & Split'}
        </button>
        <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-color-light)' }}>
          💡 Upload PDF (ex: SBI Life S FY2023 9M.pdf) - it will be automatically split according to its index
        </div>
      </div>

      {/* Step 3: Select PDF File */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          3️⃣ Select PDF File:
        </h3>
        <select
          style={selectStyle}
          value={selectedPDF}
          onChange={(e) => {
            setSelectedPDF(e.target.value);
            setSelectedForm('');
            setError('');
            setSuccess('');
            // Clear extraction data when PDF changes
            clearExtractionData();
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
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            ✅ {selectedPDF} - {pdfSplits.length} forms available
          </div>
        )}
        {companyPDFs.length === 0 && selectedCompany && (
          <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-color-light)' }}>
            💡 No PDFs found for {selectedCompany}. Please upload a PDF first.
          </div>
        )}
      </div>

      {/* Step 4: Select Form */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          4️⃣ Select Form to Extract:
        </h3>
        <select
          style={selectStyle}
          value={selectedForm}
          onChange={(e) => {
            setSelectedForm(e.target.value);
            setError('');
            setSuccess('');
            // Clear extraction data when form changes
            clearExtractionData();
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
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            ✅ Selected: {pdfSplits.find(s => s.filename === selectedForm)?.form_name}
          </div>
        )}
        <button
          style={{
            ...buttonStyle,
            marginTop: '0.75rem',
            opacity: (!selectedForm || isExtracting) ? 0.6 : 1
          }}
          onClick={handleExtractForm}
          disabled={!selectedForm || isExtracting}
        >
          {isExtracting ? '⏳ Extracting...' : '🎯 Extract Form Data'}
        </button>
        {pdfSplits.length === 0 && selectedPDF && (
          <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-color-light)' }}>
            💡 No split forms found. The PDF may not have been processed yet.
          </div>
        )}
      </div>

      {/* Step 5: Extraction Results */}
      {(extractedData || extractionError || isExtracting) && (
        <div style={stepStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color-dark)' }}>
            5️⃣ Extraction Results:
          </h3>
          
          {isExtracting && (
            <div style={{ 
              padding: '1rem', 
              background: '#fff8e1', 
              borderRadius: '8px',
              border: '1px solid #ffd54f',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <p style={{ margin: 0, color: '#f57f17' }}>
                Extracting form data and applying Gemini corrections...
              </p>
            </div>
          )}

          {extractionError && (
            <div style={{ 
              padding: '1rem', 
              background: '#ffebee', 
              borderRadius: '8px',
              border: '1px solid #f44336',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌</div>
              <p style={{ margin: 0, color: '#d32f2f' }}>
                {extractionError}
              </p>
            </div>
          )}

          {extractedData && extractedData.success && (
            <div style={{ 
              padding: '1rem', 
              background: '#e8f5e8', 
              borderRadius: '8px',
              border: '1px solid #4caf50',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '1rem',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '1.5rem' }}>✅</div>
                <div>
                  <h4 style={{ margin: 0, color: '#2e7d32' }}>
                    Extraction Completed Successfully
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#388e3c' }}>
                    Data extracted and corrected with Gemini AI
                  </p>
                </div>
              </div>

              {/* Metadata Display */}
              {extractedData.metadata && (
                <div style={{ 
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>Extraction Details:</h5>
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    <div><strong>Form Code:</strong> {extractedData.metadata.form_code}</div>
                    <div><strong>Extraction ID:</strong> {extractedData.metadata.extraction_id}</div>
                    <div><strong>Template Used:</strong> {extractedData.metadata.template_used?.split('/').pop()}</div>
                    <div><strong>Gemini Corrected:</strong> {extractedData.metadata.gemini_corrected ? 'Yes' : 'No'}</div>
                    <div><strong>Extracted At:</strong> {new Date(extractedData.metadata.extracted_at).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* Data Table Display */}
              {extractedData.data && Array.isArray(extractedData.data) && extractedData.data.length > 0 && (
                <div style={{ 
                  background: 'white',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ 
                    background: '#f5f5f5',
                    padding: '0.75rem',
                    borderBottom: '1px solid #e0e0e0',
                    fontWeight: '600'
                  }}>
                    📊 Extracted Data ({extractedData.data.length} record{extractedData.data.length !== 1 ? 's' : ''})
                  </div>
                  <div style={{ 
                    maxHeight: '400px',
                    overflow: 'auto',
                    padding: '1rem'
                  }}>
                    {extractedData.data.map((record, index) => (
                      <div key={index} style={{ 
                        marginBottom: index < extractedData.data.length - 1 ? '1.5rem' : 0,
                        paddingBottom: index < extractedData.data.length - 1 ? '1.5rem' : 0,
                        borderBottom: index < extractedData.data.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <h6 style={{ margin: '0 0 0.75rem 0', color: '#1976d2' }}>
                          Record {index + 1} {record.FormName && `- ${record.FormName}`}
                        </h6>
                        
                        {/* Metadata */}
                        {(record.FormName || record.PeriodStart || record.PeriodEnd || record.PagesUsed) && (
                          <div style={{ 
                            background: '#f8f9fa',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            marginBottom: '0.75rem',
                            fontSize: '0.85rem'
                          }}>
                            {record.FormName && <div><strong>Form:</strong> {record.FormName}</div>}
                            {record.PeriodStart && <div><strong>Period Start:</strong> {record.PeriodStart}</div>}
                            {record.PeriodEnd && <div><strong>Period End:</strong> {record.PeriodEnd}</div>}
                            {record.PagesUsed && <div><strong>Pages Used:</strong> {record.PagesUsed}</div>}
                          </div>
                        )}

                        {/* Table Data */}
                        {record.Rows && Array.isArray(record.Rows) && record.Rows.length > 0 && (
                          <div style={{ 
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              overflow: 'auto',
                              maxHeight: '300px'
                            }}>
                              <table style={{ 
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.8rem'
                              }}>
                                <thead>
                                  <tr style={{ background: '#f5f5f5' }}>
                                    {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                      <th key={headerIndex} style={{ 
                                        padding: '0.5rem',
                                        textAlign: 'left',
                                        borderRight: '1px solid #e0e0e0',
                                        borderBottom: '1px solid #e0e0e0',
                                        fontWeight: '600'
                                      }}>
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.Rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} style={{ 
                                      background: rowIndex % 2 === 0 ? 'white' : '#fafafa'
                                    }}>
                                      {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                        <td key={headerIndex} style={{ 
                                          padding: '0.5rem',
                                          borderRight: '1px solid #e0e0e0',
                                          borderBottom: '1px solid #e0e0e0'
                                        }}>
                                          {row[header] || '-'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Actions */}
              <div style={{ 
                marginTop: '1rem',
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  style={{
                    ...buttonStyle,
                    background: '#1976d2',
                    fontSize: '0.9rem',
                    padding: '0.5rem 1rem'
                  }}
                  onClick={() => {
                    const dataStr = JSON.stringify(extractedData.data, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedForm.replace('.pdf', '')}_extracted.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  📥 Download JSON
                </button>
                
                <button
                  style={{
                    ...buttonStyle,
                    background: '#388e3c',
                    fontSize: '0.9rem',
                    padding: '0.5rem 1rem'
                  }}
                  onClick={() => {
                    // Convert to CSV
                    if (extractedData.data && extractedData.data.length > 0 && extractedData.data[0].Rows) {
                      const headers = extractedData.data[0].FlatHeaders || [];
                      const rows = extractedData.data.flatMap(record => record.Rows || []);
                      
                      let csv = headers.join(',') + '\n';
                      rows.forEach(row => {
                        const values = headers.map(header => {
                          const value = row[header] || '';
                          return `"${value.toString().replace(/"/g, '""')}"`;
                        });
                        csv += values.join(',') + '\n';
                      });
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedForm.replace('.pdf', '')}_extracted.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  📊 Download CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFSplitterWorkflow;
