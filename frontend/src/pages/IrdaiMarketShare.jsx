import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiMarketShare = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [insurerName, setInsurerName] = useState('Acko Life');
    const [premiumTypeSelection, setPremiumTypeSelection] = useState('Individual Single Premium');
    const [expandedInsurers, setExpandedInsurers] = useState({});

    // Toggle Insurer Expansion
    const toggleInsurer = (idx) => {
        setExpandedInsurers(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    // Mock Options
    const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual'];
    const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24'];
    const insurerNames = ['Acko Life', 'SBI Life', 'HDFC Life', 'LIC'];
    const premiumTypes = ['Individual Single Premium', 'Group Non-Single', 'Group Yearly'];

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Market Share Data
    const marketShareData = [
        {
            insurer: 'Acko Life Insurance',
            values: { premium: '0.02', policies: '0.01', lives: '0.25', sum: '0.07' },
            subRows: [
                { type: 'Individual Single Premium', values: { premium: '0.00', policies: '0.00', lives: '', sum: '0.00' } },
                { type: 'Individual Non-Single Premium', values: { premium: '0.00', policies: '0.01', lives: '', sum: '0.08' } },
                { type: 'Group Single Premium', values: { premium: '0.03', policies: '0.46', lives: '0.41', sum: '0.18' } },
                { type: 'Group Non-Single Premium', values: { premium: '0.00', policies: '0.00', lives: '0.00', sum: '0.00' } },
                { type: 'Group Yearly Renewable Premium', values: { premium: '0.00', policies: '0.00', lives: '0.00', sum: '0.00' } },
            ]
        },
        {
            insurer: 'Aditya Birla Sun Life',
            values: { premium: '2.49', policies: '1.13', lives: '1.84', sum: '4.67' },
            subRows: [
                { type: 'Individual Single Premium', values: { premium: '1.40', policies: '0.55', lives: '', sum: '1.95' } },
                { type: 'Individual Non-Single Premium', values: { premium: '3.07', policies: '1.16', lives: '', sum: '2.62' } },
                { type: 'Group Single Premium', values: { premium: '2.52', policies: '6.27', lives: '2.33', sum: '2.30' } },
                { type: 'Group Non-Single Premium', values: { premium: '0.56', policies: '0.00', lives: '0.00', sum: '0.00' } },
                { type: 'Group Yearly Renewable Premium', values: { premium: '1.85', policies: '0.79', lives: '1.14', sum: '7.23' } },
            ]
        },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Market Share Summary of First Year Premium > ${selectedPeriod}`}
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
                                    <th style={{ backgroundColor: '#fff', border: 'none' }}></th>
                                    <th colSpan="4" style={{ textAlign: 'center', fontWeight: 'bold' }}>Market Share in First Year Premium <br /> (Based on Premium Amount)</th>
                                </tr>
                                <tr>
                                    <th style={{ minWidth: '200px', fontWeight: 'bold' }}>Insurer Name</th>
                                    <th style={{ fontWeight: 'bold' }}>First Year Premium</th>
                                    <th style={{ fontWeight: 'bold' }}>No. of Policies / Schemes</th>
                                    <th style={{ fontWeight: 'bold' }}>No. of lives covered under Group Schemes</th>
                                    <th style={{ fontWeight: 'bold' }}>Sum Assured</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marketShareData.map((row, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr style={{ backgroundColor: '#fff', fontWeight: 'bold' }}>
                                            <td style={{ display: 'flex', alignItems: 'center', borderRight: 'none' }}>
                                                {row.insurer}
                                                <button
                                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                                                    onClick={() => toggleInsurer(idx)}
                                                >
                                                    {expandedInsurers[idx] ? '−' : '+'}
                                                </button>
                                            </td>
                                            <td>{row.values.premium}</td>
                                            <td>{row.values.policies}</td>
                                            <td>{row.values.lives}</td>
                                            <td>{row.values.sum}</td>
                                        </tr>
                                        {expandedInsurers[idx] && row.subRows.map((sub, sIdx) => (
                                            <tr key={`${idx}-${sIdx}`} style={{ backgroundColor: '#f9f9f9' }}>
                                                <td style={{ paddingLeft: '20px', color: '#555' }}>{sub.type}</td>
                                                <td>{sub.values.premium}</td>
                                                <td>{sub.values.policies}</td>
                                                <td>{sub.values.lives}</td>
                                                <td>{sub.values.sum}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiMarketShare;
