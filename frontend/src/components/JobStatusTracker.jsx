import React, { useState, useEffect } from 'react';
// import { Card } from '../utils/Card';
import apiService from '../services/api';

const JobStatusTracker = ({ jobId, onComplete, onError }) => {
  const [jobStatus, setJobStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const pollJobStatus = async () => {
      try {
        const status = await apiService.getJobStatus(jobId);
        setJobStatus(status);
        setLoading(false);

        // If job is completed, call onComplete
        if (status.status === 'completed') {
          onComplete?.(status);
        } else if (status.status === 'failed') {
          setError(status.error || 'Job failed');
          onError?.(status.error || 'Job failed');
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
        onError?.(err.message);
      }
    };

    // Poll immediately
    pollJobStatus();

    // Set up polling interval (every 2 seconds)
    const interval = setInterval(() => {
      if (jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
        clearInterval(interval);
        return;
      }
      pollJobStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status, onComplete, onError]);

  if (loading && !jobStatus) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{
            fontSize: '1.1rem',
            color: '#374151',
            fontWeight: '500'
          }}>
            Initializing job tracker...
          </p>
        </div>
        
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
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '2px solid #ef4444',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '3rem',
            color: '#ef4444'
          }}>
            ❌
          </div>
          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#ef4444',
            margin: 0
          }}>
            Processing Failed
          </h3>
          <p style={{
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!jobStatus) return null;

  const progress = jobStatus.total_files > 0 ? 
    (jobStatus.processed_files / jobStatus.total_files) * 100 : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⚡';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = () => {
    if (!jobStatus.created_at) return '';
    const start = new Date(jobStatus.created_at);
    const end = jobStatus.completed_at ? new Date(jobStatus.completed_at) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      padding: '2rem',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#374151',
            margin: 0
          }}>
            Processing Status
          </h3>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: getStatusColor(jobStatus.status) + '20',
          borderRadius: '25px',
          border: `2px solid ${getStatusColor(jobStatus.status)}`
        }}>
          <span style={{ fontSize: '1.2rem' }}>
            {getStatusIcon(jobStatus.status)}
          </span>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: getStatusColor(jobStatus.status),
            textTransform: 'uppercase'
          }}>
            {jobStatus.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Progress
          </span>
          <span style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            {jobStatus.processed_files} / {jobStatus.total_files} files
          </span>
        </div>
        
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '25px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${getStatusColor(jobStatus.status)} 0%, ${getStatusColor(jobStatus.status)}80 100%)`,
            borderRadius: '25px',
            transition: 'width 0.5s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {jobStatus.status === 'processing' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            )}
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: '0.5rem',
          fontSize: '1.2rem',
          fontWeight: '700',
          color: getStatusColor(jobStatus.status)
        }}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Job Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🆔</span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              Job ID
            </span>
          </div>
          <p style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            fontFamily: 'monospace',
            margin: 0,
            wordBreak: 'break-all'
          }}>
            {jobStatus.id}
          </p>
        </div>

        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              Duration
            </span>
          </div>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#10b981',
            margin: 0
          }}>
            {formatDuration()}
          </p>
        </div>

        {jobStatus.current_file && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            gridColumn: 'span 2'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>📄</span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Currently Processing
              </span>
            </div>
            <p style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: '#f59e0b',
              margin: 0,
              wordBreak: 'break-all'
            }}>
              {jobStatus.current_file}
            </p>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.9rem',
        color: '#6b7280'
      }}>
        <div>
          <strong>Started:</strong> {formatTime(jobStatus.created_at)}
        </div>
        {jobStatus.completed_at && (
          <div>
            <strong>Completed:</strong> {formatTime(jobStatus.completed_at)}
          </div>
        )}
      </div>

      <style>
        {`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        `}
      </style>
    </div>
  );
};

export default JobStatusTracker;
