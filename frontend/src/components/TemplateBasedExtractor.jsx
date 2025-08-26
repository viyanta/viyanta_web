import React, { useState, useEffect } from 'react';

const TemplateBasedExtractor = () => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState(['sbi', 'hdfc', 'icici', 'bajaj']);
  const [error, setError] = useState(null);

  // Template API base URL (main backend on port 8000)
  const TEMPLATE_API_BASE = 'http://localhost:8000/templates';

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
      const response = await fetch(`${TEMPLATE_API_BASE}/companies`);
      if (response.ok) {
        const data = await response.json();
        setAvailableCompanies(data.companies || ['sbi', 'hdfc', 'icici', 'bajaj']);
      }
    } catch (error) {
      console.log('Using default companies list');
    }
  };

  const loadFormsForCompany = async (company) => {
    setIsLoadingForms(true);
    setError(null);
    try {
      const response = await fetch(`${TEMPLATE_API_BASE}/list-forms?company=${company}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableForms(data.forms || []);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to load forms. Please upload PDF first.');
        setAvailableForms([]);
      }
    } catch (error) {
      setError('Failed to connect to template API. Make sure the template server is running.');
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
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${TEMPLATE_API_BASE}/upload?company=${selectedCompany}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        // Reload forms after successful upload
        await loadFormsForCompany(selectedCompany);
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
      const response = await fetch(`${TEMPLATE_API_BASE}/extract-form/${selectedForm}?company=${selectedCompany}`);
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
              border: '1px solid var(--border-color)',
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
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: (!selectedForm || isExtracting) ? 'not-allowed' : 'pointer'
                }}
              >
                {isExtracting ? '⏳ Extracting...' : '🎯 Extract Form Data'}
              </button>
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
    </div>
  );
};

export default TemplateBasedExtractor;
