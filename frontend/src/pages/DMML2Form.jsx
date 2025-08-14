import React, { useState, useEffect, useRef } from 'react';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';

function DMML2Form({ onMenuClick }) {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);

    // Sample JSON data structure that matches the UI
    const sampleData = {
        company: "HDFC Life Insurance Company Limited",
        formType: "L-2 Profit and Loss Account",
        reportType: "Standalone",
        period: "Jun 24",
        breadcrumb: "L Forms > HDFC Life Insurance Company Limited > L-2 Profit and Loss Account > Standalone > Jun 24",
        description: "In the DMM modules, user would be able to retrieve the data, update data, edit and modify data. Save Data and Migrate data",
        periodDetails: {
            asIsReported: {
                periodType: "Quarterly",
                periodDetail: "First Quarter",
                numberOfMonths: 3
            },
            consolidateStandalone: {
                standalone: "Standalone",
                periodTypeMarking: "3M",
                halfyearlyMarking: 1,
                periodEnd: "30-06-2024"
            },
            rightColumn: {
                periodYear: "202406",
                periodShortDate: "Jun-24",
                calendarYear: "2024-2025",
                periodEndDetail: "For the Quarter Ended",
                previousPeriod: "31-03-2024",
                financialYear: "FY2025"
            }
        },
        profitLossAccount: {
            title: "PROFIT AND LOSS ACCOUNT FOR THE NINE MONTHS ENDED DECEMBER 31, 2022",
            columns: ["Particulars", "Units", "Jun-24"],
            rows: [
                {
                    particulars: "Amounts transferred from the Policyholders Account",
                    units: "",
                    jun24: "41,611"
                },
                {
                    particulars: "Income from Investments:",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(a) Interest, Dividend & Rent - Gross",
                    units: "",
                    jun24: "18,790"
                },
                {
                    particulars: "(b) Profit on sale / redemption of investments",
                    units: "",
                    jun24: "5,639"
                },
                {
                    particulars: "(c) (Loss on sale / redemption of investments)",
                    units: "",
                    jun24: "-63"
                },
                {
                    particulars: "(d) Amortisation of Premium / Discount on Investments",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "Investments",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "Other Income",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "Total (A)",
                    units: "",
                    jun24: "65,977"
                },
                {
                    particulars: "Remuneration of KMPs over specified limits",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "Expenses other than those directly related to the insurance:",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(a) Rates and Taxes",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(b) Directors' Sitting Fees",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(c) Board Meeting Related Expenses",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(d) Depreciation",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(e) Other expenses",
                    units: "",
                    jun24: "697"
                },
                {
                    particulars: "Contribution to the Policyholders' A/c:",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(a) Towards Excess Expenses of Management",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "(b) towards deficit funding and others",
                    units: "",
                    jun24: "31,373"
                },
                {
                    particulars: "Managerial Remuneration*",
                    units: "",
                    jun24: ""
                },
                {
                    particulars: "Interest on subordinated debt",
                    units: "",
                    jun24: "1,733"
                },
                {
                    particulars: "Expenses towards CSR activities",
                    units: "",
                    jun24: "522"
                },
                {
                    particulars: "Penalties",
                    units: "",
                    jun24: ""
                }
            ]
        }
    };

    useEffect(() => {
        // Load sample data on component mount
        setFormData(sampleData);
    }, []);

    const handleInputChange = (rowIndex, field, value) => {
        if (!formData) return;
        
        const updatedData = { ...formData };
        updatedData.profitLossAccount.rows[rowIndex][field] = value;
        setFormData(updatedData);
    };

    const handleSaveData = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            alert('Data saved successfully!');
            setLoading(false);
        }, 1000);
    };

    const handleMigrateData = () => {
        setLoading(true);
        // Simulate migration
        setTimeout(() => {
            alert('Data migrated successfully!');
            setLoading(false);
        }, 1000);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    setFormData(jsonData);
                    alert('JSON data imported successfully!');
                } catch (error) {
                    alert('Invalid JSON file. Please check the format.');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleExportData = () => {
        if (!formData) return;
        
        const dataStr = JSON.stringify(formData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dmm-l2form-data.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!formData) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: 'clamp(16px, 4vw, 18px)',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <div style={{ 
            padding: 'clamp(10px, 3vw, 20px)', 
            backgroundColor: 'white', 
            minHeight: '100vh',
            maxWidth: '100vw',
            overflowX: 'hidden'
        }}>
            {/* Header with Hamburger Menu */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'clamp(0.5rem, 2vw, 1rem)', 
                marginBottom: 'clamp(0.8rem, 2vw, 1rem)',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={onMenuClick}
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
                        minHeight: 'clamp(32px, 8vw, 36px)',
                        flexShrink: 0
                    }}
                >
                    ☰
                </button>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                }}>
                    <h1 style={{ 
                        margin: 0, 
                        color: 'var(--main-color)',
                        fontSize: 'clamp(16px, 4vw, 22px)',
                        lineHeight: '1.2'
                    }}>
                        Data Management Module (DMM)
                    </h1>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            <div style={{ 
                textAlign: window.innerWidth <= 768 ? 'left' : 'center', 
                marginBottom: 'clamp(0.8rem, 2vw, 1rem)',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                padding: 'clamp(8px, 2vw, 12px)',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
            }}>
                <span style={{ 
                    color: 'var(--main-color)', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)'
                }}>
                    L Forms
                </span>
                <span style={{ 
                    color: '#666', 
                    fontWeight: '400',
                    margin: '0 clamp(4px, 1vw, 8px)'
                }}> &gt; </span>
                <span style={{ 
                    color: 'var(--main-color)', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)'
                }}>
                    {formData.company}
                </span>
                <span style={{ 
                    color: '#666', 
                    fontWeight: '400',
                    margin: '0 clamp(4px, 1vw, 8px)'
                }}> &gt; </span>
                <span style={{ 
                    color: 'var(--main-color)', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)'
                }}>
                    {formData.formType}
                </span>
                <span style={{ 
                    color: '#666', 
                    fontWeight: '400',
                    margin: '0 clamp(4px, 1vw, 8px)'
                }}> &gt; </span>
                <span style={{ 
                    color: 'var(--main-color)', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)'
                }}>
                    {formData.reportType}
                </span>
                <span style={{ 
                    color: '#666', 
                    fontWeight: '400',
                    margin: '0 clamp(4px, 1vw, 8px)'
                }}> &gt; </span>
                <span style={{ 
                    color: 'var(--main-color)', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)'
                }}>
                    {formData.period}
                </span>
            </div>

            {/* Main Content with Sidebar */}
            <div style={{ 
                display: 'flex', 
                gap: 'clamp(15px, 3vw, 20px)',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
                {/* Company Information Sidebar */}
                <CompanyInformationSidebar />

                {/* Main Content Area */}
                <div style={{ 
                    flex: '1',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: 'clamp(15px, 4vw, 20px)',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    minWidth: 0
                }}>
                    {/* Period Details */}
                    <div style={{ marginBottom: 'clamp(20px, 5vw, 30px)' }}>
                        <h3 style={{ 
                            margin: '0 0 clamp(10px, 3vw, 15px) 0', 
                            color: '#333',
                            fontSize: 'clamp(16px, 4vw, 20px)'
                        }}>
                            Reporting Period Details
                        </h3>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: 'clamp(15px, 3vw, 20px)'
                        }}>
                            {/* AsIsReported PeriodDetail */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 clamp(8px, 2vw, 10px) 0', 
                                    color: '#495057', 
                                    fontSize: 'clamp(13px, 3.5vw, 14px)'
                                }}>
                                    AsIsReported PeriodDetail:
                                </h4>
                                <div style={{ 
                                    fontSize: 'clamp(12px, 3vw, 13px)', 
                                    lineHeight: '1.6' 
                                }}>
                                    <div><strong>Reported PeriodType:</strong> {formData.periodDetails.asIsReported.periodType}</div>
                                    <div><strong>Reported PeriodDetail:</strong> {formData.periodDetails.asIsReported.periodDetail}</div>
                                    <div><strong>Reported PeriodNumberOfMonths:</strong> {formData.periodDetails.asIsReported.numberOfMonths}</div>
                                </div>
                            </div>

                            {/* ConsolidateStandalone Marking */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 clamp(8px, 2vw, 10px) 0', 
                                    color: '#495057', 
                                    fontSize: 'clamp(13px, 3.5vw, 14px)'
                                }}>
                                    ConsolidateStandalone Marking:
                                </h4>
                                <div style={{ 
                                    fontSize: 'clamp(12px, 3vw, 13px)', 
                                    lineHeight: '1.6' 
                                }}>
                                    <div><strong>{formData.periodDetails.consolidateStandalone.standalone}</strong></div>
                                    <div><strong>Reported PeriodTypeMarking:</strong> {formData.periodDetails.consolidateStandalone.periodTypeMarking}</div>
                                    <div><strong>Reported HalfyearlyMarking:</strong> {formData.periodDetails.consolidateStandalone.halfyearlyMarking}</div>
                                    <div><strong>Reported PeriodEnd:</strong> {formData.periodDetails.consolidateStandalone.periodEnd}</div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 clamp(8px, 2vw, 10px) 0', 
                                    color: '#495057', 
                                    fontSize: 'clamp(13px, 3.5vw, 14px)'
                                }}>
                                    Period Information:
                                </h4>
                                <div style={{ 
                                    fontSize: 'clamp(12px, 3vw, 13px)', 
                                    lineHeight: '1.6' 
                                }}>
                                    <div><strong>Reported Period Year:</strong> {formData.periodDetails.rightColumn.periodYear}</div>
                                    <div><strong>Reported PeriodShortDate:</strong> {formData.periodDetails.rightColumn.periodShortDate}</div>
                                    <div><strong>Reported Calendar Year:</strong> {formData.periodDetails.rightColumn.calendarYear}</div>
                                    <div><strong>Reported Period EndDetail:</strong> {formData.periodDetails.rightColumn.periodEndDetail}</div>
                                    <div><strong>Previous Period ForReported DataPeriod:</strong> {formData.periodDetails.rightColumn.previousPeriod}</div>
                                    <div><strong>Reported FinancialYear:</strong> {formData.periodDetails.rightColumn.financialYear}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profit and Loss Account Table */}
                    <div>
                        <h3 style={{ 
                            margin: '0 0 clamp(15px, 4vw, 20px) 0', 
                            color: '#333',
                            fontSize: 'clamp(16px, 4vw, 20px)'
                        }}>
                            {formData.profitLossAccount.title}
                        </h3>
                        
                        <div style={{
                            overflowX: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                            msOverflowStyle: 'none', // Hide scrollbar on IE/Edge
                            scrollbarWidth: 'thin' // Thin scrollbar on Firefox
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: 'clamp(12px, 3vw, 14px)',
                                minWidth: window.innerWidth <= 768 ? '600px' : '100%' // Ensure minimum width on mobile
                            }}>
                                <thead style={{
                                    backgroundColor: '#f8f9fa',
                                    borderBottom: '2px solid #dee2e6',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 10
                                }}>
                                    <tr>
                                        {formData.profitLossAccount.columns.map((header, index) => (
                                            <th key={index} style={{
                                                padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 15px)',
                                                textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right',
                                                fontWeight: '600',
                                                color: '#495057',
                                                borderBottom: '2px solid #dee2e6',
                                                whiteSpace: 'nowrap',
                                                backgroundColor: '#f8f9fa',
                                                minWidth: index === 0 ? '200px' : index === 1 ? '80px' : '120px'
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.profitLossAccount.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{
                                            backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#f8f9fa',
                                            borderBottom: '1px solid #dee2e6'
                                        }}>
                                            <td style={{
                                                padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 15px)',
                                                borderRight: '1px solid #dee2e6',
                                                fontWeight: row.particulars.includes('Total') || row.particulars.includes('Income from Investments') ? '600' : 'normal',
                                                color: row.particulars.includes('Total') ? '#1976d2' : '#333',
                                                wordBreak: 'break-word',
                                                minWidth: '200px',
                                                verticalAlign: 'top'
                                            }}>
                                                <div style={{
                                                    paddingLeft: row.particulars.startsWith('(') ? '20px' : 
                                                               row.particulars.includes('Income from Investments') || 
                                                               row.particulars.includes('Expenses other than') ? '0px' : '10px'
                                                }}>
                                                    {row.particulars}
                                                </div>
                                            </td>
                                            <td style={{
                                                padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 15px)',
                                                borderRight: '1px solid #dee2e6',
                                                textAlign: 'center',
                                                minWidth: '80px',
                                                verticalAlign: 'top'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={row.units}
                                                    onChange={(e) => handleInputChange(rowIndex, 'units', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: 'clamp(60px, 15vw, 80px)',
                                                        padding: 'clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 8px)',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        textAlign: 'center',
                                                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    placeholder="Units"
                                                />
                                            </td>
                                            <td style={{
                                                padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 15px)',
                                                textAlign: 'right',
                                                minWidth: '120px',
                                                verticalAlign: 'top'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={row.jun24}
                                                    onChange={(e) => handleInputChange(rowIndex, 'jun24', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: 'clamp(80px, 20vw, 120px)',
                                                        padding: 'clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 8px)',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        textAlign: 'right',
                                                        fontWeight: row.particulars.includes('Total') ? '600' : 'normal',
                                                        color: row.particulars.includes('Total') ? '#1976d2' : '#333',
                                                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    placeholder="Amount"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                    </div>
                </div>

                {/* Right Panel - Action Buttons */}
                <div style={{ 
                    flex: window.innerWidth <= 768 ? 'none' : '0 0 250px',
                    width: window.innerWidth <= 768 ? '100%' : '250px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: 'clamp(15px, 4vw, 20px)',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    height: 'fit-content',
                    order: window.innerWidth <= 768 ? -1 : 0 // Move actions to top on mobile
                }}>
                    <h3 style={{ 
                        margin: '0 0 clamp(15px, 4vw, 20px) 0', 
                        color: '#333',
                        borderBottom: '2px solid #1976d2',
                        paddingBottom: 'clamp(8px, 2vw, 10px)',
                        fontSize: 'clamp(16px, 4vw, 18px)'
                    }}>
                        Actions
                    </h3>
                    
                    <div style={{ 
                        marginBottom: 'clamp(10px, 3vw, 15px)',
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                        gap: 'clamp(8px, 2vw, 10px)'
                    }}>
                        <button
                            onClick={handleSaveData}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: 'clamp(10px, 2.5vw, 12px)',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: 'clamp(13px, 3vw, 14px)',
                                fontWeight: '500',
                                marginBottom: '0',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Saving...' : '💾 Save Data'}
                        </button>
                    </div>

                    <div style={{ 
                        marginBottom: 'clamp(10px, 3vw, 15px)',
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                        gap: 'clamp(8px, 2vw, 10px)'
                    }}>
                        <button
                            onClick={handleMigrateData}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: 'clamp(10px, 2.5vw, 12px)',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: 'clamp(13px, 3vw, 14px)',
                                fontWeight: '500',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Migrating...' : '🚀 Migrate Data'}
                        </button>
                    </div>

                    <div style={{ 
                        marginBottom: 'clamp(10px, 3vw, 15px)',
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                        gap: 'clamp(8px, 2vw, 10px)'
                    }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                width: '100%',
                                padding: 'clamp(10px, 2.5vw, 12px)',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: 'clamp(13px, 3vw, 14px)',
                                fontWeight: '500',
                                marginBottom: '0'
                            }}
                        >
                            📁 Import JSON
                        </button>
                    </div>

                    <div style={{ 
                        marginBottom: 'clamp(10px, 3vw, 15px)',
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                        gap: 'clamp(8px, 2vw, 10px)'
                    }}>
                        <button
                            onClick={handleExportData}
                            disabled={!formData}
                            style={{
                                width: '100%',
                                padding: 'clamp(10px, 2.5vw, 12px)',
                                backgroundColor: '#fd7e14',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: formData ? 'pointer' : 'not-allowed',
                                fontSize: 'clamp(13px, 3vw, 14px)',
                                fontWeight: '500',
                                opacity: formData ? 1 : 0.7
                            }}
                        >
                            📤 Export JSON
                        </button>
                    </div>

                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: 'clamp(12px, 3vw, 15px)',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                        fontSize: 'clamp(11px, 2.5vw, 12px)',
                        color: '#666'
                    }}>
                        <strong>Data Status:</strong><br />
                        • Last Modified: {new Date().toLocaleDateString()}<br />
                        • Status: Active<br />
                        • Version: 1.0
                        <br /><br />
                        <strong>JSON Import/Export:</strong><br />
                        • Use the sample file: <code>dmm-l2form-sample.json</code><br />
                        • Import your own data<br />
                        • Export modified data
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DMML2Form; 