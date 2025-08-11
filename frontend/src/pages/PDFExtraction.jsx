import React, { useState } from 'react';
// import { Card } from '../utils/Card';
import BulkPDFUploader from '../components/BulkPDFUploader';
import JobStatusTracker from '../components/JobStatusTracker';
import ExtractionResults from '../components/ExtractionResults';
import apiService from '../services/api';

const PDFExtraction = ({ onMenuClick }) => {
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);

  const handleUploadStart = (files) => {
    console.log(`Starting upload of ${files.length} files`);
  };

  const handleUploadComplete = async (files, extractMode) => {
    try {
      const response = await apiService.extractBulkPDFs(files, extractMode);
      
      setCurrentJob(response.job_id);
      setJobResults(null);
      
      // Add to history
      const newJob = {
        id: response.job_id,
        timestamp: new Date().toISOString(),
        fileCount: files.length,
        status: 'processing',
        extractMode
      };
      setUploadHistory(prev => [newJob, ...prev]);
      
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const handleJobComplete = (jobStatus) => {
    setJobResults(jobStatus);
    
    // Update history
    setUploadHistory(prev => 
      prev.map(job => 
        job.id === jobStatus.id 
          ? { ...job, status: 'completed', results: jobStatus.results }
          : job
      )
    );
  };

  const handleJobError = (error) => {
    console.error('Job failed:', error);
    
    // Update history
    if (currentJob) {
      setUploadHistory(prev => 
        prev.map(job => 
          job.id === currentJob 
            ? { ...job, status: 'failed', error }
            : job
        )
      );
    }
  };

  const loadPreviousJob = (jobId) => {
    setCurrentJob(jobId);
    setJobResults(null);

    // Try to use cached results from history if available
    const jobFromHistory = uploadHistory.find(job => job.id === jobId);
    if (jobFromHistory && jobFromHistory.status === 'completed' && jobFromHistory.results) {
      setJobResults(jobFromHistory.results);
      return;
    }

    // Otherwise, fetch job status from API
    apiService.getJobStatus(jobId)
      .then(status => {
        if (status.status === 'completed') {
          setJobResults(status);
        }
      })
      .catch(error => {
        console.error('Failed to load job:', error);
      });
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const headerStyle = {
    textAlign: 'left',
    marginBottom: '3rem'
  };

  const titleContainerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    padding: '1rem 2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  };

  const subtitleStyle = {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.9)',
    maxWidth: '600px',
    margin: '0',
    lineHeight: '1.6',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
  };

  const featuresContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginTop: '1.5rem'
  };

  const featurePillStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '25px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: currentJob ? '1fr 1fr' : '1fr',
    gap: '2rem',
    alignItems: 'start'
  };

  const historyCardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '2rem',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    marginTop: '3rem'
  };

  const historyTitleStyle = {
    fontSize: '1.8rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const jobItemStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    marginBottom: '1rem'
  };

  const features = [
    { icon: '🚀', text: 'Bulk Processing' },
    { icon: '🤖', text: 'AI-Powered' },
    { icon: '💼', text: 'Financial Focus' },
    { icon: '⚡', text: 'Real-time Tracking' }
  ];

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Animated Header */}
        <div style={headerStyle}>
          <div style={titleContainerStyle}>
            {/* Hamburger Menu Icon */}
            <button
              onClick={() => {
                console.log('PDFExtraction hamburger clicked!');
                if (onMenuClick) {
                  onMenuClick();
                } else {
                  console.log('onMenuClick is not defined');
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: '6px',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '36px',
                minHeight: '36px',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ☰
            </button>
            <div style={{ fontSize: '2.5rem' }}>📄</div>
            <h1 style={titleStyle}>
              AI-Powered PDF Table Extraction
            </h1>
          </div>
          <p style={subtitleStyle}>
            Extract financial tables from up to 1000 PDFs with advanced AI processing. 
            Perfect for insurance documents, financial reports, and business statements.
          </p>
          
          {/* Feature Pills */}
          <div style={featuresContainerStyle}>
            {features.map((feature, index) => (
              <div key={index} style={featurePillStyle}>
                <span>{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={gridStyle}>
          
          {/* Upload Section */}
          <div>
            <BulkPDFUploader 
              onUploadStart={handleUploadStart}
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {/* Job Tracking Section */}
          {currentJob && (
            <div>
              <JobStatusTracker 
                jobId={currentJob}
                onComplete={handleJobComplete}
                onError={handleJobError}
              />
            </div>
          )}
        </div>

        {/* Results Section */}
        {jobResults && (
          <div style={{ marginTop: '2rem' }}>
            <ExtractionResults 
              jobId={currentJob}
              jobResults={jobResults}
            />
          </div>
        )}

        {/* Upload History */}
        {uploadHistory.length > 0 && (
          <div style={historyCardStyle}>
            <h2 style={historyTitleStyle}>
              <span>📊</span>
              Processing History
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {uploadHistory.slice(0, 5).map((job, index) => (
                <div 
                  key={job.id} 
                  style={{
                    ...jobItemStyle,
                    cursor: job.status === 'completed' ? 'pointer' : 'default'
                  }}
                  onClick={() => job.status === 'completed' && loadPreviousJob(job.id)}
                  onMouseEnter={(e) => {
                    if (job.status === 'completed') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: 'white'
                        }}>
                          {job.fileCount} file{job.fileCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          backgroundColor: 
                            job.status === 'completed' ? '#10B981' :
                            job.status === 'processing' ? '#F59E0B' :
                            job.status === 'failed' ? '#EF4444' : '#6B7280',
                          color: 'white'
                        }}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        {formatTimestamp(job.timestamp)} • Mode: {job.extractMode}
                      </div>
                    </div>
                    
                    {job.status === 'completed' && (
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>
                        Click to view results →
                      </div>
                    )}
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

export default PDFExtraction;
