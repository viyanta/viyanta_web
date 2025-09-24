import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const TemplateBasedExtractor = () => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState(['sbi']);
  const [error, setError] = useState(null);
  
  // New state for file selection
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState('');
  
  // New state for company management
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isAddingCompany, setIsAddingCompany] = useState(false);

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
      setAvailableFiles([]);
      setSelectedPdfFile('');
    }
  }, [selectedCompany]);

  // Load forms when selected PDF file changes
  useEffect(() => {
    if (selectedCompany && selectedPdfFile) {
      loadFormsForCompany(selectedCompany, selectedPdfFile);
    }
  }, [selectedPdfFile]);

  const loadAvailableCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const companies = await apiService.getCompanies();
      setAvailableCompanies(companies || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
      setError('Failed to load companies from database. Please check your connection.');
      // Show empty array during loading failure to avoid confusion
      setAvailableCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadFormsForCompany = async (company, filename = null) => {
    setIsLoadingForms(true);
    setError(null);
    try {
      const templateApiBase = apiService.getTemplateApiBase();
      const url = filename 
        ? `${templateApiBase}/list-forms?company=${company}&filename=${encodeURIComponent(filename)}`
        : `${templateApiBase}/list-forms?company=${company}`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableForms(data.forms || []);
        setAvailableFiles(data.files || []);
        
        // Auto-select the file returned by the backend if not already selected
        if (!selectedPdfFile && data.selected_file) {
          setSelectedPdfFile(data.selected_file);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to load forms. Please upload PDF first.');
        setAvailableForms([]);
        setAvailableFiles([]);
      }
    } catch (error) {
      setError('Failed to connect to template API. Make sure the template server is running.');
      setAvailableForms([]);
      setAvailableFiles([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedCompany) return;

    setIsUploading(true);
    setError(null);
    try {
      const templateApiBase = apiService.getTemplateApiBase();
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${templateApiBase}/upload?company=${selectedCompany}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        // Reload forms after successful upload
        await loadFormsForCompany(selectedCompany);
        // Reset file selection since we uploaded a new file
        setSelectedPdfFile('');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormExtraction = async () => {
    if (!selectedForm || !selectedCompany) return;

    setIsExtracting(true);
    setError(null);
    try {
      const templateApiBase = apiService.getTemplateApiBase();
      const url = selectedPdfFile 
        ? `${templateApiBase}/extract-form/${selectedForm}?company=${selectedCompany}&filename=${encodeURIComponent(selectedPdfFile)}`
        : `${templateApiBase}/extract-form/${selectedForm}?company=${selectedCompany}`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setExtractionResult(data.extraction_result);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Extraction failed');
      }
    } catch (error) {
      setError('Extraction failed: ' + error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddNewCompany = async () => {
    if (!newCompanyName.trim()) {
      setError('Company name is required');
      return;
    }

    setIsAddingCompany(true);
    setError(null);
    try {
      const newCompany = await apiService.createCompany(newCompanyName.trim());
      
      // Add to companies list and select it
      setAvailableCompanies(prev => [...prev, newCompany]);
      setSelectedCompany(newCompany.name);
      
      // Reset form
      setNewCompanyName('');
      setShowAddCompanyForm(false);
      
      console.log('Company added successfully:', newCompany);
    } catch (error) {
      setError('Failed to add company: ' + error.message);
    } finally {
      setIsAddingCompany(false);
    }
  };

  const handleCancelAddCompany = () => {
    setNewCompanyName('');
    setShowAddCompanyForm(false);
    setError(null);
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
          if (Array.isArray(subSubHeaders)) {
            totalCols += subSubHeaders.length;
          } else if (typeof subSubHeaders === 'object') {
            // Handle nested objects by counting their array values
            Object.values(subSubHeaders).forEach(value => {
              if (Array.isArray(value)) {
                totalCols += value.length;
              }
            });
          }
        });
        topRow.push({ text: mainKey, colspan: totalCols });
        
        Object.entries(subHeaders).forEach(([subKey, subSubHeaders]) => {
          if (Array.isArray(subSubHeaders)) {
            subSubHeaders.forEach(sub => {
              bottomRow.push({ text: sub, colspan: 1 });
              flatHeaders.push(subKey.includes('Participating') ? `P ${sub}` : `NP ${sub}`);
            });
          } else if (typeof subSubHeaders === 'object') {
            // Handle nested objects
            Object.entries(subSubHeaders).forEach(([nestedKey, nestedValue]) => {
              if (Array.isArray(nestedValue)) {
                nestedValue.forEach(sub => {
                  bottomRow.push({ text: sub, colspan: 1 });
                  flatHeaders.push(subKey.includes('Participating') ? `P ${sub}` : `NP ${sub}`);
                });
              }
            });
          }
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

    const { headerRows, flatHeaders } = createMultiLevelHeaders(extractionResult.FlatHeaders || extractionResult.Headers);
    console.log("Using headers:", extractionResult.FlatHeaders ? "FlatHeaders" : "Headers");
    console.log("Headers data:", extractionResult.FlatHeaders || extractionResult.Headers);

    return (
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-color-light)'
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>
              <thead>
                {headerRows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ backgroundColor: 'var(--main-color)', color: 'white' }}>
                    {row.map((header, colIndex) => (
                      <th key={colIndex} style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
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
                    backgroundColor: rowIndex % 2 === 0 ? 'white' : 'var(--bg-color-light)'
                  }}>
                    {flatHeaders.map((header, colIndex) => (
                      <td key={colIndex} style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
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

  return (
    <div>
      <h3 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
        🎯 Template-Based Form Extraction
      </h3>
      <p style={{ color: 'var(--text-color-light)', marginBottom: '1.5rem' }}>
        Extract specific forms from insurance PDFs using predefined templates. 
        Companies are loaded from MySQL database. Forms list is dynamically extracted from your uploaded PDF files.
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <select
              value={selectedCompany}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW') {
                  setShowAddCompanyForm(true);
                  setSelectedCompany('');
                } else {
                  setSelectedCompany(e.target.value);
                  setShowAddCompanyForm(false);
                }
              }}
              disabled={isLoadingCompanies}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {isLoadingCompanies ? (
                <option value="">🔄 Loading companies from database...</option>
              ) : availableCompanies.length === 0 ? (
                <option value="">⚠️ No companies found - Add a new one below</option>
              ) : (
                <option value="">✅ Choose from {availableCompanies.length} companies in database...</option>
              )}
              {availableCompanies.map(company => (
                <option key={company.id || company.name} value={company.name}>
                  {(company.name || company).toUpperCase()}
                </option>
              ))}
              {!isLoadingCompanies && (
                <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--main-color)' }}>
                  ➕ Add New Company
                </option>
              )}
            </select>
            
            {availableCompanies.length > 0 && (
              <button
                onClick={() => loadAvailableCompanies()}
                disabled={isLoadingCompanies}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--border-color)',
                  color: 'var(--text-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                title="Refresh companies list"
              >
                🔄
              </button>
            )}
          </div>
          
          {/* Add New Company Form */}
          {showAddCompanyForm && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              border: '2px solid var(--main-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color-light)'
            }}>
              <h4 style={{ color: 'var(--main-color)', margin: '0 0 1rem 0' }}>
                ➕ Add New Company
              </h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name (e.g., 'max', 'birla')"
                  disabled={isAddingCompany}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAddingCompany) {
                      handleAddNewCompany();
                    } else if (e.key === 'Escape') {
                      handleCancelAddCompany();
                    }
                  }}
                />
                <button
                  onClick={handleAddNewCompany}
                  disabled={!newCompanyName.trim() || isAddingCompany}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: (!newCompanyName.trim() || isAddingCompany) ? 'var(--border-color)' : 'var(--success-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: (!newCompanyName.trim() || isAddingCompany) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAddingCompany ? '⏳ Adding...' : '✅ Add'}
                </button>
                <button
                  onClick={handleCancelAddCompany}
                  disabled={isAddingCompany}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--error-bg)',
                    color: 'var(--error-color)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: isAddingCompany ? 'not-allowed' : 'pointer'
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-color-light)', margin: '0.5rem 0 0 0' }}>
                💡 Company names will be stored in lowercase in the database
              </p>
            </div>
          )}
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
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            />
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || !selectedCompany || isUploading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: (!selectedFile || !selectedCompany || isUploading) ? 'var(--border-color)' : 'var(--main-color)',
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

        {/* Step 3: Select PDF File (if multiple available) */}
        {selectedCompany && availableFiles.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              3️⃣ Select PDF File:
            </label>
            <select
              value={selectedPdfFile}
              onChange={(e) => setSelectedPdfFile(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Choose a PDF file...</option>
              {availableFiles.map(file => (
                <option key={file} value={file}>
                  📄 {file}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-color-light)', marginTop: '0.5rem' }}>
              💡 Select which PDF file to use for form extraction. Available files: {availableFiles.length}
            </p>
          </div>
        )}

        {/* Step 4: Form Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {availableFiles.length > 0 ? '4️⃣' : '3️⃣'} Select Form to Extract:
          </label>
          {isLoadingForms ? (
            <p style={{ color: 'var(--text-color-light)' }}>🔄 Loading available forms...</p>
          ) : availableForms.length > 0 && (availableFiles.length === 0 || selectedPdfFile) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
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
              <button
                onClick={handleFormExtraction}
                disabled={!selectedForm || isExtracting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (!selectedForm || isExtracting) ? 'var(--border-color)' : 'var(--success-color)',
                  color:(!selectedForm || isExtracting) ? 'black' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: (!selectedForm || isExtracting) ? 'not-allowed' : 'pointer'
                }}
              >
                {isExtracting ? '⏳ Extracting...' : '🎯 Extract Form Data'}
              </button>
              {selectedPdfFile && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-color-light)' }}>
                  📄 Using file: {selectedPdfFile}
                </p>
              )}
            </div>
          ) : availableFiles.length > 0 && !selectedPdfFile ? (
            <p style={{ color: 'var(--text-color-light)' }}>
              📄 Please select a PDF file above to view available forms.
            </p>
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
    </div>
  );
};

export default TemplateBasedExtractor;
