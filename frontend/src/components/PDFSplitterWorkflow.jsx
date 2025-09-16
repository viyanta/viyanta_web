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

  const companies = [
    'SBI Life', 'HDFC Life', 'ICICI Prudential', 'Bajaj Allianz', 
    'Aditya Birla Sun Life', 'Canara HSBC Life', 'GO Digit Life', 'Shriram Life'
  ];

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
    if (!selectedForm) {
      setError('Please select a form to extract');
      return;
    }

    try {
      // Find the selected split
      const selectedSplit = pdfSplits.find(split => split.filename === selectedForm);
      if (!selectedSplit) {
        setError('Selected form not found');
        return;
      }

      // Download the split file for extraction
      const blob = await apiService.downloadSplitFile(selectedCompany, selectedPDF, selectedForm);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedForm;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`Form ${selectedSplit.form_name} downloaded successfully!`);
    } catch (error) {
      setError(`Extraction failed: ${error.message}`);
    }
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
          onChange={(e) => {
            setSelectedCompany(e.target.value);
            setSelectedPDF('');
            setSelectedForm('');
            setError('');
            setSuccess('');
          }}
        >
          <option value="">Choose a company...</option>
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
            opacity: !selectedForm ? 0.6 : 1
          }}
          onClick={handleExtractForm}
          disabled={!selectedForm}
        >
          🎯 Extract Form Data
        </button>
        {pdfSplits.length === 0 && selectedPDF && (
          <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-color-light)' }}>
            💡 No split forms found. The PDF may not have been processed yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFSplitterWorkflow;
