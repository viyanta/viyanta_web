import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';

const PDFSplitterWorkflow = ({ user }) => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPDF, setSelectedPDF] = useState('');
  const [selectedForms, setSelectedForms] = useState([]); // Multi-select
  const [companyPDFs, setCompanyPDFs] = useState([]);
  const [pdfSplits, setPdfSplits] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionPhase, setExtractionPhase] = useState(''); // 'python' or 'gemini'
  const [extractedData, setExtractedData] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [pythonExtractionComplete, setPythonExtractionComplete] = useState(false);
  const [geminiCorrectionComplete, setGeminiCorrectionComplete] = useState(false);
  const [isPythonExtracting, setIsPythonExtracting] = useState(false);
  const [isGeminiCorrecting, setIsGeminiCorrecting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [formStatuses, setFormStatuses] = useState({}); // { filename: { python: status, gemini: status, error: msg } }
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const formDropdownRef = useRef(null);

  // Add state for expanded results and per-form extracted data
  const [expandedResults, setExpandedResults] = useState({}); // { filename: true/false }
  const [extractedResults, setExtractedResults] = useState({}); // { filename: { data, loading, error } }

  // Load companies from database
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      console.log('Loading companies from database...');
      const response = await apiService.getCompanies();
      console.log('Companies response:', response);
      
      // Extract company names from the response
      const companyNames = response.map(company => company.name);
      setCompanies(companyNames);
      console.log('Companies loaded:', companyNames);
    } catch (error) {
      console.error('Failed to load companies:', error);
      // Fallback to hardcoded companies
      setCompanies([
        'ACKO Life',
        'Aditya Birla Sun Life',
        'Ageas Federal Life',
        'AVIVA Life',
        'AXIS Max Life',
        'Bajaj Allianz',
        'Bandhan Life',
        'Bharti AXA Life',
        'Canara HSBC Life',
        'CreditAccess Life',
        'EDELWEISS Tokio Life',
        'Future Generali India Life',
        'GO Digit Life',
        'HDFC Life',
        'ICICI Prudential',
        'IndiaFirst Life',
        'Kotak Life',
        'LIC of India',
        'PNB MetLife Life',
        'Pramerica Life',
        'Reliance Nippon Life',
        'SBI Life',
        'Shriram Life',
        'STARUNION Daichi Life',
        'TATA Aig Life'
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

  // Clear extraction data when form changes
  const clearExtractionData = () => {
    setExtractedData(null);
    setExtractionError(null);
    setIsExtracting(false);
    setExtractionPhase('');
    setPythonExtractionComplete(false);
    setGeminiCorrectionComplete(false);
    setIsPythonExtracting(false);
    setIsGeminiCorrecting(false);
    setSelectedForms([]);
    setFormStatuses({});
  };

  const handlePythonExtraction = async () => {
    if (selectedForms.length === 0 || !user?.id) {
      setError('Please select one or more forms to extract and ensure you are logged in');
      return;
    }

    setIsPythonExtracting(true);
    setExtractionPhase('python');
    setExtractionError(null);
    setError('');
    setSuccess('');

    let statuses = { ...formStatuses };

    for (const form of selectedForms) {
      statuses[form] = { ...statuses[form], extracting: true, error: '', python: false };
      setFormStatuses({ ...statuses });

      // Find the selected split
      const selectedSplit = pdfSplits.find(split => split.filename === form);
      if (!selectedSplit) {
        statuses[form] = { ...statuses[form], extracting: false, error: 'Selected form not found' };
        setFormStatuses({ ...statuses });
        continue;
      }

      try {
        // Simulate Python extraction processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mark Python extraction as complete
        statuses[form] = { ...statuses[form], extracting: false, python: true, error: '' };
        setFormStatuses({ ...statuses });
      } catch (error) {
        statuses[form] = { ...statuses[form], extracting: false, error: `Python extraction failed: ${error.message}` };
        setFormStatuses({ ...statuses });
      }
    }

    setIsPythonExtracting(false);
    setPythonExtractionComplete(true);
    setSuccess('Python extraction completed for all selected forms! Click "Gemini AI Correction" to proceed.');
  };

  const handleGeminiCorrection = async () => {
    if (selectedForms.length === 0 || !user?.id) {
      setError('Please select one or more forms to extract and ensure you are logged in');
      return;
    }

    // Check all forms have python extraction complete
    for (const form of selectedForms) {
      if (!formStatuses[form]?.python) {
        setError('Please complete Python extraction for all selected forms first');
        return;
      }
    }

    setIsGeminiCorrecting(true);
    setExtractionPhase('gemini');
    setExtractionError(null);
    setError('');
    setSuccess('');

    let statuses = { ...formStatuses };

    for (const form of selectedForms) {
      statuses[form] = { ...statuses[form], correcting: true, error: '', gemini: false };
      setFormStatuses({ ...statuses });

      // Find the selected split
      const selectedSplit = pdfSplits.find(split => split.filename === form);
      if (!selectedSplit) {
        statuses[form] = { ...statuses[form], correcting: false, error: 'Selected form not found' };
        setFormStatuses({ ...statuses });
        continue;
      }

      try {
        // Check if already Gemini-corrected (fetch from backend)
        const existing = await apiService.getExtractedData(selectedCompany, selectedPDF, form);
        if (existing.success && existing.metadata && existing.metadata.gemini_corrected) {
          // Already corrected, just update status
          statuses[form] = { ...statuses[form], correcting: false, gemini: true, error: '', data: existing };
          setFormStatuses({ ...statuses });
          continue;
        }

        // Not corrected, call backend for gemini correction
        statuses[form] = { ...statuses[form], correcting: true, error: '' };
        setFormStatuses({ ...statuses });
        const result = await apiService.extractFormData(
          selectedCompany,
          selectedPDF,
          form,
          user?.id,
          { phase: 'gemini' }
        );
        if (result.success) {
          statuses[form] = { ...statuses[form], correcting: false, gemini: true, error: '', data: result };
          setFormStatuses({ ...statuses });
        } else {
          statuses[form] = { ...statuses[form], correcting: false, error: result.detail || 'Correction failed' };
          setFormStatuses({ ...statuses });
        }
      } catch (error) {
        statuses[form] = { ...statuses[form], correcting: false, error: `Gemini correction failed: ${error.message}` };
        setFormStatuses({ ...statuses });
      }
    }

    setIsGeminiCorrecting(false);
    setGeminiCorrectionComplete(true);
    setSuccess('Gemini AI correction completed for all selected forms!');
  };

  const cardStyle = {
    background: 'var(--card-background)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
    marginBottom: '1.5rem',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'visible'
  };

  const stepStyle = {
    background: 'var(--bg-color)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    border: '1px solid var(--border-color)',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'visible'
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

  // Close dropdown on outside click (fix: don't close if click is on checkbox/label)
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        formDropdownRef.current &&
        !formDropdownRef.current.contains(event.target)
      ) {
        setShowFormDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

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
            setSelectedForms([]);
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
            setSelectedForms([]);
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
          4️⃣ Select Form(s) to Extract:
        </h3>
        <div style={{ position: 'relative', width: '100%' }} ref={formDropdownRef}>
          <div
            style={{
              ...selectStyle,
              cursor: pdfSplits.length === 0 ? 'not-allowed' : 'pointer',
              background: '#fff',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: selectedForms.length > 0 ? 'var(--text-color-dark)' : '#888',
              fontWeight: 500
            }}
            onClick={() => {
              if (pdfSplits.length > 0) setShowFormDropdown(v => !v);
            }}
          >
            {selectedForms.length === 0 ? 'Choose form(s)...' : selectedForms.map(f => pdfSplits.find(s => s.filename === f)?.form_name).filter(Boolean).join(', ')}
            <span style={{ marginLeft: 'auto', fontSize: '1.2em', color: '#888' }}>▼</span>
          </div>
          {showFormDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                width: '100%',
                background: '#fff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                zIndex: 10,
                maxHeight: '250px',
                overflowY: 'auto',
                padding: '0.5rem 0'
              }}
              onMouseDown={e => e.stopPropagation()} // Prevent dropdown from closing on checkbox click
            >
              {pdfSplits.map(split => (
                <label
                  key={split.filename}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontSize: '15px',
                    background: selectedForms.includes(split.filename) ? '#f0f7ff' : 'transparent',
                    borderBottom: '1px solid #f5f5f5',
                    userSelect: 'none'
                  }}
                  onMouseDown={e => e.stopPropagation()} // Prevent dropdown from closing on label click
                >
                  <input
                    type="checkbox"
                    checked={selectedForms.includes(split.filename)}
                    onChange={e => {
                      let newSelected;
                      if (e.target.checked) {
                        newSelected = [...selectedForms, split.filename];
                      } else {
                        newSelected = selectedForms.filter(f => f !== split.filename);
                      }
                      setSelectedForms(newSelected);
                      setError('');
                      setSuccess('');
                      // Only clear extraction data for this form, not all
                      setFormStatuses(prev => {
                        const updated = { ...prev };
                        delete updated[split.filename];
                        return updated;
                      });
                    }}
                    style={{ marginRight: '0.75rem' }}
                    onMouseDown={e => e.stopPropagation()} // Prevent dropdown from closing on checkbox click
                  />
                  <span style={{ flex: 1 }}>
                    📋 {split.form_name} (Pages {split.start_page}-{split.end_page})
                  </span>
                </label>
              ))}
              {pdfSplits.length === 0 && (
                <div style={{ padding: '0.5rem 1rem', color: '#888' }}>No forms available</div>
              )}
            </div>
          )}
        </div>
        {selectedForms.length > 0 && (
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            ✅ Selected: {selectedForms.map(f => pdfSplits.find(s => s.filename === f)?.form_name).filter(Boolean).join(', ')}
          </div>
        )}
        {pdfSplits.length === 0 && selectedPDF && (
          <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-color-light)' }}>
            💡 No split forms found. The PDF may not have been processed yet.
          </div>
        )}
      </div>

      {/* Step 5: Python Extraction */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          5️⃣ Python Extraction:
        </h3>
        <button
          style={{
            ...buttonStyle,
            marginTop: '0.75rem',
            opacity: (selectedForms.length === 0 || isPythonExtracting) ? 0.6 : 1,
            background: isPythonExtracting ? '#4caf50' : 'var(--main-color)'
          }}
          onClick={async () => {
            setIsPythonExtracting(true);
            setError('');
            setSuccess('');
            let statuses = { ...formStatuses };
            for (const form of selectedForms) {
              // Only extract if not already done
              if (statuses[form]?.python === 'done') continue;
              statuses[form] = { ...statuses[form], python: 'extracting', error: null };
              setFormStatuses({ ...statuses });
              try {
                const selectedSplit = pdfSplits.find(split => split.filename === form);
                if (!selectedSplit) {
                  statuses[form] = { ...statuses[form], python: 'error', error: 'Form not found' };
                  setFormStatuses({ ...statuses });
                  continue;
                }
                // Call backend for python extraction ONLY
                const result = await apiService.extractFormData(
                  selectedCompany,
                  selectedPDF,
                  form,
                  user?.id,
                  { phase: 'python' }
                );
                if (result.success) {
                  statuses[form] = { ...statuses[form], python: 'done', error: null };
                  setFormStatuses({ ...statuses });
                } else {
                  statuses[form] = { ...statuses[form], python: 'error', error: result.detail || 'Extraction failed' };
                  setFormStatuses({ ...statuses });
                }
              } catch (err) {
                statuses[form] = { ...statuses[form], python: 'error', error: err.message };
                setFormStatuses({ ...statuses });
              }
            }
            setIsPythonExtracting(false);
            setSuccess('Python extraction completed for all selected forms!');
          }}
          disabled={selectedForms.length === 0 || isPythonExtracting}
        >
          {isPythonExtracting ? '🐍 Extracting...' : '🐍 Start Python Extraction'}
        </button>
        {selectedForms.length > 0 && (
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            {selectedForms.map(form => (
              <div key={form}>
                {pdfSplits.find(s => s.filename === form)?.form_name}: {formStatuses[form]?.python === 'done' ? '✅ Done' : formStatuses[form]?.python === 'extracting' ? '⏳ Extracting...' : formStatuses[form]?.python === 'error' ? `❌ Error: ${formStatuses[form].error}` : '⏺ Pending'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 6: Show Split Details */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          6️⃣ Split Details:
        </h3>
        {selectedPDF && selectedForms.length > 0 && (
          <div style={{ fontSize: '0.95rem', color: 'var(--text-color-dark)', lineHeight: '1.5', marginBottom: '1rem' }}>
            <div><strong>PDF Name:</strong> {selectedPDF}</div>
            <div><strong>Original Path:</strong> {`uploads\\${selectedCompany.toLowerCase().replace(/ /g, '_')}\\${selectedPDF}.pdf`}</div>
            <div><strong>Splits Location:</strong> {`pdf_splits\\${selectedCompany.toLowerCase().replace(/ /g, '_')}\\${selectedPDF}`}</div>
            <div><strong>Selected Split File:</strong> {selectedForms.join(', ')}</div>
            <div><strong>Form Name:</strong> {selectedForms.map(f => pdfSplits.find(s => s.filename === f)?.form_name).filter(Boolean).join(', ')}</div>
            <div><strong>Form Template:</strong> {(() => {
              const split = pdfSplits.find(s => s.filename === selectedForms[0]);
              const formCode = split?.form_code;
              return formCode ? `templates\\${selectedCompany.toLowerCase().replace(/ /g, '_')}\\${formCode}.json` : 'N/A';
            })()}</div>
            <div><strong>Pages:</strong> {(() => {
              const split = pdfSplits.find(s => s.filename === selectedForms[0]);
              return split ? `${split.start_page}-${split.end_page}` : 'N/A';
            })()}</div>
          </div>
        )}
        {selectedPDF && pdfSplits.length > 0 && selectedForms.length === 0 && (
          <div style={{ fontSize: '0.95rem', color: 'var(--text-color-light)' }}>
            Please select a split form to view details.
          </div>
        )}
      </div>

      {/* Step 7: Gemini AI Correction */}
      <div style={stepStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color-dark)' }}>
          7️⃣ Gemini AI Correction:
        </h3>
        <button
          style={{
            ...buttonStyle,
            marginTop: '0.75rem',
            opacity: (selectedForms.length === 0 || isGeminiCorrecting || selectedForms.some(f => formStatuses[f]?.python !== 'done')) ? 0.6 : 1,
            background: isGeminiCorrecting ? '#ff9800' : '#ff9800'
          }}
          onClick={async () => {
            setIsGeminiCorrecting(true);
            setError('');
            setSuccess('');
            let statuses = { ...formStatuses };
            for (const form of selectedForms) {
              // Only correct if not already done
              if (statuses[form]?.gemini === 'done') continue;
              if (statuses[form]?.python !== 'done') continue;
              statuses[form] = { ...statuses[form], gemini: 'checking', error: null };
              setFormStatuses({ ...statuses });

              try {
                // Check if already Gemini-corrected (fetch from backend)
                const existing = await apiService.getExtractedData(selectedCompany, selectedPDF, form);
                if (existing.success && existing.metadata && existing.metadata.gemini_corrected) {
                  // Already corrected, just update status
                  statuses[form] = { ...statuses[form], gemini: 'done', error: null };
                  setFormStatuses({ ...statuses });
                  continue;
                }
                // Not corrected, call backend for gemini correction
                statuses[form] = { ...statuses[form], gemini: 'correcting', error: null };
                setFormStatuses({ ...statuses });
                const result = await apiService.extractFormData(
                  selectedCompany,
                  selectedPDF,
                  form,
                  user?.id,
                  { phase: 'gemini' }
                );
                if (result.success) {
                  statuses[form] = { ...statuses[form], gemini: 'done', error: null };
                  setFormStatuses({ ...statuses });
                } else {
                  statuses[form] = { ...statuses[form], gemini: 'error', error: result.detail || 'Correction failed' };
                  setFormStatuses({ ...statuses });
                }
              } catch (err) {
                statuses[form] = { ...statuses[form], gemini: 'error', error: err.message };
                setFormStatuses({ ...statuses });
              }
            }
            setIsGeminiCorrecting(false);
            setSuccess('Gemini AI correction completed for all selected forms!');
          }}
          disabled={selectedForms.length === 0 || isGeminiCorrecting || selectedForms.some(f => formStatuses[f]?.python !== 'done')}
        >
          {isGeminiCorrecting ? '🤖 Correcting...' : '🤖 Start Gemini AI Correction'}
        </button>
        {selectedForms.length > 0 && (
          <div style={{ marginTop: '0.5rem', color: 'var(--success-color)', fontSize: '14px' }}>
            {selectedForms.map(form => (
              <div key={form}>
                {pdfSplits.find(s => s.filename === form)?.form_name}: {formStatuses[form]?.gemini === 'done' ? '✅ Done' : formStatuses[form]?.gemini === 'correcting' ? '⏳ Correcting...' : formStatuses[form]?.gemini === 'error' ? `❌ Error: ${formStatuses[form].error}` : formStatuses[form]?.python === 'done' ? '⏺ Ready' : '⏺ Pending'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 8: Python Extraction Progress */}
      {isPythonExtracting && (
        <div style={stepStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color-dark)' }}>
            8️⃣ Python Extraction Progress:
          </h3>
          
          <div style={{ 
            padding: '1rem', 
            background: '#e3f2fd', 
            borderRadius: '8px',
            border: '1px solid #2196f3',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🐍</div>
            <p style={{ margin: 0, color: '#1976d2', fontWeight: '500' }}>
              Python extraction in progress...
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#1565c0' }}>
              Using Camelot and templates to extract table data
            </p>
          </div>
        </div>
      )}

      {/* Step 9: Gemini Correction Progress */}
      {isGeminiCorrecting && (
        <div style={stepStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color-dark)' }}>
            9️⃣ Gemini AI Correction Progress:
          </h3>
          
          <div style={{ 
            padding: '1rem', 
            background: '#e8f5e8', 
            borderRadius: '8px',
            border: '1px solid #4caf50',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
            <p style={{ margin: 0, color: '#2e7d32', fontWeight: '500' }}>
              Applying Gemini AI corrections...
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#388e3c' }}>
              AI-powered verification and data enhancement
            </p>
          </div>
        </div>
      )}

      {/* Step 10: Extraction Results (multi-form) */}
      {Array.isArray(selectedForms) && selectedForms.length > 0 && (
        <div style={stepStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color-dark)' }}>
            🔍 Extraction Results:
          </h3>
          {selectedForms.map(f => (
            <div key={f} style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#1976d2' }}>{pdfSplits.find(s => s.filename === f)?.form_name}</h4>
              {formStatuses[f]?.error && (
                <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '8px', border: '1px solid #f44336', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌</div>
                  <p style={{ margin: 0, color: '#d32f2f' }}>{formStatuses[f].error}</p>
                </div>
              )}
              {formStatuses[f]?.data && formStatuses[f].data.success && (
                <div style={{ padding: '1rem', background: '#e8f5e8', borderRadius: '8px', border: '1px solid #4caf50', marginBottom: '1rem' }}>
                  {/* Metadata Display */}
                  {formStatuses[f].data.metadata && (
                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>Extraction Details:</h5>
                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <div><strong>Form Code:</strong> {formStatuses[f].data.metadata.form_code}</div>
                        <div><strong>Template Used:</strong> {formStatuses[f].data.metadata.template_used?.split('/').pop()}</div>
                        <div><strong>Gemini Corrected:</strong> {formStatuses[f].data.metadata.gemini_corrected ? 'Yes' : 'No'}</div>
                        <div><strong>Extracted At:</strong> {new Date(formStatuses[f].data.metadata.extracted_at).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {/* Data Table Display */}
                  {formStatuses[f].data.data && Array.isArray(formStatuses[f].data.data) && formStatuses[f].data.data.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '6px', border: '1px solid #e0e0e0', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <div style={{ background: '#f5f5f5', padding: '0.75rem', borderBottom: '1px solid #e0e0e0', fontWeight: '600' }}>
                        📊 Extracted Data ({formStatuses[f].data.data.length} record{formStatuses[f].data.data.length !== 1 ? 's' : ''})
                      </div>
                      <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden', padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
                        {formStatuses[f].data.data.map((record, index) => (
                          <div key={index} style={{ marginBottom: index < formStatuses[f].data.data.length - 1 ? '1.5rem' : 0, paddingBottom: index < formStatuses[f].data.data.length - 1 ? '1.5rem' : 0, borderBottom: index < formStatuses[f].data.data.length - 1 ? '1px solid #f0f0f0' : 'none', width: '100%', boxSizing: 'border-box' }}>
                            <h6 style={{ margin: '0 0 0.75rem 0', color: '#1976d2' }}>
                              Record {index + 1} {record.FormName && `- ${record.FormName}`}
                            </h6>
                            
                            {/* Metadata */}
                            {(record.FormName || record.PeriodStart || record.PeriodEnd || record.PagesUsed) && (
                              <div style={{ background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                {record.FormName && <div><strong>Form:</strong> {record.FormName}</div>}
                                {record.PeriodStart && <div><strong>Period Start:</strong> {record.PeriodStart}</div>}
                                {record.PeriodEnd && <div><strong>Period End:</strong> {record.PeriodEnd}</div>}
                                {record.PagesUsed && <div><strong>Pages Used:</strong> {record.PagesUsed}</div>}
                              </div>
                            )}

                            {/* Table Data */}
                            {record.Rows && Array.isArray(record.Rows) && record.Rows.length > 0 && (
                              <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                                <div 
                                  className="table-scroll-container"
                                  style={{ 
                                    overflowX: 'scroll',
                                    overflowY: 'scroll',
                                    maxHeight: '500px',
                                    width: '100%',
                                    maxWidth: '100%',
                                    display: 'block',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <table style={{ 
                                    width: 'max-content',
                                    minWidth: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '0.8rem',
                                    margin: 0
                                  }}>
                                    <thead>
                                      <tr style={{ background: '#f5f5f5' }}>
                                        {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                          <th key={headerIndex} style={{ 
                                            padding: '0.5rem',
                                            textAlign: 'left',
                                            borderRight: '1px solid #e0e0e0',
                                            borderBottom: '1px solid #e0e0e0',
                                            fontWeight: '600',
                                            whiteSpace: 'nowrap',
                                            minWidth: '120px'
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
                                              borderBottom: '1px solid #e0e0e0',
                                              whiteSpace: 'nowrap',
                                              minWidth: '120px'
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
                        const dataStr = JSON.stringify(formStatuses[f].data.data, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${f.replace('.pdf', '')}_extracted.json`;
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
                        if (formStatuses[f].data.data && formStatuses[f].data.data.length > 0 && formStatuses[f].data.data[0].Rows) {
                          const headers = formStatuses[f].data.data[0].FlatHeaders || [];
                          const rows = formStatuses[f].data.data.flatMap(record => record.Rows || []);
                          
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
                          a.download = `${f.replace('.pdf', '')}_extracted.csv`;
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
          ))}
        </div>
      )}

      {/* Step 10: Extraction Results */}
      {selectedForms.length > 0 && (
        <div style={stepStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color-dark)' }}>
            🔍 Extraction Results:
          </h3>
          {selectedForms.map(form => {
            const status = formStatuses[form];
            const split = pdfSplits.find(s => s.filename === form);
            // Only show if gemini correction is done
            if (!status || status.gemini !== 'done') return null;
            const isExpanded = expandedResults[form] || false;
            const result = extractedResults[form] || {};
            return (
              <div key={form} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
                <div
                  style={{ cursor: 'pointer', fontWeight: 600, color: '#1976d2', marginBottom: '0.5rem' }}
                  onClick={async () => {
                    setExpandedResults(prev => ({ ...prev, [form]: !isExpanded }));
                    if (!isExpanded && !result.data && !result.loading) {
                      setExtractedResults(prev => ({ ...prev, [form]: { ...prev[form], loading: true, error: null } }));
                      try {
                        const res = await apiService.getExtractedData(selectedCompany, selectedPDF, form);
                        if (res.success) {
                          setExtractedResults(prev => ({ ...prev, [form]: { data: res, loading: false, error: null } }));
                        } else {
                          setExtractedResults(prev => ({ ...prev, [form]: { data: null, loading: false, error: res.detail || 'No data' } }));
                        }
                      } catch (err) {
                        setExtractedResults(prev => ({ ...prev, [form]: { data: null, loading: false, error: err.message } }));
                      }
                    }
                  }}
                >
                  {isExpanded ? '▼' : '▶'} {split?.form_name || form} (Click to {isExpanded ? 'hide' : 'show'})
                </div>
                {isExpanded && result.loading && (
                  <div style={{ color: '#888', fontSize: '14px', marginTop: '0.5rem' }}>Loading...</div>
                )}
                {isExpanded && result.error && (
                  <div style={{ color: 'red', fontSize: '14px', marginTop: '0.5rem' }}>{result.error}</div>
                )}
                {isExpanded && result.data && result.data.data && Array.isArray(result.data.data) && result.data.data.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '6px', border: '1px solid #e0e0e0', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <div style={{ background: '#f5f5f5', padding: '0.75rem', borderBottom: '1px solid #e0e0e0', fontWeight: '600' }}>
                      📊 Extracted Data ({result.data.data.length} record{result.data.data.length !== 1 ? 's' : ''})
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden', padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
                      {result.data.data.map((record, index) => (
                        <div key={index} style={{ marginBottom: index < result.data.data.length - 1 ? '1.5rem' : 0, paddingBottom: index < result.data.data.length - 1 ? '1.5rem' : 0, borderBottom: index < result.data.data.length - 1 ? '1px solid #f0f0f0' : 'none', width: '100%', boxSizing: 'border-box' }}>
                          <h6 style={{ margin: '0 0 0.75rem 0', color: '#1976d2' }}>
                            Record {index + 1} {record.FormName && `- ${record.FormName}`}
                          </h6>
                          {/* Table Data */}
                          {record.Rows && Array.isArray(record.Rows) && record.Rows.length > 0 && (
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                              <div className="table-scroll-container" style={{ overflowX: 'scroll', overflowY: 'scroll', maxHeight: '500px', width: '100%', maxWidth: '100%', display: 'block', boxSizing: 'border-box' }}>
                                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', margin: 0 }}>
                                  <thead>
                                    <tr style={{ background: '#f5f5f5' }}>
                                      {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                        <th key={headerIndex} style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', fontWeight: '600', whiteSpace: 'nowrap', minWidth: '120px' }}>
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.Rows.map((row, rowIndex) => (
                                      <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? 'white' : '#fafafa' }}>
                                        {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                          <td key={headerIndex} style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap', minWidth: '120px' }}>
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
                {isExpanded && result.data && (!result.data.data || result.data.data.length === 0) && (
                  <div style={{ color: '#888', fontSize: '14px', marginTop: '0.5rem' }}>No data available.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PDFSplitterWorkflow;