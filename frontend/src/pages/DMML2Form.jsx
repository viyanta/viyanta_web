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
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
            {/* Header with Hamburger Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <button
                    onClick={onMenuClick}
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
                <h1 style={{ margin: 0, color: 'var(--main-color)' }}>Data Management Module (DMM)</h1>
            </div>

            {/* Breadcrumb Navigation */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>L Forms</span>
                <span style={{ color: '#666', fontWeight: '400' }}> &gt; </span>
                <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{formData.company}</span>
                <span style={{ color: '#666', fontWeight: '400' }}> &gt; </span>
                <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{formData.formType}</span>
                <span style={{ color: '#666', fontWeight: '400' }}> &gt; </span>
                <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{formData.reportType}</span>
                <span style={{ color: '#666', fontWeight: '400' }}> &gt; </span>
                <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{formData.period}</span>
            </div>

            {/* Main Content with Sidebar */}
            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Company Information Sidebar */}
                <CompanyInformationSidebar />

                {/* Main Content Area */}
                <div style={{ 
                    flex: '1',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {/* Period Details */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Reporting Period Details</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {/* AsIsReported PeriodDetail */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
                                    AsIsReported PeriodDetail:
                                </h4>
                                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                    <div><strong>Reported PeriodType:</strong> {formData.periodDetails.asIsReported.periodType}</div>
                                    <div><strong>Reported PeriodDetail:</strong> {formData.periodDetails.asIsReported.periodDetail}</div>
                                    <div><strong>Reported PeriodNumberOfMonths:</strong> {formData.periodDetails.asIsReported.numberOfMonths}</div>
                                </div>
                            </div>

                            {/* ConsolidateStandalone Marking */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
                                    ConsolidateStandalone Marking:
                                </h4>
                                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                    <div><strong>{formData.periodDetails.consolidateStandalone.standalone}</strong></div>
                                    <div><strong>Reported PeriodTypeMarking:</strong> {formData.periodDetails.consolidateStandalone.periodTypeMarking}</div>
                                    <div><strong>Reported HalfyearlyMarking:</strong> {formData.periodDetails.consolidateStandalone.halfyearlyMarking}</div>
                                    <div><strong>Reported PeriodEnd:</strong> {formData.periodDetails.consolidateStandalone.periodEnd}</div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
                                    Period Information:
                                </h4>
                                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
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
                        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
                            {formData.profitLossAccount.title}
                        </h3>
                        
                        <div style={{
                            overflowX: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '14px'
                            }}>
                                <thead style={{
                                    backgroundColor: '#f8f9fa',
                                    borderBottom: '2px solid #dee2e6'
                                }}>
                                    <tr>
                                        {formData.profitLossAccount.columns.map((header, index) => (
                                            <th key={index} style={{
                                                padding: '12px 15px',
                                                textAlign: 'left',
                                                fontWeight: '600',
                                                color: '#495057',
                                                borderBottom: '2px solid #dee2e6'
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
                                                padding: '12px 15px',
                                                borderRight: '1px solid #dee2e6',
                                                fontWeight: row.particulars.includes('Total') || row.particulars.includes('Income from Investments') ? '600' : 'normal',
                                                color: row.particulars.includes('Total') ? '#1976d2' : '#333'
                                            }}>
                                                {row.particulars}
                                            </td>
                                            <td style={{
                                                padding: '12px 15px',
                                                borderRight: '1px solid #dee2e6',
                                                textAlign: 'center'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={row.units}
                                                    onChange={(e) => handleInputChange(rowIndex, 'units', e.target.value)}
                                                    style={{
                                                        width: '80px',
                                                        padding: '4px 8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        textAlign: 'center'
                                                    }}
                                                    placeholder="Units"
                                                />
                                            </td>
                                            <td style={{
                                                padding: '12px 15px',
                                                textAlign: 'right'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={row.jun24}
                                                    onChange={(e) => handleInputChange(rowIndex, 'jun24', e.target.value)}
                                                    style={{
                                                        width: '120px',
                                                        padding: '4px 8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        textAlign: 'right',
                                                        fontWeight: row.particulars.includes('Total') ? '600' : 'normal',
                                                        color: row.particulars.includes('Total') ? '#1976d2' : '#333'
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
                    flex: '0 0 250px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    height: 'fit-content'
                }}>
                    <h3 style={{ 
                        margin: '0 0 20px 0', 
                        color: '#333',
                        borderBottom: '2px solid #1976d2',
                        paddingBottom: '10px'
                    }}>
                        Actions
                    </h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleSaveData}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '10px',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Saving...' : '💾 Save Data'}
                        </button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleMigrateData}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Migrating...' : '🚀 Migrate Data'}
                        </button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
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
                                padding: '12px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '10px'
                            }}
                        >
                            📁 Import JSON
                        </button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleExportData}
                            disabled={!formData}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#fd7e14',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: formData ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: '500',
                                opacity: formData ? 1 : 0.7
                            }}
                        >
                            📤 Export JSON
                        </button>
                    </div>

                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                        fontSize: '12px',
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