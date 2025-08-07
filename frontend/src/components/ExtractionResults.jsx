import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const ExtractionResults = ({ jobId, jobResults }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  useEffect(() => {
    if (jobId && jobResults?.status === 'completed') {
      fetchJobFiles();
    }
    // Only run when jobId or jobResults.status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, jobResults?.status]);

  const fetchJobFiles = async () => {
    setLoading(true);
    try {
      // Use the files endpoint to get the actual extracted files
      const data = await apiService.listJobFiles(jobId);
      console.log('Job files data:', data); // Debug log
      
      // The files endpoint returns { job_id, files: [...] }
      const extractedFiles = data.files || [];
      
      console.log('Extracted files:', extractedFiles); // Debug log
      setFiles(extractedFiles);
    } catch (error) {
      console.error('Failed to fetch job files:', error);
      // Fallback: try to get files from job results
      try {
        const resultsData = await apiService.getJobResults(jobId);
        console.log('Fallback job results data:', resultsData);
        
        // Try to construct files from file_details if available
        let fallbackFiles = [];
        if (resultsData.summary && resultsData.summary.file_details) {
          fallbackFiles = resultsData.summary.file_details.map(detail => ({
            filename: detail.filename.replace('.pdf', '.csv'),
            size: detail.file_size || 0,
            type: 'csv'
          }));
        }
        setFiles(fallbackFiles);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setFiles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filename) => {
    try {
      const blob = await apiService.downloadJobResults(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `extraction_${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  };

  const downloadJobResults = async () => {
    try {
      const blob = await apiService.downloadJobResults(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extraction_results_${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download results:', error);
      alert('Failed to download results');
    }
  };

  const downloadSelectedFiles = async () => {
    for (const filename of selectedFiles) {
      await downloadFile(filename);
    }
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (filename) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.filename)));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'csv':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
          </svg>
        );
      case 'json':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 0v12h12V4H4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!jobResults || jobResults.status !== 'completed') {
    return null;
  }

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
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          Extraction Results
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          Your extracted files are ready for download
        </p>
      </div>

      {/* Summary Statistics */}
      {jobResults?.results?.summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '15px',
            padding: '1.5rem',
            textAlign: 'center',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '0.5rem'
            }}>
              {jobResults.results.summary.total_files}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Total Files
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '15px',
            padding: '1.5rem',
            textAlign: 'center',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '0.5rem'
            }}>
              {jobResults.results.summary.total_tables}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Tables Extracted
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '15px',
            padding: '1.5rem',
            textAlign: 'center',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f59e0b',
              marginBottom: '0.5rem'
            }}>
              {jobResults.results.summary.success_rate?.toFixed(1)}%
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Success Rate
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={downloadJobResults}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
        >
          📦 Download Complete Results
        </button>
        
        {selectedFiles.size > 0 && (
          <button
            onClick={downloadSelectedFiles}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
          >
            ✅ Download Selected ({selectedFiles.size})
          </button>
        )}
      </div>

      {/* Files List */}
      <div style={{
        backgroundColor: 'rgba(249, 250, 251, 0.8)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#374151',
            margin: 0
          }}>
            📄 Extracted Files ({files.length})
          </h3>
          {files.length > 0 && (
            <button
              onClick={selectAllFiles}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '1rem'
            }} />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#9ca3af'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No files available for download</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Files will appear here once extraction is complete
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {files.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: selectedFiles.has(file.filename) 
                    ? 'rgba(59, 130, 246, 0.1)' 
                    : 'white',
                  borderRadius: '10px',
                  border: selectedFiles.has(file.filename) 
                    ? '1px solid rgba(59, 130, 246, 0.3)' 
                    : '1px solid #e5e7eb',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!selectedFiles.has(file.filename)) {
                    e.currentTarget.style.backgroundColor = 'rgba(249, 250, 251, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedFiles.has(file.filename)) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flex: 1
                }}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.filename)}
                    onChange={() => toggleFileSelection(file.filename)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#3b82f6'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1.2rem'
                  }}>
                    {file.type === 'csv' ? '📊' : '📄'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      color: '#374151',
                      margin: 0,
                      marginBottom: '0.25rem'
                    }}>
                      {file.filename}
                    </p>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {formatFileSize(file.size)} • {file.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(file.filename)}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Details */}
      {jobResults?.results?.summary?.file_details && (
        <div style={{
          backgroundColor: 'rgba(249, 250, 251, 0.8)',
          borderRadius: '15px',
          padding: '1.5rem',
          border: '1px solid #e5e7eb',
          marginTop: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📋 Processing Details
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {jobResults.results.summary.file_details.map((detail, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    color: '#374151',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    {detail.filename}
                  </p>
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {detail.tables_extracted} table{detail.tables_extracted !== 1 ? 's' : ''} extracted
                  </p>
                </div>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '20px',
                    backgroundColor: detail.status === 'success' ? '#dcfce7' : '#fef3c7',
                    color: detail.status === 'success' ? '#166534' : '#92400e'
                  }}
                >
                  {detail.status === 'success' ? '✅ Success' : '⚠️ No Tables'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* CSS Animation */}
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

export default ExtractionResults;
