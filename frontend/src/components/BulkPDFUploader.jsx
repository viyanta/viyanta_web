import React, { useState, useCallback, useRef } from 'react';
// import { Card } from '../utils/Card';
// import { Button } from '../utils/Button'

const BulkPDFUploader = ({ onUploadStart, onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [extractMode, setExtractMode] = useState('both');
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (droppedFiles.length > 1000) {
      alert('Maximum 1000 PDF files allowed');
      return;
    }
    
    setFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (selectedFiles.length > 1000) {
      alert('Maximum 1000 PDF files allowed');
      return;
    }
    
    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select PDF files to upload');
      return;
    }

    setUploading(true);
    onUploadStart?.(files);
    
    try {
      await onUploadComplete?.(files, extractMode);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Styles
  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '2rem',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem'
  };

  const titleStyle = {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  };

  const subtitleStyle = {
    color: '#6b7280',
    fontSize: '1rem',
    lineHeight: '1.5'
  };

  const dropZoneStyle = {
    border: `3px dashed ${dragActive ? '#3b82f6' : '#d1d5db'}`,
    borderRadius: '15px',
    padding: '3rem 2rem',
    textAlign: 'center',
    backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 250, 251, 0.8)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  };

  const dropZoneContentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  };

  const uploadIconStyle = {
    fontSize: '4rem',
    color: dragActive ? '#3b82f6' : '#9ca3af',
    transition: 'all 0.3s ease',
    transform: dragActive ? 'scale(1.1)' : 'scale(1)'
  };

  const modeCardStyle = {
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    borderRadius: '12px',
    padding: '1rem',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative'
  };

  const selectedModeStyle = {
    ...modeCardStyle,
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  };

  const fileItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease'
  };

  const extractModes = [
    {
      value: 'both',
      icon: '🚀',
      title: 'Smart Mode',
      description: 'Combines stream + lattice for maximum accuracy',
      recommended: true
    },
    {
      value: 'stream',
      icon: '⚡',
      title: 'Speed Mode',
      description: 'Fast processing for simple table structures'
    },
    {
      value: 'lattice',
      icon: '🎯',
      title: 'Precision Mode',
      description: 'Detailed extraction for complex table layouts'
    }
  ];

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <span style={{ fontSize: '2rem' }}>📄</span>
          Bulk PDF Processor
        </h2>
        <p style={subtitleStyle}>
          Upload up to 1000 PDF files and extract financial tables with AI precision
        </p>
      </div>

      {/* Extraction Mode Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Choose Extraction Mode
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {extractModes.map((mode) => (
            <div
              key={mode.value}
              style={extractMode === mode.value ? selectedModeStyle : modeCardStyle}
              onClick={() => setExtractMode(mode.value)}
              onMouseEnter={(e) => {
                if (extractMode !== mode.value) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (extractMode !== mode.value) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {mode.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '10px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px'
                }}>
                  RECOMMENDED
                </div>
              )}
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{mode.icon}</span>
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {mode.title}
                </span>
              </div>
              <p style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {mode.description}
              </p>
            </div>
          ))}
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
        <div style={dropZoneContentStyle}>
          <div style={uploadIconStyle}>
            {dragActive ? '⬇️' : '📁'}
          </div>
          <div>
            <p style={{
              fontSize: '1.3rem',
              fontWeight: '600',
              color: dragActive ? '#3b82f6' : '#374151',
              marginBottom: '0.5rem'
            }}>
              {dragActive ? 'Drop your PDF files here!' : 'Drop PDF files here or click to browse'}
            </p>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Supports up to 1000 PDF files • Max file size: 100MB each
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#374151',
              margin: 0
            }}>
              Selected Files ({files.length})
            </h3>
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Total: {formatFileSize(getTotalSize())}
            </div>
          </div>
          
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: '#fafafa'
          }}>
            {files.slice(0, 10).map((file, index) => (
              <div
                key={index}
                style={{
                  ...fileItemStyle,
                  borderBottom: index < Math.min(files.length - 1, 9) ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flex: 1
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <div>
                    <p style={{
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#374151',
                      margin: 0,
                      wordBreak: 'break-all'
                    }}>
                      {file.name}
                    </p>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fecaca';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            
            {files.length > 10 && (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}>
                ... and {files.length - 10} more files
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          style={{
            background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '1rem 3rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: uploading ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transform: uploading ? 'none' : 'translateY(0)',
            minWidth: '200px',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!uploading && files.length > 0) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
            }
          }}
        >
          {uploading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff30',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Processing...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.2rem' }}>🚀</span>
              Start Extraction
            </>
          )}
        </button>
      </div>

      {/* Add CSS animation */}
      <style>
        {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
};

export default BulkPDFUploader;
