import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService from '../services/api.js'
import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'
import SmartTableViewer from '../components/SmartTableViewer.jsx'
import { subscribeToAuthChanges } from '../firebase/auth.js'

function ExplorerAllUsers({ onMenuClick }) {
    const { refreshStats } = useStats();
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [user, setUser] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    
    // Companies data state
    const [companiesData, setCompaniesData] = React.useState([]);
    const [selectedCompany, setSelectedCompany] = React.useState(null);
    const [selectedFolder, setSelectedFolder] = React.useState(null);
    const [folderFiles, setFolderFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [jsonData, setJsonData] = React.useState(null);
    const [jsonLoading, setJsonLoading] = React.useState(false);
    const [view, setView] = React.useState('companies'); // 'companies' | 'folders' | 'files'
    
    // PDF splits data state
    const [pdfSplits, setPdfSplits] = React.useState([]);
    const [isLoadingSplits, setIsLoadingSplits] = React.useState(false);
    const [selectedSplit, setSelectedSplit] = React.useState(null);
    const [splitPdfUrl, setSplitPdfUrl] = React.useState(null);
    const [isLoadingSplitPdf, setIsLoadingSplitPdf] = React.useState(false);
    

    // Extracted data state
    const [extractedData, setExtractedData] = React.useState(null);
    const [isLoadingExtractedData, setIsLoadingExtractedData] = React.useState(false);
    const [extractedDataError, setExtractedDataError] = React.useState(null);
    
    // Pagination state for extracted data
    const [currentRecordPage, setCurrentRecordPage] = React.useState(1);
    const [recordsPerPage, setRecordsPerPage] = React.useState(10);
    const [searchTerm, setSearchTerm] = React.useState('');
    
    // Process extracted data for pagination
    const processedExtractedData = React.useMemo(() => {
        if (!extractedData) return { headers: [], allRowsData: [], records: [], hasData: false };
        
        console.log('Raw extracted data:', extractedData);
        
        // Handle multiple records (array of data)
        let records = [];
        if (Array.isArray(extractedData)) {
            records = extractedData;
        } else {
            records = [extractedData];
        }
        
        console.log('Processing records:', records.length, 'records');
        
        // Get headers from first record
        let headers = [];
        let allRowsData = [];
        
        records.forEach((record, recordIndex) => {
            // Try different data structures for each record
            let recordHeaders = [];
            let recordRows = [];
            
            // Check for SmartTableViewer format
            if (record?.tables && Array.isArray(record.tables) && record.tables.length > 0) {
                const table = record.tables[0];
                recordHeaders = table.headers || [];
                recordRows = table.data || [];
            }
            // Check for FlatHeaders and Rows format
            else if (record?.FlatHeaders && Array.isArray(record.FlatHeaders)) {
                recordHeaders = record.FlatHeaders;
                recordRows = record.Rows || record.TableData || [];
            }
            // Check for direct headers and data format
            else if (record?.headers && record?.data) {
                recordHeaders = record.headers;
                recordRows = record.data;
            }
            
            // Use headers from first record and add form info header
            if (recordIndex === 0) {
                headers = ['Form Info', ...recordHeaders];
            }
            
            // Add form information row - check for any form metadata fields
            const hasFormMetadata = record.PagesUsed || record['Form No'] || record.Title || record.Period || record.Currency || record.RegistrationNumber || record.FormName;
            
            if (hasFormMetadata) {
                // Create consolidated form metadata in single cell
                const metadataFields = [
                    { key: 'Form No', value: record['Form No'] || record.FormName },
                    { key: 'Title', value: record.Title },
                    { key: 'Period', value: record.Period },
                    { key: 'Currency', value: record.Currency },
                    { key: 'Pages Used', value: record.PagesUsed },
                    { key: 'Registration No', value: record.RegistrationNumber }
                ].filter(field => field.value);
                
                // Create single row with all metadata in first cell
                const metadataText = metadataFields.map(field => `${field.key}: ${field.value}`).join(' | ');
                const metadataRow = [`FORM_METADATA_${record.PagesUsed || 'INFO'}`, metadataText, ...new Array(recordHeaders.length - 1).fill('')];
                allRowsData.push(metadataRow);
            }
            
            // Add data rows
            if (recordRows.length > 0) {
                const convertedRows = recordRows.map(row => {
                    // If row is already an array, use it as is
                    if (Array.isArray(row)) {
                        return row;
                    }
                    // If row is an object, convert it to array based on headers
                    if (typeof row === 'object' && row !== null) {
                        return recordHeaders.map(header => row[header] || '');
                    }
                    // If row is a primitive, wrap it in an array
                    return [row];
                });
                
                // Add all data rows with empty page info column
                const rowsWithEmptyPageInfo = convertedRows.map(row => {
                    if (Array.isArray(row)) {
                        // Add empty page info column
                        return ['', ...row];
                    }
                    return row;
                });
                
                allRowsData = allRowsData.concat(rowsWithEmptyPageInfo);
            }
        });
        
        const hasData = headers.length > 0 && allRowsData.length > 0;
        console.log('Final rendering data:', { headers, allRowsData, hasData, totalRecords: records.length });
        
        return { headers, allRowsData, records, hasData };
    }, [extractedData]);
    
    // Filter rows based on search term
    const filteredRows = React.useMemo(() => {
        if (!searchTerm) return processedExtractedData.allRowsData;
        return processedExtractedData.allRowsData.filter(row => 
            Array.isArray(row) 
                ? row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()))
                : Object.values(row).some(value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [processedExtractedData.allRowsData, searchTerm]);
    
    // Pagination
    const totalPages = Math.ceil(filteredRows.length / recordsPerPage);
    const startIndex = (currentRecordPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const currentPageRows = filteredRows.slice(startIndex, endIndex);
    
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

    // Function to fetch extracted data for a split
    const fetchExtractedData = async (companyName, pdfName, splitFilename) => {
        if (!companyName || !pdfName || !splitFilename) return;
        
        console.log('🔍 fetchExtractedData called with:', { companyName, pdfName, splitFilename });
        
        setIsLoadingExtractedData(true);
        setExtractedDataError(null);
        setExtractedData(null); // Clear previous data
        
        try {
            console.log('🔍 Fetching extraction data:', { 
                companyName, 
                pdfName, 
                splitFilename,
                url: `companies/${companyName}/pdfs/${pdfName}/splits/${splitFilename}/extraction`
            });
            
            const result = await ApiService.getExtractedData(companyName, pdfName, splitFilename);
            console.log('📊 API response:', result);
            
                if (result.success) {
                    setExtractedData(result.data);
                    console.log('✅ Extracted data loaded successfully:', result.data);
                    console.log('📊 Data source:', result.source || 'unknown');
                    
                    // Reset pagination when new data is loaded
                    setCurrentRecordPage(1);
                    setSearchTerm('');
                } else {
                    console.log('❌ API returned success: false, message:', result.message);
                    setExtractedDataError(
                        result.message || 
                        'No extraction data found. Try running Smart Extraction first to generate data for this form.'
                    );
                    setExtractedData(null);
                }
        } catch (error) {
            console.error('❌ Failed to fetch extracted data:', error);
            const errorMessage = error.message || 'Failed to load extracted data';
            
            // Provide helpful error message about fallback behavior
            if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
                setExtractedDataError(
                    'No extraction data found for this form. The system checks for: 1) Gemini-verified JSON, 2) Corrected JSON, 3) Extracted JSON. Try running Smart Extraction to generate data.'
                );
            } else {
                setExtractedDataError(errorMessage);
            }
            setExtractedData(null);
        } finally {
            setIsLoadingExtractedData(false);
        }
    };

    // Load companies data on component mount
    React.useEffect(() => {
        loadCompaniesData();
    }, []);

    // Cleanup blob URL on component unmount
    React.useEffect(() => {
        return () => {
            if (splitPdfUrl) {
                URL.revokeObjectURL(splitPdfUrl);
            }
        };
    }, [splitPdfUrl]);

    // Fetch extracted data when a split is selected
    React.useEffect(() => {
        console.log('🔄 Split selection changed:', { selectedSplit, selectedFile, selectedCompany });
        
        if (selectedSplit && selectedFile && selectedCompany) {
            // Company ID to directory name mapping (for backend API calls)
            const companyIdMapping = {
                'sbi': 'sbi_life',  // Use underscore format for API
                'hdfc': 'hdfc_life', 
                'icici': 'icici_prudential',
                'bajaj': 'bajaj_allianz',
                1: 'sbi_life',  // Add numeric mapping
                2: 'hdfc_life',
                3: 'icici_prudential',
                4: 'bajaj_allianz'
            };
            
            // Directory name mapping for company names with spaces
            const companyNameToDir = {
                'Sbi Life': 'sbi_life',
                'Hdfc Life': 'hdfc_life',
                'Icici Prudential': 'icici_prudential',
                'Bajaj Allianz': 'bajaj_allianz',
                'SBI Life': 'sbi_life',
                'HDFC Life': 'hdfc_life',
                'ICICI Prudential': 'icici_prudential'
            };
            
            // Try to find company name from companiesData first
            const company = companiesData.find(c => (c.id || c.name) === selectedCompany);
            let companyName = company?.name;
            
            console.log('🏢 Company lookup:', { selectedCompany, foundCompany: company, companyName });
            
            // If not found in companiesData, use fallback mapping
            if (!companyName) {
                companyName = companyIdMapping[selectedCompany];
                console.log('🔄 Using fallback mapping:', { selectedCompany, mappedName: companyName });
            } else {
                // Convert company name to directory format for API
                const dirName = companyNameToDir[companyName];
                if (dirName) {
                    console.log('🔄 Converting company name to directory format:', { originalName: companyName, dirName });
                    companyName = dirName;
                }
            }
            
            // Additional check: if company name is 'sbi', 'hdfc', etc., map to directory format
            if (companyName && ['sbi', 'hdfc', 'icici', 'bajaj'].includes(companyName.toLowerCase())) {
                companyName = companyIdMapping[companyName.toLowerCase()] || companyName;
                console.log('🔄 Using lowercase mapping:', { originalName: companyName, mappedName: companyIdMapping[companyName.toLowerCase()] });
            }
            
            if (companyName) {
                console.log('✅ Company name resolved, fetching extraction data:', { 
                    selectedCompany, 
                    companyName, 
                    pdfName: selectedFile.name, 
                    splitFilename: selectedSplit.filename 
                });
                fetchExtractedData(companyName, selectedFile.name, selectedSplit.filename);
            } else {
                console.log('❌ Company not found in companiesData:', selectedCompany, companiesData);
                setExtractedDataError(`Company name not found for ID: ${selectedCompany}`);
            }
        } else {
            console.log('⚠️ Missing required data for extraction:', { 
                hasSelectedSplit: !!selectedSplit, 
                hasSelectedFile: !!selectedFile, 
                hasSelectedCompany: !!selectedCompany 
            });
            // Clear extracted data when no split is selected
            setExtractedData(null);
            setExtractedDataError(null);
        }
    }, [selectedSplit, selectedFile, selectedCompany, companiesData]);
    
    // Function to render extracted data in table format (matching Smart Extraction UI)
    const renderExtractedDataTable = () => {
        const { headers, allRowsData, records, hasData } = processedExtractedData;
        
        // If we have table data, render it with custom scrolling
        if (hasData) {
            return (
                <div style={{ 
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: '100%',
                    height: '100%',
                }}>
                    {/* Header Section */}
                    <div style={{
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div>
                            <h3 style={{ 
                                margin: 0, 
                                fontSize: '16px', 
                                fontWeight: '600',
                                color: '#111827'
                            }}>
                                📊 Extracted Data ({allRowsData.length} records)
                            </h3>
                            <p style={{ 
                                margin: '4px 0 0 0', 
                                fontSize: '14px', 
                                color: '#6b7280' 
                            }}>
                                {selectedSplit?.form_name || 'Extracted Data'} • Pages: {selectedSplit?.start_page || 1}-{selectedSplit?.end_page || 1}
                                {extractedData && extractedData.length > 0 && extractedData[0].metadata && (
                                    <span style={{ 
                                        marginLeft: '8px',
                                        padding: '2px 6px',
                                        background: extractedData[0].metadata.gemini_corrected ? '#28a745' : '#ffc107',
                                        color: 'white',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {extractedData[0].metadata.gemini_corrected ? '🤖 AI Verified' : '🔄 Extracted'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>



                    {/* Scrollable Table Container */}
                    <div style={{ 
                        overflowX: 'scroll', 
                        overflowY: 'auto',
                        maxHeight: 'calc(100vh - 200px)',
                        height: 'calc(100vh - 200px)',
                        width: '100%',
                        maxWidth: '800px',
                        border: '1px solid #e5e7eb',
                        position: 'relative',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <table style={{ 
                            width: '800px',
                            minWidth: '800px',
                            height: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: '0',
                            fontSize: '14px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            tableLayout: 'fixed'
                        }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr style={{ backgroundColor: '#667eea' }}>
                                     {headers.map((header, index) => (
                                         <th key={index} style={{ 
                                             padding: '12px 8px',
                                             textAlign: 'left',
                                             fontWeight: '600',
                                             color: 'white',
                                             borderBottom: '2px solid #667eea',
                                             width: index === 0 ? '300px' : '200px',
                                             minWidth: index === 0 ? '300px' : '200px',
                                             whiteSpace: 'normal',
                                             wordWrap: 'break-word',
                                             lineHeight: '1.3'
                                         }}>
                                             {header}
                                         </th>
                                     ))}
                                </tr>
                            </thead>
                             <tbody>
                                 {allRowsData.map((row, rowIndex) => {
                                    const isFormMetadataRow = Array.isArray(row) && row[0] && typeof row[0] === 'string' && row[0].startsWith('FORM_METADATA_');
                                    
                                    return (
                                        <tr key={rowIndex} style={{ 
                                            backgroundColor: isFormMetadataRow ? '#f8f9fa' :
                                                           (rowIndex % 2 === 0 ? 'white' : '#f8f9fa'),
                                            borderTop: isFormMetadataRow ? '2px solid #1976d2' : 'none'
                                        }}>
                                             {Array.isArray(row) ? (
                                                 row.map((cell, cellIndex) => (
                                                     <td key={cellIndex} style={{ 
                                                         padding: isFormMetadataRow ? '12px 16px' : '12px 8px',
                                                         borderBottom: '1px solid #e9ecef',
                                                         width: cellIndex === 0 ? '300px' : '200px',
                                                         minWidth: cellIndex === 0 ? '300px' : '200px',
                                                         whiteSpace: isFormMetadataRow ? 'normal' : 'normal',
                                                         wordWrap: 'break-word',
                                                         lineHeight: isFormMetadataRow ? '1.5' : '1.3',
                                                         fontWeight: isFormMetadataRow ? '600' : 'normal',
                                                         color: isFormMetadataRow ? '#495057' : 'inherit',
                                                         background: isFormMetadataRow ? '#f1f3f4' : 'transparent',
                                                         fontSize: isFormMetadataRow ? '12px' : '14px',
                                                         textAlign: isFormMetadataRow ? 'left' : 'inherit'
                                                     }}>
                                                         {cellIndex === 0 && isFormMetadataRow ? (
                                                             <div style={{ 
                                                                 display: 'flex', 
                                                                 flexDirection: 'column', 
                                                                 gap: '4px',
                                                                 lineHeight: '1.4'
                                                             }}>
                                                                 <div style={{ 
                                                                     fontWeight: '600', 
                                                                     color: '#1976d2',
                                                                     marginBottom: '4px'
                                                                 }}>
                                                                     📋 Form Information
                                                                 </div>
                                                                 <div style={{ 
                                                                     fontSize: '11px',
                                                                     color: '#495057',
                                                                     lineHeight: '1.3',
                                                                     whiteSpace: 'pre-line'
                                                                 }}>
                                                                     {(row[1] || '').replace(/\s*\|\s*/g, '\n')}
                                                                 </div>
                                                             </div>
                                                         ) : isFormMetadataRow ? '' : cellIndex === 0 ? '' : (cell || '-')}
                                                     </td>
                                                 ))
                                             ) : (
                                                 headers.map((header, cellIndex) => (
                                                     <td key={cellIndex} style={{ 
                                                         padding: '12px 8px',
                                                         borderBottom: '1px solid #e9ecef',
                                                         width: '200px',
                                                         minWidth: '200px',
                                                         whiteSpace: 'normal',
                                                         wordWrap: 'break-word',
                                                         lineHeight: '1.3'
                                                     }}>
                                                         {row[header] || '-'}
                                                     </td>
                                                 ))
                                             )}
                                         </tr>
                                     );
                                 })}
                             </tbody>
                        </table>
                    </div>

                    {/* Footer with data info */}
                    <div style={{
                        background: '#f9fafb',
                        borderTop: '1px solid #e5e7eb',
                        padding: '12px 20px',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Showing {allRowsData.length} records • {headers.length} columns</span>
                        <span style={{ 
                            fontSize: '12px', 
                            color: '#9ca3af',
                            fontStyle: 'italic'
                        }}>
                            ← Scroll horizontally to see all columns →
                        </span>
                    </div>
                </div>
            );
        } else {
        return (
            <div style={{
                    textAlign: 'center', 
                    padding: '2rem', 
                    color: '#6b7280',
                    background: '#f9fafb',
                borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Data Available</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        No extracted data found for this split
                    </p>
            </div>
        );
        }
    };

    // Load companies data using API
    const loadCompaniesData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading companies data...');
            const response = await ApiService.getCompanies();
            console.log('Companies data response:', response);
            
            setCompaniesData(response || []);
        } catch (error) {
            console.error('Failed to load companies data:', error);
            setError('Failed to load companies data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Load files for a specific company
    const loadCompanyFiles = async (companyId, companyName) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading files for company:', companyId, 'name:', companyName);
            
            // Map database company names to PDF splitter folder names
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life', 
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            
            // Try different company name formats
            let response = null;
            let companyNameToTry = companyName;
            
            // First try the mapped name if it exists
            if (companyNameMapping[companyName.toLowerCase()]) {
                companyNameToTry = companyNameMapping[companyName.toLowerCase()];
                try {
                    response = await ApiService.getCompanyPDFs(companyNameToTry);
                    console.log('Company PDFs response (mapped name):', response);
                } catch (error) {
                    console.log('Failed with mapped name, trying original:', error.message);
                }
            }
            
            // If mapped name didn't work, try the original name
            if (!response || !response.success || !response.pdfs || response.pdfs.length === 0) {
                try {
                    response = await ApiService.getCompanyPDFs(companyName);
                    console.log('Company PDFs response (original name):', response);
                } catch (error) {
                    console.log('Failed with original name, trying lowercase:', error.message);
                    // Try lowercase
                    companyNameToTry = companyName.toLowerCase();
                    try {
                        response = await ApiService.getCompanyPDFs(companyNameToTry);
                        console.log('Company PDFs response (lowercase):', response);
                    } catch (error2) {
                        console.log('Failed with lowercase, trying different formats:', error2.message);
                        // Try some common variations
                        const variations = [
                            companyName.toLowerCase().replace(/\s+/g, '_'),
                            companyName.toLowerCase().replace(/\s+/g, '-'),
                            companyName.toLowerCase().replace(/\s+/g, ''),
                            'sbi', 'hdfc', 'icici', 'lic' // Common company codes
                        ];
                        
                        for (const variation of variations) {
                            try {
                                response = await ApiService.getCompanyPDFs(variation);
                                console.log(`Company PDFs response (${variation}):`, response);
                                if (response.success && response.pdfs && response.pdfs.length > 0) {
                                    companyNameToTry = variation;
                                    break;
                                }
                            } catch (error3) {
                                console.log(`Failed with ${variation}:`, error3.message);
                            }
                        }
                    }
                }
            }
            
            if (response && response.success && response.pdfs && response.pdfs.length > 0) {
                // Convert PDF data to file format expected by the UI
                const files = response.pdfs.map(pdf => ({
                    name: pdf.pdf_name || pdf.original_filename,
                    type: 'pdf',
                    size: pdf.file_size || 0,
                    upload_date: pdf.upload_date || new Date().toISOString(),
                    company: companyName,
                    total_splits: pdf.total_splits || 0
                }));
                
                console.log('Converted files:', files);
                setFolderFiles(files);
                setSelectedCompany(companyId);
                setSelectedFolder('PDFs');
                setView('files');
            } else {
                console.log('No files found for company:', companyName);
                setFolderFiles([]);
                setSelectedCompany(companyId);
                setSelectedFolder('PDFs');
                setView('files');
            }
        } catch (error) {
            console.error('Failed to load company files:', error);
            setError('Failed to load company files: ' + error.message);
            setFolderFiles([]);
        } finally {
            setLoading(false);
        }
    };

    // Load files for a specific company's folder
    const loadCompanyFolderFiles = async (companyId, folderName) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading files for company:', companyId, 'folder:', folderName);
            // For now, we'll use a placeholder - this would need to be implemented in the backend
            const response = await ApiService.getAllUsersFolderFiles(companyId, folderName);
            console.log('Folder files response:', response);
            
            setFolderFiles(response.files || []);
            setSelectedCompany(companyId);
            setSelectedFolder(folderName);
            setView('files');
        } catch (error) {
            console.error('Failed to load folder files:', error);
            setError('Failed to load folder files: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Load PDF splits for a selected PDF file
    const loadPDFSplits = async (companyName, pdfName) => {
        setIsLoadingSplits(true);
        setError(null);
        try {
            console.log('Loading PDF splits for company:', companyName, 'PDF:', pdfName);
            
            // Map company name to the format expected by PDF splitter API
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life', 
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;
            
            const apiBase = 'http://localhost:8000/api';
            const url = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(pdfName)}/splits`;
            
            console.log('Loading PDF splits from URL:', url);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('PDF splits response:', data);
                setPdfSplits(data.splits || []);
            } else {
                const errorData = await response.json();
                console.log('Failed to load PDF splits:', errorData);
                setPdfSplits([]);
            }
        } catch (error) {
            console.error('Failed to load PDF splits:', error);
            setPdfSplits([]);
        } finally {
            setIsLoadingSplits(false);
        }
    };

    // Select a PDF split and load its PDF content
    const selectPDFSplit = async (split) => {
        if (!selectedFile) {
            setError('No PDF file selected');
            return;
        }

        // Clean up previous blob URL
        if (splitPdfUrl) {
            URL.revokeObjectURL(splitPdfUrl);
        }

        setSelectedSplit(split);
        setIsLoadingSplitPdf(true);
        setError(null);
        
        try {
            console.log('Loading PDF for split:', split);
            
            // Get company name for the API call
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            if (!companyName) {
                throw new Error('Company name not found');
            }
            
            // Map company name to the format expected by PDF splitter API
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life', 
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;
            
            // Create download URL for the split PDF
            const apiBase = 'http://localhost:8000/api';
            const downloadUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/splits/${encodeURIComponent(split.filename)}/download`;
            
            console.log('Downloading split PDF from URL:', downloadUrl);
            
            // Fetch the PDF file
            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                },
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (response.ok) {
                // Create a blob URL for the PDF
                const blob = await response.blob();
                console.log('Blob size:', blob.size, 'bytes');
                console.log('Blob type:', blob.type);
                
                if (blob.size > 0) {
                    const pdfUrl = URL.createObjectURL(blob);
                    setSplitPdfUrl(pdfUrl);
                    console.log('PDF split loaded successfully, URL:', pdfUrl);
                } else {
                    throw new Error('PDF file is empty');
                }
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('Failed to load split PDF:', error);
            setError('Failed to load split PDF: ' + error.message);
            setSplitPdfUrl(null);
        } finally {
            setIsLoadingSplitPdf(false);
        }
    };

    // Select and load JSON for a file
    const selectFile = async (file) => {
        if (!selectedCompany || !selectedFolder) {
            setError('No company or folder selected');
            return;
        }

        setSelectedFile(file);
        setJsonData(null);
        setJsonLoading(true);
        
        // Load PDF splits for the selected file
        const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
        
        if (companyName && file.name) {
            await loadPDFSplits(companyName, file.name);
        }
        
        try {
            // For now, skip JSON loading since we're using company-based PDF splitter service
            // which doesn't have JSON extraction data. Focus on PDF splits functionality.
            console.log('Skipping JSON loading for company-based PDF files');
            setJsonData(null);
        } catch (error) {
            console.error('Failed to load JSON data:', error);
            setError('Failed to load JSON data: ' + error.message);
        } finally {
            setJsonLoading(false);
        }
    };

    // Navigate back to companies view
    const navigateToCompanies = () => {
        setView('companies');
        setSelectedCompany(null);
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

    // All Companies View
    const AllCompaniesView = () => {
        if (companiesData.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                    <h3>No Companies Found</h3>
                    <p>No company data available at the moment</p>
                </div>
            );
        }

        return (
            <div>
                {/* Companies Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(auto-fill, minmax(150px, 2fr))',
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    marginBottom: '2rem'
                }}>
                    {companiesData.map((company) => (
                        <div
                            key={company.id || company.name}
                            onClick={() => {
                                loadCompanyFiles(company.id || company.name, company.name);
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
                                🏢
                            </div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: window.innerWidth <= 768 ? 'clamp(14px, 3.5vw, 16px)' : '1rem',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
                                textAlign: 'center',
                                color: 'var(--main-color)',
                                wordBreak: 'break-word'
                            }}>
                                {company.name}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '0.85rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center',
                                marginBottom: window.innerWidth <= 768 ? '0.25rem' : '0.5rem'
                            }}>
                                Company ID: {company.id}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(10px, 2.5vw, 12px)' : '0.75rem',
                                color: 'var(--text-color-light)',
                                textAlign: 'center'
                            }}>
                                Click to view details
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

    // Company Folders View
    const CompanyFoldersView = () => {
        if (!selectedCompany || !companiesData.find(c => (c.id || c.name) === selectedCompany)) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
                    <h3>No Company Selected</h3>
                    <p>Please select a company to view their folders</p>
                </div>
            );
        }

        const companyData = companiesData.find(c => (c.id || c.name) === selectedCompany);
        const folders = companyData?.folders || [];

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
                                Company: {companyData?.name || selectedCompany}
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
                            onClick={() => loadUserFolderFiles(selectedCompany, folder.folder_name)}
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

    // Files View for Selected Company
    const FilesView = () => {
        if (!selectedCompany || !selectedFolder || folderFiles.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <h3>No Files Found</h3>
                    <p>This company has no uploaded files yet</p>
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
                                {file.name || file.base_name || file.filename}
                            </div>
                            <div style={{
                                fontSize: window.innerWidth <= 768 ? 'clamp(9px, 2.5vw, 11px)' : '0.8rem',
                                textAlign: 'center',
                                opacity: 0.8
                            }}>
                                {file.total_splits ? `${file.total_splits} splits` : formatFileSize(file.size)}
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
                
                {/* PDF Splits Display Section - Only show when a file is selected */}
                {selectedFile && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background-color)'
                    }}>
                        <h4 style={{ 
                            color: 'var(--main-color)', 
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            📄 PDF Splits
                            {isLoadingSplits && <span style={{ fontSize: '0.8rem', color: 'var(--text-color-light)' }}>(Loading...)</span>}
                        </h4>
                        
                        {isLoadingSplits ? (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-light)' }}>
                                <div>🔄 Loading PDF splits...</div>
                            </div>
                        ) : pdfSplits.length > 0 ? (
                            <div>
                                <div style={{ 
                                    marginBottom: '1rem',
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                    border: '1px solid rgba(40, 167, 69, 0.3)',
                                    borderRadius: '6px',
                                    color: '#155724'
                                }}>
                                    ✅ {selectedFile.name || selectedFile.base_name || selectedFile.filename} - {pdfSplits.length} splits available
                                </div>
                                
                                {/* PDF Splits Grid - Card Layout */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    {pdfSplits.map((split, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectPDFSplit(split)}
                                            style={{
                                                border: selectedSplit === split ? '2px solid var(--main-color)' : '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                background: selectedSplit === split ? 'rgba(63, 114, 175, 0.1)' : 'white',
                                                transition: 'all 0.2s ease',
                                                boxShadow: 'var(--shadow-light)',
                                                minHeight: '120px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedSplit !== split) {
                                                    e.currentTarget.style.background = 'var(--background-color)';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedSplit !== split) {
                                                    e.currentTarget.style.background = 'white';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }
                                            }}
                                        >
                                            {/* Document Icon */}
                                            <div style={{
                                                fontSize: '2rem',
                                                marginBottom: '0.5rem',
                                                color: 'var(--main-color)'
                                            }}>
                                                📄
                                            </div>
                                            
                                            {/* Form Name */}
                                            <div style={{
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                marginBottom: '0.5rem',
                                                color: 'var(--text-color-dark)',
                                                wordBreak: 'break-word',
                                                lineHeight: '1.2'
                                            }}>
                                                {split.form_name}
                                            </div>
                                            
                                            {/* Form Code */}
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-color-light)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {split.form_code}
                                            </div>
                                            
                                            {/* Pages */}
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-color-light)',
                                                marginBottom: '0.5rem'
                                            }}>
                                                Pages: {split.start_page}-{split.end_page}
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <div style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 6px',
                                                borderRadius: '10px',
                                                backgroundColor: '#ffc107',
                                                color: '#856404',
                                                fontWeight: '600'
                                            }}>
                                                ✓ Available
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-light)' }}>
                                <div>📄 No splits found for this PDF</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                    This PDF may not have been split yet
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // PDF Viewer for selected split
    const PDFViewer = () => {
        if (isLoadingSplitPdf) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div>🔄 Loading PDF...</div>
                </div>
            );
        }

        if (!selectedSplit) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <h3>No Split Selected</h3>
                    <p>Click on a PDF split card to view its content</p>
                </div>
            );
        }

        if (!splitPdfUrl) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                    <h3>PDF Not Available</h3>
                    <p>Failed to load the PDF for this split</p>
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
                        <p>Debug info:</p>
                        <p>Selected Split: {selectedSplit?.form_name}</p>
                        <p>Filename: {selectedSplit?.filename}</p>
                        <p>Loading: {isLoadingSplitPdf ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            );
        }

        return (
            <div>
                {/* Split Info Header */}
                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                        📄 {selectedSplit.form_name}
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
                        <span>📋 Form: {selectedSplit.form_code}</span>
                        <span>📄 Pages: {selectedSplit.start_page}-{selectedSplit.end_page}</span>
                        <span>📁 File: {selectedSplit.filename}</span>
                        {splitPdfUrl && (
                            <span>
                                🔗 <a href={splitPdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--main-color)', textDecoration: 'underline' }}>
                                    Open PDF in new tab
                                </a>
                            </span>
                        )}
                        {splitPdfUrl && (
                            <button
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = splitPdfUrl;
                                    link.download = selectedSplit.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--main-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    marginLeft: '8px'
                                }}
                            >
                                📥 Download PDF
                            </button>
                        )}
                    </div>
                </div>

                {/* PDF Viewer */}
                <div style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: '70vh'
                }}>
                    {/* Try iframe first */}
                    <iframe
                        src={splitPdfUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none'
                        }}
                        title={`PDF Split: ${selectedSplit.form_name}`}
                        onLoad={() => console.log('PDF iframe loaded successfully')}
                        onError={(e) => {
                            console.error('PDF iframe error:', e);
                            // Fallback to object tag
                            const iframe = e.target;
                            const container = iframe.parentElement;
                            const object = document.createElement('object');
                            object.data = splitPdfUrl;
                            object.type = 'application/pdf';
                            object.style.width = '100%';
                            object.style.height = '100%';
                            object.style.border = 'none';
                            container.replaceChild(object, iframe);
                        }}
                    />
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

        // Show extracted data if available
        if (extractedData) {
            return (
                <div>
                    {/* Extraction Success Header */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🤖</span>
                            <h4 style={{ margin: 0, color: 'var(--main-color)' }}>
                                AI-Extracted Data: {selectedSplit?.form_name}
                            </h4>
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#388e3c' }}>
                            Data extracted and corrected with Gemini AI
                        </p>
                    </div>

                    {/* Metadata Display */}
                    {extractedData.metadata && (
                        <div style={{ 
                            background: 'white',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                            border: '1px solid #e0e0e0'
                        }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>Extraction Details:</h5>
                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <div><strong>Form Code:</strong> {extractedData.metadata.form_code}</div>
                                <div><strong>Extraction ID:</strong> {extractedData.metadata.extraction_id}</div>
                                <div><strong>Template Used:</strong> {extractedData.metadata.template_used?.split('/').pop()}</div>
                                <div><strong>Gemini Corrected:</strong> {extractedData.metadata.gemini_corrected ? 'Yes' : 'No'}</div>
                                <div><strong>Extracted At:</strong> {new Date(extractedData.metadata.extracted_at).toLocaleString()}</div>
                            </div>
                        </div>
                    )}

                    {/* Data Table Display */}
                    {extractedData.data && Array.isArray(extractedData.data) && extractedData.data.length > 0 && (
                        <div style={{ 
                            background: 'white',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid #e0e0e0'
                        }}>
                            <div style={{ 
                                background: '#f5f5f5',
                                padding: '0.75rem',
                                borderBottom: '1px solid #e0e0e0',
                                fontWeight: '600'
                            }}>
                                📊 Extracted Data ({extractedData.data.length} record{extractedData.data.length !== 1 ? 's' : ''})
                            </div>
                            <div style={{ 
                                maxHeight: '400px',
                                overflow: 'auto',
                                padding: '1rem'
                            }}>
                                {extractedData.data.map((record, index) => (
                                    <div key={index} style={{ 
                                        marginBottom: index < extractedData.data.length - 1 ? '1.5rem' : 0,
                                        paddingBottom: index < extractedData.data.length - 1 ? '1.5rem' : 0,
                                        borderBottom: index < extractedData.data.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}>
                                        <h6 style={{ margin: '0 0 0.75rem 0', color: '#1976d2' }}>
                                            Record {index + 1} {record.FormName && `- ${record.FormName}`}
                                            {record.PagesUsed && (
                                                <span style={{ 
                                                    marginLeft: '1rem',
                                                    padding: '2px 8px',
                                                    background: '#e3f2fd',
                                                    color: '#1976d2',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    border: '1px solid #bbdefb'
                                                }}>
                                                    📄 Pages Used: {record.PagesUsed}
                                                </span>
                                            )}
                                        </h6>
                                        
                                        {/* Form Metadata Display */}
                                        {(record["Form No"] || record.Title || record.RegistrationNumber || record.Period || record.Currency) && (
                                            <div style={{ 
                                                background: '#f8f9fa',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                marginBottom: '0.75rem',
                                                fontSize: '0.9rem',
                                                border: '1px solid #e9ecef'
                                            }}>
                                                <h6 style={{ margin: '0 0 0.5rem 0', color: '#495057', fontWeight: '600' }}>📋 Form Information</h6>
                                                <div style={{ display: 'grid', gap: '0.3rem' }}>
                                                    {record["Form No"] && <div><strong>Form No:</strong> {record["Form No"]}</div>}
                                                    {record.Title && <div><strong>Title:</strong> {record.Title}</div>}
                                                    {record.RegistrationNumber && <div><strong>Registration Number:</strong> {record.RegistrationNumber}</div>}
                                                    {record.Period && <div><strong>Period:</strong> {record.Period}</div>}
                                                    {record.Currency && <div><strong>Currency:</strong> {record.Currency}</div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legacy metadata for backward compatibility */}
                                        {(record.FormName || record.PeriodStart || record.PeriodEnd || record.PagesUsed) && (
                                            <div style={{ 
                                                background: '#f8f9fa',
                                                padding: '0.5rem',
                                                borderRadius: '4px',
                                                marginBottom: '0.75rem',
                                                fontSize: '0.85rem'
                                            }}>
                                                {record.FormName && <div><strong>Form:</strong> {record.FormName}</div>}
                                                {record.PeriodStart && <div><strong>Period Start:</strong> {record.PeriodStart}</div>}
                                                {record.PeriodEnd && <div><strong>Period End:</strong> {record.PeriodEnd}</div>}
                                                {record.PagesUsed && <div><strong>Pages Used:</strong> {record.PagesUsed}</div>}
                                            </div>
                                        )}

                                        {/* Table Data */}
                                        {record.Rows && Array.isArray(record.Rows) && record.Rows.length > 0 && (
                                            <div style={{ 
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{ 
                                                    overflow: 'auto',
                                                    maxHeight: '300px'
                                                }}>
                                                    <table style={{ 
                                                        width: '100%',
                                                        borderCollapse: 'collapse',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        <thead>
                                                            <tr style={{ background: '#f5f5f5' }}>
                                                                {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                                                    <th key={headerIndex} style={{ 
                                                                        padding: '0.5rem',
                                                                        textAlign: 'left',
                                                                        borderRight: '1px solid #e0e0e0',
                                                                        borderBottom: '1px solid #e0e0e0',
                                                                        fontWeight: '600'
                                                                    }}>
                                                                        {header}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {record.Rows.map((row, rowIndex) => (
                                                                <tr key={rowIndex} style={{ 
                                                                    background: rowIndex % 2 === 0 ? 'white' : '#fafafa'
                                                                }}>
                                                                    {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => (
                                                                        <td key={headerIndex} style={{ 
                                                                            padding: '0.5rem',
                                                                            borderRight: '1px solid #e0e0e0',
                                                                            borderBottom: '1px solid #e0e0e0'
                                                                        }}>
                                                                            {row[header] || '-'}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Download Actions */}
                            <div style={{ 
                                padding: '1rem',
                                borderTop: '1px solid #e0e0e0',
                                background: '#f8f9fa',
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#1976d2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                    onClick={() => {
                                        const dataStr = JSON.stringify(extractedData.data, null, 2);
                                        const blob = new Blob([dataStr], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${selectedSplit.filename.replace('.pdf', '')}_extracted.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    📥 Download JSON
                                </button>
                                
                                <button
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#388e3c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                    onClick={() => {
                                        // Convert to CSV
                                        if (extractedData.data && extractedData.data.length > 0 && extractedData.data[0].Rows) {
                                            const headers = extractedData.data[0].FlatHeaders || [];
                                            const rows = extractedData.data.flatMap(record => record.Rows || []);
                                            
                                            let csv = headers.join(',') + '\n';
                                            rows.forEach(row => {
                                                const values = headers.map(header => {
                                                    const value = row[header] || '';
                                                    return `"${value.toString().replace(/"/g, '""')}"`;
                                                });
                                                csv += values.join(',') + '\n';
                                            });
                                            
                                            const blob = new Blob([csv], { type: 'text/csv' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${selectedSplit.filename.replace('.pdf', '')}_extracted.csv`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }
                                    }}
                                >
                                    📊 Download CSV
                                </button>
                            </div>
                        </div>
                    )}
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

        if (!jsonData) {
            return (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <h3>PDF Splits Available</h3>
                    <p>This is a company-based PDF file with split forms available</p>
                    <p style={{ fontSize: '0.9rem' }}>File: {selectedFile.name || selectedFile.base_name || selectedFile.filename}</p>
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        border: '1px solid rgba(40, 167, 69, 0.3)',
                        borderRadius: '6px',
                        color: '#155724'
                    }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            ✅ {pdfSplits.length} PDF splits are available for this file
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
                            View the splits in the left panel to see individual form pages
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div>
                {/* File Info Header with Gemini Status */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
                        📊 Extraction Data: {selectedFile.base_name || selectedFile.filename}
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
                        padding: '0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <span>🏢 Company: {selectedCompany}</span>
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

    // Extract form data from selected split
    const handleExtractFormData = async () => {
        if (!selectedSplit || !selectedFile || !user?.id) {
            setExtractionError('Please ensure you are logged in and have selected a form split');
            return;
        }

        setIsExtracting(true);
        setExtractionError(null);
        setExtractedData(null);

        try {
            console.log('Starting form extraction:', {
                company: selectedCompany,
                pdf: selectedFile.name,
                split: selectedSplit.filename,
                user: user.id
            });

            // Get company name for the API call
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            if (!companyName) {
                throw new Error('Company name not found');
            }

            // Map company name to the format expected by backend
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life', 
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };

            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

            // First check if extraction already exists
            try {
                const existingData = await ApiService.getExtractedData(mappedCompanyName, selectedFile.name, selectedSplit.filename);
                if (existingData.success) {
                    console.log('Found existing extraction data');
                    setExtractedData(existingData);
                    return;
                }
            } catch (existingError) {
                console.log('No existing extraction found, proceeding with new extraction');
            }

            // Perform new extraction
            const extractionResult = await ApiService.extractFormData(
                mappedCompanyName, 
                selectedFile.name, 
                selectedSplit.filename, 
                user.id
            );

            if (extractionResult.success) {
                console.log('Extraction completed successfully');
                setExtractedData(extractionResult);
            } else {
                setExtractionError(extractionResult.detail || 'Extraction failed');
            }

        } catch (error) {
            console.error('Extraction error:', error);
            setExtractionError(`Extraction failed: ${error.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
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
                        🏢 Maker and Checker - Admin Only
                    </h1>
                </div>
                <p style={{ 
                    fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '1rem', 
                    color: 'var(--text-color-light)', 
                    marginBottom: '0' 
                }}>
                    Browse all companies and view their uploaded files and extracted JSON data
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
                gridTemplateColumns: selectedSplit ? 
                    (window.innerWidth <= 768 ? '1fr' : '1fr 1fr') : 
                    (window.innerWidth <= 768 ? '1fr' : '1fr 1fr'),
                gap: window.innerWidth <= 768 ? '1rem' : '2rem',
                minHeight: 'calc(100vh - 100px)',
                height: 'calc(100vh - 100px)'
            }}>
                {/* Left Panel - Users, Folders and Files OR PDF Viewer */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    order: window.innerWidth <= 768 ? 1 : 0 // Show first on mobile
                }}>
                    {/* Navigation Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '1rem',
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        gap: window.innerWidth <= 768 ? '0.5rem' : '0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {selectedSplit && (
                                <button
                                    onClick={() => setSelectedSplit(null)}
                                    style={{
                                        background: 'rgba(108, 117, 125, 0.1)',
                                        border: '1px solid rgba(108, 117, 125, 0.3)',
                                        color: '#6c757d',
                                        borderRadius: '6px',
                                        padding: '0.25rem 0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        minWidth: '36px',
                                        minHeight: '36px'
                                    }}
                                >
                                    ←
                                </button>
                            )}
                            <h3 style={{ 
                                margin: 0, 
                                color: 'var(--main-color)',
                                fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)'
                            }}>
                                {selectedSplit ? 
                                    `📄 ${selectedSplit.form_name}` :
                                    view === 'companies' ? 
                                    `🏢 All Companies (${companiesData.length})` :
                                    view === 'folders' ?
                                    `📁 ${selectedCompany}'s Folders` :
                                    `📄 Files in ${selectedFolder} (${folderFiles.length})`
                                }
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={loadCompaniesData}
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
                    {view !== 'companies' && (
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #e9ecef'
                        }}>
                            <button
                                onClick={navigateToCompanies}
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
                                ← All Companies
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
                                        {selectedCompany}
                                    </button>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--text-color-light)' }}>/</span>
                                    <span style={{ fontWeight: '600', color: 'var(--main-color)' }}>{selectedFolder}</span>
                                </>
                            )}
                            
                            {view === 'folders' && (
                                <>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--text-color-light)' }}>/</span>
                                    <span style={{ fontWeight: '600', color: 'var(--main-color)' }}>{selectedCompany}</span>
                                </>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div>Loading...</div>
                        </div>
                    ) : selectedSplit ? (
                        <PDFViewer />
                    ) : (
                        view === 'companies' ? <AllCompaniesView /> : 
                        view === 'folders' ? <CompanyFoldersView /> : <FilesView />
                    )}
                </div>

                {/* Right Panel - JSON Data Viewer OR Split Info */}
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid #e9ecef',
                    boxShadow: 'var(--shadow-light)',
                    padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    order: window.innerWidth <= 768 ? 2 : 0, // Show second on mobile
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ 
                        margin: '0 0 1rem 0', 
                        color: 'var(--main-color)',
                        fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)',
                        textAlign: window.innerWidth <= 768 ? 'center' : 'left'
                    }}>
                        {selectedSplit ? '📋 Split Details' : '📊 Extracted Data'}
                    </h3>
                    <div style={{ 
                        flex: 1,
                        overflow: 'auto' 
                    }}>
                        {selectedSplit ? (
                            <div>
                                {/* Split Information */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--main-color)', marginBottom: '0.5rem' }}>
                                        {selectedSplit.form_name}
                                    </h4>
                                    <div style={{ 
                                        background: 'var(--background-color)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <div><strong>Form Code:</strong> {selectedSplit.form_code}</div>
                                            <div><strong>Pages:</strong> {selectedSplit.start_page} - {selectedSplit.end_page}</div>
                                            <div><strong>File:</strong> {selectedSplit.filename}</div>
                                            <div><strong>Status:</strong> <span style={{ color: '#28a745', fontWeight: '600' }}>✓ Available</span></div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => setSelectedSplit(null)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#6c757d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            ← Back to Files
                                        </button>
                                    </div>

                                </div>
                                
                                {/* Extracted data display */}
                                {!extractedData ? (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(63, 114, 175, 0.1)',
                                        border: '1px solid rgba(63, 114, 175, 0.3)',
                                        borderRadius: '6px',
                                        textAlign: 'center',
                                        color: '#155724'
                                    }}>
                                        {isLoadingExtractedData ? (
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                                    🔄 Loading extracted data...
                                                </p>
                                            </div>
                                        ) : extractedDataError ? (
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#dc3545' }}>
                                                    ❌ {extractedDataError}
                                                </p>
                                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
                                                    You can try extracting new data using the Smart Extraction feature
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                                    📊 No extracted data available for this split
                                                </p>
                                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
                                                    Extract data using the Smart Extraction feature first
                                                </p>
                                            </div>
                                        )}
                                    </div>
        ) : (
            <div style={{ padding: '0' }}>
                {renderExtractedDataTable()}
            </div>
        )}
                            </div>
                        ) : (
                            <JsonViewer />
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

export default ExplorerAllUsers