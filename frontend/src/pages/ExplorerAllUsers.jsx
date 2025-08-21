import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'
import { subscribeToAuthChanges } from '../firebase/auth.js'
import { useState, useEffect } from 'react';

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
    
    // State for managing comments and review status
    const [tableComments, setTableComments] = useState({});
    const [tableStatus, setTableStatus] = useState({});
    const [reviewMode, setReviewMode] = useState(false);

    // Handle comment changes for a specific table
    const handleCommentChange = (pageIndex, tableIndex, comment) => {
        const key = `${pageIndex}-${tableIndex}`;
        setTableComments(prev => ({
            ...prev,
            [key]: comment
        }));
    };

    // Handle status changes (approve/reject) for a specific table
    const handleStatusChange = (pageIndex, tableIndex, status) => {
        const key = `${pageIndex}-${tableIndex}`;
        setTableStatus(prev => ({
            ...prev,
            [key]: status
        }));
        
        // Here you would typically save to backend
        console.log(`Table ${pageIndex}-${tableIndex} marked as: ${status}`);
    };

    // Get status for a specific table
    const getTableStatus = (pageIndex, tableIndex) => {
        const key = `${pageIndex}-${tableIndex}`;
        return tableStatus[key] || 'pending';
    };

    // Get comment for a specific table
    const getTableComment = (pageIndex, tableIndex) => {
        const key = `${pageIndex}-${tableIndex}`;
        return tableComments[key] || '';
    };

    // Save review data to localStorage
    const saveReviewData = () => {
        const reviewData = {
            tableComments,
            tableStatus,
            timestamp: new Date().toISOString(),
            fileId: selectedFile?.id || selectedFile?.filename
        };
        localStorage.setItem(`reviewData_${selectedFile?.id || selectedFile?.filename}`, JSON.stringify(reviewData));
    };

    // Load review data from localStorage
    const loadReviewData = () => {
        if (!selectedFile) return;
        
        const savedData = localStorage.getItem(`reviewData_${selectedFile?.id || selectedFile?.filename}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setTableComments(parsed.tableComments || {});
                setTableStatus(parsed.tableStatus || {});
            } catch (error) {
                console.error('Error loading review data:', error);
            }
        }
    };

    // Export review data
    const exportReviewData = () => {
        if (!selectedFile) return;
        
        const exportData = {
            filename: selectedFile.filename,
            user: selectedUser,
            folder: selectedFolder,
            reviewDate: new Date().toISOString(),
            tables: Object.keys(tableStatus).map(key => {
                const [pageIndex, tableIndex] = key.split('-').map(Number);
                return {
                    page: pageIndex + 1,
                    table: tableIndex + 1,
                    status: tableStatus[key],
                    comment: tableComments[key] || '',
                    timestamp: new Date().toISOString()
                };
            }),
            summary: {
                totalTables: Object.keys(tableStatus).length,
                approved: Object.values(tableStatus).filter(status => status === 'approved').length,
                rejected: Object.values(tableStatus).filter(status => status === 'rejected').length,
                pending: Object.values(tableStatus).filter(status => status === 'pending').length,
                withComments: Object.values(tableComments).filter(comment => comment.trim() !== '').length
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review_${selectedFile.filename.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Auto-save review data when it changes
    useEffect(() => {
        if (selectedFile && (Object.keys(tableComments).length > 0 || Object.keys(tableStatus).length > 0)) {
            saveReviewData();
        }
    }, [tableComments, tableStatus, selectedFile]);

    // Load review data when file changes
    useEffect(() => {
        if (selectedFile) {
            loadReviewData();
        }
    }, [selectedFile]);
    
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

        console.log('Selected file object:', file); // Debug log
        console.log('File has s3_pdf_key:', file?.s3_pdf_key); // Debug log
        console.log('File has file_id:', file?.file_id); // Debug log
        
        // Add user and folder info to the file object for the PDF viewer
        // Also ensure we have the correct PDF filename and S3 key
        const enhancedFile = {
            ...file,
            user_id: selectedUser,
            folder_name: selectedFolder,
            // If the filename is a JSON file, get the corresponding PDF filename
            original_filename: file.filename?.endsWith('.json') 
                ? file.filename.replace('.json', '.pdf') 
                : file.filename,
            // Use the PDF S3 key if available
            s3_pdf_key: file.pdf_s3_key || file.s3_pdf_key || file.pdf_info?.s3_key,
            // Ensure the type is set to PDF for proper rendering
            type: 'pdf',
            // Preserve the pdf_info for the SourceFileViewer
            pdf_info: file.pdf_info
        };
        
        console.log('Enhanced file object:', enhancedFile); // Debug log
        
        setSelectedFile(enhancedFile);
        setJsonData(null);
        setJsonLoading(true);
        
        try {
            // Use the base filename to load the best available JSON (Gemini verified preferred)
            const filenameToLoad = file.base_name || file.filename || file.json_filename;
            console.log('Loading JSON for file:', filenameToLoad, 'with verification status:', file.has_gemini_verification);
            
            const response = await ApiService.getAllUsersJsonData(
                selectedUser, 
                selectedFolder, 
                filenameToLoad  // Backend will prioritize Gemini verified > extracted > legacy
            );
            console.log('JSON data response:', response);
            // Extract the actual data based on verification status
            let actualData = response.data;
            let pages = [];
            let totalPages = 0;
            let summary = {};
            
            // For Gemini verified data, extract from corrected_data
            if (response.verification_status === 'gemini_verified' && actualData.corrected_data) {
                pages = actualData.corrected_data.pages || [];
                totalPages = actualData.corrected_data.total_pages || 0;
                summary = actualData.corrected_data.summary || {};
            } else {
                // For extracted or legacy data, use direct structure
                pages = actualData.pages || [];
                totalPages = actualData.total_pages || 0;
                summary = actualData.summary || {};
            }
            
            // Calculate total tables if not in summary
            const totalTables = summary.total_tables_found || 
                pages.reduce((total, page) => total + (page.tables?.length || 0), 0);
            
            setJsonData({
                pages: pages,
                total_pages: totalPages,
                summary: {
                    ...summary,
                    total_tables_found: totalTables
                },
                mode: actualData.mode || actualData.corrected_data?.mode || 'unknown',
                metadata: {
                    verification_status: response.verification_status,
                    gemini_verified: response.metadata?.gemini_verified || false,
                    data_priority: response.metadata?.data_priority || 'unknown',
                    file_source: response.metadata?.file_source || 'unknown'
                }
            });
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
        if (!pages || pages.length === 0) {
            return (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                    No data available
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1rem',
                        backgroundColor: 'white'
                    }}>
                        <h4 style={{
                            fontWeight: '600',
                            marginBottom: '0.75rem',
                            color: '#4f46e5',
                            fontSize: '1.1rem',
                            fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                        }}>
                            📄 Page {page.page_number}
                        </h4>
                        
                        {page.tables && page.tables.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {page.tables.map((table, tableIndex) => (
                                    <div key={tableIndex} style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '0.75rem',
                                        backgroundColor: '#f9fafb'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.5rem',
                                            flexWrap: 'wrap',
                                            gap: '0.5rem'
                                        }}>
                                            <h5 style={{
                                                fontWeight: '500',
                                                color: '#374151',
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                            }}>
                                                📊 Table {table.table_number || tableIndex + 1}
                                                {table.method && (
                                                    <span style={{ 
                                                        fontSize: '0.875rem', 
                                                        color: '#6b7280',
                                                        marginLeft: '0.5rem',
                                                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                                    }}>
                                                        ({table.method})
                                                    </span>
                                                )}
                                            </h5>
                                            <span style={{
                                                fontSize: '0.875rem',
                                                color: '#6c7280',
                                                fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                            }}>
                                                {table.total_rows || 0} rows × {table.total_columns || 0} cols
                                            </span>
                                        </div>
                                        
                                        {table.headers && table.data ? (
                                            <div style={{ 
                                                overflowX: 'auto',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                backgroundColor: 'white'
                                            }}>
                                                <table style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    fontSize: '14px',
                                                    fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                                }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                                                            {table.headers.map((header, headerIndex) => (
                                                                <th 
                                                                    key={headerIndex}
                                                                    style={{
                                                                        border: '1px solid #d1d5db',
                                                                        padding: '0.75rem',
                                                                        textAlign: 'left',
                                                                        fontWeight: '600',
                                                                        color: '#1f2937',
                                                                        minWidth: '120px',
                                                                        maxWidth: '250px',
                                                                        wordBreak: 'break-word',
                                                                        fontSize: '14px',
                                                                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                                                    }}
                                                                >
                                                                    {header}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {table.data.map((row, rowIndex) => (
                                                            <tr key={rowIndex} style={{
                                                                backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb'
                                                            }}>
                                                                {table.headers.map((header, cellIndex) => (
                                                                    <td 
                                                                        key={cellIndex}
                                                                        style={{
                                                                            border: '1px solid #d1d5db',
                                                                            padding: '0.75rem',
                                                                            maxWidth: '250px',
                                                                            wordBreak: 'break-word',
                                                                            whiteSpace: 'pre-wrap',
                                                                            fontSize: '13px',
                                                                            fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                                                                            color: '#374151',
                                                                            lineHeight: '1.5'
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
                                            <div style={{
                                                color: '#6b7280',
                                                fontStyle: 'italic',
                                                textAlign: 'center',
                                                padding: '1rem'
                                            }}>
                                                Table structure not available
                                            </div>
                                        )}
                                        
                                        {/* Remove the "Showing first 10 rows" message since we now show all rows */}
                                        
                                        {/* Review Section - Only show when review mode is enabled */}
                                        {reviewMode && (
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '1rem',
                                                backgroundColor: '#f8f9fa',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '6px',
                                                borderTop: '2px solid #007bff'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                                                    <h6 style={{
                                                        margin: 0,
                                                        fontSize: '0.95rem',
                                                        fontWeight: '600',
                                                        color: '#495057',
                                                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                                    }}>
                                                        Review & Feedback
                                                    </h6>
                                                    {/* Status Badge */}
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                                                        ...(getTableStatus(pageIndex, tableIndex) === 'approved' ? {
                                                            backgroundColor: '#d4edda',
                                                            color: '#155724',
                                                            border: '1px solid #c3e6cb'
                                                        } : getTableStatus(pageIndex, tableIndex) === 'rejected' ? {
                                                            backgroundColor: '#f8d7da',
                                                            color: '#721c24',
                                                            border: '1px solid #f5c6cb'
                                                        } : {
                                                            backgroundColor: '#fff3cd',
                                                            color: '#856404',
                                                            border: '1px solid #ffeaa7'
                                                        })
                                                    }}>
                                                        {getTableStatus(pageIndex, tableIndex) === 'approved' ? '✅ Approved' :
                                                         getTableStatus(pageIndex, tableIndex) === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                                                    </span>
                                                </div>
                                                
                                                {/* Comment Box */}
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '500',
                                                        color: '#495057',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                                                    }}>
                                                        💬 Add comment or mark incorrect data:
                                                    </label>
                                                    <textarea
                                                        value={getTableComment(pageIndex, tableIndex)}
                                                        onChange={(e) => handleCommentChange(pageIndex, tableIndex, e.target.value)}
                                                        placeholder="Enter your feedback, mark incorrect cells, or add notes about this table..."
                                                        style={{
                                                            width: '100%',
                                                            minHeight: '80px',
                                                            padding: '0.75rem',
                                                            border: '1px solid #ced4da',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem',
                                                            fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                                                            resize: 'vertical',
                                                            lineHeight: '1.4'
                                                        }}
                                                    />
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <button
                                                        onClick={() => handleStatusChange(pageIndex, tableIndex, 'approved')}
                                                        style={{
                                                            background: getTableStatus(pageIndex, tableIndex) === 'approved' ? '#28a745' : '#6c757d',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '500',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        }}
                                                    >
                                                        ✅ Approve Table
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(pageIndex, tableIndex, 'rejected')}
                                                        style={{
                                                            background: getTableStatus(pageIndex, tableIndex) === 'rejected' ? '#dc3545' : '#6c757d',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '500',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        }}
                                                    >
                                                        ❌ Reject Table
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(pageIndex, tableIndex, 'pending')}
                                                        style={{
                                                            background: getTableStatus(pageIndex, tableIndex) === 'pending' ? '#ffc107' : '#6c757d',
                                                            color: '#212529',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '500',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        }}
                                                    >
                                                        ⏳ Mark Pending
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                color: '#6b7280',
                                fontStyle: 'italic',
                                backgroundColor: '#f9fafb',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                textAlign: 'center'
                            }}>
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

                    gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(auto-fill, minmax(150px, 2fr))',
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
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
                                padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                                cursor: 'pointer',
                                background: 'white',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-light)',
                                minHeight: window.innerWidth <= 768 ? '120px' : 'auto'
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
                                fontSize: window.innerWidth <= 768 ? '2rem' : '3rem',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.5rem' : '1rem'
                            }}>
                                👤
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: window.innerWidth <= 768 ? 'clamp(14px, 3.5vw, 16px)' : '1rem',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
                                textAlign: 'center',
                                color: 'var(--main-color)',
                                wordBreak: 'break-word'
                            }}>
                                {userId}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '0.85rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem'
                            }}>
                                {userData.total_folders} folders
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : '0.75rem',
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
                    gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    marginBottom: '2rem'
                }}>
                    {folders.map((folder, index) => (
                        <div
                            key={index}
                            onClick={() => loadUserFolderFiles(selectedUser, folder.folder_name)}
                            style={{
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                                cursor: 'pointer',
                                background: 'white',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-light)',
                                minHeight: window.innerWidth <= 768 ? '120px' : 'auto'
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
                                fontSize: window.innerWidth <= 768 ? '2rem' : '3rem',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.5rem' : '1rem'
                            }}>
                                📁
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: window.innerWidth <= 768 ? 'clamp(14px, 3.5vw, 16px)' : '1rem',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
                                textAlign: 'center',
                                color: 'var(--main-color)',
                                wordBreak: 'break-word'
                            }}>
                                {folder.folder_name}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '0.85rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem'
                            }}>
                                {folder.pdf_count} PDFs • {folder.json_count} JSONs
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : '0.75rem',
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
                    gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    marginBottom: '2rem'
                }}>
                    {folderFiles.map((file, index) => (
                        <div
                            key={index}
                            onClick={() => selectFile(file)}
                            style={{
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                                cursor: 'pointer',
                                background: selectedFile === file ? 'var(--sub-color)' : 'white',
                                color: selectedFile === file ? 'white' : 'var(--text-color-dark)',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-light)',
                                minHeight: window.innerWidth <= 768 ? '100px' : 'auto'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedFile !== file) {
                                    e.currentTarget.style.background = 'var(--background-color)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedFile !== file) {
                                    e.currentTarget.style.background = selectedFile === file ? 'var(--sub-color)' : 'white';
                                }
                            }}
                        >
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem'
                            }}>
                                📄
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: window.innerWidth <= 768 ? 'clamp(11px, 2.5vw, 13px)' : '0.9rem',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
                                textAlign: 'center',
                                wordBreak: 'break-word'
                            }}>
                                {file.base_name || file.filename}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(9px, 2.5vw, 11px)' : '0.8rem',
                                textAlign: 'center',
                                opacity: 0.8
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
                            
                            {/* Gemini Verification Status */}
                            <div style={{
                                fontSize: '0.7rem',
                                marginBottom: '0.25rem',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                textAlign: 'center',
                                background: file.has_gemini_verification 
                                    ? (selectedFile === file ? 'rgba(40, 167, 69, 0.2)' : '#28a745')
                                    : (selectedFile === file ? 'rgba(255, 193, 7, 0.2)' : '#ffc107'),
                                color: selectedFile === file 
                                    ? 'white'
                                    : (file.has_gemini_verification ? 'white' : '#856404'),
                                fontWeight: '600'
                            }}>
                                {file.has_gemini_verification ? '🤖 Gemini Verified' : 
                                 file.json_priority === 'extracted' ? '🔄 Extracted' : 
                                 file.json_priority === 'legacy' ? '📄 Legacy' : '❌ No Data'}
                            </div>
                            
                            {/* Available Files Count */}
                            <div style={{
                                fontSize: '0.7rem',
                                opacity: selectedFile === file ? 0.9 : 0.7,
                                textAlign: 'center'
                            }}>
                                {file.available_files ? Object.keys(file.available_files).length : 1} files
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

        if (!jsonData || (!selectedFile.has_gemini_verification && !selectedFile.json_priority)) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                    <h3>No JSON Data</h3>
                    <p>This file does not have extracted JSON data</p>
                    <p style={{ fontSize: '0.9rem' }}>File: {selectedFile.base_name || selectedFile.filename}</p>
                    {selectedFile.available_files && (
                        <div style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                            <p>Available files:</p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {Object.keys(selectedFile.available_files).map(fileType => (
                                    <li key={fileType}>• {fileType.replace('_', ' ')}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div>
                {/* File Info Header with Gemini Status */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ 
                        margin: '0 0 0.5rem 0', 
                        color: 'var(--main-color)',
                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                    }}>
                        📊 Extraction Data: {selectedFile.filename}
                    </h4>
                    
                    {/* Verification Status Badge */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: jsonData.metadata?.gemini_verified 
                                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                                : jsonData.metadata?.verification_status === 'extracted'
                                ? 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                                : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                            color: 'white',
                            boxShadow: 'var(--shadow-light)'
                        }}>
                            {jsonData.metadata?.gemini_verified ? '🤖 Gemini AI Verified' :
                             jsonData.metadata?.verification_status === 'extracted' ? '🔄 Machine Extracted' :
                             '📄 Legacy Data'} 
                        </span>
                    </div>
                    
                    <div style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--text-color-light)',
                        background: 'var(--background-color)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                        lineHeight: '1.4'
                    }}>
                        <span>👤 User: {selectedUser}</span>
                        <span>📁 Folder: {selectedFolder}</span>
                        <span>📄 {jsonData.total_pages || 0} pages</span>
                        <span>📊 {jsonData.summary?.total_tables_found || 0} tables</span>
                        <span>🔧 Mode: {jsonData.mode || 'unknown'}</span>
                        {jsonData.metadata?.data_priority && (
                            <span>🏆 Priority: {jsonData.metadata.data_priority}</span>
                        )}
                    </div>
                </div>

                {/* Render extracted data */}
                {renderTableData(jsonData.pages)}
            </div>
        );
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'white', 
            padding: window.innerWidth <= 768 ? '0.5rem' : '1rem' 
        }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap'
                }}>
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
                        fontSize: 'clamp(16px, 4vw, 24px)',
                        lineHeight: '1.2',
                        color: 'var(--main-color)'
                    }}>
                        👥 Maker and Checker - All Users Data
                    </h1>
                </div>
                <p style={{ 
                    fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '1rem', 
                    color: 'var(--text-color-light)', 
                    marginBottom: '0' 
                }}>
                    Browse all users' uploaded files and view extracted JSON data from S3 vifiles/users/all
                </p>
                
                {/* Review Mode Toggle */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: reviewMode ? '#e8f5e8' : '#f8f9fa',
                    border: `1px solid ${reviewMode ? '#28a745' : '#dee2e6'}`,
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                }}>
                    <button
                        onClick={() => setReviewMode(!reviewMode)}
                        style={{
                            background: reviewMode ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '500'
                        }}
                    >
                        {reviewMode ? '🔍 Review Mode: ON' : '🔍 Review Mode: OFF'}
                    </button>
                    <span style={{
                        fontSize: '0.85rem',
                        color: reviewMode ? '#155724' : '#6c757d',
                        fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
                    }}>
                        {reviewMode 
                            ? 'Add comments and approve/reject extracted tables' 
                            : 'Click to enable table review functionality'
                        }
                    </span>
                </div>
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
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : selectedFile ? '1fr 1.2fr' : '1fr 1fr',
                gap: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                minHeight: '600px',
                maxWidth: '100%',
                overflow: 'hidden'
            }}>
                {/* Left Panel - PDF Viewer when file selected, otherwise Users/Folders/Files */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    order: window.innerWidth <= 768 ? 1 : 0 // Show first on mobile
                }}>
                    {selectedFile ? (
                        // PDF Viewer when file is selected
                        <div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '1rem',
                                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                                gap: window.innerWidth <= 768 ? '0.5rem' : '0'
                            }}>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: 'var(--main-color)',
                                    fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)'
                                }}>
                                    📄 Original PDF: {selectedFile.original_filename || selectedFile.filename?.replace('.json', '.pdf') || selectedFile.filename}
                                </h3>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    style={{
                                        padding: window.innerWidth <= 768 ? '0.5rem 1rem' : '0.25rem 0.5rem',
                                        border: '1px solid #e9ecef',
                                        background: 'white',
                                        color: 'var(--text-color-dark)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '0.8rem',
                                        minWidth: window.innerWidth <= 768 ? '80px' : 'auto'
                                    }}
                                >
                                    ← Back to Files
                                </button>
                            </div>
                            
                            {/* PDF Viewer */}
                            <div style={{ 
                                height: window.innerWidth <= 768 ? '50vh' : '70vh',
                                border: '2px solid #e9ecef',
                                borderRadius: 'var(--border-radius)',
                                overflow: 'hidden',
                                backgroundColor: '#f8f9fa'
                            }}>
                                {console.log('ExplorerAllUsers - selectedFile for SourceFileViewer:', selectedFile)}
                                <SourceFileViewer file={selectedFile} title="Original PDF" />
                            </div>
                            
                            {/* File Info */}
                            <div style={{ 
                                marginTop: '1rem', 
                                padding: '1rem', 
                                backgroundColor: '#f8f9fa', 
                                borderRadius: 'var(--border-radius)',
                                border: '1px solid #e9ecef'
                            }}>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)', 
                                    gap: '1rem',
                                    fontSize: '0.9rem'
                                }}>
                                    <div>
                                        <strong>File Size:</strong> {formatFileSize(selectedFile.file_size || 0)}
                                    </div>
                                    <div>
                                        <strong>Upload Date:</strong> {formatDate(selectedFile.created_at || selectedFile.upload_date || new Date())}
                                    </div>
                                    <div>
                                        <strong>Has JSON:</strong> {selectedFile.has_json ? '✅ Yes' : '❌ No'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Original Users/Folders/Files view when no file is selected
                        <>
                    {/* Navigation Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                                marginBottom: '1rem',
                                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                                gap: window.innerWidth <= 768 ? '0.5rem' : '0'
                            }}>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: 'var(--main-color)',
                                    fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)'
                                }}>
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
                                            padding: window.innerWidth <= 768 ? '0.5rem 1rem' : '0.25rem 0.5rem',
                                    border: '1px solid #e9ecef',
                                    background: 'white',
                                    color: 'var(--text-color-dark)',
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '0.8rem',
                                            opacity: loading ? 0.6 : 1,
                                            minWidth: window.innerWidth <= 768 ? '80px' : 'auto'
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
                        </>
                    )}
                </div>

                {/* Right Panel - JSON Data Viewer */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    order: window.innerWidth <= 768 ? 2 : 0, // Show second on mobile
                    minWidth: 0, // Allow shrinking
                    overflow: 'hidden' // Prevent overflow
                }}>
                    <h3 style={{ 
                        margin: '0 0 1rem 0', 
                        color: 'var(--main-color)',
                        fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)',
                        textAlign: window.innerWidth <= 768 ? 'center' : 'left'
                    }}>
                        {selectedFile ? '📊 Extracted Data' : '📊 Extracted Data'}
                    </h3>
                    
                    {/* Review Summary - Only show when review mode is enabled and a file is selected */}
                    {reviewMode && selectedFile && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#e3f2fd',
                            border: '1px solid #2196f3',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: '600',
                                    color: '#1565c0'
                                }}>
                                    📋 Review Summary
                                </div>
                                <button
                                    onClick={exportReviewData}
                                    style={{
                                        background: '#2196f3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                    title="Export review data as JSON"
                                >
                                    📥 Export
                                </button>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '0.5rem',
                                fontSize: '0.85rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#2e7d32' }}>✅</span>
                                    <span>Approved: {Object.values(tableStatus).filter(status => status === 'approved').length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#c62828' }}>❌</span>
                                    <span>Rejected: {Object.values(tableStatus).filter(status => status === 'rejected').length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#f57c00' }}>⏳</span>
                                    <span>Pending: {Object.values(tableStatus).filter(status => status === 'pending').length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#6c757d' }}>📝</span>
                                    <span>With Comments: {Object.values(tableComments).filter(comment => comment.trim() !== '').length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ 
                        maxHeight: window.innerWidth <= 768 ? '50vh' : '75vh', 
                        overflow: 'auto',
                        border: '1px solid #e9ecef',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: '#f8f9fa',
                        padding: '1rem'
                    }}>
                        {selectedFile ? (
                            <div style={{
                                fontSize: '15px',
                                lineHeight: '1.7',
                                fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                color: '#2d3748',
                                fontWeight: '400'
                            }}>
                        <JsonViewer />
                    </div>
                        ) : (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '2rem', 
                                color: 'var(--text-color-light)',
                                border: '2px dashed #e9ecef',
                                borderRadius: 'var(--border-radius)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                                <p>Select a file to view extracted data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExplorerAllUsers
