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
    padding: '14px 24px',
    margin: '0 4px',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'var(--transition)',
    outline: 'none',
    minWidth: '140px'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: 'var(--sub-color)',
    color: 'white',
    borderColor: 'var(--sub-color)',
    boxShadow: 'var(--shadow-light)'
  };

  const inactiveButtonStyle = {
    ...buttonStyle,
    background: 'white',
    color: 'var(--text-color-dark)',
    borderColor: '#e9ecef'
  };

  const dropZoneStyle = {
    border: `3px dashed ${dragActive ? 'var(--sub-color)' : '#e9ecef'}`,
    borderRadius: '16px',
    padding: '3rem 2rem',
    textAlign: 'center',
    background: dragActive ? 'rgba(63, 114, 175, 0.05)' : 'var(--background-color)',
    transition: 'var(--transition)',
    cursor: 'pointer',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '1.5rem',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto'
  };

  return (
    <div style={{ margin: '0' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ 
          marginBottom: '2rem', 
          color: 'var(--main-color)',
          fontSize: '1.5rem',
          fontWeight: '700',
          textAlign: 'center'
        }}>
          Smart PDF Extraction
        </h3>
        
        {/* Upload Mode Selection */}
        <div style={{ 
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <label style={{ 
            color: 'var(--text-color-dark)', 
            fontWeight: '600',
            fontSize: '16px',
            marginBottom: '0.75rem',
            textAlign: 'center'
          }}>
            Upload Mode:
          </label>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
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
        </div>

        {/* Extract Mode Selection */}
        <div style={{ 
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <label style={{ 
            color: 'var(--text-color-dark)', 
            fontWeight: '600',
            fontSize: '16px',
            marginBottom: '0.75rem',
            textAlign: 'center'
          }}>
            Extraction Method:
          </label>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
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
              borderTop: '4px solid var(--sub-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--sub-color)', fontWeight: '600' }}>
              {uploadMode === 'single' ? 'Processing PDF...' : 'Uploading files...'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: '4rem',
              color: dragActive ? 'var(--sub-color)' : 'var(--text-color-light)',
              marginBottom: '1.5rem'
            }}>
              📄
            </div>
            <p style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              color: dragActive ? 'var(--sub-color)' : 'var(--text-color-dark)',
              marginBottom: '1rem'
            }}>
              {dragActive ? 'Drop PDF files here' : 'Drop PDF files here or click to browse'}
            </p>
            <p style={{ 
              color: 'var(--text-color-light)', 
              fontSize: '1rem',
              marginBottom: '0.75rem',
              lineHeight: '1.5'
            }}>
              {uploadMode === 'single' 
                ? 'Single file mode: Get instant results'
                : 'Bulk mode: Process multiple files in background'
              }
            </p>
            <p style={{ 
              color: 'var(--text-color-light)', 
              fontSize: '0.9rem',
              opacity: 0.8,
              lineHeight: '1.4'
            }}>
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
