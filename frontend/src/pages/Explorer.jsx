import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'

function Explorer() {
    const { refreshStats } = useStats();
    const [file, setFile] = React.useState(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [uploadResult, setUploadResult] = React.useState(null);
    const [uploadSuccess, setUploadSuccess] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [previewData, setPreviewData] = React.useState(null);

    const handleFileUpload = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadSuccess(false);
            setUploadResult(null);
            setError(null);
            setPreviewData(null);
            console.log(`File selected: ${selectedFile.name}`);
        }
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setUploadSuccess(false);
        setError(null);
        
        try {
            const result = await ApiService.uploadFile(file);
            setUploadResult(result);
            setUploadSuccess(true);
            
            // Refresh stats to update sidebar and dashboard
            await refreshStats();
            
            // Load preview data
            if (result.file_id) {
                try {
                    const preview = await ApiService.previewFile(result.file_id);
                    setPreviewData(preview);
                } catch (previewError) {
                    console.warn('Preview failed:', previewError.message);
                }
            }
        } catch (error) {
            setError(error.message);
            console.error('Upload failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadOriginalFile = async () => {
        if (!uploadResult?.file_id) return;
        
        try {
            const blob = await ApiService.downloadOriginalFile(uploadResult.file_id);
            ApiService.downloadBlob(blob, uploadResult.original_file.filename);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed: ' + error.message);
        }
    };

    const downloadParquetFile = async () => {
        if (!uploadResult?.file_id) return;
        
        try {
            const blob = await ApiService.downloadParquetFile(uploadResult.file_id);
            ApiService.downloadBlob(blob, uploadResult.parquet_file.filename);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed: ' + error.message);
        }
    };

    const getFileType = (file) => {
        if (file.type === 'application/pdf') return 'PDF';
        if (file.type === 'application/json') return 'JSON';
        if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) return 'CSV';
        return 'Unknown';
    };

    const formatFileSize = (bytes) => {
        return (bytes / 1024 / 1024).toFixed(2);
    };

  return (
    <div className="fade-in" style={{ padding: '1rem' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>File Explorer</h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '0' }}>
                Upload your files and convert them to Parquet format for efficient data processing.
            </p>
        </div>
        
        {/* Upload Section */}
        <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📁 File Upload
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Supported formats: PDF, JSON, CSV
                </p>
            </div>
            
            <div className="form-group">
                <label className="form-label">Select File</label>
                <input 
                    type="file" 
                    accept=".pdf,.json,.csv"
                    onChange={handleFileUpload} 
                    className="form-input"
                    style={{ marginBottom: '1rem' }}
                />
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button 
                        onClick={processFile} 
                        disabled={!file || isProcessing}
                        variant="primary"
                        loading={isProcessing}
                        icon={isProcessing ? null : '🚀'}
                    >
                        {isProcessing ? 'Processing...' : 'Upload & Convert'}
                    </Button>
                    
                    {file && (
                        <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--text-color-light)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>📄</span>
                            <span>{file.name}</span>
                            <span>({formatFileSize(file.size)} MB)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Error Message */}
        {error && (
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                border: '1px solid var(--error-color)', 
                borderRadius: 'var(--border-radius)', 
                color: 'var(--error-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>❌</span>
                <div>
                    <strong>Error!</strong> {error}
                </div>
            </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(40, 167, 69, 0.1)', 
                border: '1px solid var(--success-color)', 
                borderRadius: 'var(--border-radius)', 
                color: 'var(--success-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                    <strong>Success!</strong> File uploaded and converted successfully.
                </div>
            </div>
        )}

        {/* Processing Results */}
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Processing Results</h2>
            <div className="grid grid-2" style={{ gap: '2rem' }}>
                {/* Left Section - Source File */}
                <div className="card" style={{ 
                    backgroundColor: 'rgba(63, 114, 175, 0.1)',
                    border: '2px solid var(--sub-color)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '1rem',
                            opacity: file ? 1 : 0.3
                        }}>
                            📄
                        </div>
                        <h3 style={{ color: 'var(--sub-color)', marginBottom: '1rem' }}>
                            Source File
                        </h3>
                        
                        {file && uploadResult ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.original_file.filename}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(uploadResult.original_file.size)} MB
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.original_file.type}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: uploadSuccess ? 'var(--success-color)' : isProcessing ? 'var(--warning-color)' : 'var(--text-color-light)'
                                    }}>
                                        {uploadSuccess ? '✅ Processed' : isProcessing ? '🔄 Processing...' : '⏳ Ready to process'}
                                    </p>
                                </div>

                                {uploadSuccess && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <Button 
                                            variant="outline" 
                                            size="small"
                                            icon="⬇️"
                                            onClick={downloadOriginalFile}
                                        >
                                            Download Original
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : file ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{file.name}</p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(file.size)} MB
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {getFileType(file)}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: 'var(--text-color-light)'
                                    }}>
                                        ⏳ Ready to process
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-color-light)', fontStyle: 'italic' }}>
                                No file uploaded yet
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Section - Converted Parquet File */}
                <div className="card" style={{ 
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    border: '2px solid var(--success-color)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: '3rem', 
                            marginBottom: '1rem',
                            opacity: uploadResult?.parquet_file ? 1 : 0.3
                        }}>
                            📊
                        </div>
                        <h3 style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>
                            Parquet File
                        </h3>
                        
                        {uploadResult?.parquet_file ? (
                            <div style={{ textAlign: 'left' }}>
                                <div className="form-group">
                                    <span className="form-label">File Name:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.parquet_file.filename}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Size:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {formatFileSize(uploadResult.parquet_file.size)} MB
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--success-color)',
                                            marginLeft: '0.5rem'
                                        }}>
                                            ({Math.round((1 - uploadResult.parquet_file.size / uploadResult.original_file.size) * 100)}% smaller!)
                                        </span>
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Rows:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>
                                        {uploadResult.parquet_file.row_count.toLocaleString()}
                                    </p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">File Type:</span>
                                    <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>Parquet</p>
                                </div>
                                
                                <div className="form-group">
                                    <span className="form-label">Status:</span>
                                    <p style={{ 
                                        margin: '0.25rem 0', 
                                        fontWeight: '500',
                                        color: 'var(--success-color)'
                                    }}>
                                        ✅ Ready for download
                                    </p>
                                </div>
                                
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <Button 
                                        variant="success" 
                                        icon="⬇️"
                                        onClick={downloadParquetFile}
                                    >
                                        Download Parquet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-color-light)', fontStyle: 'italic' }}>
                                No converted file available yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Data Preview Section */}
        {previewData && (
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Data Preview</h2>
                <div className="card">
                    <div className="card-header">
                        <h3>First 10 Rows</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                            Total: {previewData.total_rows.toLocaleString()} rows, {previewData.columns.length} columns
                        </p>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            fontSize: '0.875rem'
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--background-color)' }}>
                                    {previewData.columns.map((col, index) => (
                                        <th key={index} style={{ 
                                            padding: '0.75rem', 
                                            textAlign: 'left',
                                            borderBottom: '2px solid #e9ecef',
                                            fontWeight: '600'
                                        }}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.preview.map((row, rowIndex) => (
                                    <tr key={rowIndex} style={{ 
                                        borderBottom: '1px solid #e9ecef',
                                        backgroundColor: rowIndex % 2 === 0 ? 'white' : 'var(--background-color)'
                                    }}>
                                        {previewData.columns.map((col, colIndex) => (
                                            <td key={colIndex} style={{ 
                                                padding: '0.75rem',
                                                maxWidth: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {String(row[col] || '')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default Explorer