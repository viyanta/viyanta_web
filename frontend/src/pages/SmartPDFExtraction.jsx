import React, { useState } from 'react';
// import { Card } from '../utils/Card';
import SmartPDFExtractor from '../components/SmartPDFExtractor';
import SmartTableViewer from '../components/SmartTableViewer';
import JobStatusTracker from '../components/JobStatusTracker';
import ExtractionResults from '../components/ExtractionResults';
import apiService from '../services/api';

const SmartPDFExtraction = () => {
  const [currentResults, setCurrentResults] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [extractionHistory, setExtractionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('extract'); // 'extract', 'results', 'history'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleExtractComplete = (response, mode, fileCount) => {
    console.log('Extraction complete:', { response, mode, fileCount });

    if (mode === 'single') {
      // Single file extraction - immediate results
      setCurrentResults({
        ...response,
        extractionMode: mode,
        fileCount: 1,
        completedAt: new Date().toISOString()
      });
      setActiveTab('results');

      // Add to history
      const historyEntry = {
        id: response.job_id,
        timestamp: new Date().toISOString(),
        filename: response.filename,
        fileCount: 1,
        mode: 'single',
        status: 'completed',
        results: response
      };
      setExtractionHistory(prev => [historyEntry, ...prev]);

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
        status: 'processing'
      };
      setExtractionHistory(prev => [historyEntry, ...prev]);
    }

    setError(null);
  };

  const handleJobComplete = (jobStatus) => {
    console.log('Job complete:', jobStatus);
    setJobResults(jobStatus);
    setCurrentJob(null);

    // Update history
    setExtractionHistory(prev =>
      prev.map(entry =>
        entry.id === jobStatus.id
          ? { ...entry, status: 'completed', results: jobStatus.results, completedAt: new Date().toISOString() }
          : entry
      )
    );

    // Show results
    setCurrentResults({
      ...jobStatus,
      extractionMode: 'bulk',
      completedAt: new Date().toISOString()
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

    if (historyItem.status === 'completed' && historyItem.results) {
      setCurrentResults({
        ...historyItem.results,
        extractionMode: historyItem.mode,
        completedAt: historyItem.completedAt
      });
      setActiveTab('results');
    } else if (historyItem.status === 'processing') {
      setCurrentJob(historyId);
      setActiveTab('results');
    }
  };

  const clearResults = () => {
    setCurrentResults(null);
    setCurrentJob(null);
    setJobResults(null);
    setError(null);
    setActiveTab('extract');
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
    color: 'white'
  };

  const tabStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
    gap: '1rem'
  };

  const tabButtonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    minWidth: '120px'
  };

  const activeTabStyle = {
    ...tabButtonStyle,
    background: 'white',
    color: '#667eea',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  };

  const inactiveTabStyle = {
    ...tabButtonStyle,
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    backdropFilter: 'blur(10px)'
  };

  const contentStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(20px)',
    minHeight: '600px'
  };

  const errorStyle = {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
    color: 'white',
    padding: '1rem',
    borderRadius: '8px',
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
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          🚀 Smart PDF Table Extraction
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, margin: 0 }}>
          Extract, verify, and analyze table data from PDF documents with AI-powered accuracy
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={tabStyle}>
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

      {/* Content */}
      <div style={contentStyle}>
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
                color: 'white',
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
            />
            
            {/* Quick Tips */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>💡 Quick Tips:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6c757d' }}>
                <li><strong>Single File Mode:</strong> Get instant results with AI verification</li>
                <li><strong>Bulk Mode:</strong> Process multiple files in the background</li>
                <li><strong>Extraction Methods:</strong> 'Both' gives best results, 'Stream' for simple tables, 'Lattice' for complex layouts</li>
                <li><strong>AI Verification:</strong> Gemini AI automatically corrects and improves extraction accuracy</li>
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
                    <h3 style={{ margin: 0, color: '#2c3e50' }}>
                      Extraction Results
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
                      Completed at {formatTimestamp(currentResults.completedAt)} • 
                      Mode: {currentResults.extractionMode}
                    </p>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: '#6c757d',
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
                  <SmartTableViewer
                    tables={currentResults.formatted_tables || currentResults.tables}
                    filename={currentResults.filename}
                    jobId={currentResults.job_id}
                    extractionSummary={currentResults.extraction_summary}
                  />
                )}

                {/* Bulk file results */}
                {currentResults.results && (
                  <ExtractionResults results={currentResults} />
                )}
              </div>
            )}

            {!currentJob && !currentResults && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                <h3>No Results Yet</h3>
                <p>Extract some PDFs to see results here</p>
                <button
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '1rem'
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
            <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>📚 Extraction History</h3>
            
            {extractionHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
                <h3>No History Yet</h3>
                <p>Your extraction history will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {extractionHistory.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: item.status === 'completed' ? '#f8f9fa' : 
                                 item.status === 'failed' ? '#fff5f5' : '#fff8e1'
                    }}
                    onClick={() => loadHistoryItem(item.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                          {item.filename || `${item.fileCount} files`} 
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '12px', 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            background: item.mode === 'single' ? '#e3f2fd' : '#f3e5f5',
                            color: item.mode === 'single' ? '#1976d2' : '#7b1fa2'
                          }}>
                            {item.mode}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          {formatTimestamp(item.timestamp)}
                          {item.completedAt && item.completedAt !== item.timestamp && (
                            <> → {formatTimestamp(item.completedAt)}</>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.results?.extraction_summary?.accuracy_score && (
                          <span style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            background: '#e8f5e8',
                            color: '#2e7d32'
                          }}>
                            {item.results.extraction_summary.accuracy_score}% accuracy
                          </span>
                        )}
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '4px 8px',
                          borderRadius: '12px',
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPDFExtraction;
