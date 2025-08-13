import React, { useState, useEffect } from 'react'
import ApiService from '../services/api'
import CompanyInformationSidebar from '../components/CompanyInformationSidebar'

function Lform({ onMenuClick }) {
    const [dropdownData, setDropdownData] = useState({
        companies: [],
        companyInfo: [],
        lforms: [],
        reportTypes: [],
        periods: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedValues, setSelectedValues] = useState({
        company: null,
        companyInfo: null,
        lform: null,
        reportType: null,
        period: null
    });
    const [reportData, setReportData] = useState(null);
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
        try {
            setLoading(true);
            const response = await ApiService.getDropdownData();
            if (response.success) {
                setDropdownData(response.dropdown_data);
            }
        } catch (err) {
            setError(`Failed to load data: ${err.message}`);
            console.error('Error fetching dropdown data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelection = (category, item) => {
        setSelectedValues(prev => ({
            ...prev,
            [category]: item
        }));
        
        // When company is selected, fetch company-specific L-forms
        if (category === 'company' && item) {
            fetchCompanyLforms(item.name);
        }
    };

    const fetchCompanyLforms = async (companyName) => {
        try {
            setLoading(true);
            const response = await ApiService.getCompanyLforms(companyName);
            if (response.success) {
                setDropdownData(prev => ({
                    ...prev,
                    lforms: response.lforms
                }));
                // Clear L-form selection when company changes
                setSelectedValues(prev => ({
                    ...prev,
                    lform: null
                }));
            }
        } catch (err) {
            setError(`Failed to load L-forms for ${companyName}: ${err.message}`);
            console.error('Error fetching company L-forms:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!selectedValues.lform) {
            setError('Please select an L-form to generate the report.');
            return;
        }

        try {
            setGeneratingReport(true);
            setError(null);
            
            const filters = {
                company: selectedValues.company?.name,
                lform: selectedValues.lform?.name,
                period: selectedValues.period?.name,
                reportType: selectedValues.reportType?.name,
                companyInfo: selectedValues.companyInfo?.name
            };

            const response = await ApiService.generateLformReport(filters);
            
            if (response.success) {
                setReportData(response.report_data);
            } else {
                setError(response.message || 'Failed to generate report');
            }
        } catch (err) {
            setError(`Error generating report: ${err.message}`);
            console.error('Error generating report:', err);
        } finally {
            setGeneratingReport(false);
        }
    };

    const renderReportTable = () => {
        if (!reportData) return null;

        return (
            <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflowX: 'auto'
            }}>
                <h3 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#333',
                    fontSize: 'clamp(18px, 4vw, 24px)'
                }}>
                    Generated Report Data
                </h3>
                <div style={{
                    overflowX: 'auto',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    minWidth: '600px' // Ensure table doesn't get too cramped on mobile
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 'clamp(12px, 2.5vw, 14px)'
                    }}>
                        <thead style={{
                            backgroundColor: '#f8f9fa',
                            borderBottom: '2px solid #dee2e6'
                        }}>
                            <tr>
                                {reportData.columns && reportData.columns.map((header, index) => (
                                    <th key={index} style={{
                                        padding: 'clamp(8px, 2vw, 12px)',
                                        textAlign: 'left',
                                        borderBottom: '1px solid #dee2e6',
                                        fontWeight: '600',
                                        color: '#495057',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.rows && reportData.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} style={{
                                    borderBottom: '1px solid #f1f3f4',
                                    backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa'
                                }}>
                                    {Object.values(row).map((cell, cellIndex) => (
                                        <td key={cellIndex} style={{
                                            padding: 'clamp(8px, 2vw, 12px)',
                                            borderBottom: '1px solid #f1f3f4',
                                            color: '#495057',
                                            wordBreak: 'break-word'
                                        }}>
                                            {cell || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: 'clamp(16px, 4vw, 18px)',
                color: '#666',
                padding: '20px',
                textAlign: 'center'
            }}>
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                gap: '20px',
                padding: '20px'
            }}>
                <div style={{
                    color: '#dc3545',
                    fontSize: 'clamp(16px, 4vw, 18px)',
                    textAlign: 'center',
                    maxWidth: '90vw'
                }}>
                    {error}
                </div>
                <button
                    onClick={fetchDropdownData}
                    style={{
                        padding: 'clamp(10px, 3vw, 15px) clamp(20px, 5vw, 30px)',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: 'clamp(14px, 3vw, 16px)'
                    }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{
            padding: 'clamp(10px, 3vw, 20px)',
            maxWidth: '100vw',
            overflowX: 'hidden'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'clamp(0.5rem, 2vw, 1rem)', 
                marginBottom: 'clamp(1rem, 3vw, 2rem)',
                flexWrap: 'wrap'
            }}>
                {/* Hamburger Menu Icon */}
                <button
                    onClick={() => {
                        console.log('Lform hamburger clicked!');
                        if (onMenuClick) {
                            onMenuClick();
                        } else {
                            console.log('onMenuClick is not defined');
                        }
                    }}
                    style={{
                        background: 'rgba(63, 114, 175, 0.1)',
                        border: '1px solid rgba(63, 114, 175, 0.3)',
                        color: 'var(--main-color)',
                        borderRadius: '6px',
                        padding: 'clamp(0.4rem, 2vw, 0.5rem)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: 'clamp(32px, 8vw, 36px)',
                        minHeight: 'clamp(32px, 8vw, 36px)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(63, 114, 175, 0.2)';
                        e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(63, 114, 175, 0.1)';
                        e.target.style.transform = 'scale(1)';
                    }}
                >
                    ☰
                </button>
                <h1 style={{ 
                    margin: 0,
                    fontSize: 'clamp(18px, 5vw, 28px)',
                    lineHeight: '1.2'
                }}>L-Form Data Selection</h1>
            </div>
            
            <div style={{ 
                display: 'flex', 
                gap: 'clamp(10px, 3vw, 20px)',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
                {/* Company Information Sidebar */}
                <CompanyInformationSidebar />

                {/* Main Content Area */}
                <div style={{ flex: '1', minWidth: 0 }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 'clamp(15px, 3vw, 20px)',
                        marginBottom: '20px'
                    }}>
                        <div className='dropdown' style={{
                            minWidth: '200px',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: 'clamp(16px, 3.5vw, 18px)',
                                marginBottom: '8px'
                            }}>Select Company</h3>
                            <select 
                                value={selectedValues.company?.id || ''} 
                                onChange={(e) => {
                                    const selected = dropdownData.companies.find(item => item.id === parseInt(e.target.value));
                                    handleSelection('company', selected);
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(10px, 2.5vw, 12px)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: 'clamp(14px, 3vw, 16px)'
                                }}
                            >
                                <option value="">Select a company...</option>
                                {dropdownData.companies.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                            {selectedValues.company && (
                                <p style={{
                                    fontSize: 'clamp(11px, 2.5vw, 12px)', 
                                    color: '#666', 
                                    margin: '5px 0'
                                }}>
                                    Selected: {selectedValues.company.name}
                                </p>
                            )}
                        </div>

                        <div className='dropdown' style={{
                            minWidth: '200px',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: 'clamp(16px, 3.5vw, 18px)',
                                marginBottom: '8px'
                            }}>Company Information</h3>
                            <select 
                                value={selectedValues.companyInfo?.id || ''} 
                                onChange={(e) => {
                                    const selected = dropdownData.companyInfo.find(item => item.id === parseInt(e.target.value));
                                    handleSelection('companyInfo', selected);
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(10px, 2.5vw, 12px)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: 'clamp(14px, 3vw, 16px)'
                                }}
                            >
                                <option value="">Select information type...</option>
                                {dropdownData.companyInfo.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                            {selectedValues.companyInfo && (
                                <p style={{
                                    fontSize: 'clamp(11px, 2.5vw, 12px)', 
                                    color: '#666', 
                                    margin: '5px 0'
                                }}>
                                    Selected: {selectedValues.companyInfo.name}
                                </p>
                            )}
                        </div>

                        <div className='dropdown' style={{
                            minWidth: '200px',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: 'clamp(16px, 3.5vw, 18px)',
                                marginBottom: '8px'
                            }}>Select Report Type</h3>
                            <select 
                                value={selectedValues.reportType?.id || ''} 
                                onChange={(e) => {
                                    const selected = dropdownData.reportTypes.find(item => item.id === parseInt(e.target.value));
                                    handleSelection('reportType', selected);
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(10px, 2.5vw, 12px)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: 'clamp(14px, 3vw, 16px)'
                                }}
                            >
                                <option value="">Select report type...</option>
                                {dropdownData.reportTypes.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                            {selectedValues.reportType && (
                                <p style={{
                                    fontSize: 'clamp(11px, 2.5vw, 12px)', 
                                    color: '#666', 
                                    margin: '5px 0'
                                }}>
                                    Selected: {selectedValues.reportType.name}
                                </p>
                            )}
                        </div>

                        <div className='dropdown' style={{
                            minWidth: '200px',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: 'clamp(16px, 3.5vw, 18px)',
                                marginBottom: '8px'
                            }}>Select Period</h3>
                            <select 
                                value={selectedValues.period?.id || ''} 
                                onChange={(e) => {
                                    const selected = dropdownData.periods.find(item => item.id === parseInt(e.target.value));
                                    handleSelection('period', selected);
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(10px, 2.5vw, 12px)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: 'clamp(14px, 3vw, 16px)'
                                }}
                            >
                                <option value="">Select period...</option>
                                {dropdownData.periods.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                            {selectedValues.period && (
                                <p style={{
                                    fontSize: 'clamp(11px, 2.5vw, 12px)', 
                                    color: '#666', 
                                    margin: '5px 0'
                                }}>
                                    Selected: {selectedValues.period.name}
                                </p>
                            )}
                        </div>

                        <div className='dropdown' style={{
                            minWidth: '200px',
                            width: '100%'
                        }}>
                            <h3 style={{
                                fontSize: 'clamp(16px, 3.5vw, 18px)',
                                marginBottom: '8px'
                            }}>Select L-Form</h3>
                            <select 
                                value={selectedValues.lform?.id || ''} 
                                onChange={(e) => {
                                    const selected = dropdownData.lforms.find(item => item.id === parseInt(e.target.value));
                                    handleSelection('lform', selected);
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(10px, 2.5vw, 12px)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: 'clamp(14px, 3vw, 16px)'
                                }}
                            >
                                <option value="">
                                    {selectedValues.company ? 'Select L-form...' : 'Select a company first'}
                                </option>
                                {dropdownData.lforms.map(item => (
                                    <option key={item.id} value={item.id} disabled={!selectedValues.company}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                            {selectedValues.lform && (
                                <p style={{
                                    fontSize: 'clamp(11px, 2.5vw, 12px)', 
                                    color: '#666', 
                                    margin: '5px 0'
                                }}>
                                    Selected: {selectedValues.lform.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Display selected values summary */}
                    <div style={{
                        marginTop: '30px',
                        padding: 'clamp(15px, 4vw, 20px)',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <h3 style={{
                            fontSize: 'clamp(18px, 4vw, 20px)',
                            marginBottom: '15px'
                        }}>Selected Configuration:</h3>
                        <div style={{
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: 'clamp(10px, 3vw, 15px)'
                        }}>
                            <div style={{
                                fontSize: 'clamp(13px, 3vw, 14px)'
                            }}>
                                <strong>Company:</strong><br />
                                {selectedValues.company ? selectedValues.company.name : 'Not selected'}
                            </div>
                            <div style={{
                                fontSize: 'clamp(13px, 3vw, 14px)'
                            }}>
                                <strong>Information Type:</strong><br />
                                {selectedValues.companyInfo ? selectedValues.companyInfo.name : 'Not selected'}
                            </div>
                            <div style={{
                                fontSize: 'clamp(13px, 3vw, 14px)'
                            }}>
                                <strong>L-Form:</strong><br />
                                {selectedValues.lform ? selectedValues.lform.name : 'Not selected'}
                            </div>
                            <div style={{
                                fontSize: 'clamp(13px, 3vw, 14px)'
                            }}>
                                <strong>Report Type:</strong><br />
                                {selectedValues.reportType ? selectedValues.reportType.name : 'Not selected'}
                            </div>
                            <div style={{
                                fontSize: 'clamp(13px, 3vw, 14px)'
                            }}>
                                <strong>Period:</strong><br />
                                {selectedValues.period ? selectedValues.period.name : 'Not selected'}
                            </div>
                        </div>
                        
                        {Object.values(selectedValues).some(val => val !== null) && (
                            <button 
                                onClick={handleGenerateReport}
                                disabled={!selectedValues.lform || generatingReport}
                                style={{
                                    marginTop: '20px',
                                    padding: 'clamp(12px, 3vw, 16px) clamp(24px, 5vw, 32px)',
                                    backgroundColor: selectedValues.lform ? '#28a745' : '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: selectedValues.lform ? 'pointer' : 'not-allowed',
                                    fontSize: 'clamp(14px, 3vw, 16px)',
                                    opacity: generatingReport ? 0.7 : 1,
                                    width: '100%',
                                    maxWidth: '300px'
                                }}
                            >
                                {generatingReport ? 'Generating Report...' : 'Generate Report'}
                            </button>
                        )}
                    </div>

                    {/* Report data table */}
                    {renderReportTable()}

                    {/* Data source info */}
                    <div style={{
                        marginTop: '20px',
                        padding: 'clamp(12px, 3vw, 15px)',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '6px',
                        fontSize: 'clamp(12px, 2.5vw, 14px)',
                        color: '#0066cc'
                    }}>
                        <strong>📊 Dynamic L-form System:</strong> 
                        <br />
                        • <strong>Company Selection:</strong> First select a company to see only their available L-forms
                        <br />
                        • <strong>Real Data:</strong> L-forms are extracted from actual uploaded PDF/CSV files
                        <br />
                        • <strong>Available Companies:</strong> {dropdownData.companies.length} found in files
                        <br />
                        • <strong>L-forms for Selected Company:</strong> {dropdownData.lforms.length} found
                        <br />
                        • <strong>Data Source:</strong> Reports show exact rows from company's financial documents
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Lform
