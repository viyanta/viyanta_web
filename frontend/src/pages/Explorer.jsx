import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'

function Explorer({ onMenuClick }) {
    const { refreshStats } = useStats();
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    
    // File browser state
    const [uploadedFiles, setUploadedFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [selectedFileJson, setSelectedFileJson] = React.useState(null);
    const [jsonLoading, setJsonLoading] = React.useState(false);
    const [view, setView] = React.useState('grid'); // 'grid' | 'list'
    
    // Load uploaded files on component mount
    React.useEffect(() => {
        loadUploadedFiles();
    }, []);
    
    // Load uploaded files from backend
    const loadUploadedFiles = async () => {
        setLoading(true);
        try {
            const response = await ApiService.getUploadedFiles();
            setUploadedFiles(response.files || []);
        } catch (error) {
            console.error('Failed to load uploaded files:', error);
            setError('Failed to load uploaded files');
        } finally {
            setLoading(false);
        }
    };

    // Select and load JSON for a file
    const selectFile = async (file) => {
        setSelectedFile(file);
        setSelectedFileJson(null);
        setJsonLoading(true);
        
        try {
            // Get JSON from the relative path
            const jsonPath = file.json_relative_path;
            const response = await fetch(`${ApiService.getApiOrigin()}/${jsonPath}`);
            if (response.ok) {
                const jsonData = await response.json();
                setSelectedFileJson(jsonData);
            } else {
                throw new Error('JSON file not found');
            }
        } catch (error) {
            console.error('Failed to load JSON for file:', error);
            setError(`Failed to load JSON for ${file.name}`);
        } finally {
            setJsonLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleString();
    };

    const getFileType = (filename) => {
        if (!filename) return 'unknown';
        const ext = filename.toLowerCase().split('.').pop();
        return ext === 'pdf' ? 'pdf' : ext;
    };

    const FileGrid = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1.5rem'
        }}>
            {uploadedFiles.map((file, index) => (
                <div
                    key={index}
                    onClick={() => selectFile(file)}
                    style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        background: selectedFile === file ? 'var(--sub-color)' : 'white',
                        color: selectedFile === file ? 'white' : 'var(--text-color-dark)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-light)',
                        minHeight: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedFile !== file) {
                            e.target.style.background = 'var(--background-color)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedFile !== file) {
                            e.target.style.background = 'white';
                        }
                    }}
                >
                    <div style={{
                        fontSize: '1.25rem',
                        marginBottom: '0.25rem'
                    }}>
                        {getFileType(file.name) === 'pdf' ? '📄' : '📁'}
                    </div>
                    <div style={{
                        fontWeight: '600',
                        fontSize: '0.7rem',
                        marginBottom: '0.25rem',
                        wordBreak: 'break-word',
                        lineHeight: '1.2'
                    }}>
                        {file.name}
                    </div>
                    <div style={{
                        fontSize: '0.6rem',
                        opacity: selectedFile === file ? 0.9 : 0.7
                    }}>
                        {formatFileSize(file.size)}
                    </div>
                    <div style={{
                        fontSize: '0.55rem',
                        opacity: selectedFile === file ? 0.8 : 0.6
                    }}>
                        {formatDate(file.created_at)}
                    </div>
                </div>
            ))}
        </div>
    );

    const FileList = () => (
        <div style={{ marginBottom: '1.5rem', overflow: 'auto' }}>
            <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '500px' // Reduced from 600px for better mobile fit
            }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>Type</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>Size</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>Created</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>JSON</th>
                    </tr>
                </thead>
                <tbody>
                    {uploadedFiles.map((file, index) => (
                        <tr
                            key={index}
                            onClick={() => selectFile(file)}
                            style={{
                                borderBottom: '1px solid #e9ecef',
                                cursor: 'pointer',
                                background: selectedFile === file ? 'var(--sub-color)' : 'transparent',
                                color: selectedFile === file ? 'white' : 'var(--text-color-dark)'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedFile !== file) {
                                    e.target.style.background = 'var(--background-color)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedFile !== file) {
                                    e.target.style.background = 'transparent';
                                }
                            }}
                        >
                            <td style={{ padding: '0.5rem', wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                {getFileType(file.name) === 'pdf' ? '📄' : '📁'} {file.name}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                {getFileType(file.name).toUpperCase()}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                {formatFileSize(file.size)}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                {formatDate(file.created_at)}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                {file.hasJson ? '✅' : '❌'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const JsonViewer = () => {
        if (jsonLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div>Loading JSON...</div>
                </div>
            );
        }

        if (!selectedFileJson) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <h3>No JSON Selected</h3>
                    <p>Select a file to view its JSON data</p>
                </div>
            );
        }

        return (
            <div>
                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)', fontSize: '1rem' }}>
                        JSON Data for: {selectedFile?.name}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-color-light)' }}>
                        {selectedFileJson.pages?.length || 0} pages • 
                        {selectedFileJson.pages?.reduce((sum, page) => sum + (page.tables?.length || 0), 0) || 0} tables
                    </div>
                </div>

                {/* Pages and Tables */}
                {selectedFileJson.pages?.map((page, pageIndex) => (
                    <div key={pageIndex} style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ 
                            color: 'var(--sub-color)', 
                            marginBottom: '0.75rem',
                            padding: '0.5rem',
                            background: 'var(--background-color)',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}>
                            Page {page.page_number} ({page.tables?.length || 0} tables)
                        </h5>

                        {/* Text Preview */}
                        {page.text && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h6 style={{ color: 'var(--text-color-dark)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Text Content:</h6>
                                <div style={{
                                    background: '#f8f9fa',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    border: '1px solid #e9ecef',
                                    maxHeight: '120px',
                                    overflow: 'auto',
                                    fontSize: '0.75rem',
                                    lineHeight: '1.4'
                                }}>
                                    {page.text.substring(0, 300)}
                                    {page.text.length > 300 && '...'}
                                </div>
                            </div>
                        )}

                        {/* Tables */}
                        {page.tables?.map((table, tableIndex) => (
                            <div key={tableIndex} style={{ marginBottom: '1rem' }}>
                                <h6 style={{ color: 'var(--text-color-dark)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    Table {tableIndex + 1} ({table.length} rows × {table[0]?.length || 0} columns)
                                </h6>
                                <div style={{
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    maxHeight: '250px'
                                }}>
                                    <table style={{ 
                                        width: '100%', 
                                        borderCollapse: 'collapse', 
                                        fontSize: '0.7rem',
                                        minWidth: '400px' // Ensure table doesn't get too cramped
                                    }}>
                                        <tbody>
                                            {table.slice(0, 8).map((row, rowIndex) => (
                                                <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} style={{
                                                            padding: '0.25rem 0.5rem',
                                                            borderRight: '1px solid #f1f3f4',
                                                            wordBreak: 'break-word',
                                                            maxWidth: '150px'
                                                        }}>
                                                            {String(cell).substring(0, 30)}
                                                            {String(cell).length > 30 && '...'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {table.length > 8 && (
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            fontSize: '0.7rem',
                                            color: 'var(--text-color-light)',
                                            borderTop: '1px solid #e9ecef'
                                        }}>
                                            Showing first 8 rows of {table.length} total rows
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

  return (
        <div style={{ padding: '0.5rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <button
                        onClick={() => onMenuClick && onMenuClick()}
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
                >
                    ☰
                </button>
                <h1 style={{ 
                    margin: 0,
                        fontSize: 'clamp(16px, 4.5vw, 24px)',
                        lineHeight: '1.2',
                        color: 'var(--main-color)'
                    }}>
                        📁  Maker and Checker
                    </h1>
            </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', marginBottom: '0' }}>
                    Browse uploaded files and view their extracted JSON data
                </p>
            </div>
            
            {/* Error Display */}
            {error && (
                        <div style={{ 
                    background: 'rgba(220, 53, 69, 0.1)',
                    color: 'var(--error-color)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--error-color)',
                    marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                    <button
                        style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            color: 'var(--error-color)',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                        onClick={() => setError(null)}
                    >
                        ×
                    </button>
          </div>
        )}

            {/* Main Content */}
            <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                minHeight: '600px'
            }}>
                {/* Left Panel - Original Files */}
            <div style={{ 
                    background: 'white',
                borderRadius: 'var(--border-radius)', 
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: '1rem'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginBottom: '1rem' 
                    }}>
                        <h3 style={{ margin: 0, color: 'var(--main-color)', fontSize: '1.1rem' }}>
                            📄 Original Files ({uploadedFiles.length})
                        </h3>
                        <div style={{ 
                            display: 'flex', 
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={() => setView('grid')}
                                style={{
                                    padding: '0.6rem 1rem',
                                    border: '1px solid #e9ecef',
                                    background: view === 'grid' ? 'var(--sub-color)' : 'white',
                                    color: view === 'grid' ? 'white' : 'var(--text-color-dark)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    minWidth: '70px',
                                    fontWeight: '500'
                                }}
                            >
                                ⊞ Grid
                            </button>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    padding: '0.6rem 1rem',
                                    border: '1px solid #e9ecef',
                                    background: view === 'list' ? 'var(--sub-color)' : 'white',
                                    color: view === 'list' ? 'white' : 'var(--text-color-dark)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    minWidth: '70px',
                                    fontWeight: '500'
                                }}
                            >
                                ☰ List
                            </button>
                            <button
                                onClick={loadUploadedFiles}
                                style={{
                                    padding: '0.6rem 1rem',
                                    border: '1px solid #e9ecef',
                                    background: 'white',
                                    color: 'var(--text-color-dark)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    minWidth: '90px',
                                    fontWeight: '500'
                                }}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                                </div>
                                
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div>Loading files...</div>
                                </div>
                    ) : uploadedFiles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-color-light)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Files Found</h3>
                            <p style={{ fontSize: '0.9rem' }}>Upload some files using the Smart PDF Extraction page</p>
                            </div>
                        ) : (
                        view === 'grid' ? <FileGrid /> : <FileList />
                        )}
                </div>

                {/* Right Panel - JSON Data */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: '1rem'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--main-color)', fontSize: '1.1rem' }}>
                        📊 JSON Data
                        </h3>
                    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                        <JsonViewer />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Explorer
