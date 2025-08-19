import React, { useState, useEffect } from 'react';
// import { Card } from '../utils/Card';
import SmartPDFExtractor from '../components/SmartPDFExtractor';
import SmartTableViewer from '../components/SmartTableViewer';
import BulkResultsViewer from '../components/BulkResultsViewer';
import JobStatusTracker from '../components/JobStatusTracker';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

 

const SmartPDFExtraction = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [currentResults, setCurrentResults] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [extractionHistory, setExtractionHistory] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'extract', 'results', 'history'
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
      console.log('Loaded user history:', history); // Debug log
      
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

    if (!user?.uid) {
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
        userId: user.uid
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
        userId: user.uid
      };
      addToHistory(historyEntry);
      await saveToUserHistory(historyEntry); // Save to user history

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
        userId: user.uid
      };
      addToHistory(historyEntry);
      await saveToUserHistory(historyEntry); // Save to user history
    }

    setError(null);
  };

  const handleJobComplete = async (jobStatus) => {
    console.log('Job complete:', jobStatus);
    console.log('Job complete - jobStatus.results:', jobStatus.results);
    console.log('Job complete - jobStatus.results.summary:', jobStatus.results?.summary);
    
    setJobResults(jobStatus);
    setCurrentJob(null);

    if (!user?.uid) return;

    // Update history - only update existing entry, don't create new one
    const updatedEntry = {
      status: 'completed',
      results: jobStatus.results,
      completedAt: new Date().toISOString(),
      userId: user.uid
    };

    setExtractionHistory(prev =>
      prev.map(entry =>
        entry.id === jobStatus.id
          ? { ...entry, ...updatedEntry }
          : entry
      )
    );

    // Save updated status to user history - only if entry exists
    const historyEntry = extractionHistory.find(entry => entry.id === jobStatus.id);
    if (historyEntry) {
      const completeEntry = { ...historyEntry, ...updatedEntry };
      // Don't save again to prevent duplicates - the entry was already saved when created
      console.log('Job completed, updating existing entry:', completeEntry.id);
    }

    // Show results - FIXED: Pass the correct data structure
    setCurrentResults({
      ...jobStatus.results, // This contains the summary with files_with_tables
      extractionMode: 'bulk',
      completedAt: new Date().toISOString(),
      userId: user.uid
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
    setCurrentResults(null);
  };

  const loadHistoryItem = async (historyId) => {
    const historyItem = extractionHistory.find(item => item.id === historyId);
    if (!historyItem) return;

    console.log('Loading history item:', historyItem);

    // Only try to fetch live job status if it's currently processing
    // For completed jobs, use the stored results directly
    if (historyItem.status === 'completed' && historyItem.results) {
      // For bulk uploads, the results should contain the summary
      if (historyItem.mode === 'bulk') {
        setCurrentResults({
          ...historyItem.results, // This should contain summary with files_with_tables
          extractionMode: historyItem.mode,
          completedAt: historyItem.completedAt
        });
      } else {
        // For single uploads, the results contain the table data directly
        setCurrentResults({
          ...historyItem.results,
          extractionMode: historyItem.mode,
          completedAt: historyItem.completedAt
        });
      }
      setActiveTab('results');
    } else if (historyItem.status === 'processing') {
      // Only try to track live jobs that are actually still processing
      try {
        // Check if the job still exists on the server
        const jobStatus = await apiService.getJobStatus(historyId);
        if (jobStatus) {
          if (jobStatus.status === 'completed') {
            // Job completed, update history and show results
            const updatedEntry = {
              status: 'completed',
              results: jobStatus.results,
              completedAt: new Date().toISOString(),
              userId: user.uid
            };
            
            setExtractionHistory(prev =>
              prev.map(entry =>
                entry.id === historyId
                  ? { ...entry, ...updatedEntry }
                  : entry
              )
            );
            
            // Show results directly
            setCurrentResults({
              ...jobStatus.results,
              extractionMode: 'bulk',
              completedAt: new Date().toISOString(),
              userId: user.uid
            });
            setActiveTab('results');
          } else {
            // Still processing, track it
            setCurrentJob(historyId);
            setActiveTab('results');
          }
        } else {
          // Job doesn't exist anymore, mark as failed in history
          setExtractionHistory(prev =>
            prev.map(entry =>
              entry.id === historyId
                ? { ...entry, status: 'failed', error: 'Job no longer exists', completedAt: new Date().toISOString() }
                : entry
            )
          );
          setError('This job is no longer available on the server');
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
        // Check if it's a network error or if the job doesn't exist
        const isNetworkError = error.message.includes('Failed to fetch') || error.message.includes('NetworkError');
        const errorMessage = isNetworkError 
          ? 'Unable to connect to server. Please check your connection and try again.'
          : 'This job is no longer available on the server. It may have completed or expired.';
        
        // Mark job as failed in local history
        setExtractionHistory(prev =>
          prev.map(entry =>
            entry.id === historyId
              ? { ...entry, status: 'failed', error: 'Job no longer available', completedAt: new Date().toISOString() }
              : entry
          )
        );
        setError(errorMessage);
      }
    } else if (historyItem.status === 'failed') {
      // For failed jobs, show the specific error message
      if (historyItem.error === 'Job no longer available') {
        setError('This job has expired and is no longer available on the server.');
      } else {
        setError(`Previous job failed: ${historyItem.error || 'Unknown error'}`);
      }
    }
  };

  const clearResults = () => {
    setCurrentResults(null);
    setCurrentJob(null);
    setJobResults(null);
    setError(null);
    setActiveTab('extract');
  };

  // Prevent duplicate history entries
  const addToHistory = (newEntry) => {
    setExtractionHistory(prev => {
      // Check if entry already exists
      const exists = prev.some(entry => entry.id === newEntry.id);
      if (exists) {
        console.log('Entry already exists in history, not adding duplicate:', newEntry.id);
        return prev;
      }
      console.log('Adding new entry to history:', newEntry);
      return [newEntry, ...prev];
    });
  };

  // Clear all history (for testing/debugging)
  const clearAllHistory = async () => {
    if (!user?.uid) return;
    
    try {
      await apiService.clearUserExtractionHistory(user.uid);
      setExtractionHistory([]);
      console.log('History cleared successfully for user:', user.uid);
    } catch (error) {
      console.error('Failed to clear history:', error);
      // Still clear local state even if backend fails
      setExtractionHistory([]);
    }
  };

  // Styles — aligned with app theme (cards + white backgrounds)
  const containerStyle = {
    minHeight: '100%',
    background: 'white',
    padding: '1rem',
    width: '100%'
  };

  const headerStyle = {
    marginBottom: '2rem',
    textAlign: 'left',
    color: 'var(--main-color)'
  };

  const tabsWrapperStyle = {
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'flex-start'
  };

  const tabsStyle = {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  };

  const tabButtonBase = {
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--border-radius)',
    border: '2px solid #e9ecef',
    background: 'white',
    color: 'var(--text-color-dark)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    fontSize: '0.9rem',
    minWidth: '100px'
  };

  const activeTabStyle = {
    ...tabButtonBase,
    background: 'var(--sub-color)',
    border: '2px solid var(--sub-color)',
    color: 'white',
    boxShadow: 'var(--shadow-light)'
  };

  const inactiveTabStyle = tabButtonBase;

  const cardStyle = {
    background: 'white',
    borderRadius: 'var(--border-radius)',
    border: '1px solid #e9ecef',
    boxShadow: 'var(--shadow-light)',
    padding: '1.5rem',
    width: '100%'
  };

  const errorStyle = {
    background: 'rgba(220, 53, 69, 0.1)',
    color: 'var(--error-color)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--error-color)',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTabNotification = (tab) => {
    switch (tab) {
      case 'results':
        return currentResults || currentJob ? '●' : '';
      case 'history':
        return extractionHistory.length > 0 ? extractionHistory.length : '';
      default:
        return '';
    }
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
        }}>Smart PDF Table Extraction</h1>
        </div>
        <p style={{ color: 'var(--text-color-light)', marginTop: '0.25rem' }}>
          Extract, verify, and analyze table data from PDF documents with AI-powered accuracy
        </p>
      </div>

      {/* Tabs */}
      <div style={tabsWrapperStyle}>
        <div style={tabsStyle}>
          <button
            style={activeTab === 'upload' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('upload')}
          >
            🚀 New Upload & Verification
          </button>
          <button
            style={activeTab === 'extract' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('extract')}
          >
            📄 Legacy Extract
          </button>
          <button
            style={activeTab === 'results' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('results')}
          >
            📊 Results {getTabNotification('results')}
          </button>
          <button
            style={activeTab === 'history' ? activeTabStyle : inactiveTabStyle}
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

            {/* Quick Tips */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'var(--background-color)',
              borderRadius: 'var(--border-radius)',
              border: '1px solid #e9ecef',
              boxShadow: 'var(--shadow-light)',
              maxWidth: '100%'
            }}>
              <h4 style={{ 
                margin: '0 0 1rem 0', 
                color: 'var(--main-color)',
                fontSize: '1rem',
                fontWeight: '600',
                textAlign: 'left'
              }}>
                💡 Quick Tips:
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '1.5rem', 
                color: 'var(--text-color-light)',
                lineHeight: '1.6',
                fontSize: '0.875rem'
              }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>Single File Mode:</strong> Get instant results with AI verification
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>Bulk Mode:</strong> Process multiple files in the background
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>Extraction Methods:</strong> 'Both' gives best results, 'Stream' for simple tables, 'Lattice' for complex layouts
                </li>
                <li style={{ marginBottom: '0' }}>
                  <strong>AI Verification:</strong> Gemini AI automatically corrects and improves extraction accuracy
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            {currentJob && !jobResults && (
              <JobStatusTracker
                jobId={currentJob}
                onComplete={handleJobComplete}
                onError={handleJobError}
              />
            )}

            {currentResults && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--main-color)' }}>
                      Extraction Results
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-color-light)' }}>
                      Completed at {formatTimestamp(currentResults.completedAt)} • 
                      Mode: {currentResults.extractionMode}
                    </p>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: 'var(--text-color-light)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={clearResults}
                  >
                    Clear Results
                  </button>
                </div>

                {/* Single file results */}
                {currentResults.tables && (
                  <div>
                    {console.log('Single file results:', currentResults)}
                    <SmartTableViewer
                      tables={currentResults.formatted_tables || currentResults.tables}
                      filename={currentResults.filename}
                      jobId={currentResults.job_id}
                      extractionSummary={currentResults.extraction_summary}
                    />
                  </div>
                )}

                {/* Bulk file results */}
                {currentResults.summary && (
                  <div>
                    {console.log('Bulk file results:', currentResults)}
                    <BulkResultsViewer 
                      jobResults={currentResults} 
                      jobId={currentResults.job_id || currentResults.id}
                    />
                  </div>
                )}
              </div>
            )}

            {!currentJob && !currentResults && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3>No Results Yet</h3>
                <p>Extract some PDFs to see results here</p>
                <button
                  style={{
                    padding: '10px 16px',
                    background: 'var(--sub-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                  onClick={() => setActiveTab('extract')}
                >
                  Start Extraction
                </button>
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
                          background: item.mode === 'single' ? '#e3f2fd' : '#f3e5f5',
                          color: item.mode === 'single' ? '#1976d2' : '#7b1fa2'
                        }}>
                          {item.mode}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-color-light)' }}>
                        {formatTimestamp(item.timestamp)}
                        {item.completedAt && item.completedAt !== item.timestamp && (
                          <> → {formatTimestamp(item.completedAt)}</>
                        )}
                        {item.status === 'failed' && item.error === 'Job no longer available' && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: '#dc3545',
                            fontStyle: 'italic'
                          }}>
                            (expired)
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.results?.extraction_summary?.accuracy_score && (
                        <span style={{
                          fontSize: 12,
                          padding: '4px 8px',
                          borderRadius: 12,
                          background: '#e8f5e8',
                          color: '#2e7d32'
                        }}>
                          {item.results.extraction_summary.accuracy_score}% accuracy
                        </span>
                      )}
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 12,
                        color: 'white',
                        background: item.status === 'completed' ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' :
                                   item.status === 'failed' ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' :
                                   'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                      }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPDFExtraction;
