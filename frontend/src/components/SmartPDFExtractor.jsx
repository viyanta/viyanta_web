import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const SmartPDFExtractor = ({ onExtractComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [extractMode, setExtractMode] = useState('both');
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      onError('Please select PDF files only');
      return;
    }

    console.log(`Processing ${pdfFiles.length} PDF files in ${uploadMode} mode`);

    setIsUploading(true);

    try {
      let response;
      
      if (uploadMode === 'single' && pdfFiles.length === 1) {
        // Single file extraction with immediate response
        response = await apiService.extractSinglePDF(pdfFiles[0], extractMode, 'both');
        console.log('Single file extraction response:', response);
      } else {
        // Bulk extraction (background processing)
        response = await apiService.extractBulkPDFs(pdfFiles, extractMode);
        console.log('Bulk extraction response:', response);
      }

      onExtractComplete(response, uploadMode, pdfFiles.length);
    } catch (error) {
      console.error('Extraction error:', error);
      onError(error.message || 'Extraction failed');
    } finally {
      setIsUploading(false);
    }
  };

  const buttonStyle = {
    padding: '12px 24px',
    margin: '0 8px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    outline: 'none'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
  };

  const inactiveButtonStyle = {
    ...buttonStyle,
    background: '#f8f9fa',
    color: '#6c757d',
    border: '2px solid #e9ecef'
  };

  const dropZoneStyle = {
    border: `3px dashed ${dragActive ? '#667eea' : '#e9ecef'}`,
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    background: dragActive ? 'rgba(102, 126, 234, 0.1)' : '#f8f9fa',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  return (
    <div style={{ margin: '2rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Smart PDF Extraction</h3>
        
        {/* Upload Mode Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem', color: '#6c757d', fontWeight: '600' }}>
            Upload Mode:
          </label>
          <button
            style={uploadMode === 'single' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => setUploadMode('single')}
          >
            Single File (Instant)
          </button>
          <button
            style={uploadMode === 'bulk' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => setUploadMode('bulk')}
          >
            Bulk Upload (Background)
          </button>
        </div>

        {/* Extract Mode Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem', color: '#6c757d', fontWeight: '600' }}>
            Extraction Method:
          </label>
          <button
            style={extractMode === 'both' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => setExtractMode('both')}
          >
            Both
          </button>
          <button
            style={extractMode === 'stream' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => setExtractMode('stream')}
          >
            Stream
          </button>
          <button
            style={extractMode === 'lattice' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => setExtractMode('lattice')}
          >
            Lattice
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        style={dropZoneStyle}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={uploadMode === 'bulk'}
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {isUploading ? (
          <div>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#667eea', fontWeight: '600' }}>
              {uploadMode === 'single' ? 'Processing PDF...' : 'Uploading files...'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: '3rem',
              color: dragActive ? '#667eea' : '#bbb',
              marginBottom: '1rem'
            }}>
              📄
            </div>
            <p style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              color: dragActive ? '#667eea' : '#6c757d',
              marginBottom: '0.5rem'
            }}>
              {dragActive ? 'Drop PDF files here' : 'Drop PDF files here or click to browse'}
            </p>
            <p style={{ color: '#adb5bd', fontSize: '0.9rem' }}>
              {uploadMode === 'single' 
                ? 'Single file mode: Get instant results'
                : 'Bulk mode: Process multiple files in background'
              }
            </p>
            <p style={{ color: '#adb5bd', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Maximum file size: 100MB | Supported format: PDF
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SmartPDFExtractor;
