import React, { useState, useEffect } from 'react';
// import { Card } from '../utils/Card';
import SmartPDFExtractor from '../components/SmartPDFExtractor';
import SmartTableViewer from '../components/SmartTableViewer';
// import BulkResultsViewer from '../components/BulkResultsViewer';
import JobStatusTracker from '../components/JobStatusTracker';
// import TemplateBasedExtractor from '../components/TemplateBasedExtractor';
import PDFSplitterWorkflow from '../components/PDFSplitterWorkflow';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary';
import StandardPageLayout from '../components/StandardPageLayout';

const SmartPDFExtraction = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [currentResults, setCurrentResults] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [activeTab, setActiveTab] = useState('new_template'); // 'new_template'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // New upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection for new upload
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  // Handle new folder upload with S3 and Gemini verification
  const handleNewUpload = async () => {
    if (!selectedFiles.length || !folderName.trim()) {
      setError('Please select files and enter a folder name');
      return;
    }

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Use the new upload endpoint with S3 structure and Gemini verification
      const response = await apiService.uploadFolderFilesNew(selectedFiles, folderName.trim(), user.id);

      console.log('Upload response:', response);


      // Refresh upload history
      // await loadUploadHistory(user.id);

      // Clear form
      setSelectedFiles([]);
      setFolderName('');
      // setActiveTab('history');

    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  const handleJobError = (error) => {
    console.error('Job error:', error);
    setError(error);
    setCurrentJob(null);

    // Update history
    if (currentJob) {
      setExtractionHistory(prev =>
        prev.map(entry =>
          entry.id === currentJob
            ? { ...entry, status: 'failed', error, completedAt: new Date().toISOString() }
            : entry
        )
      );
    }
  };

  const handleError = (errorMessage) => {
    console.error('Extraction error:', errorMessage);
    setError(errorMessage);
  };

  // Styles
  const tabsWrapperStyle = {
    marginBottom: '1.5rem',
    display: 'flex',
    color: 'var(--text-color-dark)',
    justifyContent: 'center'
  };

  const tabsStyle = {
    display: 'flex',
    background: 'var(--bg-color)',
    borderRadius: '12px',
    padding: '4px',
    gap: '4px',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',

  };

  const activeTabStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--main-color)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'var(--transition)',
    boxShadow: 'var(--shadow-light)',
    minWidth: 'fit-content'
  };

  const inactiveTabStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-color)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'var(--transition)',
    minWidth: 'fit-content'
  };

  const cardStyle = {
    background: 'var(--card-background)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'visible',
    minHeight: '400px'
  };

  const errorStyle = {
    background: '#fee',
    color: 'var(--error-color)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid #fcc'
  };

  return (
    <StandardPageLayout
      title="Smart PDF Table Extraction (Admin Only)"
      onMenuClick={onMenuClick}
    >
      <p style={{ color: 'var(--text-color-light)', marginTop: '0', marginBottom: '1.5rem' }}>
        Upload, extract, verify, and analyze table data from PDF documents with S3 storage and AI-powered Gemini verification
      </p>

      {/* Tabs */}
      <div style={tabsWrapperStyle}>
        <div style={tabsStyle}>
          <button
            style={{ ... (activeTab === 'new_template' ? activeTabStyle : inactiveTabStyle), color: 'var(--text-color-dark)' }}
            onClick={() => setActiveTab('new_template')}
          >
            📋 PDF Split & Extract
          </button>

        </div>
      </div>

      {/* Content */}
      <div style={cardStyle}>
        {/* Error Display */}
        {error && (
          <div style={errorStyle}>
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

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div>
            <h3 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
              🚀 New Upload with S3 Storage & Gemini Verification
            </h3>
            <p style={{ color: 'var(--text-color-light)', marginBottom: '1.5rem' }}>
              Upload PDF files to the new S3 structure with automatic extraction and AI verification using Gemini API.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Folder Name Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Folder Name:
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g., insurance_docs_2024)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* File Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Select PDF Files:
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-color-light)' }}>
                    Selected: {selectedFiles.length} file(s)
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                      {selectedFiles.map((file, index) => (
                        <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleNewUpload}
                disabled={isUploading || !selectedFiles.length || !folderName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isUploading ? 'var(--border-color)' : 'var(--main-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: (!selectedFiles.length || !folderName.trim()) ? 0.5 : 1
                }}
              >
                {isUploading ? '🔄 Uploading & Verifying...' : '🚀 Upload & Verify with Gemini'}
              </button>

              {/* Upload Progress */}
              {isUploading && (
                <div style={{
                  background: 'var(--bg-color-light)',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p>Processing files with Gemini verification...</p>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      backgroundColor: 'var(--main-color)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Extract Tab */}
        {/* New PDF Split & Extract Tab */}
        {activeTab === 'new_template' && (
          <ErrorBoundary>
            <PDFSplitterWorkflow user={user} />
          </ErrorBoundary>
        )}

      </div>
    </StandardPageLayout>
  );
};

export default SmartPDFExtraction;
