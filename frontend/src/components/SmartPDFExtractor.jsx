import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const SmartPDFExtractor = ({ onExtractComplete, onError, user }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single', 'multi', 'folder_tables', 'folder_text'
  const [dragActive, setDragActive] = useState(false);
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [timerSec, setTimerSec] = useState(0);
  const [extractMode, setExtractMode] = useState('text'); // 'text', 'tables', 'complete'
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

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

  const handleMultiFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setSelectedFiles(pdfs);
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

  const processUpload = async () => {
    if (!user?.uid) {
      onError('Please log in to extract PDF files');
      return;
    }

    setIsUploading(true);
    
    try {
      let response;
      
      switch (uploadMode) {
        case 'single':
          if (!selectedFiles.length) {
            throw new Error('Please select a PDF file');
          }
          if (!folderName.trim()) {
            throw new Error('Please provide a folder name for organizing files');
          }
          console.log('🚀 Single instant upload');
          response = await apiService.uploadSingleInstant(
            selectedFiles[0], 
            extractMode, // text, tables, or complete
            folderName.trim()
          );
          onExtractComplete(response, 'single', 1);
          break;
          
        case 'multi':
          if (!selectedFiles.length) {
            throw new Error('Please select PDF files');
          }
          if (!folderName.trim()) {
            throw new Error('Please provide a folder name for organizing files');
          }
          console.log(`🚀 Multi files upload: ${selectedFiles.length} PDFs`);
          response = await apiService.uploadMultiFiles(
            selectedFiles,
            extractMode, // text, tables, or complete
            folderName.trim()
          );
          onExtractComplete(response, 'multi', selectedFiles.length);
          break;
          
        case 'folder_tables':
          if (!folderFiles.length || !folderName.trim()) {
            throw new Error('Please select a folder and provide a folder name');
          }
          console.log(`🚀 Folder tables upload: ${folderFiles.length} PDFs`);
          response = await apiService.uploadFolderTables(folderFiles, folderName.trim());
          onExtractComplete(response, 'folder_tables', folderFiles.length);
          break;
          
        case 'folder_text':
          if (!folderFiles.length || !folderName.trim()) {
            throw new Error('Please select a folder and provide a folder name');
          }
          console.log(`🚀 Folder text upload: ${folderFiles.length} PDFs`);
          response = await apiService.uploadFolderText(folderFiles, folderName.trim());
          onExtractComplete(response, 'folder_text', folderFiles.length);
          break;
          
        default:
          throw new Error('Invalid upload mode');
      }
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      onError(error.message || 'Upload failed');
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

    if (uploadMode === 'single' && pdfFiles.length > 1) {
      onError('Single mode: Please select only one PDF file');
      return;
    }

    setSelectedFiles(pdfFiles);
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
              style={uploadMode === 'multi' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('multi')}
            >
              📚 Multiple Files
            </button>
            <button
              style={uploadMode === 'folder_tables' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('folder_tables')}
            >
              📊 Folder (Tables Only)
            </button>
            <button
              style={uploadMode === 'folder_text' ? activeButtonStyle : inactiveButtonStyle}
              onClick={() => setUploadMode('folder_text')}
            >
              � Folder (Text Only)
            </button>
          </div>
        </div>

        {/* Extract Mode Selection - Only for single and multi modes */}
        {(uploadMode === 'single' || uploadMode === 'multi') && (
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
                style={extractMode === 'text' ? activeButtonStyle : inactiveButtonStyle}
                onClick={() => setExtractMode('text')}
              >
                📝 Text Only
              </button>
              <button
                style={extractMode === 'tables' ? activeButtonStyle : inactiveButtonStyle}
                onClick={() => setExtractMode('tables')}
              >
                📊 Tables Only
              </button>
              <button
                style={extractMode === 'complete' ? activeButtonStyle : inactiveButtonStyle}
                onClick={() => setExtractMode('complete')}
              >
                🔄 Complete (Text + Tables)
              </button>
            </div>
          </div>
        )}

        {/* Folder Name Input - Required for all modes */}
        <div style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <label style={{ 
            color: 'var(--text-color-dark)', 
            fontWeight: '600',
            fontSize: '0.875rem',
            textAlign: 'left'
          }}>
            Folder Name (Required):
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name for organizing files..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              fontSize: '0.9rem',
              background: 'white'
            }}
          />
          <p style={{ 
            color: 'var(--text-color-light)', 
            fontSize: '0.8rem',
            margin: '0',
            textAlign: 'left'
          }}>
            All uploaded files and extracted data will be organized under this folder name.
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {uploadMode === 'folder_tables' || uploadMode === 'folder_text' ? (
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
                  📁 Selected Folder: {folderFiles.length} PDF files
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

            {folderFiles.length > 0 && folderName.trim() && (
              <button
                onClick={processUpload}
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
                    🚀 Process {folderFiles.length} PDFs ({uploadMode === 'folder_tables' ? 'Tables Only' : 'Text Only'})
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
              {uploadMode === 'folder_tables' ? 
                `Fast table extraction (Camelot-py): ~${Math.ceil(folderFiles.length * 0.1)} minutes` :
                `Ultra-fast text extraction: ~${Math.ceil(folderFiles.length * 0.05)} minutes`
              }
            </p>
          </div>
        </div>
      ) : (
        // Single/Multi File Upload Mode  
        <div
          style={dropZoneStyle}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (uploadMode === 'single') {
              fileInputRef.current?.click();
            } else {
              multiFileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <input
            ref={multiFileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleMultiFileSelect}
            style={{ display: 'none' }}
          />
          
          {isUploading ? (
            <div style={{ textAlign: 'center', width: '100%' }}>
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
                Processing {selectedFiles.length} PDF{selectedFiles.length > 1 ? 's' : ''}... {formatMMSS(timerSec)}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', width: '100%' }}>
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
                  : 'Multi-file mode: Process multiple files efficiently'
                }
              </p>

              {selectedFiles.length > 0 && (
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <p style={{ 
                    color: 'var(--text-color-dark)', 
                    fontWeight: '600',
                    marginBottom: '0.5rem' 
                  }}>
                    Selected Files ({selectedFiles.length}):
                  </p>
                  <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-color-light)',
                        padding: '0.2rem 0'
                      }}>
                        📄 {file.name} ({(file.size / (1024*1024)).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedFiles.length > 0 && folderName.trim() && (
                <button
                  onClick={processUpload}
                  disabled={isUploading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--sub-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  🚀 Process {selectedFiles.length} PDF{selectedFiles.length > 1 ? 's' : ''} ({extractMode})
                </button>
              )}

              <p style={{ 
                color: 'var(--text-color-light)', 
                fontSize: '0.9rem',
                opacity: 0.8,
                lineHeight: '1.4',
                marginTop: '1rem'
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
