import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiPremiumWise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [premiumTypeSelection, setPremiumTypeSelection] = useState('Individual Single Premium');

    // Mock Options
    const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual'];
    const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24'];
    const premiumTypes = ['Individual Single Premium', 'Group Non-Single', 'Group Yearly'];

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Table Data for Premium Wise
    const premiumTableData = [
        { category: 'First Year Premium', unit: 'In Crs', period: 'Dec 24', value: '123.11' },
        { category: 'Sum Assured', unit: 'In Crs', period: 'Dec 24', value: '123.11' },
        { category: 'No. of lives covered under Group Schemes', unit: 'In Nos', period: 'Dec 24', value: '123.11' },
        { category: 'No of Policies / Schemes', unit: 'In Nos', period: 'Dec 24', value: '123.11' },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Data Summary of ${premiumTypeSelection} > ${selectedPeriod}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Premium Type</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
                            value={premiumTypeSelection}
                            onChange={(e) => setPremiumTypeSelection(e.target.value)}
                        >
                            {premiumTypes.map(name => (
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
                        <div className="chart-placeholder" style={{ flex: '2', minHeight: '300px' }}>Treemap Visualization Placeholder</div>
                    </div>
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper">
                        <table className="irdai-data-table">
                            <thead>
                                <tr>
                                    <th colSpan="4" style={{ borderBottom: 'none', color: '#333' }}>MONTHLY DATA BASED ON PREMIUM TYPE</th>
                                    <th style={{ borderBottom: 'none', color: '#333' }}>Premium Type Long Name</th>
                                </tr>
                                <tr>
                                    <th>Category Long Name</th>
                                    <th>Units</th>
                                    <th>Period</th>
                                    <th>{premiumTypeSelection}<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {premiumTableData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.category}</td>
                                        <td>{row.unit}</td>
                                        <td>{row.period}</td>
                                        <td style={{ textAlign: 'right' }}>{row.value}</td>
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

export default IrdaiPremiumWise;
