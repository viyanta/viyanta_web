import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const SmartPDFExtractor = ({ onExtractComplete, onError, user }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [extractMode, setExtractMode] = useState('both');
  const [uploadMode, setUploadMode] = useState('single'); // 'single', 'bulk', or 'folder'
  const [dragActive, setDragActive] = useState(false);
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [timerSec, setTimerSec] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Timer for live processing time
  React.useEffect(() => {
    let interval;
    if (isUploading) {
      setTimerSec(0);
      interval = setInterval(() => setTimerSec(prev => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading]);

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

  const handleFolderSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFolderFiles(pdfs);
    // Capture root folder name from webkitRelativePath
    const root = files.length && files[0].webkitRelativePath ? 
      (files[0].webkitRelativePath.split('/')[0] || '') : '';
    setFolderName(root);
  };

  const processFolder = async () => {
    if (!folderFiles || folderFiles.length === 0) {
      onError('Please select a folder that contains PDF files.');
      return;
    }

    if (!user?.uid) {
      onError('Please log in to extract PDF files');
      return;
    }

    setIsUploading(true);
    console.log(`🚀 Starting folder upload: ${folderFiles.length} PDFs`);

    try {
      // Use the folder uploader API with table extraction enabled for "complete" mode
      const response = await apiService.uploadPdfFolder(folderFiles, extractMode === 'both' || extractMode === 'lattice');
      console.log('✅ Folder processing completed:', response);
      
      onExtractComplete(response, 'folder', folderFiles.length);
    } catch (error) {
      console.error('❌ Folder processing failed:', error);
      onError(error.message || 'Folder processing failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatMMSS = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
      
      if (!user?.uid) {
        onError('Please log in to extract PDF files');
        return;
      }
      
      if (uploadMode === 'single' && pdfFiles.length === 1) {
        // Single file extraction with immediate response
        response = await apiService.extractSinglePDFWithUser(pdfFiles[0], extractMode, 'both', user.uid);
        console.log('Single file extraction response:', response);
      } else {
        // Bulk extraction (background processing)
        response = await apiService.extractBulkPDFsWithUser(pdfFiles, extractMode, user.uid);
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
    padding: '0.75rem 1.5rem',
    margin: '0 4px',
    border: '1px solid #e9ecef',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'var(--transition)',
    outline: 'none',
    minWidth: '120px'
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
    border: `2px dashed ${dragActive ? 'var(--sub-color)' : '#e9ecef'}`,
    borderRadius: 'var(--border-radius)',
    padding: '2rem',
    textAlign: 'left',
    background: dragActive ? 'rgba(63, 114, 175, 0.05)' : 'var(--background-color)',
    transition: 'var(--transition)',
    cursor: 'pointer',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: '1rem',
    maxWidth: '100%'
  };

  return (
    <div style={{ margin: '0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          marginBottom: '1.5rem', 
          color: 'var(--main-color)',
          fontSize: '1.25rem',
          fontWeight: '600',
          textAlign: 'left'
        }}>
          Smart PDF Extraction
        </h3>
        
        {/* Upload Mode Selection */}
        <div style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <label style={{ 
            color: 'var(--text-color-dark)', 
            fontWeight: '600',
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
            textAlign: 'left'
          }}>
            Upload Mode:
          </label>
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            flexWrap: 'wrap',
            justifyContent: 'flex-start'
          }}>
            <button
              style={uploadMode === 'single' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('single')}
            >
              📄 Single File (Instant)
            </button>
            <button
              style={uploadMode === 'bulk' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('bulk')}
            >
              📚 Multiple Files (Background)
            </button>
            <button
              style={uploadMode === 'folder' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('folder')}
            >
              📁 Folder Upload (Fast)
            </button>
          </div>
        </div>

        {/* Extract Mode Selection */}
        <div style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <label style={{ 
            color: 'var(--text-color-dark)', 
            fontWeight: '600',
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
            textAlign: 'left'
          }}>
            Extraction Method:
          </label>
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            flexWrap: 'wrap',
            justifyContent: 'flex-start'
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

      {/* Upload Area */}
      {uploadMode === 'folder' ? (
        // Folder Upload Mode
        <div style={{
          ...dropZoneStyle,
          cursor: 'default'
        }}>
          <div style={{ width: '100%' }}>
            <div style={{
              fontSize: '4rem',
              color: 'var(--text-color-light)',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              📁
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-color-dark)',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Select Folder:
              </label>
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderSelect}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {folderFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ 
                  color: 'var(--text-color-dark)', 
                  fontWeight: '600',
                  marginBottom: '0.5rem' 
                }}>
                  📁 {folderName || 'Selected Folder'}: {folderFiles.length} PDF files
                </p>
                <div style={{
                  maxHeight: '150px',
                  overflow: 'auto',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  padding: '0.5rem'
                }}>
                  {folderFiles.slice(0, 10).map((file, index) => (
                    <div key={index} style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-color-light)',
                      padding: '0.2rem 0'
                    }}>
                      📄 {file.name} ({(file.size / (1024*1024)).toFixed(2)} MB)
                    </div>
                  ))}
                  {folderFiles.length > 10 && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-color-light)',
                      fontStyle: 'italic',
                      padding: '0.2rem 0'
                    }}>
                      ... and {folderFiles.length - 10} more files
                    </div>
                  )}
                </div>
              </div>
            )}

            {folderFiles.length > 0 && (
              <button
                onClick={processFolder}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: isUploading ? '#6c757d' : 'var(--sub-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isUploading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Processing... {formatMMSS(timerSec)}
                  </>
                ) : (
                  <>
                    🚀 Process {folderFiles.length} PDFs ({extractMode === 'both' ? 'with tables' : 'text only'})
                  </>
                )}
              </button>
            )}

            <p style={{ 
              color: 'var(--text-color-light)', 
              fontSize: '0.9rem',
              opacity: 0.8,
              lineHeight: '1.4',
              marginTop: '1rem',
              textAlign: 'center'
            }}>
              Estimated time: {folderFiles.length > 0 ? 
                `~${extractMode === 'both' ? Math.ceil(folderFiles.length * 0.3) : Math.ceil(folderFiles.length * 0.05)} minutes` : 
                'Select folder to estimate'
              }
            </p>
          </div>
        </div>
      ) : (
        // Single/Bulk File Upload Mode  
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
            <div style={{ textAlign: 'center' }}>
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
            <div style={{ textAlign: 'center' }}>
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
      )}

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
