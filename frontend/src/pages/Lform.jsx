import React, { useState, useEffect } from 'react'
import ApiService from '../services/api'
import DataTable from '../components/DataTable.jsx'

function Lform() {
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
                setError('Failed to generate report');
            }
        } catch (err) {
            setError(`Failed to generate report: ${err.message}`);
            console.error('Error generating report:', err);
        } finally {
            setGeneratingReport(false);
        }
    };

    const renderReportTable = () => {
        if (!reportData || !reportData.table || !reportData.table.rows || reportData.table.rows.length === 0) {
            return null;
        }

        const { table } = reportData;
        const { headers, rows, title } = table;

        // Convert row array format to object format for DataTable
        const convertedData = rows.map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
                rowObj[header] = row[index] || '';
            });
            return rowObj;
        });

        return (
            <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    <strong>Applied Filters:</strong><br />
                    Company: {reportData.filters.company || 'All'} | 
                    Period: {reportData.filters.period || 'All'} | 
                    Report Type: {reportData.filters.report_type || 'All'}
                    <br />
                    <strong>Source Files:</strong> {reportData.metadata.source_files.join(', ')}
                </div>

                <DataTable
                    title={title}
                    columns={headers}
                    data={convertedData}
                    maxHeight="600px"
                    showFullData={true}
                    fileType="lform"
                />

                {rows.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#666'
                    }}>
                        No data found matching the selected criteria.
                        <br />
                        Try selecting different filters or upload files containing L-form data.
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{padding: '20px', textAlign: 'center'}}>
                <h1>L-Form Data</h1>
                <p>Loading data from backend...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{padding: '20px', textAlign: 'center'}}>
                <h1>L-Form Data</h1>
                <p style={{color: 'red'}}>Error: {error}</p>
                <button onClick={fetchDropdownData} style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{padding: '20px'}}>
            <h1>L-Form Data Selection</h1>
            <div style={{display:'flex', justifyContent:'space-between', gap: '20px', flexWrap: 'wrap'}}>
                <div className='dropdown' style={{minWidth: '200px'}}>
                    <h3>Select Company</h3>
                    <select 
                        value={selectedValues.company?.id || ''} 
                        onChange={(e) => {
                            const selected = dropdownData.companies.find(item => item.id === parseInt(e.target.value));
                            handleSelection('company', selected);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Select a company...</option>
                        {dropdownData.companies.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                    {selectedValues.company && (
                        <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
                            Selected: {selectedValues.company.name}
                        </p>
                    )}
                </div>

                <div className='dropdown' style={{minWidth: '200px'}}>
                    <h3>Company Information</h3>
                    <select 
                        value={selectedValues.companyInfo?.id || ''} 
                        onChange={(e) => {
                            const selected = dropdownData.companyInfo.find(item => item.id === parseInt(e.target.value));
                            handleSelection('companyInfo', selected);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Select information type...</option>
                        {dropdownData.companyInfo.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                    {selectedValues.companyInfo && (
                        <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
                            Selected: {selectedValues.companyInfo.name}
                        </p>
                    )}
                </div>

                <div className='dropdown' style={{minWidth: '200px'}}>
                    <h3>Select Report Type</h3>
                    <select 
                        value={selectedValues.reportType?.id || ''} 
                        onChange={(e) => {
                            const selected = dropdownData.reportTypes.find(item => item.id === parseInt(e.target.value));
                            handleSelection('reportType', selected);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Select report type...</option>
                        {dropdownData.reportTypes.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                    {selectedValues.reportType && (
                        <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
                            Selected: {selectedValues.reportType.name}
                        </p>
                    )}
                </div>

                <div className='dropdown' style={{minWidth: '200px'}}>
                    <h3>Select Period</h3>
                    <select 
                        value={selectedValues.period?.id || ''} 
                        onChange={(e) => {
                            const selected = dropdownData.periods.find(item => item.id === parseInt(e.target.value));
                            handleSelection('period', selected);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Select period...</option>
                        {dropdownData.periods.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                    {selectedValues.period && (
                        <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
                            Selected: {selectedValues.period.name}
                        </p>
                    )}
                </div>

                <div className='dropdown' style={{minWidth: '200px'}}>
                    <h3>Select L-Form</h3>
                    <select 
                        value={selectedValues.lform?.id || ''} 
                        onChange={(e) => {
                            const selected = dropdownData.lforms.find(item => item.id === parseInt(e.target.value));
                            handleSelection('lform', selected);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
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
                        <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
                            Selected: {selectedValues.lform.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Display selected values summary */}
            <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
            }}>
                <h3>Selected Configuration:</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div>
                        <strong>Company:</strong><br />
                        {selectedValues.company ? selectedValues.company.name : 'Not selected'}
                    </div>
                    <div>
                        <strong>Information Type:</strong><br />
                        {selectedValues.companyInfo ? selectedValues.companyInfo.name : 'Not selected'}
                    </div>
                    <div>
                        <strong>L-Form:</strong><br />
                        {selectedValues.lform ? selectedValues.lform.name : 'Not selected'}
                    </div>
                    <div>
                        <strong>Report Type:</strong><br />
                        {selectedValues.reportType ? selectedValues.reportType.name : 'Not selected'}
                    </div>
                    <div>
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
                            padding: '12px 24px',
                            backgroundColor: selectedValues.lform ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedValues.lform ? 'pointer' : 'not-allowed',
                            fontSize: '16px',
                            opacity: generatingReport ? 0.7 : 1
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
                padding: '15px',
                backgroundColor: '#e7f3ff',
                borderRadius: '6px',
                fontSize: '14px',
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
    );
}

export default Lform
