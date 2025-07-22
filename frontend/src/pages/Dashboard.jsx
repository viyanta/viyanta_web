import React from 'react'
import { Link } from 'react-router-dom'
import Button from '../utils/Button.jsx'
import { useStats } from '../context/StatsContext.jsx'

function Dashboard() {
  const { stats, files, loading } = useStats();

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
        <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
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
            <div style={{ 
              fontSize: '2rem', 
              marginBottom: '0.5rem' 
            }}>
              {stat.icon}
            </div>
            <h3 style={{ 
              fontSize: '1rem', 
              marginBottom: '0.5rem',
              color: 'var(--text-color-dark)'
            }}>
              {stat.title}
            </h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: stat.color,
              margin: 0
            }}>
              {stat.value}
            </p>
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
              {files.slice(0, 5).map((file, index) => (
                <div key={file.file_id || index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: index < 4 ? '1px solid #e9ecef' : 'none'
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
    </div>
  )
}

export default Dashboard
