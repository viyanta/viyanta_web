import React, { useState, useEffect } from 'react';

function SourceFileViewer({ file, title }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);

  // Extract file information from the file object
  const fileName = file?.original_filename || file?.filename || file?.name;
  const fileType = fileName ? fileName.split('.').pop()?.toLowerCase() : null;
  const fileId = file?.file_id || file?.id;
  const s3PdfKey = file?.s3_pdf_key; // For S3-stored files
  
  // Fallback: try to construct S3 key from other available information
  const constructS3Key = () => {
    if (s3PdfKey) return s3PdfKey;
    
    // If we have user and folder info, try to construct the key
    if (file?.user_id && file?.folder_name && fileName) {
      return `users/${file.user_id}/${file.folder_name}/pdf/${fileName}`;
    }
    
    // If we have just the filename, try a generic path
    if (fileName) {
      return `users/default_user/default_folder/pdf/${fileName}`;
    }
    
    return null;
  };
  
  const finalS3Key = constructS3Key();

  // Debug logging
  console.log('SourceFileViewer - File object:', file);
  console.log('SourceFileViewer - fileName:', fileName);
  console.log('SourceFileViewer - fileType:', fileType);
  console.log('SourceFileViewer - fileId:', fileId);
  console.log('SourceFileViewer - s3PdfKey:', s3PdfKey);
  console.log('SourceFileViewer - finalS3Key:', finalS3Key);

  // Create blob URL for PDF files to ensure they display inline
  useEffect(() => {
    if (fileType?.toLowerCase() === 'pdf') {
      const loadPdfAsBlob = async () => {
        try {
          setLoading(true);
          console.log('Loading PDF...');
          
          let response;
          let url;
          
          if (finalS3Key) {
            // For S3 files, use the S3 view endpoint for inline display
            url = `http://localhost:8000/api/extraction/s3/view/${encodeURIComponent(finalS3Key)}`;
            console.log('Using S3 view endpoint:', url);
            response = await fetch(url);
          } else if (fileId) {
            // For local files, use the view endpoint
            url = `http://localhost:8000/view/original/${fileId}`;
            console.log('Using local view endpoint:', url);
            response = await fetch(url);
          } else {
            throw new Error('No file ID or S3 key available');
          }
          
          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
          
          if (response.ok) {
            const blob = await response.blob();
            console.log('Blob created:', blob);
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            console.log('Blob URL created:', url);
          } else {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          }
        } catch (err) {
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF file: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      loadPdfAsBlob();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileId, finalS3Key, fileType]);

  if (!file || !fileName) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-color-light)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
        <p>No file selected. Please select a file to view.</p>
      </div>
    );
  }

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
        <p>Loading file...</p>
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
        <p>Error loading file: {error}</p>
      </div>
    );
  }

  const getFileTypeIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'json': return '📋';
      case 'csv': return '📊';
      case 'txt': return '📝';
      case 'xlsx': case 'xls': return '📈';
      case 'docx': case 'doc': return '📄';
      case 'parquet': return '📦';
      default: return '📁';
    }
  };

  const renderFileContent = () => {
    // Use blob URL for PDFs to ensure inline display, API endpoint for others
    const fileUrl = (fileType?.toLowerCase() === 'pdf' && blobUrl) 
      ? blobUrl
      : fileId 
        ? `http://localhost:8000/view/original/${fileId}`
        : `http://localhost:8000/uploads/${encodeURIComponent(fileName)}`;
    
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return (
          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #e9ecef',
            borderRadius: 'var(--border-radius)',
            height: '600px',
            overflow: 'auto',
            position: 'relative'
          }}>
            {blobUrl ? (
              // Use blob URL if available
              <iframe
                src={blobUrl}
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  borderRadius: 'var(--border-radius)'
                }}
                title="PDF Document"
              />
            ) : (
              // Fallback to direct URL
              <iframe
                src={finalS3Key 
                  ? `http://localhost:8000/api/extraction/s3/view/${encodeURIComponent(finalS3Key)}`
                  : `http://localhost:8000/view/original/${fileId}`
                }
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  borderRadius: 'var(--border-radius)'
                }}
                title="PDF Document"
              />
            )}
          </div>
        );

      case 'json':
      case 'txt':
      case 'csv':
        return (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px solid #e9ecef',
            borderRadius: 'var(--border-radius)',
            height: '500px',
            overflow: 'auto',
            position: 'relative'
          }}>
            <iframe
              src={fileUrl}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                backgroundColor: 'white',
                fontFamily: fileType === 'json' ? 'Consolas, Monaco, "Courier New", monospace' : 'inherit'
              }}
              title={`Original ${fileType?.toUpperCase()} File`}
            />
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              zIndex: 10
            }}>
              {getFileTypeIcon(fileType)} Original {fileType?.toUpperCase()}
            </div>
          </div>
        );

      case 'xlsx':
      case 'xls':
      case 'docx':
      case 'doc':
        return (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px solid #e9ecef',
            borderRadius: 'var(--border-radius)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {getFileTypeIcon(fileType)}
            </div>
            <h3 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>
              {fileName}
            </h3>
            <p style={{ color: 'var(--text-color-light)', marginBottom: '2rem' }}>
              This file type requires downloading to view properly.
            </p>
            <a 
              href={fileId ? `http://localhost:8000/api/files/download/original/${fileId}` : fileUrl} 
              download={fileName}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--main-color)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 'var(--border-radius)',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--main-color-dark)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--main-color)'}
            >
              📥 Download File
            </a>
          </div>
        );

      case 'parquet':
        return (
          <div style={{
            backgroundColor: '#f0f8ff',
            border: '2px solid #4CAF50',
            borderRadius: 'var(--border-radius)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              📦
            </div>
            <h3 style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>
              {fileName}
            </h3>
            <p style={{ color: 'var(--text-color-light)', marginBottom: '1rem' }}>
              Parquet is a columnar storage format optimized for analytics.
            </p>
            <div style={{ 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              padding: '1rem', 
              borderRadius: 'var(--border-radius)',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success-color)' }}>
                ✨ File Benefits:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-color)' }}>
                <li>Compressed for efficient storage</li>
                <li>Optimized for fast data queries</li>
                <li>Column-oriented structure</li>
                <li>Preserves data types and schema</li>
              </ul>
            </div>
            <a 
              href={fileId ? `http://localhost:8000/api/files/download/parquet/${fileId}` : fileUrl} 
              download={fileName}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--success-color)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 'var(--border-radius)',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--success-color)'}
            >
              📥 Download Parquet File
            </a>
          </div>
        );

      default:
        return (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px solid #e9ecef',
            borderRadius: 'var(--border-radius)',
            height: '500px',
            overflow: 'auto',
            position: 'relative'
          }}>
            <iframe
              src={fileUrl}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                backgroundColor: 'white'
              }}
              title="Original File"
            />
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              zIndex: 10,
              whiteSpace: 'nowrap'
            }}>
              📁 Original File
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
      {/* Header */}
      {title && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem',
          backgroundColor: 'var(--background-color)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getFileTypeIcon(fileType)}</span>
              <h4 style={{ margin: 0, color: 'var(--main-color)' }}>{title}</h4>
            </div>
            <div style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: 'var(--main-color)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              📄 Original File
            </div>
          </div>
          <div style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-color-light)',
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <span><strong>File Name:</strong> {fileName}</span>
            <span><strong>File Type:</strong> {fileType?.toUpperCase() || 'Unknown'}</span>
            <span><strong>Format:</strong> Native/Original</span>
            {file.file_size && (
              <span><strong>Size:</strong> {(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
            )}
            {file.upload_timestamp && (
              <span><strong>Uploaded:</strong> {new Date(file.upload_timestamp).toLocaleDateString()}</span>
            )}
            <span style={{ color: 'var(--info-color)' }}>
              🎯 <strong>Source:</strong> Displayed exactly as uploaded
            </span>
          </div>
        </div>
      )}
      
      {/* File Content Display */}
      {renderFileContent()}
      
      {/* Footer */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: 'var(--background-color)',
        borderRadius: 'var(--border-radius)',
        border: '1px solid #e9ecef',
        fontSize: '0.75rem',
        color: 'var(--text-color-light)',
        textAlign: 'center'
      }}>
        🎯 <strong>Original file displayed as uploaded</strong> •{' '}
        File served directly from backend/uploads/ folder
        <span style={{ marginLeft: '1rem', color: 'var(--info-color)' }}>
          📁 No processing • Pure original format
        </span>
      </div>
    </div>
  );
}

export default SourceFileViewer