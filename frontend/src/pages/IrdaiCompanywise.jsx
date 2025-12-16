import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiCompanywise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [insurerName, setInsurerName] = useState('Acko Life');

    // Mock Options
    const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual'];
    const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24'];
    const insurerNames = ['Acko Life', 'SBI Life', 'HDFC Life', 'LIC'];

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Table Data (Same as Dashboard for now as per original file)
    const tableData = [
        { category: 'First Year Premium', unit: 'In Crs', period: 'Dec 24', groupNonSingle: '123.11', indSingle: '123.11', indNonSingle: '123.11', groupYearly: '123.11', groupSingle: '123.11' },
        { category: 'Sum Assured', unit: 'In Crs', period: 'Dec 24', groupNonSingle: '123.11', indSingle: '123.11', indNonSingle: '123.11', groupYearly: '123.11', groupSingle: '123.11' },
        { category: 'No. of lives covered under Group Schemes', unit: 'In Nos', period: 'Dec 24', groupNonSingle: '123.11', indSingle: '123.11', indNonSingle: '123.11', groupYearly: '123.11', groupSingle: '123.11' },
        { category: 'No of Policies / Schemes', unit: 'In Nos', period: 'Dec 24', groupNonSingle: '123.11', indSingle: '123.11', indNonSingle: '123.11', groupYearly: '123.11', groupSingle: '123.11' },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Data Summary of ${insurerName} > ${selectedPeriod}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Insurer Name</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
                            value={insurerName}
                            onChange={(e) => setInsurerName(e.target.value)}
                        >
                            {insurerNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period</label>
                        <select
                            className="custom-select"
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value)}
                        >
                            {periodTypes.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period</label>
                        <select
                            className="custom-select"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {periods.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </>
            }
        >
            {viewMode === 'visuals' ? (
                <div className="visuals-view">
                    <div className="kpi-grid">
                        {kpiData.map((kpi, idx) => (
                            <div key={idx} className={`kpi-card ${kpi.color}`}>
                                <span className="kpi-unit">{kpi.unit}</span>
                                <h3 className="kpi-title">{kpi.title}</h3>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row">
                        <div className="chart-placeholder">Treemap Placeholder</div>
                        <div className="chart-placeholder" style={{ borderRadius: '50%' }}>Pie Chart Placeholder</div>
                        <div className="chart-placeholder">Vertical Bar Chart Placeholder</div>
                        <div className="chart-placeholder">Vertical Bar Chart Placeholder</div>
                    </div>
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper">
                        <table className="irdai-data-table">
                            <thead>
                                <tr>
                                    <th colSpan="8" style={{ borderBottom: 'none' }}>MONTHLY DATA BASED ON PREMIUM TYPE</th>
                                </tr>
                                <tr>
                                    <th rowSpan="2">Category Long Name</th>
                                    <th rowSpan="2">Units</th>
                                    <th rowSpan="2">Period</th>
                                    <th colSpan="5" style={{ textAlign: 'center', backgroundColor: '#f0f0f0' }}>Premium Type Long Name</th>
                                </tr>
                                <tr>
                                    <th>Group Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Individual Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Individual Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Group Yearly<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Renewable Premium</span></th>
                                    <th>Group Single Premium<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.category}</td>
                                        <td>{row.unit}</td>
                                        <td>{row.period}</td>
                                        <td>{row.groupNonSingle}</td>
                                        <td>{row.indSingle}</td>
                                        <td>{row.indNonSingle}</td>
                                        <td>{row.groupYearly}</td>
                                        <td>{row.groupSingle}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiCompanywise;
