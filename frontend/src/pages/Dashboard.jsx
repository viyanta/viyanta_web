import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../utils/Button.jsx';
import { useStats } from '../context/StatsContext.jsx';
import Modal from '../components/Modal.jsx';
import DataTable from '../components/DataTable.jsx';
import SourceFileViewer from '../components/SourceFileViewer.jsx';
import ApiService from '../services/api.js';

// Component to display Parquet data in table format
function ParquetDataViewer({ fileId, fileName, title }) {
  const [parquetData, setParquetData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const loadParquetData = async () => {
      if (!fileId) return;
      
      setLoading(true);
      try {
        const data = await ApiService.previewFile(fileId, false);
        setParquetData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadParquetData();
  }, [fileId]);

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-color-light)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <p>Loading parquet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--error-color)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
        <p>Error loading data: {error}</p>
      </div>
    );
  }

  if (!parquetData) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-color-light)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={parquetData.columns}
      data={parquetData.preview}
      title={title}
    />
  );
}

function Dashboard({ onMenuClick }) {
  const { stats, files, loading } = useStats();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [sourcePreview, setSourcePreview] = useState(null);
  const [parquetPreview, setParquetPreview] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showFullData, setShowFullData] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison', 'original', or 'files'

  const loadFullData = async () => {
    if (!currentFileId) return;
    
    setModalLoading(true);
    try {
      const [sourceData, parquetData] = await Promise.all([
        ApiService.previewOriginalFile(currentFileId, true),
        ApiService.previewFile(currentFileId, true)
      ]);
      setSourcePreview(sourceData);
      setParquetPreview(parquetData);
      setShowFullData(true);
    } catch (err) {
      console.error('Full data load error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const loadPreviewData = async () => {
    if (!currentFileId) return;
    
    setModalLoading(true);
    try {
      const [sourceData, parquetData] = await Promise.all([
        ApiService.previewOriginalFile(currentFileId, false),
        ApiService.previewFile(currentFileId, false)
      ]);
      setSourcePreview(sourceData);
      setParquetPreview(parquetData);
      setShowFullData(false);
    } catch (err) {
      console.error('Preview data load error:', err);
    } finally {
      setModalLoading(false);
    }
  };

    const statsCards = [
      {
        title: 'Total Files Uploaded',
        value: loading ? '...' : stats.total_files.toString(),
        icon: '📁',
        color: 'var(--sub-color)',
        bgColor: 'rgba(63, 114, 175, 0.1)'
      },
      {
        title: 'Files Processed',
        value: loading ? '...' : stats.processed_files.toString(),
        icon: '✅',
        color: 'var(--success-color)',
        bgColor: 'rgba(40, 167, 69, 0.1)'
      },
      {
        title: 'In Progress',
        value: loading ? '...' : stats.processing_files.toString(),
        icon: '⏳',
        color: 'var(--warning-color)',
        bgColor: 'rgba(255, 193, 7, 0.1)'
      },
      {
        title: 'Total Size',
        value: loading ? '...' : `${stats.total_size_mb} MB`,
        icon: '💾',
        color: 'var(--info-color)',
        bgColor: 'rgba(23, 162, 184, 0.1)'
      }
    ];

    return (
      <div className="fade-in" style={{ padding: '1rem' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            {/* Hamburger Menu Icon */}
            <button
              onClick={() => {
                console.log('Dashboard hamburger clicked!');
                if (onMenuClick) {
                  onMenuClick();
                } else {
                  console.log('onMenuClick is not defined');
                }
              }}
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
            <h1 style={{ margin: 0 }}>Dashboard</h1>
          </div>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            Welcome to your file processing dashboard. Monitor your uploads and conversions in real-time.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/explorer">
              <Button variant="primary" size="medium" icon="📁">
                Upload New File
              </Button>
            </Link>
            <Button variant="outline" size="medium" icon="📊">
              View Reports
            </Button>
            <Button variant="ghost" size="medium" icon="⚙️">
              Settings
            </Button>
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="card"
              style={{
                textAlign: 'center',
                backgroundColor: stat.bgColor,
                border: `1px solid ${stat.color}20`
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
              <h4 style={{ color: stat.color, marginBottom: '0.5rem' }}>{stat.title}</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>
        {/* Recent Activity Section */}
        <div className="grid grid-2" style={{ gap: '2rem' }}>
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Loading...</p>
              </div>
            ) : files.length === 0 ? (
              <div style={{ color: 'var(--text-color-light)', textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                <p>No recent activity</p>
                <p style={{ fontSize: '0.875rem' }}>Upload your first file to get started</p>
                <Link to="/explorer">
                  <Button variant="primary" size="small" style={{ marginTop: '1rem' }}>
                    Start Uploading
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: 'var(--background-color)', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.75rem',
                  color: 'var(--text-color-light)',
                  border: '1px solid #e9ecef'
                }}>
                  💡 <strong>Tip:</strong> Click any file to view both source file and parquet comparison
                </div>
                {files.slice(0, 5).map((file, index) => (
                  <div key={file.file_id || index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: index < 4 ? '1px solid #e9ecef' : 'none',
                    cursor: 'pointer'
                  }}
                    onClick={async (e) => {
                      setSelectedFile(file);
                      setCurrentFileId(file.file_id);
                      setModalOpen(true);
                      setModalTitle(`Files Comparison: ${file.original_filename}`);
                      setViewMode('files');
                      setModalLoading(false);
                    }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                        {file.original_filename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)' }}>
                        {new Date(file.upload_time).toLocaleDateString()} • {file.file_type.toUpperCase()}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: file.status === 'completed' ? 'rgba(40, 167, 69, 0.1)' :
                        file.status === 'processing' ? 'rgba(255, 193, 7, 0.1)' :
                          'rgba(220, 53, 69, 0.1)',
                      color: file.status === 'completed' ? 'var(--success-color)' :
                        file.status === 'processing' ? 'var(--warning-color)' :
                          'var(--error-color)'
                    }}>
                      {file.status === 'completed' ? '✅ Completed' :
                        file.status === 'processing' ? '⏳ Processing' :
                          '❌ Failed'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/explorer" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1rem',
                  border: '1px solid #e9ecef',
                  borderRadius: 'var(--border-radius)',
                  transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background-color)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>📁</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>File Explorer</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>Upload and manage your files</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1rem',
                  border: '1px solid #e9ecef',
                  borderRadius: 'var(--border-radius)',
                  transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background-color)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>👤</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>User Profile</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>Manage your account settings</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
        {/* Modal for File Display */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
          <div className="modal-body">
            {viewMode === 'original' && selectedFile ? (
              <SourceFileViewer 
                file={selectedFile}
                title={selectedFile.original_filename}
              />
            ) : viewMode === 'files' && selectedFile ? (
              <div>
                {/* Files Comparison Header */}
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--background-color)', 
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                    📁 File Comparison View
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-color-light)' }}>
                    Compare original source file with processed parquet data
                  </p>
                </div>
                
                <div className="split-layout">
                  {/* Source File */}
                  <div className="split-pane">
                    <SourceFileViewer
                      file={selectedFile}
                      title={`Source: ${selectedFile.original_filename}`}
                    />
                  </div>
                  {/* Vertical Divider */}
                  <div style={{ 
                    width: '3px', 
                    background: 'linear-gradient(to bottom, var(--main-color), var(--sub-color))', 
                    minHeight: '400px', 
                    borderRadius: '2px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                  }} />
                  {/* Parquet Data Table */}
                  <div className="split-pane">
                    {selectedFile.parquet_filename ? (
                      <ParquetDataViewer 
                        fileId={selectedFile.file_id}
                        fileName={selectedFile.parquet_filename}
                        title={`Parquet Data: ${selectedFile.parquet_filename}`}
                      />
                    ) : (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-color-light)',
                        border: '2px dashed #e9ecef',
                        borderRadius: 'var(--border-radius)'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                        <p>Parquet file not available yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : modalLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Loading {showFullData ? 'complete' : 'preview'} file data for comparison...</p>
              </div>
            ) : sourcePreview && parquetPreview ? (
              <div>
                {/* Data View Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--background-color)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      variant={!showFullData ? 'primary' : 'outline'}
                      size="small"
                      onClick={loadPreviewData}
                      disabled={modalLoading}
                    >
                      📊 Preview (20 rows)
                    </Button>
                    <Button
                      variant={showFullData ? 'primary' : 'outline'}
                      size="small"
                      onClick={loadFullData}
                      disabled={modalLoading}
                    >
                      📋 Full Data ({Math.max(sourcePreview.total_rows, parquetPreview.total_rows)} rows)
                    </Button>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-light)' }}>
                    Currently showing: <strong>{showFullData ? 'Complete Dataset' : 'Preview Only'}</strong>
                  </div>
                </div>

                {/* File Statistics Summary */}
                <div style={{ 
                  display: 'flex', 
                  gap: '2rem', 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--background-color)', 
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)', whiteSpace: 'nowrap' }}>
                      📄 Original File
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      <strong>Type:</strong> {sourcePreview.file_type?.toUpperCase()}<br/>
                      <strong>Total Rows:</strong> {sourcePreview.total_rows.toLocaleString()}<br/>
                      <strong>Columns:</strong> {sourcePreview.columns.length}<br/>
                      <strong>Showing:</strong> {sourcePreview.preview.length.toLocaleString()} rows
                    </p>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#e9ecef' }}></div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--sub-color)' }}>
                      📦 Parquet File
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      <strong>Type:</strong> {parquetPreview.file_type?.toUpperCase()}<br/>
                      <strong>Total Rows:</strong> {parquetPreview.total_rows.toLocaleString()}<br/>
                      <strong>Columns:</strong> {parquetPreview.columns.length}<br/>
                      <strong>Showing:</strong> {parquetPreview.preview.length.toLocaleString()} rows
                    </p>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#e9ecef' }}></div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success-color)' }}>
                      🔍 Comparison
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      <strong>Data Match:</strong> {sourcePreview.total_rows === parquetPreview.total_rows ? '✅ Perfect' : '⚠️ Different'}<br/>
                      <strong>Schema Match:</strong> {sourcePreview.columns.length === parquetPreview.columns.length ? '✅ Perfect' : '⚠️ Different'}<br/>
                      <strong>View Mode:</strong> {showFullData ? '📋 Complete' : '📊 Preview'}<br/>
                      <strong>Status:</strong> {sourcePreview.is_full_data ? '🔓 Full Access' : '🔒 Limited'}
                    </p>
                  </div>
                </div>
                
                {/* Side-by-side Data Display: Original Format vs Table */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 3px 1fr',
                  gap: '1rem', 
                  alignItems: 'flex-start',
                  minHeight: '400px'
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <SourceFileViewer
                      fileData={sourcePreview}
                      fileType={sourcePreview.file_type}
                      title={`Source File ${showFullData ? 'Complete Data' : 'Preview'} (Original Format)`}
                    />
                  </div>
                                    <div className="split-divider" />
                  <div style={{ overflow: 'hidden' }}>
                    <DataTable
                      columns={parquetPreview.columns}
                      data={parquetPreview.preview}
                      title={`Parquet File ${showFullData ? 'Complete Data' : 'Preview'} (Table Format)`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--error-color)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                <p><strong>Unable to load file data for comparison.</strong></p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-color-light)' }}>
                  The file may still be processing or there was an error loading the data.
                </p>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => currentFileId && loadPreviewData()}
                  style={{ marginTop: '1rem' }}
                >
                  🔄 Retry Loading
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
           
}

export default Dashboard
