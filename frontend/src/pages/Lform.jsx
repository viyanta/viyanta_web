import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiService from '../services/api'
import CompanyInformationSidebar from '../components/CompanyInformationSidebar'
import { useNavigation } from '../context/NavigationContext'
import './Lform.css'

function Lform({ onMenuClick }) {
    const navigate = useNavigate();
    const { isNavItemActive } = useNavigation();
    const [selectedValues, setSelectedValues] = useState({
        lform: '',
        period: '',
        reportType: ''
    });
    const [selectedCompany, setSelectedCompany] = useState('');
    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [errorCompanies, setErrorCompanies] = useState(null);
    const [lforms, setLforms] = useState([]);
    const [loadingLforms, setLoadingLforms] = useState(false);
    const [errorLforms, setErrorLforms] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [errorPeriods, setErrorPeriods] = useState(null);
    const [reportTypes, setReportTypes] = useState([]);
    const [loadingReportTypes, setLoadingReportTypes] = useState(false);
    const [errorReportTypes, setErrorReportTypes] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [errorData, setErrorData] = useState(null);
    
    // Refs to prevent duplicate API calls
    const fetchingCompaniesRef = useRef(false);
    const fetchingFormsRef = useRef(false);
    const fetchingPeriodsRef = useRef(false);
    const fetchingReportTypesRef = useRef(false);
    const fetchingDataRef = useRef(false);
    const lastDataRequestRef = useRef('');

    // Navigation tabs
    const allTabs = [
        'Dashboard', 'Background', 'L Forms', 'Metrics', 
        'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
        'Define Template', 'Save Template',
        'Screener Inputs', 'Screener Output Sheets',
        'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches',
        'Irdai Monthly Data'
    ];

    // Filter to show only active tabs
    const tabs = allTabs.filter(tab => isNavItemActive(tab));

    // Handle tab clicks
    const handleTabClick = (tab) => {
        // Only allow clicks on active items
        if (!isNavItemActive(tab)) {
            return;
        }
        
        if (tab === 'Dashboard') {
            navigate('/dashboard');
        } else if (tab === 'Background') {
            navigate('/insurance-dashboard?tab=Background');
        } else if (tab === 'L Forms') {
            // Stay on current page
            return;
        } else if (tab === 'Metrics') {
            navigate('/metrics');
          } else if (tab === 'Analytics') {
              navigate('/analytics');
          } else if (tab === 'Annual Data') {
              navigate('/annual-data');
          } else if (tab === 'Documents') {
              navigate('/documents');
        } else if (tab === 'Peers') {
            navigate('/peers');
        } else if (tab === 'News') {
            navigate('/news');
        } else if (tab === 'Define Template') {
            navigate('/template');
        } else if (tab === 'Save Template') {
            console.log('Save Template clicked');
        } else if (tab === 'Screener Inputs') {
            console.log('Screener Inputs clicked');
        } else if (tab === 'Screener Output Sheets') {
            console.log('Screener Output Sheets clicked');
        } else if (tab === 'Child Plans') {
            console.log('Child Plans clicked');
        } else if (tab === 'Investment Plans') {
            console.log('Investment Plans clicked');
        } else if (tab === 'Protection Plans') {
            console.log('Protection Plans clicked');
        } else if (tab === 'Term Plans') {
            console.log('Term Plans clicked');
        } else if (tab === 'New Launches') {
            console.log('New Launches clicked');
        } else if (tab === 'Irdai Monthly Data') {
            // Navigate to IRDAI Monthly Data page if route exists
            console.log('Irdai Monthly Data clicked');
            // navigate('/irdai-monthly-data'); // Uncomment when route is available
        } else {
            // For other tabs, you can add navigation logic later
            console.log(`Clicked ${tab} tab`);
        }
    };

    // L Form options from the image
    const lformOptions = [
        'L-1_Revenue Account - L-1-A-Ra',
        'L-2_Profit And Loss Account - L-2-A-Pl',
        'L-3_Balance Sheet - L-3-A-Bs',
        'L-4-Premium Schedule - L-4',
        'L-4-Commission Schedule - L-5',
        'L-6-Operating Expenses Schedule - L-6',
        'L-6-Operating Expenses Schedule - L-6A',
        'L-7-Benefits Paid - L-7'
    ];

    // Period options from the image
    const periodOptions = [
        'Dec 24',
        'Sep 24',
        'Jun 24',
        'Mar-24'
    ];

    // Report type options from the image
    const reportTypeOptions = [
        'Consolidated',
        'Standalone'
    ];

    const handleSelection = (field, value) => {
        setSelectedValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Fetch companies from API when component loads
    useEffect(() => {
        if (fetchingCompaniesRef.current) return;
        
        const fetchCompanies = async () => {
            fetchingCompaniesRef.current = true;
            setLoadingCompanies(true);
            setErrorCompanies(null);
            try {
                const data = await ApiService.getLformCompanies();
                setCompanies(data || []);
            } catch (err) {
                console.error('Error fetching companies:', err);
                setErrorCompanies('Failed to load companies. Please try again.');
                setCompanies([]);
            } finally {
                setLoadingCompanies(false);
                fetchingCompaniesRef.current = false;
            }
        };

        fetchCompanies();
    }, []);

    // Fetch forms when company is selected
    useEffect(() => {
        if (fetchingFormsRef.current) return;
        
        const fetchForms = async () => {
            if (!selectedCompany) {
                setLforms([]);
                // Use functional update to avoid triggering other effects
                setSelectedValues(prev => {
                    if (prev.lform === '' && prev.period === '' && prev.reportType === '') {
                        return prev; // No change needed
                    }
                    return { ...prev, lform: '', period: '', reportType: '' };
                });
                return;
            }

            fetchingFormsRef.current = true;
            setLoadingLforms(true);
            setErrorLforms(null);
            try {
                const data = await ApiService.getLformForms(selectedCompany);
                setLforms(data || []);
                // Reset lform, period, and reportType selection when company changes
                setSelectedValues(prev => ({ ...prev, lform: '', period: '', reportType: '' }));
            } catch (err) {
                console.error('Error fetching forms:', err);
                setErrorLforms('Failed to load forms. Please try again.');
                setLforms([]);
            } finally {
                setLoadingLforms(false);
                fetchingFormsRef.current = false;
            }
        };

        fetchForms();
    }, [selectedCompany]);

    // Fetch periods when company and lform are selected
    useEffect(() => {
        if (fetchingPeriodsRef.current) return;
        
        const fetchPeriods = async () => {
            if (!selectedCompany || !selectedValues.lform) {
                setPeriods([]);
                setSelectedValues(prev => {
                    if (prev.period === '' && prev.reportType === '') {
                        return prev; // No change needed
                    }
                    return { ...prev, period: '', reportType: '' };
                });
                return;
            }

            fetchingPeriodsRef.current = true;
            setLoadingPeriods(true);
            setErrorPeriods(null);
            try {
                const data = await ApiService.getLformPeriods(selectedCompany, selectedValues.lform);
                setPeriods(data || []);
                // Reset period and reportType selection when form changes
                setSelectedValues(prev => ({ ...prev, period: '', reportType: '' }));
            } catch (err) {
                console.error('Error fetching periods:', err);
                setErrorPeriods('Failed to load periods. Please try again.');
                setPeriods([]);
            } finally {
                setLoadingPeriods(false);
                fetchingPeriodsRef.current = false;
            }
        };

        fetchPeriods();
    }, [selectedCompany, selectedValues.lform]);

    // Fetch report types when company, lform, and period are selected
    useEffect(() => {
        if (fetchingReportTypesRef.current) return;
        
        const fetchReportTypes = async () => {
            if (!selectedCompany || !selectedValues.lform || !selectedValues.period) {
                setReportTypes([]);
                setSelectedValues(prev => {
                    if (prev.reportType === '') {
                        return prev; // No change needed
                    }
                    return { ...prev, reportType: '' };
                });
                return;
            }

            fetchingReportTypesRef.current = true;
            setLoadingReportTypes(true);
            setErrorReportTypes(null);
            try {
                const data = await ApiService.getLformReportTypes(selectedCompany, selectedValues.lform, selectedValues.period);
                setReportTypes(data || []);
                // Reset reportType selection when period changes
                setSelectedValues(prev => ({ ...prev, reportType: '' }));
            } catch (err) {
                console.error('Error fetching report types:', err);
                setErrorReportTypes('Failed to load report types. Please try again.');
                setReportTypes([]);
            } finally {
                setLoadingReportTypes(false);
                fetchingReportTypesRef.current = false;
            }
        };

        fetchReportTypes();
    }, [selectedCompany, selectedValues.lform, selectedValues.period]);

    // Fetch report data when all selections are made
    // Only fetch if report type is selected (when report types are available)
    // Or if no report types are available, fetch without report type
    useEffect(() => {
        // Early returns to prevent unnecessary calls
        if (!selectedCompany || !selectedValues.lform || !selectedValues.period) {
            setReportData([]);
            lastDataRequestRef.current = '';
            return;
        }

        // If report types are still loading, wait
        if (loadingReportTypes) {
            return;
        }

        // If report types exist and user hasn't selected one, don't fetch data
        if (reportTypes.length > 0 && !selectedValues.reportType) {
            setReportData([]);
            lastDataRequestRef.current = '';
            return;
        }

        // Create a unique key for this request to prevent duplicates
        const requestKey = `${selectedCompany}-${selectedValues.lform}-${selectedValues.period}-${selectedValues.reportType || 'null'}`;
        
        // If this is the same request as the last one, skip it
        if (lastDataRequestRef.current === requestKey) {
            return;
        }
        
        // If already fetching, skip
        if (fetchingDataRef.current) {
            return;
        }
        
        lastDataRequestRef.current = requestKey;
        fetchingDataRef.current = true;
        
        const fetchData = async () => {
            setLoadingData(true);
            setErrorData(null);
            try {
                console.log('📊 Fetching report data with:', {
                    company: selectedCompany,
                    form_no: selectedValues.lform,
                    period: selectedValues.period,
                    report_type: selectedValues.reportType || null
                });
                
                const data = await ApiService.getLformData(
                    selectedCompany, 
                    selectedValues.lform, 
                    selectedValues.period,
                    selectedValues.reportType || null
                );
                
                console.log('✅ Report data received:', data?.length || 0, 'rows');
                setReportData(data || []);
                setErrorData(null); // Clear any previous errors
            } catch (err) {
                console.error('❌ Error fetching report data:', err);
                console.error('Error details:', {
                    company: selectedCompany,
                    form_no: selectedValues.lform,
                    period: selectedValues.period,
                    report_type: selectedValues.reportType || null,
                    error: err.message
                });
                // Show the specific error message from the API
                setErrorData(err.message || 'Failed to load report data. Please try again.');
                setReportData([]);
            } finally {
                setLoadingData(false);
                fetchingDataRef.current = false;
            }
        };

        fetchData();
    }, [selectedCompany, selectedValues.lform, selectedValues.period, selectedValues.reportType, reportTypes, loadingReportTypes]);


    return (
        <div className="lform-page">
            <div className="page-header">
                <button
                    onClick={() => {
                        if (onMenuClick) {
                            onMenuClick();
                        }
                    }}
                    className="hamburger-button"
                >
                    ☰
                </button>
                <h1>L-Form Data Selection</h1>
            </div>

            <div className="main-content-wrapper">
                <div className="content-layout">
                    {/* Left Sidebar */}
                    <div className="sidebar-container">
                        <CompanyInformationSidebar />
                    </div>

                    {/* Main Content Area */}
                    <div className="main-content-area">
                        {/* Navigation Tabs */}
                        <div className="navigation-tabs-container">
                            <div className="navigation-tabs">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabClick(tab)}
                                        className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Insurer Name Dropdown */}
                        <div className="insurer-section">
                            <div className="insurer-dropdown-wrapper">
                                <label className="insurer-label">Insurer Name</label>
                                <select
                                    value={selectedCompany || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSelectedCompany(value);
                                    }}
                                    className="insurer-select"
                                    disabled={loadingCompanies}
                                >
                                    <option value="">
                                        {loadingCompanies ? 'Loading companies...' : 'Select Insurer...'}
                                    </option>
                                    {companies.map((company, index) => (
                                        <option key={index} value={company}>
                                            {company}
                                        </option>
                                    ))}
                                </select>
                                {errorCompanies && (
                                    <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {errorCompanies}
                                    </small>
                                )}
                            </div>
                        </div>

                        {/* Filters Section */}
                        <div className="filters-section">
                            {/* Select L Form Dropdown */}
                            <div className="filter-group">
                                <label>Select L Form</label>
                                <select 
                                    value={selectedValues.lform} 
                                    onChange={(e) => handleSelection('lform', e.target.value)}
                                    className="filter-select"
                                    disabled={!selectedCompany || loadingLforms}
                                >
                                    <option value="">
                                        {!selectedCompany 
                                            ? 'Select a company first' 
                                            : loadingLforms 
                                            ? 'Loading forms...' 
                                            : 'Select L Form...'}
                                    </option>
                                    {lforms.map((form, index) => (
                                        <option key={index} value={form}>{form}</option>
                                    ))}
                                </select>
                                {errorLforms && (
                                    <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {errorLforms}
                                    </small>
                                )}
                            </div>

                            {/* Select Period Dropdown */}
                            <div className="filter-group">
                                <label>Select Period</label>
                                <select 
                                    value={selectedValues.period} 
                                    onChange={(e) => handleSelection('period', e.target.value)}
                                    className="filter-select"
                                    disabled={!selectedCompany || !selectedValues.lform || loadingPeriods}
                                >
                                    <option value="">
                                        {!selectedCompany 
                                            ? 'Select a company first' 
                                            : !selectedValues.lform
                                            ? 'Select an L-Form first'
                                            : loadingPeriods 
                                            ? 'Loading periods...' 
                                            : 'Select Period...'}
                                    </option>
                                    {periods.map((period, index) => (
                                        <option key={index} value={period}>{period}</option>
                                    ))}
                                </select>
                                {errorPeriods && (
                                    <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {errorPeriods}
                                    </small>
                                )}
                            </div>

                            {/* Select Report Type Dropdown */}
                            <div className="filter-group">
                                <label>Select Report Type</label>
                                <select 
                                    value={selectedValues.reportType} 
                                    onChange={(e) => handleSelection('reportType', e.target.value)}
                                    className="filter-select"
                                    disabled={!selectedCompany || !selectedValues.lform || !selectedValues.period || loadingReportTypes}
                                >
                                    <option value="">
                                        {!selectedCompany 
                                            ? 'Select a company first' 
                                            : !selectedValues.lform
                                            ? 'Select an L-Form first'
                                            : !selectedValues.period
                                            ? 'Select a period first'
                                            : loadingReportTypes 
                                            ? 'Loading report types...' 
                                            : 'Select...'}
                                    </option>
                                    {reportTypes.map((reportType, index) => (
                                        <option key={index} value={reportType}>{reportType}</option>
                                    ))}
                                </select>
                                {errorReportTypes && (
                                    <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {errorReportTypes}
                                    </small>
                                )}
                            </div>
                        </div>

                        {/* Data Display Section */}
                        {loadingData && (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px', 
                                color: '#666',
                                fontSize: '16px'
                            }}>
                                Loading data...
                            </div>
                        )}

                        {errorData && (
                            <div className="warning-message" style={{ backgroundColor: '#f8d7da', borderColor: '#f5c6cb' }}>
                                <h3 style={{ color: '#721c24' }}>Error Loading Data</h3>
                                <p style={{ color: '#721c24' }}>{errorData}</p>
                            </div>
                        )}
                        
                        {!loadingData && !errorData && reportData.length === 0 && 
                         selectedCompany && selectedValues.lform && selectedValues.period && 
                         (!reportTypes.length || selectedValues.reportType) && (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: 'clamp(30px, 6vw, 50px)', 
                                color: '#666',
                                fontSize: 'clamp(14px, 2.5vw, 16px)',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #dee2e6',
                                marginTop: 'clamp(20px, 4vw, 30px)'
                            }}>
                                <p style={{ margin: 0, fontWeight: '500' }}>
                                    No data available for the selected criteria.
                                </p>
                                <p style={{ margin: '10px 0 0 0', fontSize: 'clamp(12px, 2vw, 14px)', color: '#999' }}>
                                    Please try selecting different Company, L-Form, Period, or Report Type.
                                </p>
                            </div>
                        )}

                        {!loadingData && !errorData && reportData.length > 0 && (
                            <div className="data-display-section">
                                <h2 style={{ 
                                    fontSize: 'clamp(18px, 3.5vw, 22px)',
                                    marginBottom: 'clamp(15px, 3vw, 20px)',
                                    color: '#333',
                                    textAlign: 'center',
                                    fontWeight: '600'
                                }}>
                                    {selectedCompany} - {selectedValues.lform}
                                    {selectedValues.period && ` - ${selectedValues.period}`}
                                    {selectedValues.reportType && ` (${selectedValues.reportType})`}
                                </h2>
                                
                                <div className="table-container">
                                    <table className="lform-table">
                                        <thead>
                                            <tr>
                                                {Object.keys(reportData[0] || {}).map((header, index) => (
                                                    <th key={index} style={{ 
                                                        textAlign: index === 0 ? 'left' : 'center',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {Object.values(row).map((cell, cellIndex) => (
                                                        <td 
                                                            key={cellIndex}
                                                            style={{ 
                                                                textAlign: cellIndex === 0 ? 'left' : 'right',
                                                                fontWeight: cellIndex === 0 && (row[Object.keys(row)[0]]?.toString().toUpperCase().includes('TOTAL') || 
                                                                                                    row[Object.keys(row)[0]]?.toString().toUpperCase().includes('SUBTOTAL')) ? '600' : '400'
                                                            }}
                                                        >
                                                            {cell !== null && cell !== undefined ? String(cell) : '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!loadingData && !errorData && reportData.length === 0 && 
                         selectedCompany && selectedValues.lform && selectedValues.period && 
                         reportTypes.length > 0 && !selectedValues.reportType && (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: 'clamp(30px, 6vw, 50px)', 
                                color: '#666',
                                fontSize: 'clamp(14px, 2.5vw, 16px)',
                                backgroundColor: '#fff3cd',
                                borderRadius: '8px',
                                border: '1px solid #ffeaa7',
                                marginTop: 'clamp(20px, 4vw, 30px)'
                            }}>
                                <p style={{ margin: 0, fontWeight: '500' }}>
                                    Please select a Report Type to view the data.
                                </p>
                            </div>
                        )}

                        {/* Old hardcoded L-2 table - removed, using dynamic data display above */}
                        {false && selectedValues.lform === 'L-2_Profit And Loss Account - L-2-A-Pl' && 
                         selectedValues.period && 
                         selectedValues.reportType && (
                            <div className="data-display-section">
                                <h2>
                                    Condensed {selectedValues.reportType} Profit & Loss Account for the quarter ended {selectedValues.period}<br />
                                    Shareholders' Account (Non-technical Account)
                                </h2>
                                
                                <div className="table-container">
                                    <table className="lform-table">
                                        <thead>
                                            <tr>
                                                <th>Particulars</th>
                                                <th style={{ textAlign: 'center' }}>Schedule Ref. Form No.</th>
                                                <th style={{ textAlign: 'center' }}>Quarter ended {selectedValues.period}</th>
                                                <th style={{ textAlign: 'center' }}>Quarter ended {selectedValues.period === 'Jun 24' ? 'Jun 23' : 'Previous Period'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: '600' }}>
                                                    Amounts transferred from the Policyholders Account (Technical Account)
                                                </td>
                                                <td style={{ textAlign: 'center' }}>-</td>
                                                <td style={{ textAlign: 'right' }}>37,960</td>
                                                <td style={{ textAlign: 'right' }}>29,600</td>
                                            </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                                Income From Investments
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (a) Interest, Dividends & Rent – Gross
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>15,756</td>
                                            <td style={{ textAlign: 'right'  }}>17,963</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (b) Profit on sale/redemption of investments
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>17,903</td>
                                            <td style={{ textAlign: 'right'  }}>1</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (c) (Loss on sale/redemption of investments)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>(9)</td>
                                            <td style={{ textAlign: 'right'  }}>(383)</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (d) Amortisation of Premium/Discount on Investments (Net)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>(383)</td>
                                            <td style={{ textAlign: 'right'  }}>(387)</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                Other Income
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>567</td>
                                            <td style={{ textAlign: 'right'  }}>300</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ fontWeight: '600'  }}>
                                                <strong>Total (A)</strong>
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>71,794</strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>47,477</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Expense other than those directly related to the insurance business
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>L-6A</td>
                                            <td style={{ textAlign: 'right'  }}>804</td>
                                            <td style={{ textAlign: 'right'  }}>399</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Contribution to Policyholders' A/c
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (a) Towards Excess Expenses of Management
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>44,564</td>
                                            <td style={{ textAlign: 'right'  }}>29,212</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (b) towards deficit funding and others
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>132</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Managerial Remuneration*
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>2,049</td>
                                            <td style={{ textAlign: 'right'  }}>2,049</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Interest on subordinated debt
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>47</td>
                                            <td style={{ textAlign: 'right'  }}>3</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Expenses towards CSR activities
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Penalties
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Bad debts written off
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Amount Transferred to Policyholders' Account
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Provisions (Other than taxation)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (a) For diminution in the value of investments (Net)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>3,587</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (b) Provision for doubtful debts
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (c) Others
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ fontWeight: '600'  }}>
                                                <strong>Total (B)</strong>
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>51,051</strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>31,795</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Profit/ (Loss) before tax
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>20,743</td>
                                            <td style={{ textAlign: 'right'  }}>15,682</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Provision for Taxation
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (a) Current tax credit/(charge)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>(158)</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (b) Deferred tax credit/(charge)
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>34</td>
                                            <td style={{ textAlign: 'right'  }}>(26)</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ fontWeight: '600'  }}>
                                                <strong>Profit/(Loss) after tax</strong>
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>20,619</strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>15,656</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '600'  }}>
                                                Appropriations
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (a) Balance at the beginning of the period
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>480,695</td>
                                            <td style={{ textAlign: 'right'  }}>407,252</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (b) Interim dividend paid
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (c) Final dividend paid
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>7,906</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px'  }}>
                                                (d) Transfer to reserves/other accounts
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                            <td style={{ textAlign: 'right'  }}>-</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ fontWeight: '600'  }}>
                                                <strong>Profit/Loss carried forward to Balance Sheet</strong>
                                            </td>
                                            <td style={{ textAlign: 'center'  }}>-</td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>501,314</strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '600'  }}>
                                                <strong>415,002</strong>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                                <div className="table-footer">
                                    <p><strong>Units:</strong> (₹ Lakhs)</p>
                                    <p><strong>*</strong> in excess of the allowable limits as prescribed by IRDAI</p>
                                    <p>The Schedules referred to herein form an integral part of the Condensed Consolidated Profit and Loss Account.</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default Lform
