

import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const TemplateBasedExtractor = () => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [aiExtractionResult, setAiExtractionResult] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState(['sbi', 'hdfc', 'icici', 'bajaj']);
  const [error, setError] = useState(null);

  // Load available companies on mount
  useEffect(() => {
    loadAvailableCompanies();
  }, []);

  // Load forms when company is selected
  useEffect(() => {
    if (selectedCompany) {
      loadFormsForCompany(selectedCompany);
    } else {
      setAvailableForms([]);
      setSelectedForm('');
    }
  }, [selectedCompany]);

  const loadAvailableCompanies = async () => {
    try {
      const data = await ApiService.getTemplateCompanies();
      setAvailableCompanies(data.companies || ['sbi', 'hdfc', 'icici', 'bajaj']);
    } catch (error) {
      console.log('Using default companies list:', error.message);
    }
  };

  const loadFormsForCompany = async (company) => {
    setIsLoadingForms(true);
    setError(null);
    try {
      const data = await ApiService.listCompanyForms(company);
      setAvailableForms(data.forms || []);
    } catch (error) {
      setError(error.message || 'Failed to load forms. Please upload PDF first.');
      setAvailableForms([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedCompany) return;

    setIsUploading(true);
    setError(null);
    try {
      const data = await ApiService.uploadTemplateCompanyPDF(selectedFile, selectedCompany);
      console.log('Upload successful:', data);
      // Reload forms after successful upload
      await loadFormsForCompany(selectedCompany);
    } catch (error) {
      setError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormExtraction = async () => {
    if (!selectedForm || !selectedCompany) return;

    setIsExtracting(true);
    setError(null);
    try {
      const data = await ApiService.extractTemplateForm(selectedCompany, selectedForm);
      setExtractionResult(data.data);
    } catch (error) {
      setError(error.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // 🤖 NEW: AI Extraction for ALL periods
  const handleAiFormExtraction = async () => {
    if (!selectedForm || !selectedCompany) return;

    setIsAiExtracting(true);
    setError(null);
    try {
      const data = await ApiService.aiExtractTemplateForm(selectedCompany, selectedForm);
      setAiExtractionResult(data);
    } catch (error) {
      setError(error.message || 'AI Extraction failed');
    } finally {
      setIsAiExtracting(false);
    }
  };

  // Helper function to create multi-level header structure for rendering
  const createMultiLevelHeaders = (headers) => {
    const headerRows = [];
    const flatHeaders = [];
    
    // If headers is already flat, use it directly
    if (Array.isArray(headers)) {
      return {
        headerRows: [headers.map(h => ({ text: h, colspan: 1 }))],
        flatHeaders: headers
      };
    }
    
    // Process multi-level headers
    const topRow = [];
    const bottomRow = [];
    
    Object.entries(headers).forEach(([mainKey, subHeaders]) => {
      if (Array.isArray(subHeaders)) {
        // Simple array of sub-headers
        topRow.push({ text: mainKey, colspan: subHeaders.length });
        subHeaders.forEach(sub => {
          bottomRow.push({ text: sub, colspan: 1 });
          flatHeaders.push(sub === 'Particulars' ? 'Particulars' : 
                          mainKey.includes('Unit Linked') ? `UL ${sub}` :
                          mainKey.includes('Grand Total') ? 'Grand Total' : sub);
        });
      } else if (typeof subHeaders === 'object') {
        // Nested structure like Non-Linked Business
        let totalCols = 0;
        Object.entries(subHeaders).forEach(([subKey, subSubHeaders]) => {
          totalCols += subSubHeaders.length;
        });
        topRow.push({ text: mainKey, colspan: totalCols });
        
        Object.entries(subHeaders).forEach(([subKey, subSubHeaders]) => {
          subSubHeaders.forEach(sub => {
            bottomRow.push({ text: sub, colspan: 1 });
            flatHeaders.push(subKey.includes('Participating') ? `P ${sub}` : `NP ${sub}`);
          });
        });
      }
    });
    
    return {
      headerRows: [topRow, bottomRow],
      flatHeaders
    };
  };

  const renderExtractionResult = () => {
    if (!extractionResult) return null;

    const { headerRows, flatHeaders } = createMultiLevelHeaders(extractionResult.Headers);

    return (
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h4 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
          📊 Extraction Result: {extractionResult['Form No']} - {extractionResult.Title}
          {extractionResult.Period && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', marginTop: '0.25rem' }}>
              {extractionResult.Period} {extractionResult.Currency && `(${extractionResult.Currency})`}
            </div>
          )}
        </h4>
        
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
          <span>📄 Pages Used: {extractionResult.PagesUsed}</span>
          <span style={{ marginLeft: '2rem' }}>📋 Total Rows: {extractionResult.TotalRows}</span>
          {extractionResult.TablesInfo && (
            <span style={{ marginLeft: '2rem' }}>
              🔍 Tables: {extractionResult.TablesInfo.processed}/{extractionResult.TablesInfo.total_found} processed
            </span>
          )}
        </div>

        {extractionResult.Rows && extractionResult.Rows.length > 0 ? (
          <div style={{ 
            overflowX: 'auto', 
            overflowY: 'auto', 
            maxHeight: '70vh',
            border: '1px solid #dee2e6',
            borderRadius: '8px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                {headerRows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ backgroundColor: 'var(--main-color)', color: 'white' }}>
                    {row.map((header, colIndex) => (
                      <th key={colIndex} style={{
                        padding: '0.5rem',
                        border: '1px solid #dee2e6',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }} colSpan={header.colspan}>
                        {header.text}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {extractionResult.Rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f8f9fa'
                  }}>
                    {flatHeaders.map((header, colIndex) => (
                      <td key={colIndex} style={{
                        padding: '0.5rem',
                        border: '1px solid #dee2e6',
                        fontSize: '0.75rem',
                        textAlign: colIndex === 0 ? 'left' : 'right'
                      }}>
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-color-light)' }}>No data extracted</p>
        )}
      </div>
    );
  };

  // Helper function to render AI extraction results
  const renderAiExtractionResult = () => {
    if (!aiExtractionResult) return null;

    return (
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h4 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
          🤖 AI Extraction Complete!
        </h4>
        
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
          <span><strong>Company:</strong> {aiExtractionResult.company}</span>
          <span style={{ marginLeft: '2rem' }}><strong>Form:</strong> {aiExtractionResult.form_no}</span>
          <span style={{ marginLeft: '2rem' }}><strong>Total Periods:</strong> {aiExtractionResult.total_periods}</span>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', marginBottom: '1.5rem' }}>
          {aiExtractionResult.message}
        </p>

        {aiExtractionResult.data && aiExtractionResult.data.length > 0 ? (
          <div>
            <h5 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
              📊 All Extracted Periods ({aiExtractionResult.data.length}):
            </h5>
            
            {aiExtractionResult.data.map((period, index) => (
              <div key={index} style={{
                border: '1px solid #ddd',
                margin: '10px 0',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
              }}>
                <h6 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
                  Period {index + 1}: {period.Form} - {period.Title}
                </h6>
                
                <div style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
                  <span><strong>Period:</strong> {period.Period}</span>
                  <span style={{ marginLeft: '2rem' }}><strong>Currency:</strong> {period.Currency}</span>
                  <span style={{ marginLeft: '2rem' }}><strong>Page Used:</strong> {period.PagesUsed}</span>
                  <span style={{ marginLeft: '2rem' }}><strong>Rows:</strong> {period.Rows ? period.Rows.length : 0}</span>
                </div>

                {period.Rows && period.Rows.length > 0 ? (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      color: '#3498db',
                      padding: '5px 0' 
                    }}>
                      📋 View Data Preview (Click to expand)
                    </summary>
                    <div style={{ 
                      marginTop: '10px', 
                      maxHeight: '300px', 
                      overflow: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.8rem'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                            {period.Headers && period.Headers.map((header, hIndex) => (
                              <th key={hIndex} style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {period.Rows.slice(0, 3).map((row, rIndex) => (
                            <tr key={rIndex} style={{
                              backgroundColor: rIndex % 2 === 0 ? 'white' : '#f8f9fa'
                            }}>
                              {period.Headers && period.Headers.map((header, hIndex) => (
                                <td key={hIndex} style={{
                                  padding: '8px',
                                  border: '1px solid #ddd',
                                  fontSize: '0.75rem',
                                  textAlign: hIndex === 0 ? 'left' : 'right'
                                }}>
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {period.Rows.length > 3 && (
                            <tr>
                              <td colSpan={period.Headers ? period.Headers.length : 1} 
                                  style={{ 
                                    textAlign: 'center', 
                                    fontStyle: 'italic', 
                                    padding: '8px',
                                    color: '#666'
                                  }}>
                                ... and {period.Rows.length - 3} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ) : (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>No data rows found for this period</p>
                )}
              </div>
            ))}
            
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              borderLeft: '4px solid #27ae60'
            }}>
              <h6 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>
                ✅ Extraction Summary
              </h6>
              <p><strong>Total Periods:</strong> {aiExtractionResult.total_periods}</p>
              <p><strong>Total Rows Across All Periods:</strong> {
                aiExtractionResult.data.reduce((sum, period) => sum + (period.Rows ? period.Rows.length : 0), 0)
              }</p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
                💡 This AI extraction found multiple instances of the same form across different time periods in your PDF. 
                Each period represents the same form structure but with data for different quarters/years.
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#e74c3c' }}>❌ No periods found or extraction failed</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
        🎯 Template-Based Form Extraction
      </h3>
      <p style={{ color: 'var(--text-color-light)', marginBottom: '1.5rem' }}>
        Extract specific forms from insurance PDFs using predefined templates. 
        Upload a PDF, select a company, and choose from available forms to extract structured data.
      </p>

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          color: 'var(--error-color)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--error-color)',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Step 1: Company Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            1️⃣ Select Company:
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            <option value="">Choose a company...</option>
            {availableCompanies.map(company => (
              <option key={company} value={company}>
                {company.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: File Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            2️⃣ Upload PDF:
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '8px'
              }}
            />
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || !selectedCompany || isUploading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: (!selectedFile || !selectedCompany || isUploading) ? '#dee2e6' : 'var(--main-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: (!selectedFile || !selectedCompany || isUploading) ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? '⏳ Uploading...' : '📤 Upload'}
            </button>
          </div>
        </div>

        {/* Step 3: Form Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            3️⃣ Select Form to Extract:
          </label>
          {isLoadingForms ? (
            <p style={{ color: 'var(--text-color-light)' }}>🔄 Loading available forms...</p>
          ) : availableForms.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Choose a form...</option>
                {availableForms.map(form => (
                  <option key={form.form_no} value={form.form_no}>
                    {form.form_no} - {form.description} {form.pages && `(Pages: ${form.pages})`}
                  </option>
                ))}
              </select>
              
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#666',
                border: '1px solid #e9ecef'
              }}>
                <strong>Choose Extraction Method:</strong>
                <br />
                • <strong>Single Period:</strong> Extract data from one specific period/year
                <br />
                • <strong>🤖 AI Extract ALL Periods:</strong> Find and extract ALL instances of this form across different time periods (recommended)
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleFormExtraction}
                  disabled={!selectedForm || isExtracting}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    backgroundColor: (!selectedForm || isExtracting) ? '#dee2e6' : 'var(--success-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: (!selectedForm || isExtracting) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isExtracting ? '⏳ Extracting...' : '🎯 Extract Single Period'}
                </button>
                <button
                  onClick={handleAiFormExtraction}
                  disabled={!selectedForm || isAiExtracting}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    backgroundColor: (!selectedForm || isAiExtracting) ? '#dee2e6' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: (!selectedForm || isAiExtracting) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAiExtracting ? '🤖 AI Extracting...' : '🤖 AI Extract ALL Periods'}
                </button>
              </div>
            </div>
          ) : selectedCompany ? (
            <p style={{ color: 'var(--text-color-light)' }}>
              📁 No forms found. Please upload a PDF first to discover available forms.
            </p>
          ) : (
            <p style={{ color: 'var(--text-color-light)' }}>
              👆 Please select a company first.
            </p>
          )}
        </div>
      </div>

      {/* Extraction Results */}
      {renderExtractionResult()}
      {renderAiExtractionResult()}
    </div>
  );
};

export default TemplateBasedExtractor;
