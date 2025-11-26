import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiService from '../services/api'
import CompanyInformationSidebar from '../components/CompanyInformationSidebar'
import { useNavigation } from '../context/NavigationContext'

function Lform({ onMenuClick }) {
    const navigate = useNavigate();
    const { isNavItemActive } = useNavigation();
    const [selectedValues, setSelectedValues] = useState({
        lform: '',
        period: '',
        reportType: ''
    });
    const [selectedCompany, setSelectedCompany] = useState('');

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


    return (
        <div className="lform-page" style={{
            padding: 'clamp(10px, 3vw, 20px)',
            minHeight: '100vh',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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

            {/* Insurer Name Dropdown - Aligned with other dropdowns */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
                padding: window.innerWidth <= 768 ? '0 0.5rem' : '0 1rem'
            }}>
                <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    minWidth: '200px'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        marginBottom: '8px',
                        color: '#6c757d',
                        fontWeight: '600'
                    }}>Insurer Name</h3>
                    <select
                        value={selectedCompany || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedCompany(value);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            border: '2px solid #28a745',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                            color: '#333',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="">Select Insurer...</option>
                        <option value="hdfc">HDFC Life</option>
                        <option value="sbi">SBI Life</option>
                        <option value="icici">ICICI Prudential</option>
                        <option value="lic">LIC</option>
                        <option value="bajaj">Bajaj Allianz</option>
                    </select>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="navigation-tabs-container" style={{
                marginBottom: 'clamp(15px, 3vw, 20px)',
                padding: '0 clamp(10px, 3vw, 20px)'
            }}>
                <div className="navigation-tabs" style={{
                    display: 'flex',
                    gap: tabs.length <= 3 ? 'clamp(15px, 3vw, 20px)' : 'clamp(8px, 2vw, 12px)',
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'visible',
                    paddingBottom: '5px',
                    justifyContent: tabs.length <= 3 ? 'center' : 'flex-start'
                }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabClick(tab)}
                            className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'}`}
                            style={{
                                padding: tabs.length <= 3 ? 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 18px)' : 'clamp(6px, 2vw, 8px) clamp(10px, 2vw, 12px)',
                                fontSize: tabs.length <= 3 ? 'clamp(13px, 2.5vw, 15px)' : 'clamp(12px, 2.5vw, 13px)',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: isNavItemActive(tab) ? 'var(--main-color)' : 'transparent',
                                color: isNavItemActive(tab) ? 'white' : '#666',
                                fontWeight: isNavItemActive(tab) ? '600' : '400',
                                cursor: isNavItemActive(tab) ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: tabs.length <= 3 ? '36px' : '32px',
                                opacity: isNavItemActive(tab) ? 1 : 0.5
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Main Content Area with Sidebar */}
            <div style={{
                display: 'flex',
                gap: 'clamp(10px, 2vw, 15px)',
                padding: '0 clamp(10px, 3vw, 20px)',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
                {/* Left Sidebar - Company Information */}
                <div style={{
                    flex: '0 0 clamp(200px, 25vw, 220px)',
                    minWidth: '200px',
                    maxWidth: '220px'
                }}>
                    <CompanyInformationSidebar />
                </div>

                {/* Right Content Area */}
                <div style={{ 
                    flex: '1', 
                    minWidth: 0,
                    paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)'
                }}>
                    {/* Dropdowns Section */}
                    <div style={{
                        display: 'flex',
                        gap: 'clamp(15px, 3vw, 25px)',
                        marginBottom: '30px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start'
                    }}>
                        {/* Select L Form Dropdown */}
                        <div style={{
                            minWidth: '280px',
                            flex: '1',
                            maxWidth: '400px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                marginBottom: '8px',
                                color: '#007bff',
                                fontWeight: '600'
                            }}>Select L Form</h3>
                            <select 
                                value={selectedValues.lform} 
                                onChange={(e) => handleSelection('lform', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #28a745',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Select L Form...</option>
                                {lformOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        {/* Select Period Dropdown */}
                        <div style={{
                            minWidth: '200px',
                            flex: '1',
                            maxWidth: '300px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                marginBottom: '8px',
                                color: '#6c757d',
                                fontWeight: '600'
                            }}>Select Period</h3>
                            <select 
                                value={selectedValues.period} 
                                onChange={(e) => handleSelection('period', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #28a745',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Select Period...</option>
                                {periodOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        {/* Select Report Type Dropdown */}
                        <div style={{
                            minWidth: '200px',
                            flex: '1',
                            maxWidth: '300px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                marginBottom: '8px',
                                color: '#6c757d',
                                fontWeight: '600'
                            }}>Select Report Type</h3>
                            <select 
                                value={selectedValues.reportType} 
                                onChange={(e) => handleSelection('reportType', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #28a745',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Select...</option>
                                {reportTypeOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Message when L-2 is selected but Period or Report Type is missing */}
                    {selectedValues.lform === 'L-2_Profit And Loss Account - L-2-A-Pl' && 
                     (!selectedValues.period || !selectedValues.reportType) && (
                    <div style={{
                        marginTop: '30px',
                            padding: '20px',
                            backgroundColor: '#fff3cd',
                        borderRadius: '8px',
                            border: '1px solid #ffeaa7',
                            textAlign: 'center'
                    }}>
                        <h3 style={{
                                fontSize: '18px',
                                marginBottom: '10px',
                                color: '#856404'
                            }}>Please Select Period and Report Type</h3>
                            <p style={{
                                fontSize: '14px',
                                color: '#856404',
                                margin: 0
                            }}>
                                To view the L-2 Profit and Loss Account data, please select both the Period and Report Type (Consolidated/Standalone) from the dropdowns above.
                            </p>
                        </div>
                    )}

                    {/* L-2 Profit and Loss Account Data Display */}
                    {selectedValues.lform === 'L-2_Profit And Loss Account - L-2-A-Pl' && 
                     selectedValues.period && 
                     selectedValues.reportType && (
                        <div style={{
                            marginTop: '30px',
                            padding: '20px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                marginBottom: '20px',
                                color: '#333',
                                textAlign: 'center'
                            }}>
                                Condensed {selectedValues.reportType} Profit & Loss Account for the quarter ended {selectedValues.period}<br />
                                Shareholders' Account (Non-technical Account)
                            </h2>
                            
                            <div style={{
                                overflowX: 'auto',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    borderSpacing: '0',
                                    fontSize: '14px',
                                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    tableLayout: 'auto'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <th style={{
                                                padding: '12px',
                                                textAlign: 'left',
                                                border: '1px solid #ddd',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                            }}>Particulars</th>
                                            <th style={{
                                                padding: '12px',
                                                textAlign: 'center',
                                                border: '1px solid #ddd',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                            }}>Schedule Ref. Form No.</th>
                                            <th style={{
                                                padding: '12px',
                                                textAlign: 'center',
                                                border: '1px solid #ddd',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                            }}>Quarter ended {selectedValues.period}</th>
                                            <th style={{
                                                padding: '12px',
                                                textAlign: 'center',
                                                border: '1px solid #ddd',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                            }}>Quarter ended {selectedValues.period === 'Jun 24' ? 'Jun 23' : 'Previous Period'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                                Amounts transferred from the Policyholders Account (Technical Account)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>37,960</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>29,600</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '600', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                                Income From Investments
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (a) Interest, Dividends & Rent – Gross
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>15,756</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>17,963</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (b) Profit on sale/redemption of investments
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>17,903</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>1</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (c) (Loss on sale/redemption of investments)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(9)</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(383)</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (d) Amortisation of Premium/Discount on Investments (Net)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(383)</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(387)</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                Other Income
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>567</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>300</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                <strong>Total (A)</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>71,794</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>47,477</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Expense other than those directly related to the insurance business
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>L-6A</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>804</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>399</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Contribution to Policyholders' A/c
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (a) Towards Excess Expenses of Management
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>44,564</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>29,212</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (b) towards deficit funding and others
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>132</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Managerial Remuneration*
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>2,049</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>2,049</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Interest on subordinated debt
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>47</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>3</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Expenses towards CSR activities
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Penalties
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Bad debts written off
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Amount Transferred to Policyholders' Account
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Provisions (Other than taxation)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (a) For diminution in the value of investments (Net)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>3,587</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (b) Provision for doubtful debts
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (c) Others
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                <strong>Total (B)</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>51,051</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>31,795</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Profit/ (Loss) before tax
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>20,743</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>15,682</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Provision for Taxation
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (a) Current tax credit/(charge)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(158)</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (b) Deferred tax credit/(charge)
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>34</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>(26)</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                <strong>Profit/(Loss) after tax</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>20,619</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>15,656</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                Appropriations
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (a) Balance at the beginning of the period
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>480,695</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>407,252</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (b) Interim dividend paid
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (c) Final dividend paid
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>7,906</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingLeft: '20px' }}>
                                                (d) Transfer to reserves/other accounts
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right' }}>-</td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '600' }}>
                                                <strong>Profit/Loss carried forward to Balance Sheet</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'center' }}>-</td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>501,314</strong>
                                            </td>
                                            <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', textAlign: 'right', fontWeight: '600' }}>
                                                <strong>415,002</strong>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{
                                marginTop: '20px',
                                fontSize: '12px',
                                color: '#666'
                            }}>
                                <p><strong>Units:</strong> (₹ Lakhs)</p>
                                <p><strong>*</strong> in excess of the allowable limits as prescribed by IRDAI</p>
                                <p>The Schedules referred to herein form an integral part of the Condensed Consolidated Profit and Loss Account.</p>
                            </div>
                        </div>
                    )}

                    {/* Selected Values Display for other forms */}
                    {(selectedValues.lform && selectedValues.lform !== 'L-2_Profit And Loss Account - L-2-A-Pl') && (
                            <div style={{
                            marginTop: '30px',
                            padding: '20px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                        }}>
                            <h3 style={{
                                fontSize: '18px',
                                marginBottom: '15px',
                                color: '#333'
                            }}>Selected Values:</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '15px'
                            }}>
                                <div style={{ fontSize: '14px' }}>
                                    <strong>L Form:</strong><br />
                                    {selectedValues.lform || 'Not selected'}
                                </div>
                                <div style={{ fontSize: '14px' }}>
                                <strong>Period:</strong><br />
                                    {selectedValues.period || 'Not selected'}
                                </div>
                                <div style={{ fontSize: '14px' }}>
                                    <strong>Report Type:</strong><br />
                                    {selectedValues.reportType || 'Not selected'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Lform
