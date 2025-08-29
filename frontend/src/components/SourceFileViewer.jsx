import React, { useState, useEffect } from 'react';

function SourceFileViewer({ file, title }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add unique identifier for debugging
  const componentId = React.useMemo(() => `SourceFileViewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);
  
  console.log(`${componentId} - Component rendered at ${new Date().toISOString()}`);
  console.log(`${componentId} - Props received:`, { file, title });

  // Extract file information from the file object
  const fileName = file?.original_filename || file?.filename || file?.name;
  const fileType = fileName ? fileName.split('.').pop()?.toLowerCase() : null;
  const fileId = file?.file_id || file?.id;
  
  // For S3-stored files, use the correct S3 key
  const s3PdfKey = file?.s3_pdf_key || file?.pdf_s3_key || file?.pdf_info?.s3_key; // Check all possible field names
  const s3JsonKey = file?.s3_json_key || file?.json_s3_key; // Check both possible field names
  
  // Determine if this is a PDF file (regardless of the filename extension)
  const isPdfFile = file?.type === 'pdf' || file?.pdf_s3_key || file?.s3_pdf_key || file?.pdf_info?.s3_key;
  
  // Fallback: try to construct S3 key from other available information
  const constructS3Key = () => {
    console.log(`${componentId} - Constructing S3 key...`);
    console.log(`${componentId} - s3PdfKey:`, s3PdfKey);
    console.log(`${componentId} - file.pdf_info:`, file?.pdf_info);
    console.log(`${componentId} - file.user_id:`, file?.user_id);
    console.log(`${componentId} - file.folder_name:`, file?.folder_name);
    console.log(`${componentId} - fileName:`, fileName);
    
    // First priority: use the explicitly set s3PdfKey
    if (s3PdfKey) {
      console.log(`${componentId} - Using s3PdfKey:`, s3PdfKey);
      return s3PdfKey;
    }
    
    // Second priority: if we have pdf_info, use that S3 key
    if (file?.pdf_info?.s3_key) {
      console.log(`${componentId} - Using pdf_info.s3_key:`, file.pdf_info.s3_key);
      return file.pdf_info.s3_key;
    }
    
    // Third priority: if we have user and folder info, try to construct the key
    if (file?.user_id && file?.folder_name && fileName) {
      // If the filename ends with .json, we need to get the corresponding PDF
      if (fileName.toLowerCase().endsWith('.json')) {
        const pdfFilename = fileName.replace('.json', '.pdf');
        const constructedKey = `users/${file.user_id}/${file.folder_name}/pdf/${pdfFilename}`;
        console.log(`${componentId} - Constructed key from JSON filename:`, constructedKey);
        return constructedKey;
      } else {
        const constructedKey = `users/${file.user_id}/${file.folder_name}/pdf/${fileName}`;
        console.log(`${componentId} - Constructed key from PDF filename:`, constructedKey);
        return constructedKey;
      }
    }
    
    // Fourth priority: if we have just the filename, try a generic path
    if (fileName) {
      if (fileName.toLowerCase().endsWith('.json')) {
        const pdfFilename = fileName.replace('.json', '.pdf');
        const constructedKey = `users/default_user/default_folder/pdf/${pdfFilename}`;
        console.log(`${componentId} - Constructed generic key from JSON filename:`, constructedKey);
        return constructedKey;
      } else {
        const constructedKey = `users/default_user/default_folder/pdf/${fileName}`;
        console.log(`${componentId} - Constructed generic key from PDF filename:`, constructedKey);
        return constructedKey;
      }
    }
    
    console.log(`${componentId} - No S3 key could be constructed`);
    return null;
  };
  
  const finalS3Key = constructS3Key();

  // Debug logging
  console.log(`${componentId} - File object:`, file);
  console.log(`${componentId} - fileName:`, fileName);
  console.log(`${componentId} - fileType:`, fileType);
  console.log(`${componentId} - fileId:`, fileId);
  console.log(`${componentId} - finalS3Key:`, finalS3Key);
  console.log(`${componentId} - file.pdf_info:`, file?.pdf_info);
  console.log(`${componentId} - file.type:`, file?.type);
  console.log(`${componentId} - file.user_id:`, file?.user_id);
  console.log(`${componentId} - file.folder_name:`, file?.folder_name);

  // Handle S3 PDF files only
  useEffect(() => {
    console.log(`${componentId} - useEffect triggered for S3 PDF handling`);
    console.log(`${componentId} - isPdfFile:`, isPdfFile);
    console.log(`${componentId} - finalS3Key:`, finalS3Key);
    
    if (isPdfFile && finalS3Key) {
      console.log(`${componentId} - Using S3 endpoint for PDF file`);
      setLoading(false);
    } else if (isPdfFile && !finalS3Key) {
      console.log(`${componentId} - No S3 key available for PDF file`);
      setError('PDF file not available in S3 storage');
      setLoading(false);
    } else {
      console.log(`${componentId} - Not a PDF file or no S3 key`);
      setLoading(false);
    }
  }, [finalS3Key, isPdfFile, componentId]);



  if (!file || !fileName) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: 'var(--border-radius)',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
        <div>No file selected</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>Please select a file to view</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <div>Loading file...</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>Please wait while we prepare your file</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#dc3545',
        backgroundColor: '#f8d7da',
        borderRadius: 'var(--border-radius)',
        border: '1px solid #f5c6cb'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
        <div>Error loading file</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>{error}</div>
      </div>
    );
  }

  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'json': return '📊';
      case 'txt': return '📝';
      case 'csv': return '📈';
      case 'xlsx':
      case 'xls': return '📊';
      default: return '📁';
    }
  };

  const renderFileContent = () => {
    console.log(`${componentId} - Rendering file content`);
    console.log(`${componentId} - isPdfFile:`, isPdfFile);
    console.log(`${componentId} - finalS3Key:`, finalS3Key);
    
    if (isPdfFile) {
      console.log(`${componentId} - Rendering PDF file`);
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '2px solid #e9ecef',
          borderRadius: 'var(--border-radius)',
          height: '80vh',
          overflow: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {finalS3Key ? (
            // Use backend S3 view endpoint for S3 files
            <div>
              <div style={{ flex: 1, minHeight: '600px', position: 'relative' }}>
                <iframe
                  src={`http://localhost:8000/api/extraction/s3/view/${encodeURIComponent(finalS3Key)}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  width="100%"
                  height="100%"
                  style={{
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }}
                  title="PDF Document"
                  onLoad={() => {
                    console.log(`${componentId} - Iframe loaded successfully from S3 endpoint`);
                  }}
                />
              </div>
            </div>
          ) : (
            // Fallback message
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
              <div>PDF file ready</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                {loading ? 'Loading PDF viewer...' : 'Preparing PDF viewer...'}
              </div>
                          <div style={{ fontSize: '10px', marginTop: '10px', color: '#999' }}>
              Debug: isPdfFile={isPdfFile.toString()}, S3Key={finalS3Key || 'null'}
            </div>
              {error && (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '10px', 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Error: {error}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // For non-PDF files, use the original logic
    switch (fileType?.toLowerCase()) {
      case 'json':
        return (
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: 'var(--border-radius)',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #e9ecef'
          }}>
            {JSON.stringify(file.content || file.data || {}, null, 2)}
          </pre>
        );
      case 'txt':
        return (
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: 'var(--border-radius)',
            overflow: 'auto',
            fontSize: '14px',
            border: '1px solid #e9ecef',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace'
          }}>
            {file.content || 'No content available'}
          </pre>
        );
      default:
        return (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: 'var(--border-radius)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>{getFileIcon(fileName)}</div>
            <div>File type not supported for preview</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>Please download the file to view its contents</div>
          </div>
        );
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 'var(--border-radius)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '5px'
        }}>
          <span style={{ fontSize: '20px' }}>{getFileIcon(fileName)}</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{title || 'File Viewer'}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {fileName} • {fileType?.toUpperCase() || 'Unknown'} • {file?.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Size unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {renderFileContent()}
      </div>
    </div>
  );
}

export default SourceFileViewer;