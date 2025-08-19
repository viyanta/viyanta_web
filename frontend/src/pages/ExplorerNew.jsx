import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'

function ExplorerNew({ onMenuClick }) {
    const { refreshStats } = useStats();
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [user, setUser] = React.useState(null);
    
    // New user-based state
    const [folders, setFolders] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState(null);
    const [folderFiles, setFolderFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [jsonData, setJsonData] = React.useState(null);
    const [jsonLoading, setJsonLoading] = React.useState(false);
    const [view, setView] = React.useState('folders'); // 'folders' | 'files'
    
    // AWS S3 details state
    const [s3Details, setS3Details] = React.useState(null);
    
    // Load user and folders on component mount
    React.useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            loadUserFolders(parsedUser.id || parsedUser.user_id || 'default_user');
        } else {
            // Create a default user for testing
            const defaultUser = { id: 'default_user', name: 'Test User' };
            setUser(defaultUser);
            loadUserFolders('default_user');
        }
    }, []);
    
    // Load user folders using new API
    const loadUserFolders = async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getUserFolders(userId);
            setFolders(response.folders || []);
            setS3Details({
                s3_folders: response.s3_folders || [],
                total_folders: response.total_folders || 0,
                user_id: response.user_id
            });
        } catch (error) {
            console.error('Failed to load user folders:', error);
            setError('Failed to load user folders: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Load files for a specific folder
    const loadFolderFiles = async (folderName) => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getUserFolderFiles(user.id || user.user_id || 'default_user', folderName);
            setFolderFiles(response.files || []);
            setSelectedFolder(folderName);
            setView('files');
        } catch (error) {
            console.error('Failed to load folder files:', error);
            setError('Failed to load folder files: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Select and load JSON for a file
    const selectFile = async (file) => {
        setSelectedFile(file);
        setJsonData(null);
        setJsonLoading(true);
        
        try {
            if (file.has_json && file.json_filename) {
                const response = await ApiService.getUserJsonData(
                    user.id || user.user_id || 'default_user', 
                    selectedFolder, 
                    file.json_filename
                );
                setJsonData(response.data);
            }
        } catch (error) {
            console.error('Failed to load JSON data:', error);
            setError('Failed to load JSON data: ' + error.message);
        } finally {
            setJsonLoading(false);
        }
    };

    // Navigate back to folders view
    const navigateBack = () => {
        setView('folders');
        setSelectedFolder(null);
        setFolderFiles([]);
        setSelectedFile(null);
        setJsonData(null);
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // Render table data with proper structure
    const renderTableData = (pages) => {
        if (!pages || pages.length === 0) return <div className="text-gray-500">No data available</div>;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '1rem' }}>
                        <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--main-color)' }}>
                            Page {page.page_number}
                        </h4>
                        
                        {page.tables && page.tables.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {page.tables.map((table, tableIndex) => (
                                    <div key={tableIndex} style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '0.75rem', background: '#f8f9fa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h5 style={{ fontWeight: '500', margin: 0, color: '#333' }}>
                                                Table {table.table_number || tableIndex + 1} 
                                                {table.method && <span style={{ fontSize: '0.85rem', color: '#666' }}> ({table.method})</span>}
                                            </h5>
                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                {table.total_rows || 0} rows × {table.total_columns || 0} cols
                                                {table.accuracy && <span> • {(table.accuracy * 100).toFixed(1)}% accuracy</span>}
                                            </span>
                                        </div>
                                        
                                        {table.headers && table.data ? (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                                                    <thead>
                                                        <tr style={{ background: '#e9ecef' }}>
                                                            {table.headers.map((header, headerIndex) => (
                                                                <th 
                                                                    key={headerIndex}
                                                                    style={{ 
                                                                        border: '1px solid #ccc', 
                                                                        padding: '0.5rem', 
                                                                        textAlign: 'left', 
                                                                        fontWeight: '600', 
                                                                        fontSize: '0.85rem',
                                                                        color: '#333'
                                                                    }}
                                                                >
                                                                    {header}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {table.data.slice(0, 10).map((row, rowIndex) => (
                                                            <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? 'white' : '#f8f9fa' }}>
                                                                {table.headers.map((header, cellIndex) => (
                                                                    <td 
                                                                        key={cellIndex}
                                                                        style={{ 
                                                                            border: '1px solid #ccc', 
                                                                            padding: '0.5rem', 
                                                                            fontSize: '0.85rem'
                                                                        }}
                                                                    >
                                                                        {row[header] || ''}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div style={{ fontStyle: 'italic', color: '#666' }}>
                                                Table structure not available
                                            </div>
                                        )}
                                        
                                        {table.data && table.data.length > 10 && (
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                                                Showing first 10 rows of {table.data.length} total rows
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontStyle: 'italic', color: '#666', background: '#f8f9fa', padding: '0.75rem', borderRadius: '6px' }}>
                                No tables found on this page
                            </div>
                        )}
                        
                        {page.text && (
                            <details style={{ marginTop: '1rem' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', color: '#666' }}>
                                    View extracted text ({page.text.length} characters)
                                </summary>
                                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{page.text}</pre>
                                </div>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '1rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
                    <div>
                        <h1 style={{ 
                            margin: 0,
                            fontSize: 'clamp(18px, 5vw, 28px)',
                            lineHeight: '1.2',
                            color: 'var(--main-color)'
                        }}>
                            📁 Maker and Checker
                        </h1>
                        {user && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', margin: '0.25rem 0 0 0' }}>
                                User: {user.name || user.id} | 
                                {view === 'folders' ? ` ${folders.length} folders` : ` ${folderFiles.length} files in ${selectedFolder}`}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Breadcrumb Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
                    <span 
                        onClick={() => view === 'files' && navigateBack()}
                        style={{ 
                            cursor: view === 'files' ? 'pointer' : 'default',
                            color: view === 'files' ? 'var(--main-color)' : 'inherit'
                        }}
                    >
                        Home
                    </span>
                    {view === 'files' && (
                        <>
                            <span>/</span>
                            <span style={{ color: 'var(--main-color)' }}>{selectedFolder}</span>
                        </>
                    )}
                </div>
                
                {/* AWS S3 Details */}
                {s3Details && (
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        background: '#e3f2fd', 
                        borderRadius: '6px',
                        border: '1px solid #2196f3'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#1976d2' }}>
                            <strong>☁️ AWS S3 Details:</strong> User {s3Details.user_id} | 
                            Local: {folders.length} folders | 
                            S3: {s3Details.s3_folders.length} folders | 
                            Bucket: vifiles
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div style={{ 
                    marginBottom: '1rem', 
                    padding: '1rem', 
                    background: '#ffebee', 
                    border: '1px solid #f44336', 
                    borderRadius: '6px',
                    color: '#c62828'
                }}>
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                    <div>Loading...</div>
                </div>
            )}

            {/* Main Content Grid */}
            {!loading && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1rem',
                    height: 'calc(100vh - 200px)'
                }}>
                    {/* Left Panel - Folders/Files Browser */}
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ 
                            padding: '1rem', 
                            borderBottom: '1px solid #e9ecef',
                            background: '#f8f9fa'
                        }}>
                            <h3 style={{ margin: '0', color: 'var(--main-color)' }}>
                                {view === 'folders' ? '📁 Upload Folders' : '📄 PDF Files'}
                            </h3>
                            {view === 'files' && (
                                <button
                                    onClick={navigateBack}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.25rem 0.5rem',
                                        background: 'var(--main-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ← Back to Folders
                                </button>
                            )}
                        </div>
                        
                        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                            {view === 'folders' ? (
                                // Folders View
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {folders.map((folder, index) => (
                                        <div
                                            key={index}
                                            onClick={() => loadFolderFiles(folder.folder_name)}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.2s ease',
                                                background: 'white'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor = 'var(--main-color)';
                                                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor = '#e9ecef';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                                            <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--main-color)' }}>
                                                {folder.folder_name}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-color-light)' }}>
                                                {folder.pdf_count} PDFs • {folder.json_count} JSONs
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-light)', marginTop: '0.25rem' }}>
                                                {formatDate(folder.created_at)}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {folders.length === 0 && (
                                        <div style={{ 
                                            gridColumn: '1 / -1',
                                            textAlign: 'center', 
                                            padding: '2rem',
                                            color: 'var(--text-color-light)'
                                        }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                                            <div>No folders found</div>
                                            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                                Upload some PDFs to get started
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Files View
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {folderFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectFile(file)}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                background: selectedFile?.filename === file.filename ? '#e3f2fd' : 'white',
                                                borderColor: selectedFile?.filename === file.filename ? 'var(--main-color)' : '#e9ecef'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedFile?.filename !== file.filename) {
                                                    e.target.style.borderColor = 'var(--main-color)';
                                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedFile?.filename !== file.filename) {
                                                    e.target.style.borderColor = '#e9ecef';
                                                    e.target.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '1.5rem', color: '#d32f2f' }}>📄</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                                        {file.filename}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-color-light)' }}>
                                                        {formatFileSize(file.size)} • {formatDate(file.created_at)}
                                                        {file.has_json && (
                                                            <span style={{ 
                                                                marginLeft: '0.5rem',
                                                                padding: '0.125rem 0.375rem',
                                                                background: '#4caf50',
                                                                color: 'white',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                JSON ✓
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '1rem', color: 'var(--text-color-light)' }}>
                                                    →
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {folderFiles.length === 0 && (
                                        <div style={{ 
                                            textAlign: 'center', 
                                            padding: '2rem',
                                            color: 'var(--text-color-light)'
                                        }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                            <div>No files found in this folder</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - JSON Data Viewer */}
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ 
                            padding: '1rem', 
                            borderBottom: '1px solid #e9ecef',
                            background: '#f8f9fa'
                        }}>
                            <h3 style={{ margin: '0', color: 'var(--main-color)' }}>
                                📊 Extracted Data
                            </h3>
                            {selectedFile && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-color-light)', marginTop: '0.25rem' }}>
                                    {selectedFile.filename}
                                </div>
                            )}
                        </div>
                        
                        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                            {!selectedFile ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem 1rem',
                                    color: 'var(--text-color-light)'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                                    <div style={{ marginBottom: '0.5rem' }}>Select a PDF file to view its extracted data</div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        Choose a file from the left panel to see tables and text extraction results
                                    </div>
                                </div>
                            ) : !selectedFile.has_json ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem 1rem',
                                    color: 'var(--text-color-light)'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                                    <div>No extracted data available for this file</div>
                                </div>
                            ) : jsonLoading ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem 1rem'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                                    <div>Loading extracted data...</div>
                                </div>
                            ) : jsonData ? (
                                <div>
                                    {/* Summary */}
                                    <div style={{ 
                                        marginBottom: '1.5rem', 
                                        padding: '1rem', 
                                        background: '#f8f9fa', 
                                        borderRadius: '6px',
                                        border: '1px solid #e9ecef'
                                    }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--main-color)' }}>
                                            📋 Extraction Summary
                                        </h4>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                                            gap: '0.75rem',
                                            fontSize: '0.85rem'
                                        }}>
                                            <div>
                                                <span style={{ color: 'var(--text-color-light)' }}>Total Pages:</span>
                                                <span style={{ fontWeight: '600', marginLeft: '0.5rem' }}>{jsonData.total_pages}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-color-light)' }}>Mode:</span>
                                                <span style={{ fontWeight: '600', marginLeft: '0.5rem', textTransform: 'capitalize' }}>{jsonData.mode}</span>
                                            </div>
                                            {jsonData.summary && (
                                                <>
                                                    <div>
                                                        <span style={{ color: 'var(--text-color-light)' }}>Tables Found:</span>
                                                        <span style={{ fontWeight: '600', marginLeft: '0.5rem' }}>{jsonData.summary.total_tables_found}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-color-light)' }}>Pages with Tables:</span>
                                                        <span style={{ fontWeight: '600', marginLeft: '0.5rem' }}>{jsonData.summary.pages_with_tables}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Table Data */}
                                    <div>
                                        {renderTableData(jsonData.pages)}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '3rem 1rem',
                                    color: 'var(--text-color-light)'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                                    <div>Failed to load extracted data</div>
                                    {error && <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#d32f2f' }}>{error}</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExplorerNew
