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
            // Get files from folder uploader (PDF folder extracted)
            const response = await fetch(`${ApiService.getApiOrigin()}/api/files/uploaded-files`);
            if (response.ok) {
                const files = await response.json();
                setUploadedFiles(files);
            } else {
                // Fallback: Scan pdf_folder_extracted directory
                const folderResponse = await fetch(`${ApiService.getApiOrigin()}/pdf_folder_extracted`);
                if (folderResponse.ok) {
                    const folderData = await folderResponse.json();
                    setUploadedFiles(folderData.files || []);
                }
            }
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
            let jsonData = null;
            
            // Try to get JSON from pdf_folder_extracted
            const jsonPath = file.jsonPath || `pdf_folder_extracted/${file.name}/${file.name}.json`;
            const response = await fetch(`${ApiService.getApiOrigin()}/${jsonPath}`);
            if (response.ok) {
                jsonData = await response.json();
            } else {
                throw new Error('JSON file not found');
            }
            
            setSelectedFileJson(jsonData);
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
        }}>
            {uploadedFiles.map((file, index) => (
                <div
                    key={index}
                    onClick={() => selectFile(file)}
                    style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        background: selectedFile === file ? 'var(--sub-color)' : 'white',
                        color: selectedFile === file ? 'white' : 'var(--text-color-dark)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-light)'
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
                        fontSize: '2rem',
                        textAlign: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        {getFileType(file.name) === 'pdf' ? '📄' : '📁'}
                    </div>
                    <div style={{
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        marginBottom: '0.25rem',
                        wordBreak: 'break-word'
                    }}>
                        {file.name}
                    </div>
                    <div style={{
                        fontSize: '0.8rem',
                        opacity: selectedFile === file ? 0.9 : 0.7
                    }}>
                        {formatFileSize(file.size)}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        opacity: selectedFile === file ? 0.8 : 0.6
                    }}>
                        {formatDate(file.created_at)}
                    </div>
                </div>
            ))}
        </div>
    );

    const FileList = () => (
        <div style={{ marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Size</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Created</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>JSON</th>
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
                            <td style={{ padding: '0.5rem', wordBreak: 'break-word' }}>
                                {getFileType(file.name) === 'pdf' ? '📄' : '📁'} {file.name}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                                {getFileType(file.name).toUpperCase()}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                                {formatFileSize(file.size)}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                                {formatDate(file.created_at)}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
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
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                        JSON Data for: {selectedFile?.name}
                    </h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
                        {selectedFileJson.pages?.length || 0} pages • 
                        {selectedFileJson.pages?.reduce((sum, page) => sum + (page.tables?.length || 0), 0) || 0} tables
                    </div>
                </div>

                {/* Pages and Tables */}
                {selectedFileJson.pages?.map((page, pageIndex) => (
                    <div key={pageIndex} style={{ marginBottom: '2rem' }}>
                        <h5 style={{ 
                            color: 'var(--sub-color)', 
                            marginBottom: '1rem',
                            padding: '0.5rem',
                            background: 'var(--background-color)',
                            borderRadius: '4px'
                        }}>
                            Page {page.page_number} ({page.tables?.length || 0} tables)
                        </h5>

                        {/* Text Preview */}
                        {page.text && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h6 style={{ color: 'var(--text-color-dark)', marginBottom: '0.5rem' }}>Text Content:</h6>
                                <div style={{
                                    background: '#f8f9fa',
                                    padding: '1rem',
                                    borderRadius: '4px',
                                    border: '1px solid #e9ecef',
                                    maxHeight: '150px',
                                    overflow: 'auto',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.4'
                                }}>
                                    {page.text.substring(0, 500)}
                                    {page.text.length > 500 && '...'}
                                </div>
                            </div>
                        )}

                        {/* Tables */}
                        {page.tables?.map((table, tableIndex) => (
                            <div key={tableIndex} style={{ marginBottom: '1.5rem' }}>
                                <h6 style={{ color: 'var(--text-color-dark)', marginBottom: '0.5rem' }}>
                                    Table {tableIndex + 1} ({table.length} rows × {table[0]?.length || 0} columns)
                                </h6>
                                <div style={{
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <tbody>
                                            {table.slice(0, 10).map((row, rowIndex) => (
                                                <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} style={{
                                                            padding: '0.25rem 0.5rem',
                                                            borderRight: '1px solid #f1f3f4',
                                                            wordBreak: 'break-word',
                                                            maxWidth: '200px'
                                                        }}>
                                                            {String(cell).substring(0, 50)}
                                                            {String(cell).length > 50 && '...'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {table.length > 10 && (
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            background: '#f8f9fa',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-color-light)'
                                        }}>
                                            ... and {table.length - 10} more rows
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
        <div style={{ minHeight: '100vh', background: 'white', padding: '1rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
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
                        fontSize: 'clamp(18px, 5vw, 28px)',
                        lineHeight: '1.2',
                        color: 'var(--main-color)'
                    }}>
                        📁 File Explorer
                    </h1>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-color-light)', marginBottom: '0' }}>
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
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                minHeight: '600px'
            }}>
                {/* Left Panel - Original Files */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: '1.5rem'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '1rem' 
                    }}>
                        <h3 style={{ margin: 0, color: 'var(--main-color)' }}>
                            📄 Original Files ({uploadedFiles.length})
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setView('grid')}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #e9ecef',
                                    background: view === 'grid' ? 'var(--sub-color)' : 'white',
                                    color: view === 'grid' ? 'white' : 'var(--text-color-dark)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                ⊞ Grid
                            </button>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #e9ecef',
                                    background: view === 'list' ? 'var(--sub-color)' : 'white',
                                    color: view === 'list' ? 'white' : 'var(--text-color-dark)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                ☰ List
                            </button>
                            <button
                                onClick={loadUploadedFiles}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #e9ecef',
                                    background: 'white',
                                    color: 'var(--text-color-dark)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
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
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                            <h3>No Files Found</h3>
                            <p>Upload some files using the Smart PDF Extraction page</p>
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
                    padding: '1.5rem'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--main-color)' }}>
                        📊 JSON Data
                    </h3>
                    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                        <JsonViewer />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Explorer
