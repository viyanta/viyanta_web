import React, { useState, useEffect } from 'react';
// import { Card } from '../utils/Card';
import SmartPDFExtractor from '../components/SmartPDFExtractor';
import SmartTableViewer from '../components/SmartTableViewer';
import BulkResultsViewer from '../components/BulkResultsViewer';
import JobStatusTracker from '../components/JobStatusTracker';
import TemplateBasedExtractor from '../components/TemplateBasedExtractor';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const SmartPDFExtraction = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [currentResults, setCurrentResults] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [extractionHistory, setExtractionHistory] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('template'); // 'upload', 'extract', 'template', 'results', 'history'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Subscribe to authentication changes and load user-specific history
  useEffect(() => {
    if (user) {
      // Load user-specific extraction history and upload history
      loadUserHistory(user.id);
      loadUploadHistory(user.id);
    } else {
      // Clear history when user logs out
      setExtractionHistory([]);
      setUploadHistory([]);
      setCurrentResults(null);
      setCurrentJob(null);
    }
  }, [user]);

  // Load user-specific extraction history from backend
  const loadUserHistory = async (userId) => {
    try {
      setIsLoading(true);
      const history = await apiService.getUserExtractionHistory(userId);
      console.log('Loaded user history:', history);
      
      // Deduplicate entries by ID (keep only the most recent)
      const deduplicatedHistory = [];
      const seenIds = new Set();
      
      if (history && Array.isArray(history)) {
        for (const entry of history) {
          if (!seenIds.has(entry.id)) {
            seenIds.add(entry.id);
            deduplicatedHistory.push(entry);
          }
        }
      }
      
      console.log('Deduplicated history:', deduplicatedHistory);
      setExtractionHistory(deduplicatedHistory);
    } catch (error) {
      console.error('Failed to load user history:', error);
      // Don't show error to user for history loading failure
    } finally {
      setIsLoading(false);
    }
  };

  // Load user-specific upload history from backend
  const loadUploadHistory = async (userId) => {
    try {
      const history = await apiService.getUploadHistory(userId);
      console.log('Loaded upload history:', history);
      setUploadHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Failed to load upload history:', error);
      setUploadHistory([]);
    }
  };

  // Save extraction to user-specific history
  const saveToUserHistory = async (extractionData) => {
    if (!user?.id) return;

    try {
      await apiService.saveUserExtractionHistory(user.id, extractionData);
    } catch (error) {
      console.error('Failed to save extraction to user history:', error);
    }
  };

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

      // Save to upload history
      const uploadData = {
        id: Date.now().toString(),
        folder_name: folderName.trim(),
        file_count: selectedFiles.length,
        uploaded_at: new Date().toISOString(),
        status: 'completed',
        user_id: user.id,
        files: selectedFiles.map(f => f.name),
        s3_structure: response.s3_structure || {},
        gemini_verification: response.gemini_verification || {}
      };

      await apiService.saveToUploadHistory(uploadData, user.id);
      
      // Refresh upload history
      await loadUploadHistory(user.id);

      // Clear form
      setSelectedFiles([]);
      setFolderName('');
      setActiveTab('history');

    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExtractComplete = async (response, mode, fileCount) => {
    console.log('Extraction complete:', { response, mode, fileCount });

    if (!user?.id) {
      setError('User not authenticated. Please log in to save extraction results.');
      return;
    }

    if (mode === 'single') {
      // Single file extraction - immediate results
      const extractionData = {
        ...response,
        extractionMode: mode,
        fileCount: 1,
        completedAt: new Date().toISOString(),
        userId: user.id
      };
      
      setCurrentResults(extractionData);
      setActiveTab('results');

      // Add to history
      const historyEntry = {
        id: response.job_id,
        timestamp: new Date().toISOString(),
        filename: response.filename,
        fileCount: 1,
        mode: 'single',
        status: 'completed',
        results: response,
        userId: user.id
      };
      addToHistory(historyEntry);
      await saveToUserHistory(historyEntry);

    } else {
      // Bulk extraction - background processing
      setCurrentJob(response.job_id);
      setCurrentResults(null);
      setActiveTab('results');

      // Add to history
      const historyEntry = {
        id: response.job_id,
        timestamp: new Date().toISOString(),
        fileCount,
        mode: 'bulk',
        status: 'processing',
        userId: user.id
      };
      addToHistory(historyEntry);
      await saveToUserHistory(historyEntry);
    }

    setError(null);
  };

  const addToHistory = (newEntry) => {
    setExtractionHistory(prev => {
      // Check if entry already exists
      const exists = prev.some(entry => entry.id === newEntry.id);
      if (exists) {
        return prev; // Don't add duplicate
      }
      return [newEntry, ...prev];
    });
  };

  const loadHistoryItem = (historyId) => {
    const item = extractionHistory.find(h => h.id === historyId);
    if (item && item.results) {
      setCurrentResults({
        ...item.results,
        extractionMode: item.mode,
        completedAt: item.completedAt || item.timestamp,
        userId: user?.id
      });
      setActiveTab('results');
    }
  };

  const getTabNotification = (tab) => {
    if (tab === 'results') {
      return currentResults || jobResults || currentJob ? '●' : null;
    }
    if (tab === 'history') {
      return extractionHistory.length;
    }
    return null;
  };

  const clearAllHistory = async () => {
    if (!user?.id) return;
    
    if (window.confirm('Are you sure you want to clear all extraction history?')) {
      try {
        await apiService.clearUserExtractionHistory(user.id);
        setExtractionHistory([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
        setError('Failed to clear history');
      }
    }
  };

  const handleJobComplete = async (jobStatus) => {
    console.log('Job complete:', jobStatus);
    setJobResults(jobStatus);
    setCurrentJob(null);

    if (!user?.id) return;

    // Update history
    const updatedEntry = {
      status: 'completed',
      results: jobStatus.results,
      completedAt: new Date().toISOString(),
      userId: user.id
    };

    setExtractionHistory(prev =>
      prev.map(entry =>
        entry.id === jobStatus.id
          ? { ...entry, ...updatedEntry }
          : entry
      )
    );

    // Show results
    setCurrentResults({
      ...jobStatus.results,
      extractionMode: 'bulk',
      completedAt: new Date().toISOString(),
      userId: user.id
    });
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
  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--bg-gradient)',
    padding: '1rem'
  };

  const headerStyle = {
    marginBottom: '1.5rem',
    textAlign: 'left',
    color: 'var(--text-color-dark)',
  };

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
    maxWidth: '100%'
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
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => { onMenuClick && onMenuClick(); }}
            aria-label="Toggle sidebar"
            style={{
              background: 'rgba(63, 114, 175, 0.1)',
              border: '1px solid rgba(63, 114, 175, 0.3)',
              color: 'var(--main-color)',
              borderRadius: '6px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.2)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
          <h1 style={{ 
            margin: 0,
            fontSize: 'clamp(18px, 5vw, 28px)',
            lineHeight: '1.2'
          }}>Smart PDF Table Extraction (Admin Only)</h1>
        </div>
        <p style={{ color: 'var(--text-color-light)', marginTop: '0.25rem' }}>
          Upload, extract, verify, and analyze table data from PDF documents with S3 storage and AI-powered Gemini verification
        </p>
      </div>

      {/* Tabs */}
      <div style={tabsWrapperStyle}>
        <div style={tabsStyle}>
{/*    
          <button
            style={{ ... (activeTab === 'extract' ? activeTabStyle : inactiveTabStyle), color: 'var(--text-color-dark)' }}
            onClick={() => setActiveTab('extract')}
          >
            📄 Legacy Extract
          </button> */}
          <button
            style={{ ... (activeTab === 'template' ? activeTabStyle : inactiveTabStyle), color: 'var(--text-color-dark)' }}
            onClick={() => setActiveTab('template')}
          >
            🎯 Template Extract
          </button>
          <button
            style={{ ... (activeTab === 'results' ? activeTabStyle : inactiveTabStyle), color: 'var(--text-color-dark)' }}
            onClick={() => setActiveTab('results')}
          >
            📊 Results {getTabNotification('results')}
          </button>
          <button
            // style={activeTab === 'history' ? activeTabStyle : inactiveTabStyle}
            style={{ ... (activeTab === 'history' ? activeTabStyle : inactiveTabStyle), color: 'var(--text-color-dark)' }}
            onClick={() => setActiveTab('history')}
          >
            📚 History {getTabNotification('history') && `(${getTabNotification('history')})`}
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
        {activeTab === 'extract' && (
          <div>
            <h3 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
              📄 Legacy PDF Extraction
            </h3>
            <SmartPDFExtractor
              onExtractComplete={handleExtractComplete}
              onError={handleError}
              user={user}
            />
          </div>
        )}

        {/* Template-Based Extraction Tab */}
        {activeTab === 'template' && (
          <TemplateBasedExtractor />
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            {currentJob && (
              <JobStatusTracker
                jobId={currentJob}
                onJobComplete={handleJobComplete}
                onJobError={handleJobError}
              />
            )}
            
            {currentResults && (
              <div>
                {currentResults.extractionMode === 'single' ? (
                  <SmartTableViewer
                    data={currentResults}
                    filename={currentResults.filename}
                  />
                ) : (
                  <BulkResultsViewer
                    results={currentResults}
                  />
                )}
              </div>
            )}
            
            {jobResults && (
              <BulkResultsViewer
                results={jobResults.results}
              />
            )}
            
            {!currentResults && !jobResults && !currentJob && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <h3>No Results Yet</h3>
                <p>Extract some PDFs to see results here</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--main-color)' }}>📚 Upload & Extraction History</h3>
              {isLoading && <span style={{ fontSize: 12, color: 'var(--text-color-light)' }}>Loading...</span>}
            </div>

            {/* Upload History Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>🚀 Upload History (New S3 Structure)</h4>
              {uploadHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-light)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                  <p>No uploads yet. Use the Upload tab to start uploading files with Gemini verification.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {uploadHistory.map((item, index) => (
                    <div
                      key={`upload-${item.id}-${index}`}
                      style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        background: item.status === 'completed' ? '#f8fff8' : '#fff8e1'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-color-dark)', marginBottom: 4 }}>
                            📁 {item.folder_name}
                            <span style={{
                              marginLeft: 8,
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: item.status === 'completed' ? '#d4edda' : '#fff3cd',
                              color: item.status === 'completed' ? '#155724' : '#856404'
                            }}>
                              {item.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text-color-light)' }}>
                            {item.file_count} files • {new Date(item.uploaded_at).toLocaleDateString()} {new Date(item.uploaded_at).toLocaleTimeString()}
                          </div>
                          {item.files && (
                            <div style={{ fontSize: 12, color: 'var(--text-color-light)', marginTop: 4 }}>
                              Files: {item.files.slice(0, 3).join(', ')}
                              {item.files.length > 3 && ` + ${item.files.length - 3} more`}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-color-light)' }}>
                          🚀 New Structure
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extraction History Section */}
            <div>
              <h4 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>📄 Legacy Extraction History</h4>
              {extractionHistory.length === 0 && !isLoading ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-light)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                  <p>No legacy extractions yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {extractionHistory.map((item, index) => (
                    <div
                      key={`extraction-${item.id}-${index}`}
                      style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        background: item.status === 'completed' ? 'var(--background-color)' : 
                                   item.status === 'failed' ? '#fff5f5' : '#fff8e1'
                      }}
                      onClick={() => loadHistoryItem(item.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-color-dark)', marginBottom: 4 }}>
                            {item.filename || `${item.fileCount} files`}
                            <span style={{
                              marginLeft: 8,
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: item.status === 'completed' ? '#d4edda' : '#fff3cd',
                              color: item.status === 'completed' ? '#155724' : '#856404'
                            }}>
                              {item.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text-color-light)' }}>
                            {new Date(item.timestamp).toLocaleDateString()} • {item.mode}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-color-light)' }}>
                          📄 Legacy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPDFExtraction;
