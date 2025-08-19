import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'
import { subscribeToAuthChanges } from '../firebase/auth.js'

function ExplorerAllUsers({ onMenuClick }) {
    const { refreshStats } = useStats();
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [user, setUser] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    
    // All users data state
    const [allUsersData, setAllUsersData] = React.useState({});
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [selectedFolder, setSelectedFolder] = React.useState(null);
    const [folderFiles, setFolderFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [jsonData, setJsonData] = React.useState(null);
    const [jsonLoading, setJsonLoading] = React.useState(false);
    const [view, setView] = React.useState('users'); // 'users' | 'folders' | 'files'
    
    // S3 data state
    const [s3Data, setS3Data] = React.useState({});
    
    // Set up Firebase auth listener (for authentication context)
    React.useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((authUser) => {
            setAuthLoading(false);
            if (authUser) {
                const userData = {
                    id: authUser.uid,
                    email: authUser.email,
                    name: authUser.displayName || authUser.email,
                    photoURL: authUser.photoURL
                };
                setUser(userData);
                console.log('Firebase user authenticated:', userData);
            } else {
                setUser(null);
                console.log('No user authenticated');
            }
        });

        return () => unsubscribe();
    }, []);

    // Load all users data on component mount
    React.useEffect(() => {
        loadAllUsersData();
    }, []);
    
    // Load all users data using new API
    const loadAllUsersData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading all users data...');
            const response = await ApiService.getAllUsersData();
            console.log('All users data response:', response);
            
            setAllUsersData(response.users_data || {});
            setS3Data(response.s3_data || {});
        } catch (error) {
            console.error('Failed to load all users data:', error);
            setError('Failed to load all users data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Load files for a specific user's folder
    const loadUserFolderFiles = async (userId, folderName) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading files for user:', userId, 'folder:', folderName);
            const response = await ApiService.getAllUsersFolderFiles(userId, folderName);
            console.log('Folder files response:', response);
            
            setFolderFiles(response.files || []);
            setSelectedUser(userId);
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
        if (!selectedUser || !selectedFolder) {
            setError('No user or folder selected');
            return;
        }

        setSelectedFile(file);
        setJsonData(null);
        setJsonLoading(true);
        
        try {
            if (file.has_json && file.json_filename) {
                console.log('Loading JSON for file:', file.json_filename);
                const response = await ApiService.getAllUsersJsonData(
                    selectedUser, 
                    selectedFolder, 
                    file.json_filename
                );
                console.log('JSON data response:', response);
                setJsonData(response.data);
            } else {
                setJsonData(null);
            }
        } catch (error) {
            console.error('Failed to load JSON data:', error);
            setError('Failed to load JSON data: ' + error.message);
        } finally {
            setJsonLoading(false);
        }
    };

    // Navigate back to users view
    const navigateToUsers = () => {
        setView('users');
        setSelectedUser(null);
        setSelectedFolder(null);
        setFolderFiles([]);
        setSelectedFile(null);
        setJsonData(null);
    };

    // Navigate back to folders view
    const navigateToFolders = () => {
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
            <div className="space-y-6">
                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-indigo-600">
                            Page {page.page_number}
                        </h4>
                        
                        {page.tables && page.tables.length > 0 ? (
                            <div className="space-y-4">
                                {page.tables.map((table, tableIndex) => (
                                    <div key={tableIndex} className="border rounded p-3 bg-gray-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-medium text-gray-800">
                                                Table {table.table_number || tableIndex + 1} 
                                                {table.method && <span className="text-sm text-gray-500"> ({table.method})</span>}
                                            </h5>
                                            <span className="text-sm text-gray-500">
                                                {table.total_rows || 0} rows × {table.total_columns || 0} cols
                                                {table.accuracy && <span> • {(table.accuracy * 100).toFixed(1)}% accuracy</span>}
                                            </span>
                                        </div>
                                        
                                        {table.headers && table.data ? (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full border-collapse border border-gray-300">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            {table.headers.map((header, headerIndex) => (
                                                                <th 
                                                                    key={headerIndex}
                                                                    className="border border-gray-300 px-2 py-1 text-left font-semibold text-sm text-gray-700"
                                                                >
                                                                    {header}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {table.data.slice(0, 10).map((row, rowIndex) => (
                                                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                {table.headers.map((header, cellIndex) => (
                                                                    <td 
                                                                        key={cellIndex}
                                                                        className="border border-gray-300 px-2 py-1 text-sm"
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
                                            <div className="text-gray-500 italic">
                                                Table structure not available
                                            </div>
                                        )}
                                        
                                        {table.data && table.data.length > 10 && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Showing first 10 rows of {table.data.length} total rows
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic bg-gray-50 p-3 rounded">
                                No tables found on this page
                            </div>
                        )}
                        
                        {page.text && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                                    View extracted text ({page.text.length} characters)
                                </summary>
                                <div className="mt-2 p-3 bg-gray-50 rounded text-sm max-h-64 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap text-xs">{page.text}</pre>
                                </div>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // All Users View
    const AllUsersView = () => {
        const usersList = Object.entries(allUsersData);
        
        if (usersList.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                    <h3>No Users Found</h3>
                    <p>No user data available at the moment</p>
                </div>
            );
        }

        return (
            <div>
                {/* Users Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {usersList.map(([userId, userData]) => (
                        <div
                            key={userId}
                            onClick={() => {
                                setSelectedUser(userId);
                                setView('folders');
                            }}
                            style={{
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                background: 'white',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-light)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--background-color)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{
                                fontSize: '3rem',
                                textAlign: 'center',
                                marginBottom: '1rem'
                            }}>
                                👤
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: '1rem',
                                marginBottom: '0.5rem',
                                textAlign: 'center',
                                color: 'var(--main-color)',
                                wordBreak: 'break-word'
                            }}>
                                {userId}
                            </div>
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                {userData.total_folders} folders
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center'
                            }}>
                                {userData.folders.reduce((sum, folder) => sum + folder.pdf_count, 0)} PDFs •{' '}
                                {userData.folders.reduce((sum, folder) => sum + folder.json_count, 0)} JSONs
                            </div>
                        </div>
                    ))}
                </div>

                {/* S3 Data Info (if any) */}
                {Object.keys(s3Data).length > 0 && (
                    <div>
                        <h4 style={{ color: 'var(--sub-color)', marginBottom: '1rem' }}>
                            ☁️ AWS S3 Users ({Object.keys(s3Data).length})
                        </h4>
                        <div style={{
                            background: 'rgba(63, 114, 175, 0.05)',
                            border: '1px solid rgba(63, 114, 175, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-color-light)', margin: 0 }}>
                                Additional data available in S3 storage
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // User Folders View
    const UserFoldersView = () => {
        if (!selectedUser || !allUsersData[selectedUser]) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
                    <h3>No User Selected</h3>
                    <p>Please select a user to view their folders</p>
                </div>
            );
        }

        const userData = allUsersData[selectedUser];
        const folders = userData.folders || [];

        if (folders.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                    <h3>No Folders Found</h3>
                    <p>This user has no folders</p>
                </div>
            );
        }

        return (
            <div>
                {/* User Info */}
                <div style={{
                    background: 'var(--background-color)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid #e9ecef'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ fontSize: '2rem' }}>👤</div>
                        <div>
                            <div style={{ fontWeight: '600', color: 'var(--main-color)' }}>
                                User: {selectedUser}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-color-light)' }}>
                                {folders.length} folders
                            </div>
                        </div>
                    </div>
                </div>

                {/* Folders Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {folders.map((folder, index) => (
                        <div
                            key={index}
                            onClick={() => loadUserFolderFiles(selectedUser, folder.folder_name)}
                            style={{
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                background: 'white',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-light)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--background-color)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{
                                fontSize: '3rem',
                                textAlign: 'center',
                                marginBottom: '1rem'
                            }}>
                                📁
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: '1rem',
                                marginBottom: '0.5rem',
                                textAlign: 'center',
                                color: 'var(--main-color)',
                                wordBreak: 'break-word'
                            }}>
                                {folder.folder_name}
                            </div>
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                {folder.pdf_count} PDFs • {folder.json_count} JSONs
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center'
                            }}>
                                Created: {formatDate(folder.created_at)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Files View for Selected Folder
    const FilesView = () => {
        if (!selectedUser || !selectedFolder || folderFiles.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <h3>No Files Found</h3>
                    <p>This folder appears to be empty</p>
                </div>
            );
        }

        return (
            <div>
                {/* Files Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {folderFiles.map((file, index) => (
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
                                    e.currentTarget.style.background = 'var(--background-color)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedFile !== file) {
                                    e.currentTarget.style.background = 'white';
                                }
                            }}
                        >
                            <div style={{
                                fontSize: '2rem',
                                textAlign: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                📄
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                marginBottom: '0.25rem',
                                wordBreak: 'break-word'
                            }}>
                                {file.filename}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                opacity: selectedFile === file ? 0.9 : 0.7,
                                marginBottom: '0.25rem'
                            }}>
                                {formatFileSize(file.size)}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                opacity: selectedFile === file ? 0.8 : 0.6,
                                marginBottom: '0.25rem'
                            }}>
                                {formatDate(file.created_at)}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                opacity: selectedFile === file ? 0.9 : 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem'
                            }}>
                                {file.has_json ? '✅ JSON' : '❌ No JSON'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // JSON Data Viewer for selected file
    const JsonViewer = () => {
        if (jsonLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div>Loading JSON data...</div>
                </div>
            );
        }

        if (!selectedFile) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
                    <h3>No File Selected</h3>
                    <p>Select a file from the left panel to view its extracted data</p>
                </div>
            );
        }

        if (!selectedFile.has_json || !jsonData) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                    <h3>No JSON Data</h3>
                    <p>This file does not have extracted JSON data</p>
                    <p style={{ fontSize: '0.9rem' }}>File: {selectedFile.filename}</p>
                </div>
            );
        }

        return (
            <div>
                {/* File Info Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                        📊 Extraction Data: {selectedFile.filename}
                    </h4>
                    <div style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--text-color-light)',
                        background: 'var(--background-color)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <span>👤 User: {selectedUser}</span>
                        <span>📁 Folder: {selectedFolder}</span>
                        <span>📄 {jsonData.total_pages || 0} pages</span>
                        <span>📊 {jsonData.summary?.total_tables_found || 0} tables</span>
                        <span>🔧 Mode: {jsonData.mode || 'unknown'}</span>
                    </div>
                </div>

                {/* Render extracted data */}
                {renderTableData(jsonData.pages)}
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
                        👥 Maker and Checker - All Users Data
                    </h1>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-color-light)', marginBottom: '0' }}>
                    Browse all users' uploaded files and view extracted JSON data from S3 vifiles/users/all
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
                {/* Left Panel - Users, Folders and Files */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: '1.5rem'
                }}>
                    {/* Navigation Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '1rem' 
                    }}>
                        <h3 style={{ margin: 0, color: 'var(--main-color)' }}>
                            {view === 'users' ? 
                                `👥 All Users (${Object.keys(allUsersData).length})` :
                                view === 'folders' ?
                                `📁 ${selectedUser}'s Folders` :
                                `📄 Files in ${selectedFolder} (${folderFiles.length})`
                            }
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={loadAllUsersData}
                                disabled={loading}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #e9ecef',
                                    background: 'white',
                                    color: 'var(--text-color-dark)',
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem',
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    {/* Breadcrumb Navigation */}
                    {view !== 'users' && (
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #e9ecef'
                        }}>
                            <button
                                onClick={navigateToUsers}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--sub-color)',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: '0',
                                    fontSize: '0.9rem'
                                }}
                            >
                                ← All Users
                            </button>
                            
                            {view === 'files' && (
                                <>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--text-color-light)' }}>/</span>
                                    <button
                                        onClick={navigateToFolders}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--sub-color)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            padding: '0',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {selectedUser}
                                    </button>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--text-color-light)' }}>/</span>
                                    <span style={{ fontWeight: '600', color: 'var(--main-color)' }}>{selectedFolder}</span>
                                </>
                            )}
                            
                            {view === 'folders' && (
                                <>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--text-color-light)' }}>/</span>
                                    <span style={{ fontWeight: '600', color: 'var(--main-color)' }}>{selectedUser}</span>
                                </>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div>Loading...</div>
                        </div>
                    ) : (
                        view === 'users' ? <AllUsersView /> : 
                        view === 'folders' ? <UserFoldersView /> : <FilesView />
                    )}
                </div>

                {/* Right Panel - JSON Data Viewer */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: '1.5rem'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--main-color)' }}>
                        📊 Extracted Data
                    </h3>
                    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                        <JsonViewer />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExplorerAllUsers
