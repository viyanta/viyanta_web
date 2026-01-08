import React from 'react'
import Button from '../utils/Button.jsx'
import ApiService, { API_BASE_URL } from '../services/api.js'
// import { useStats } from '../context/StatsContext.jsx'
import DataTable from '../components/DataTable.jsx'
import SourceFileViewer from '../components/SourceFileViewer.jsx'
import SmartTableViewer from '../components/SmartTableViewer.jsx'
import { subscribeToAuthChanges } from '../firebase/auth.js'
import StandardPageLayout from '../components/StandardPageLayout';

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

    // Form visibility control state - track which forms are enabled/disabled
    const [enabledForms, setEnabledForms] = React.useState(new Set());
    const [showFormSelector, setShowFormSelector] = React.useState(false);
    const [lastPreferencesUpdate, setLastPreferencesUpdate] = React.useState(null);

    // Data edits state - track cell edits for admin
    const [dataEdits, setDataEdits] = React.useState({});
    const [editingCell, setEditingCell] = React.useState(null); // {recordIndex, rowIndex, header}
    const [editValue, setEditValue] = React.useState('');

    // View mode state - 'pdf' or 'data'
    const [viewMode, setViewMode] = React.useState('pdf');

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

    // Poll for form preference updates every 3 seconds when a file is selected
    // This allows real-time updates when admin changes preferences
    React.useEffect(() => {
        if (!selectedFile || !selectedCompany || isLoadingSplits || !pdfSplits.length) {
            return;
        }

        const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
        if (!companyName) {
            return;
        }

        // Map company name to match backend API format
        const companyNameMapping = {
            'sbi': 'SBI Life',
            'hdfc': 'HDFC Life',
            'icici': 'ICICI Prudential',
            'lic': 'LIC'
        };
        const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

        // Poll for preference updates (works for all users, including admin in other tabs)
        const pollInterval = setInterval(async () => {
            try {
                const apiBase = API_BASE_URL;
                const prefsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/form-preferences`;

                const prefsResponse = await fetch(prefsUrl);
                if (prefsResponse.ok) {
                    const prefsData = await prefsResponse.json();
                    const enabledFormsList = prefsData.data?.enabled_forms;

                    // Check if preferences exist and have changed
                    if (enabledFormsList !== undefined && enabledFormsList !== null) {
                        setEnabledForms(prevEnabledForms => {
                            const newSet = new Set(enabledFormsList);

                            // Check if preferences have changed
                            const hasChanged =
                                newSet.size !== prevEnabledForms.size ||
                                Array.from(newSet).some(form => !prevEnabledForms.has(form)) ||
                                Array.from(prevEnabledForms).some(form => !newSet.has(form));

                            if (hasChanged) {
                                console.log('🔄 Form preferences updated from server:', Array.from(newSet));
                                setLastPreferencesUpdate(new Date());
                                return newSet;
                            }
                            return prevEnabledForms; // No change, keep current state
                        });
                    }
                }
            } catch (error) {
                console.error('Error polling form preferences:', error);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [selectedFile?.name, selectedCompany, pdfSplits.length, isLoadingSplits, companiesData]);

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
    // Each record gets its own table with headers
    const renderExtractedDataTable = () => {
        const { records, hasData } = processedExtractedData;

        // If we have table data, render each record separately with its own headers
        if (hasData && records.length > 0) {
            return (
                <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        background: '#f5f5f5',
                        padding: '0.75rem',
                        borderBottom: '1px solid #e0e0e0',
                        fontWeight: '600',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>📊 Extracted Data ({records.length} record{records.length !== 1 ? 's' : ''})</span>
                        {isAdmin && (
                            <span style={{
                                fontSize: '0.75rem',
                                color: '#667eea',
                                fontWeight: 'normal',
                                fontStyle: 'italic'
                            }}>
                                💡 Double-click any cell to edit (Admin only)
                            </span>
                        )}
                    </div>

                    <div style={{
                        maxHeight: '600px',
                        overflow: 'auto',
                        padding: '1rem'
                    }}>
                        {records.map((record, recordIndex) => {
                            // Get headers and rows for this record
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

                            if (recordHeaders.length === 0 || recordRows.length === 0) {
                                return null;
                            }

                            return (
                                <div key={recordIndex} style={{
                                    marginBottom: recordIndex < records.length - 1 ? '1.5rem' : 0,
                                    paddingBottom: recordIndex < records.length - 1 ? '1.5rem' : 0,
                                    borderBottom: recordIndex < records.length - 1 ? '1px solid #f0f0f0' : 'none'
                                }}>
                                    {/* Record Header */}
                                    <h6 style={{ margin: '0 0 0.75rem 0', color: '#1976d2' }}>
                                        Record {recordIndex + 1} {record.FormName && `- ${record.FormName}`}
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

                                    {/* Table Data - Each record has its own table with headers */}
                                    <div style={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div
                                            className="table-scroll-container"
                                            style={{
                                                overflowX: 'scroll',
                                                overflowY: 'scroll',
                                                maxHeight: '500px',
                                                width: '100%',
                                                maxWidth: '100%',
                                                display: 'block',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <table style={{
                                                width: 'max-content',
                                                minWidth: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.8rem',
                                                margin: 0
                                            }}>
                                                <thead>
                                                    <tr style={{ background: '#0885f1' }}>
                                                        {recordHeaders.map((header, headerIndex) => {
                                                            // Function to determine alignment based on column header
                                                            const getHeaderAlignment = (headerText) => {
                                                                const normalizedHeader = headerText.toLowerCase().trim();

                                                                // Left-aligned columns (text/description columns)
                                                                const leftAlignedColumns = [
                                                                    'particulars', 'information', 'category of business',
                                                                    'claims experience', 'types of claims', 'channels',
                                                                    'category of investment', 'description', 'designation', 'details', 'shareholder', 'shareholders',
                                                                    'name', 'title', 'remarks', 'role/function', 'notes', 'type', 'category', 'non-performing loans'
                                                                ];

                                                                // Center-aligned columns (serial numbers)
                                                                const centerAlignedColumns = [
                                                                    'sl no', 'Sl No', 'sl.no', 'sl. no.', 'sl.no.', 'sr no', 'sr.no',
                                                                    's.no', 's no', 'serial no', 'serial number', 'sn', 'index', 'item', 'Item No', 'items'
                                                                ];

                                                                const rightAlignedColumns = [
                                                                    'for'
                                                                ];

                                                                // Check for serial number columns
                                                                if (centerAlignedColumns.some(col => normalizedHeader.includes(col))) {
                                                                    return 'center';
                                                                }

                                                                // Check for text/description columns or second column
                                                                if (headerIndex === 1 || leftAlignedColumns.some(col => normalizedHeader.includes(col))) {
                                                                    return 'left';
                                                                }
                                                                if (rightAlignedColumns.some(col => normalizedHeader.includes(col))) return 'right';

                                                                // Default: numeric columns - right align
                                                                return 'right';
                                                            };
                                                            // Function to break long headers
                                                            const formatHeader = (text) => {
                                                                if (!text) return '';

                                                                const MAX_CHUNK = 20;
                                                                let cleanText = text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim(); // Replace underscores with spaces
                                                                const words = cleanText.split(' ');
                                                                let lines = [];
                                                                let currentLine = '';

                                                                // Build up to 3 lines
                                                                for (let i = 0; i < words.length; i++) {
                                                                    const word = words[i];
                                                                    if ((currentLine + ' ' + word).trim().length <= MAX_CHUNK) {
                                                                        // If word fits in current line
                                                                        currentLine = (currentLine + ' ' + word).trim();
                                                                    } else {
                                                                        // Push current line and start new one
                                                                        lines.push(currentLine);
                                                                        currentLine = word;
                                                                        if (lines.length === 2) break; // stop after 2 lines; remaining goes to last
                                                                    }
                                                                }

                                                                // Push last line (even if long)
                                                                if (currentLine) {
                                                                    const remainingWords = words.slice(words.indexOf(currentLine.split(' ')[0]));
                                                                    lines.push(remainingWords.join(' '));
                                                                }

                                                                return (
                                                                    <>
                                                                        {lines.map((line, i) => (
                                                                            <React.Fragment key={i}>
                                                                                {line}
                                                                                {i < lines.length - 1 && <br />}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </>
                                                                );
                                                            };



                                                            return (
                                                                <th key={headerIndex} style={{
                                                                    padding: '0.5rem',
                                                                    textAlign: 'center',
                                                                    borderRight: '1px solid #e0e0e0',
                                                                    borderBottom: '1px solid #e0e0e0',
                                                                    fontWeight: 'bold',
                                                                    whiteSpace: 'nowrap',
                                                                    minWidth: '120px'
                                                                }}>
                                                                    {formatHeader(header)}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recordRows.map((row, rowIndex) => {
                                                        // Check if row contains "total" or "subtotal" (case-insensitive)
                                                        const checkForTotal = (cellValue) => {
                                                            if (!cellValue) return false;
                                                            const str = cellValue.toString().trim().toLowerCase();
                                                            return str.includes('total') || str.includes('subtotal') || str.includes('sub total');
                                                        };

                                                        let isTotalRow = false;
                                                        if (Array.isArray(row)) {
                                                            // Check all cells in the row
                                                            isTotalRow = row.some(cell => checkForTotal(cell));
                                                        } else if (typeof row === 'object' && row !== null) {
                                                            // For object rows, check all header values
                                                            isTotalRow = recordHeaders.some(header => checkForTotal(row[header]));
                                                        }

                                                        return (
                                                            <tr key={rowIndex} style={{
                                                                background: rowIndex % 2 === 0 ? 'white' : '#ebf7f9',
                                                                fontWeight: isTotalRow ? '700' : 'normal'
                                                            }}>
                                                                {recordHeaders.map((header, headerIndex) => {
                                                                    // Handle both array and object row formats
                                                                    let originalValue = '';
                                                                    if (Array.isArray(row)) {
                                                                        originalValue = row[headerIndex] || '';
                                                                    } else if (typeof row === 'object' && row !== null) {
                                                                        originalValue = row[header] || '';
                                                                    } else {
                                                                        originalValue = row || '';
                                                                    }

                                                                    // Function to determine cell alignment
                                                                    const getCellAlignment = (headerText, colIndex) => {
                                                                        const normalizedHeader = headerText.toLowerCase().trim();

                                                                        // Left-aligned columns (text/description columns)
                                                                        const leftAlignedColumns = [
                                                                            'particulars', 'particular', 'Designation', 'information', 'category of business',
                                                                            'claims experience', 'types of claims', 'channels',
                                                                            'category of investment', 'description', 'designation', 'details', 'shareholder', 'shareholders',
                                                                            'name', 'title', 'remarks', 'Role/Function', 'notes', 'type', 'category', 'non-performing loans'
                                                                        ];

                                                                        // Center-aligned columns (serial numbers)
                                                                        const centerAlignedColumns = [
                                                                            'sl no', 'sl_no', 'sl.no', 'sl. no.', 'sl.no.', 'sr no', 'sr.no',
                                                                            's.no', 's no', 'serial no', 'serial number', 'sn', 'index', 'item', 'Item No', 'items'
                                                                        ];
                                                                        const rightAlignedColumns = [
                                                                            'for'
                                                                        ];

                                                                        // Check for serial number columns
                                                                        if (centerAlignedColumns.some(col => normalizedHeader.includes(col))) {
                                                                            return 'center';
                                                                        }
                                                                        if (rightAlignedColumns.some(col => normalizedHeader.includes(col)))
                                                                            return 'right';
                                                                        // Check for text/description columns or second column
                                                                        if (colIndex === 1 || leftAlignedColumns.some(col => normalizedHeader.includes(col))) {
                                                                            return 'left';
                                                                        }


                                                                        // Default: numeric columns - right align
                                                                        return 'right';
                                                                    };

                                                                    const alignment = getCellAlignment(header, headerIndex);

                                                                    // Get form name for edit key - use selectedSplit.form_name as primary source
                                                                    const formName = selectedSplit?.form_name || record.FormName || record['Form No'] || record.form_name || 'Unknown';
                                                                    const cellValue = getCellValue(formName, recordIndex, rowIndex, header, originalValue);
                                                                    const isEditing = editingCell &&
                                                                        editingCell.recordIndex === recordIndex &&
                                                                        editingCell.rowIndex === rowIndex &&
                                                                        editingCell.header === header &&
                                                                        editingCell.formName === formName;

                                                                    return (
                                                                        <td
                                                                            key={headerIndex}
                                                                            style={{
                                                                                padding: '0.5rem',
                                                                                borderRight: '1px solid #e0e0e0',
                                                                                borderBottom: '1px solid #e0e0e0',
                                                                                whiteSpace: 'nowrap',
                                                                                minWidth: '120px',
                                                                                fontWeight: isTotalRow ? '700' : 'normal',
                                                                                textAlign: alignment,
                                                                                backgroundColor: isEditing ? '#fff3cd' : (dataEdits[`${formName}_${recordIndex}_${rowIndex}_${header}`] ? '#e7f3ff' : 'transparent'),
                                                                                cursor: isAdmin ? 'pointer' : 'default',
                                                                                position: 'relative'
                                                                            }}
                                                                            onDoubleClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isAdmin && !isTotalRow) {
                                                                                    const formName = selectedSplit?.form_name || record.FormName || record['Form No'] || record.form_name || 'Unknown';
                                                                                    // Get current cell value (with edits applied)
                                                                                    const currentCellValue = getCellValue(formName, recordIndex, rowIndex, header, originalValue);
                                                                                    console.log('Starting edit:', { formName, recordIndex, rowIndex, header, originalValue, currentCellValue });
                                                                                    // Reset editing state first
                                                                                    setEditingCell(null);
                                                                                    setEditValue('');
                                                                                    // Use setTimeout to ensure state is cleared before setting new edit
                                                                                    setTimeout(() => {
                                                                                        setEditingCell({
                                                                                            recordIndex,
                                                                                            rowIndex,
                                                                                            header,
                                                                                            formName,
                                                                                            initialValue: currentCellValue || '' // Store the initial value when editing starts
                                                                                        });
                                                                                        setEditValue(currentCellValue || '');
                                                                                    }, 0);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isEditing ? (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '0.25rem',
                                                                                    width: '100%'
                                                                                }}>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editValue}
                                                                                        onChange={(e) => {
                                                                                            const newValue = e.target.value;
                                                                                            console.log('Input onChange:', newValue);
                                                                                            setEditValue(newValue);
                                                                                        }}
                                                                                        onKeyDown={(e) => {
                                                                                            // Only allow Escape to cancel, no auto-save on Enter
                                                                                            if (e.key === 'Escape') {
                                                                                                e.preventDefault();
                                                                                                e.stopPropagation();
                                                                                                setEditingCell(null);
                                                                                                setEditValue('');
                                                                                            }
                                                                                        }}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                                        autoFocus
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            padding: '0.25rem',
                                                                                            border: '2px solid #667eea',
                                                                                            borderRadius: '4px',
                                                                                            fontSize: '0.8rem',
                                                                                            outline: 'none',
                                                                                            backgroundColor: 'white',
                                                                                            boxSizing: 'border-box'
                                                                                        }}
                                                                                    />
                                                                                    <div style={{
                                                                                        display: 'flex',
                                                                                        gap: '0.25rem',
                                                                                        justifyContent: 'flex-end'
                                                                                    }}>
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                e.preventDefault();
                                                                                                const finalValue = editValue.trim();
                                                                                                const currentFormName = editingCell?.formName || formName;
                                                                                                const initialValue = editingCell?.initialValue || originalValue;
                                                                                                console.log('Saving on Save button:', { finalValue, initialValue, originalValue, changed: finalValue !== initialValue });
                                                                                                if (finalValue !== initialValue) {
                                                                                                    saveCellEdit(currentFormName, recordIndex, rowIndex, header, finalValue);
                                                                                                }
                                                                                                setEditingCell(null);
                                                                                                setEditValue('');
                                                                                            }}
                                                                                            style={{
                                                                                                padding: '0.2rem 0.5rem',
                                                                                                fontSize: '0.7rem',
                                                                                                backgroundColor: '#667eea',
                                                                                                color: 'white',
                                                                                                border: 'none',
                                                                                                borderRadius: '4px',
                                                                                                cursor: 'pointer',
                                                                                                fontWeight: '600'
                                                                                            }}
                                                                                        >
                                                                                            Save
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                e.preventDefault();
                                                                                                setEditingCell(null);
                                                                                                setEditValue('');
                                                                                            }}
                                                                                            style={{
                                                                                                padding: '0.2rem 0.5rem',
                                                                                                fontSize: '0.7rem',
                                                                                                backgroundColor: '#ccc',
                                                                                                color: 'white',
                                                                                                border: 'none',
                                                                                                borderRadius: '4px',
                                                                                                cursor: 'pointer',
                                                                                                fontWeight: '600'
                                                                                            }}
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {cellValue || '-'}
                                                                                    {dataEdits[`${formName}_${recordIndex}_${rowIndex}_${header}`] && isAdmin && (
                                                                                        <span style={{
                                                                                            position: 'absolute',
                                                                                            top: '2px',
                                                                                            right: '2px',
                                                                                            fontSize: '0.6rem',
                                                                                            color: '#667eea',
                                                                                            fontWeight: 'bold'
                                                                                        }}>✏️</span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

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

            const apiBase = API_BASE_URL;
            const url = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(pdfName)}/splits`;

            console.log('Loading PDF splits from URL:', url);
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                console.log('PDF splits response:', data);
                const splits = data.splits || [];
                setPdfSplits(splits);

                // Initialize enabled forms - load from backend API (shared across all users and browsers)
                try {
                    // Map company name to match backend API format
                    const companyNameMapping = {
                        'sbi': 'SBI Life',
                        'hdfc': 'HDFC Life',
                        'icici': 'ICICI Prudential',
                        'lic': 'LIC'
                    };
                    const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

                    const apiBase = API_BASE_URL;
                    const prefsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(pdfName)}/form-preferences`;

                    const prefsResponse = await fetch(prefsUrl);
                    if (prefsResponse.ok) {
                        const prefsData = await prefsResponse.json();
                        const enabledFormsList = prefsData.data?.enabled_forms;

                        // Check if preferences exist (null/undefined means no preferences saved yet)
                        if (enabledFormsList !== undefined && enabledFormsList !== null) {
                            // Preferences exist (even if empty array - admin explicitly set it)
                            const savedSet = new Set(enabledFormsList);
                            setEnabledForms(savedSet);
                            console.log(`Loaded form preferences from API: ${savedSet.size} forms enabled for ${mappedCompanyName}/${pdfName}`, Array.from(savedSet));
                        } else {
                            // No preferences saved yet, enable all forms by default (first time)
                            const allFormNames = new Set(splits.map(s => s.form_name || s.filename));
                            setEnabledForms(allFormNames);
                            console.log(`No preferences found in API (first time), enabling all ${allFormNames.size} forms by default for ${mappedCompanyName}/${pdfName}`);
                        }
                    } else {
                        // API call failed (404 means no preferences yet), enable all forms by default
                        if (prefsResponse.status === 404) {
                            const allFormNames = new Set(splits.map(s => s.form_name || s.filename));
                            setEnabledForms(allFormNames);
                            console.log(`No preferences found (404), enabling all ${allFormNames.size} forms by default for ${companyName}/${pdfName}`);
                        } else {
                            // Other error, enable all forms by default
                            const allFormNames = new Set(splits.map(s => s.form_name || s.filename));
                            setEnabledForms(allFormNames);
                            console.error(`API call failed with status ${prefsResponse.status}, enabling all forms by default`);
                        }
                    }
                } catch (error) {
                    console.error('Error loading form preferences from API:', error);
                    // On error, enable all forms by default
                    const allFormNames = new Set(splits.map(s => s.form_name || s.filename));
                    setEnabledForms(allFormNames);
                }
            } else {
                const errorData = await response.json();
                console.log('Failed to load PDF splits:', errorData);
                setPdfSplits([]);
                setEnabledForms(new Set());
            }
        } catch (error) {
            console.error('Failed to load PDF splits:', error);
            setPdfSplits([]);
            setEnabledForms(new Set());
        } finally {
            setIsLoadingSplits(false);
        }
    };

    // Check if current user is admin (viyanta.insights@gmail.com)
    // This will be recalculated whenever user changes
    const isAdmin = React.useMemo(() => {
        return user?.email === 'viyanta.insights@gmail.com';
    }, [user?.email]);

    // Load data edits when extracted data is loaded
    React.useEffect(() => {
        if (!selectedFile || !selectedCompany || !extractedData) {
            return;
        }

        const loadEdits = async () => {
            try {
                const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
                const companyNameMapping = {
                    'sbi': 'SBI Life',
                    'hdfc': 'HDFC Life',
                    'icici': 'ICICI Prudential',
                    'lic': 'LIC'
                };
                const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

                const apiBase = API_BASE_URL;
                const editsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/data-edits`;

                const response = await fetch(editsUrl);
                if (response.ok) {
                    const data = await response.json();
                    const edits = data.data?.edits || {};
                    setDataEdits(edits);
                    console.log('Loaded data edits:', edits);
                }
            } catch (error) {
                console.error('Error loading data edits:', error);
            }
        };

        loadEdits();
    }, [selectedFile, selectedCompany, extractedData, companiesData]);

    // Poll for data edit updates (every 3 seconds)
    React.useEffect(() => {
        if (!selectedFile || !selectedCompany || !extractedData) {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
                const companyNameMapping = {
                    'sbi': 'SBI Life',
                    'hdfc': 'HDFC Life',
                    'icici': 'ICICI Prudential',
                    'lic': 'LIC'
                };
                const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

                const apiBase = API_BASE_URL;
                const editsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/data-edits`;

                const response = await fetch(editsUrl);
                if (response.ok) {
                    const data = await response.json();
                    const edits = data.data?.edits || {};

                    // Check if edits have changed
                    const editsString = JSON.stringify(edits);
                    const currentEditsString = JSON.stringify(dataEdits);
                    if (editsString !== currentEditsString) {
                        console.log('🔄 Data edits updated from server');
                        setDataEdits(edits);
                    }
                }
            } catch (error) {
                console.error('Error polling data edits:', error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [selectedFile, selectedCompany, extractedData, dataEdits, companiesData]);

    // Save cell edit (admin only)
    const saveCellEdit = async (formName, recordIndex, rowIndex, header, value) => {
        if (!isAdmin) {
            console.log('Not admin, cannot save');
            return;
        }

        if (!selectedFile || !selectedCompany) {
            console.error('Missing selectedFile or selectedCompany');
            return;
        }

        try {
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            if (!companyName) {
                console.error('Company name not found');
                return;
            }

            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life',
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

            const apiBase = API_BASE_URL;
            const editsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/data-edits`;

            const editPayload = {
                form_name: formName,
                record_index: recordIndex,
                row_index: rowIndex,
                header: header,
                value: value
            };

            console.log('Saving cell edit:', editPayload);
            console.log('Edit URL:', editsUrl);

            const response = await fetch(editsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editPayload)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Cell edit saved successfully:', result);

                // Update local state immediately
                const editKey = `${formName}_${recordIndex}_${rowIndex}_${header}`;
                setDataEdits(prev => ({
                    ...prev,
                    [editKey]: {
                        form_name: formName,
                        record_index: recordIndex,
                        row_index: rowIndex,
                        header: header,
                        value: value,
                        edited_at: new Date().toISOString()
                    }
                }));

                // Also reload from server to ensure sync
                const editsResponse = await fetch(editsUrl);
                if (editsResponse.ok) {
                    const data = await editsResponse.json();
                    setDataEdits(data.data?.edits || {});
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to save cell edit:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Error saving cell edit:', error);
        }
    };

    // Get cell value (with edits applied)
    const getCellValue = (formName, recordIndex, rowIndex, header, originalValue) => {
        const editKey = `${formName}_${recordIndex}_${rowIndex}_${header}`;
        console.log('getCellValue:', { editKey, hasEdit: !!dataEdits[editKey], dataEdits: Object.keys(dataEdits) });
        if (dataEdits[editKey]) {
            return dataEdits[editKey].value;
        }
        return originalValue;
    };

    // Toggle form visibility (only admin can do this)
    const toggleFormVisibility = async (formName) => {
        if (!isAdmin) return; // Only admin can toggle

        const newEnabledForms = new Set(enabledForms);
        if (newEnabledForms.has(formName)) {
            newEnabledForms.delete(formName);
            console.log(`Admin disabled form: ${formName}`);
        } else {
            newEnabledForms.add(formName);
            console.log(`Admin enabled form: ${formName}`);
        }
        setEnabledForms(newEnabledForms);

        // Save to backend API (shared across all users and browsers)
        if (selectedCompany && selectedFile) {
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            // Map company name to match backend API format
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life',
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;
            const formsArray = Array.from(newEnabledForms);

            try {
                const apiBase = API_BASE_URL;
                const prefsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/form-preferences`;

                const response = await fetch(prefsUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        enabled_forms: formsArray
                    })
                });

                if (response.ok) {
                    console.log(`Saved form preferences to API: ${formsArray.length} forms enabled for ${mappedCompanyName}/${selectedFile.name}`);
                } else {
                    console.error('Failed to save form preferences to API:', await response.text());
                }
            } catch (error) {
                console.error('Error saving form preferences to API:', error);
            }
        }
    };

    // Select all forms (only admin can do this)
    const selectAllForms = async () => {
        if (!isAdmin) return; // Only admin can do this

        const allFormNames = new Set(pdfSplits.map(s => s.form_name || s.filename));
        setEnabledForms(allFormNames);

        // Save to backend API (shared across all users and browsers)
        if (selectedCompany && selectedFile) {
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            // Map company name to match backend API format
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life',
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;
            const formsArray = Array.from(allFormNames);

            try {
                const apiBase = API_BASE_URL;
                const prefsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/form-preferences`;

                const response = await fetch(prefsUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        enabled_forms: formsArray
                    })
                });

                if (response.ok) {
                    console.log(`Saved form preferences to API: All ${formsArray.length} forms enabled`);
                } else {
                    console.error('Failed to save form preferences to API:', await response.text());
                }
            } catch (error) {
                console.error('Error saving form preferences to API:', error);
            }
        }
    };

    // Deselect all forms (only admin can do this)
    const deselectAllForms = async () => {
        if (!isAdmin) return; // Only admin can do this

        setEnabledForms(new Set());

        // Save to backend API (shared across all users and browsers)
        if (selectedCompany && selectedFile) {
            const companyName = companiesData.find(c => (c.id || c.name) === selectedCompany)?.name;
            // Map company name to match backend API format
            const companyNameMapping = {
                'sbi': 'SBI Life',
                'hdfc': 'HDFC Life',
                'icici': 'ICICI Prudential',
                'lic': 'LIC'
            };
            const mappedCompanyName = companyNameMapping[companyName.toLowerCase()] || companyName;

            try {
                const apiBase = API_BASE_URL;
                const prefsUrl = `${apiBase}/pdf-splitter/companies/${encodeURIComponent(mappedCompanyName)}/pdfs/${encodeURIComponent(selectedFile.name)}/form-preferences`;

                const response = await fetch(prefsUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        enabled_forms: []
                    })
                });

                if (response.ok) {
                    console.log(`Saved form preferences to API: All forms disabled`);
                } else {
                    console.error('Failed to save form preferences to API:', await response.text());
                }
            } catch (error) {
                console.error('Error saving form preferences to API:', error);
            }
        }
    };

    // Get filtered splits based on enabled forms
    const filteredPdfSplits = React.useMemo(() => {
        return pdfSplits.filter(split => {
            const formName = split.form_name || split.filename;
            return enabledForms.has(formName);
        });
    }, [pdfSplits, enabledForms]);

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
        setViewMode('pdf'); // Reset to PDF view when selecting a new split
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
            const apiBase = API_BASE_URL;
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
        setShowFormSelector(false); // Reset form selector visibility when switching files

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
        // Filter out any null or undefined companies
        const validCompanies = companiesData.filter(company => company && company.name);
        
        if (validCompanies.length === 0) {
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
                    {validCompanies.map((company) => (
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
                    gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    marginBottom: '2rem'
                }}>
                    {folderFiles.map((file, index) => (
                        <div
                            key={index}
                            onClick={() => selectFile(file)}
                            style={{
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: window.innerWidth <= 768 ? '1rem' : '1.25rem',
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
                                        file.json_priority === 'legacy' ? '📄 Legacy' : '❌ No Data'
                                }
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
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '600',
                            fontSize: '1.1rem'
                        }}>
                            📄 PDF Splits
                            {isLoadingSplits && <span style={{ fontSize: '0.8rem', color: 'var(--text-color-light)', marginLeft: '0.5rem' }}>(Loading...)</span>}
                        </h4>

                        {isLoadingSplits ? (
                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-light)' }}>
                                <div>🔄 Loading PDF splits...</div>
                            </div>
                        ) : pdfSplits.length > 0 ? (
                            <div>
                                {/* Form Visibility Control Header */}
                                <div style={{
                                    marginBottom: '1.5rem',
                                    padding: '1rem',
                                    backgroundColor: 'rgba(63, 114, 175, 0.08)',
                                    border: '1px solid rgba(63, 114, 175, 0.2)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div style={{ color: '#155724', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        ✅ <strong>{pdfSplits.length}</strong> PDF splits available
                                        {filteredPdfSplits.length !== pdfSplits.length && (
                                            <span style={{ color: '#856404', fontSize: '0.85rem' }}>
                                                ({filteredPdfSplits.length} enabled)
                                            </span>
                                        )}
                                        {lastPreferencesUpdate && (
                                            <span style={{ color: '#6c757d', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                • Last updated: {lastPreferencesUpdate.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowFormSelector(!showFormSelector)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: showFormSelector ? '#667eea' : 'white',
                                                color: showFormSelector ? 'white' : '#667eea',
                                                border: '1px solid #667eea',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!showFormSelector) {
                                                    e.currentTarget.style.backgroundColor = '#f0f4ff';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!showFormSelector) {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                }
                                            }}
                                        >
                                            ⚙️ {showFormSelector ? 'Hide' : 'Show'} Form Selector
                                        </button>
                                    )}
                                </div>

                                {/* Form Selector Panel - Only visible to admin */}
                                {showFormSelector && isAdmin && (
                                    <div style={{
                                        marginBottom: '1.5rem',
                                        padding: '1.5rem',
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '1rem'
                                        }}>
                                            <h5 style={{ margin: 0, color: '#495057', fontSize: '1rem', fontWeight: '600' }}>
                                                📋 Select Forms to Display
                                            </h5>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button
                                                    onClick={selectAllForms}
                                                    style={{
                                                        padding: '0.25rem 0.6rem',
                                                        backgroundColor: '#28a745',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    ✓ Select All
                                                </button>
                                                <button
                                                    onClick={deselectAllForms}
                                                    style={{
                                                        padding: '0.25rem 0.6rem',
                                                        backgroundColor: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    ✗ Deselect All
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '0.75rem',
                                            maxHeight: '300px',
                                            overflowY: 'auto',
                                            padding: '0.5rem'
                                        }}>
                                            {pdfSplits.map((split, index) => {
                                                const formName = split.form_name || split.filename;
                                                const isEnabled = enabledForms.has(formName);
                                                return (
                                                    <label
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.5rem',
                                                            backgroundColor: isEnabled ? 'white' : '#f8f9fa',
                                                            border: `1px solid ${isEnabled ? '#28a745' : '#dee2e6'}`,
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = isEnabled ? '#f0f8f0' : '#e9ecef';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = isEnabled ? 'white' : '#f8f9fa';
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isEnabled}
                                                            onChange={() => toggleFormVisibility(formName)}
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                cursor: 'pointer',
                                                                accentColor: '#28a745'
                                                            }}
                                                        />
                                                        <span style={{
                                                            fontWeight: isEnabled ? '600' : 'normal',
                                                            color: isEnabled ? '#155724' : '#6c757d',
                                                            flex: 1
                                                        }}>
                                                            {formName}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* PDF Splits Grid - Card Layout */}
                                {filteredPdfSplits.length > 0 ? (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                        gap: '1.25rem'
                                    }}>
                                        {filteredPdfSplits.map((split, index) => (
                                            <div
                                                key={index}
                                                onClick={() => selectPDFSplit(split)}
                                                style={{
                                                    border: selectedSplit === split ? '2px solid var(--main-color)' : '1px solid #e9ecef',
                                                    borderRadius: '10px',
                                                    padding: '1.25rem',
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
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '2rem',
                                        backgroundColor: '#fff3cd',
                                        border: '1px solid #ffc107',
                                        borderRadius: '8px',
                                        color: '#856404'
                                    }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>No Forms Enabled</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                            Please enable at least one form using the "Show Form Selector" button above to display forms.
                                        </p>
                                    </div>
                                )}
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
                <div style={{
                    marginBottom: '1.25rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #f3f4f6'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                color: '#1f2937',
                                fontSize: '1.1rem',
                                fontWeight: '600'
                            }}>
                                📄 {selectedSplit.form_name}
                            </h4>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}>
                                <span>📋 Form: <strong>{selectedSplit.form_code}</strong></span>
                                <span>📄 Pages: <strong>{selectedSplit.start_page}-{selectedSplit.end_page}</strong></span>
                            </div>
                        </div>
                        {splitPdfUrl && (
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <a
                                    href={splitPdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#3b82f6',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                        display: 'inline-block'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = '#2563eb';
                                        e.target.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = '#3b82f6';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    🔗 Open in New Tab
                                </a>
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
                                        padding: '0.5rem 1rem',
                                        background: '#059669',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = '#047857';
                                        e.target.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = '#059669';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    📥 Download
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* PDF Viewer */}
                <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: 'calc(100vh - 280px)',
                    background: '#f9fafb',
                    minHeight: '500px'
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
                                                    📄 Pages Used: {record.PagesUsed} heading : {record.Heading}
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
                                                {record.Currency && <div><strong>Currency:</strong> {record.Currency}</div>}
                                            </div>
                                        )}

                                        {/* Table Data */}
                                        {record.Rows && Array.isArray(record.Rows) && record.Rows.length > 0 && (
                                            <div style={{
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div
                                                    className="table-scroll-container"
                                                    style={{
                                                        overflow: 'auto',
                                                        maxHeight: '500px'
                                                    }}
                                                >
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
                                                                        fontWeight: '600',
                                                                        whiteSpace: 'nowrap',
                                                                        minWidth: '120px'
                                                                    }}>
                                                                        {header}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {record.Rows.map((row, rowIndex) => {
                                                                // Check if row contains "total" or "subtotal"
                                                                const checkForTotal = (cellValue) => {
                                                                    if (!cellValue) return false;
                                                                    const str = cellValue.toString().trim().toLowerCase();
                                                                    return str.includes('total') || str.includes('subtotal') || str.includes('sub total');
                                                                };

                                                                const isTotalRow = record.FlatHeaders?.some(header => checkForTotal(row[header]));

                                                                return (
                                                                    <tr key={rowIndex} style={{
                                                                        background: rowIndex % 2 === 0 ? 'white' : '#fafafa',
                                                                        fontWeight: isTotalRow ? '700' : 'normal'
                                                                    }}>
                                                                        {record.FlatHeaders && record.FlatHeaders.map((header, headerIndex) => {
                                                                            const originalValue = row[header] || '';
                                                                            const formName = selectedSplit?.form_name || record.FormName || record['Form No'] || 'Unknown';
                                                                            const cellValue = getCellValue(formName, index, rowIndex, header, originalValue);
                                                                            const isEditing = editingCell &&
                                                                                editingCell.recordIndex === index &&
                                                                                editingCell.rowIndex === rowIndex &&
                                                                                editingCell.header === header &&
                                                                                editingCell.formName === formName;

                                                                            return (
                                                                                <td
                                                                                    key={headerIndex}
                                                                                    style={{
                                                                                        padding: '0.5rem',
                                                                                        borderRight: '1px solid #e0e0e0',
                                                                                        borderBottom: '1px solid #e0e0e0',
                                                                                        whiteSpace: 'nowrap',
                                                                                        minWidth: '120px',
                                                                                        fontWeight: isTotalRow ? '700' : 'normal',
                                                                                        backgroundColor: isEditing ? '#fff3cd' : (dataEdits[`${formName}_${index}_${rowIndex}_${header}`] ? '#e7f3ff' : 'transparent'),
                                                                                        cursor: isAdmin ? 'pointer' : 'default',
                                                                                        position: 'relative'
                                                                                    }}
                                                                                    onDoubleClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (isAdmin && !isTotalRow) {
                                                                                            // Get current cell value (with edits applied)
                                                                                            const currentCellValue = getCellValue(formName, index, rowIndex, header, originalValue);
                                                                                            console.log('Starting edit (data path):', { formName, recordIndex: index, rowIndex, header, originalValue, currentCellValue });
                                                                                            // Reset editing state first
                                                                                            setEditingCell(null);
                                                                                            setEditValue('');
                                                                                            // Use setTimeout to ensure state is cleared before setting new edit
                                                                                            setTimeout(() => {
                                                                                                setEditingCell({
                                                                                                    recordIndex: index,
                                                                                                    rowIndex,
                                                                                                    header,
                                                                                                    formName,
                                                                                                    initialValue: currentCellValue || '' // Store the initial value when editing starts
                                                                                                });
                                                                                                setEditValue(currentCellValue || '');
                                                                                            }, 0);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {isEditing ? (
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '0.25rem',
                                                                                            width: '100%'
                                                                                        }}>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editValue}
                                                                                                onChange={(e) => {
                                                                                                    const newValue = e.target.value;
                                                                                                    console.log('Input onChange (data path):', newValue);
                                                                                                    setEditValue(newValue);
                                                                                                }}
                                                                                                onKeyDown={(e) => {
                                                                                                    // Only allow Escape to cancel, no auto-save on Enter
                                                                                                    if (e.key === 'Escape') {
                                                                                                        e.preventDefault();
                                                                                                        e.stopPropagation();
                                                                                                        setEditingCell(null);
                                                                                                        setEditValue('');
                                                                                                    }
                                                                                                }}
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                autoFocus
                                                                                                style={{
                                                                                                    width: '100%',
                                                                                                    padding: '0.25rem',
                                                                                                    border: '2px solid #667eea',
                                                                                                    borderRadius: '4px',
                                                                                                    fontSize: '0.8rem',
                                                                                                    outline: 'none',
                                                                                                    backgroundColor: 'white',
                                                                                                    boxSizing: 'border-box'
                                                                                                }}
                                                                                            />
                                                                                            <div style={{
                                                                                                display: 'flex',
                                                                                                gap: '0.25rem',
                                                                                                justifyContent: 'flex-end'
                                                                                            }}>
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        e.preventDefault();
                                                                                                        const finalValue = editValue.trim();
                                                                                                        const currentFormName = editingCell?.formName || formName;
                                                                                                        const initialValue = editingCell?.initialValue || originalValue;
                                                                                                        console.log('Saving on Save button (data path):', { finalValue, initialValue, originalValue, changed: finalValue !== initialValue });
                                                                                                        if (finalValue !== initialValue) {
                                                                                                            saveCellEdit(currentFormName, index, rowIndex, header, finalValue);
                                                                                                        }
                                                                                                        setEditingCell(null);
                                                                                                        setEditValue('');
                                                                                                    }}
                                                                                                    style={{
                                                                                                        padding: '0.2rem 0.5rem',
                                                                                                        fontSize: '0.7rem',
                                                                                                        backgroundColor: '#667eea',
                                                                                                        color: 'white',
                                                                                                        border: 'none',
                                                                                                        borderRadius: '4px',
                                                                                                        cursor: 'pointer',
                                                                                                        fontWeight: '600'
                                                                                                    }}
                                                                                                >
                                                                                                    Save
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        e.preventDefault();
                                                                                                        setEditingCell(null);
                                                                                                        setEditValue('');
                                                                                                    }}
                                                                                                    style={{
                                                                                                        padding: '0.2rem 0.5rem',
                                                                                                        fontSize: '0.7rem',
                                                                                                        backgroundColor: '#ccc',
                                                                                                        color: 'white',
                                                                                                        border: 'none',
                                                                                                        borderRadius: '4px',
                                                                                                        cursor: 'pointer',
                                                                                                        fontWeight: '600'
                                                                                                    }}
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            {cellValue || '-'}
                                                                                            {dataEdits[`${formName}_${index}_${rowIndex}_${header}`] && isAdmin && (
                                                                                                <span style={{
                                                                                                    position: 'absolute',
                                                                                                    top: '2px',
                                                                                                    right: '2px',
                                                                                                    fontSize: '0.6rem',
                                                                                                    color: '#667eea',
                                                                                                    fontWeight: 'bold'
                                                                                                }}>✏️</span>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
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
            <StandardPageLayout
                title="Maker and Checker - Admin Only"
                onMenuClick={onMenuClick}
            >
                <p style={{
                    fontSize: window.innerWidth <= 768 ? 'clamp(12px, 3vw, 14px)' : '1rem',
                    color: 'var(--text-color-light)',
                    marginBottom: '2rem',
                    marginTop: '0'
                }}>
                    Browse companies, files, and extracted data
                </p>

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
                        (window.innerWidth <= 768 ? '1fr' : '350px 1fr') :
                        (window.innerWidth <= 768 ? '1fr' : '350px 1fr'),
                    gap: window.innerWidth <= 768 ? '1.25rem' : '2rem',
                    minHeight: 'calc(100vh - 140px)',
                    height: 'calc(100vh - 140px)',
                    alignItems: 'stretch'
                }}>
                    {/* Left Panel - Users, Folders and Files OR PDF Viewer */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                        padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                        order: window.innerWidth <= 768 ? 1 : 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Navigation Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            paddingBottom: '1.25rem',
                            borderBottom: '2px solid #f3f4f6',
                            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                            gap: window.innerWidth <= 768 ? '0.75rem' : '0',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {selectedSplit && (
                                    <button
                                        onClick={() => {
                                            setSelectedSplit(null);
                                            setViewMode('pdf');
                                        }}
                                        style={{
                                            background: 'rgba(108, 117, 125, 0.1)',
                                            border: '1px solid rgba(108, 117, 125, 0.3)',
                                            color: '#6c757d',
                                            borderRadius: '6px',
                                            padding: '0.5rem 0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontWeight: '500'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(108, 117, 125, 0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(108, 117, 125, 0.1)';
                                        }}
                                    >
                                        ← Back to Files
                                    </button>
                                )}
                                {view === 'files' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1f2937',
                                            lineHeight: '1.3',
                                            textAlign: 'center'
                                        }}>
                                            📄 Files in {selectedFolder}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: '#6b7280',
                                            lineHeight: '1.2',
                                            textAlign: 'center'
                                        }}>
                                            ({folderFiles.length} files)
                                        </div>
                                    </div>
                                ) : (
                                    <h3 style={{
                                        margin: 0,
                                        color: '#1f2937',
                                        fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)',
                                        fontWeight: '600',
                                        lineHeight: '1.4'
                                    }}>
                                        {view === 'companies' ?
                                            `🏢 All Companies (${companiesData.length})` :
                                            `📁 ${selectedCompany}'s Folders`
                                        }
                                    </h3>
                                )}
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
                        {view !== 'companies' && !selectedSplit && (
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

                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            paddingRight: '0.5rem'
                        }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div>Loading...</div>
                                </div>
                            ) : (
                                view === 'companies' ? <AllCompaniesView /> :
                                    view === 'folders' ? <CompanyFoldersView /> : <FilesView />
                            )}
                        </div>
                    </div>

                    {/* Right Panel - JSON Data Viewer OR Split Info */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                        padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                        order: window.innerWidth <= 768 ? 2 : 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {selectedSplit && (
                            <div style={{
                                marginBottom: '1rem',
                                flexShrink: 0
                            }}>
                                {/* Tabs for switching between PDF and Data views */}
                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    borderBottom: '2px solid #e5e7eb',
                                    marginBottom: '1rem'
                                }}>
                                    <button
                                        onClick={() => setViewMode('pdf')}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: viewMode === 'pdf' ? '#3b82f6' : 'transparent',
                                            color: viewMode === 'pdf' ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderBottom: viewMode === 'pdf' ? '3px solid #3b82f6' : '3px solid transparent',
                                            borderRadius: '6px 6px 0 0',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: viewMode === 'pdf' ? '600' : '500',
                                            transition: 'all 0.2s ease',
                                            marginBottom: '-2px'
                                        }}
                                    >
                                        📄 PDF
                                    </button>
                                    <button
                                        onClick={() => setViewMode('data')}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: viewMode === 'data' ? '#3b82f6' : 'transparent',
                                            color: viewMode === 'data' ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderBottom: viewMode === 'data' ? '3px solid #3b82f6' : '3px solid transparent',
                                            borderRadius: '6px 6px 0 0',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: viewMode === 'data' ? '600' : '500',
                                            transition: 'all 0.2s ease',
                                            marginBottom: '-2px'
                                        }}
                                    >
                                        📊 Data
                                    </button>
                                </div>
                            </div>
                        )}

                        {!selectedSplit && (
                            <div style={{
                                marginBottom: '1.25rem',
                                paddingBottom: '1rem',
                                borderBottom: '2px solid #f3f4f6',
                                flexShrink: 0
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    color: '#1f2937',
                                    fontSize: window.innerWidth <= 768 ? 'clamp(16px, 4vw, 18px)' : 'clamp(18px, 4vw, 20px)',
                                    fontWeight: '600',
                                    textAlign: window.innerWidth <= 768 ? 'center' : 'left',
                                    lineHeight: '1.4'
                                }}>
                                    📊 Extracted Data
                                </h3>
                            </div>
                        )}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            paddingRight: '0.5rem',
                            minHeight: 0
                        }}>
                            {selectedSplit ? (
                                viewMode === 'pdf' ? (
                                    <PDFViewer />
                                ) : (
                                    <div>
                                        {/* Extracted Data Mode - Clean View */}
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
                                )
                            ) : (
                                <JsonViewer />
                            )}
                        </div>
                    </div>
                </div>
            </StandardPageLayout>
        </>
    );
}

export default ExplorerAllUsers