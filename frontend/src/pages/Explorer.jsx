import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'

function Explorer() {
    const { refreshStats } = useStats();
    const [file, setFile] = React.useState(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [uploadResult, setUploadResult] = React.useState(null);
    const [uploadSuccess, setUploadSuccess] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [previewData, setPreviewData] = React.useState(null);
    const [sourcePreview, setSourcePreview] = React.useState(null);

    const handleFileUpload = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadSuccess(false);
            setUploadResult(null);
            setError(null);
            setPreviewData(null);
            setSourcePreview(null);
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
                    // Load both source and parquet previews
                    const [sourceData, parquetData] = await Promise.all([
                        ApiService.previewOriginalFile(result.file_id),
                        ApiService.previewFile(result.file_id)
                    ]);
                    setSourcePreview(sourceData);
                    setPreviewData(parquetData);
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
            <h1 style={{ marginBottom: '0.5rem' }}>Checker and Maker </h1>
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

        {/* Data Comparison Section: Original File vs Parquet File */}
        {previewData && sourcePreview && (
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '3px solid var(--main-color)', paddingBottom: '0.5rem', letterSpacing: '0.5px' }}>
                    Compare Source File vs Parquet File
                </h2>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', position: 'relative' }}>
                    {/* Source File in Original Format */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <SourceFileViewer
                            file={{
                                original_filename: uploadResult?.original_file?.filename || file?.name,
                                file_id: uploadResult?.file_id,
                                file_size: file?.size,
                                upload_timestamp: uploadResult?.upload_time
                            }}
                            title={uploadResult?.original_file?.filename ? `Source: ${uploadResult.original_file.filename}` : 'Source File (Original Format)'}
                        />
                    </div>
                    {/* Vertical Divider */}
                    <div style={{ width: '3px', background: 'linear-gradient(to bottom, var(--main-color), var(--sub-color))', minHeight: '400px', borderRadius: '2px', margin: '0 1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    {/* Parquet File */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--sub-color)' }}>
                        📊 Parquet Data Preview (Table Format)
                       </h3>
                        <DataTable
                        columns={previewData.columns}
                        data={previewData.preview}
                        title="Parquet Data Table"
                        fileType={previewData.file_type}
                        maxHeight="500px"
                        showFullData={false}
                    />
                    </div>
                </div>
            

                
                {/* Horizontal Bar for separation */}
                <div style={{ margin: '2rem 0 0 0', height: '6px', width: '100%', background: 'linear-gradient(to right, var(--main-color), var(--sub-color))', borderRadius: '3px' }} />
            </div>
        )}
    </div>
  )
}

export default Explorer