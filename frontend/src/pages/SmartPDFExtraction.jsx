import React, { useState, useEffect } from 'react';
// import { Card } from '../utils/Card';
import SmartPDFExtractor from '../components/SmartPDFExtractor';
import SmartTableViewer from '../components/SmartTableViewer';
import BulkResultsViewer from '../components/BulkResultsViewer';
import JobStatusTracker from '../components/JobStatusTracker';
import apiService from '../services/api';
import { subscribeToAuthChanges } from '../firebase/auth.js';
import { useUser } from '../context/UserContext.jsx';
import { Navigate } from 'react-router-dom';

 

function SmartPDFExtraction({ onMenuClick }) {
  const { hasRole, loading } = useUser();

  // Check if user has admin access
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!hasRole('admin')) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          You don't have permission to access Smart Extraction. This feature is only available to admin users.
        </p>
        <button 
          onClick={() => window.history.back()} 
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const [user, setUser] = useState(null);
  const [currentResults, setCurrentResults] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [extractionHistory, setExtractionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('extract'); // 'extract', 'results', 'history'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to authentication changes and load user-specific history
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      if (authUser) {
        // Load user-specific extraction history
        loadUserHistory(authUser.uid);
      } else {
        // Clear history when user logs out
        setExtractionHistory([]);
        setCurrentResults(null);
        setCurrentJob(null);
      }
    });

    return () => unsubscribe();
  }, []);

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

  // Save extraction to user-specific history
  const saveToUserHistory = async (extractionData) => {
    if (!user?.uid) return;

    try {
      await apiService.saveUserExtractionHistory(user.uid, extractionData);
    } catch (error) {
      console.error('Failed to save extraction to user history:', error);
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
            style={activeTab === 'extract' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('extract')}
          >
            📄 Extract
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

        {/* Extract Tab */}
        {activeTab === 'extract' && (
          <div>
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
              <h3 style={{ margin: 0, color: 'var(--main-color)' }}>📚 Extraction History</h3>
              {isLoading && <span style={{ fontSize: 12, color: 'var(--text-color-light)' }}>Loading...</span>}
              {extractionHistory.length > 0 && !isLoading && (
                <button
                  style={{
                    padding: '6px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  onClick={clearAllHistory}
                >
                  Clear All History
                </button>
              )}
            </div>
            {extractionHistory.length === 0 && !isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h3>No History Yet</h3>
                <p>Your extraction history will appear here</p>
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {extractionHistory.map((item, index) => (
                <div
                  key={`${item.id}-${index}`} // Use index to ensure uniqueness
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
