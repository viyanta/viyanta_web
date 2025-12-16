import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiGrowth = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [insurerName, setInsurerName] = useState('Acko Life');
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

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Growth Data
    const growthData = [
        {
            insurer: 'Acko Life Insurance',
            values: { for23: '1.50', for24: '3.54', growthFor: '136.35', upTo23: '1.62', upTo24: '30.29', growthUpTo: '1770.72' },
            subRows: [
                { type: 'Individual Single Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
                { type: 'Individual Non-Single Premium', values: { for23: '0.00', for24: '0.30', growthFor: '', upTo23: '0.00', upTo24: '1.54', growthUpTo: '' } },
                { type: 'Group Single Premium', values: { for23: '1.50', for24: '3.24', growthFor: '115.52', upTo23: '1.62', upTo24: '28.76', growthUpTo: '1675.68' } },
                { type: 'Group Non-Single Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
                { type: 'Group Yearly Renewable Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
            ]
        },
        {
            insurer: 'Aditya Birla Sun Life',
            values: { for23: '575.95', for24: '1025.19', growthFor: '78.00', upTo23: '3300.75', upTo24: '4712.96', growthUpTo: '42.78' },
            subRows: [
                { type: 'Individual Single Premium', values: { for23: '31.54', for24: '52.87', growthFor: '67.65', upTo23: '170.76', upTo24: '334.29', growthUpTo: '95.77' } },
                { type: 'Individual Non-Single Premium', values: { for23: '224.99', for24: '370.44', growthFor: '64.65', upTo23: '1544.66', upTo24: '31.93', growthUpTo: '' } },
                { type: 'Group Single Premium', values: { for23: '309.47', for24: '584.52', growthFor: '88.88', upTo23: '1843.88', upTo24: '2720.80', growthUpTo: '47.56' } },
                { type: 'Group Non-Single Premium', values: { for23: '0.23', for24: '4.61', growthFor: '1887.15', upTo23: '10.37', upTo24: '9.16', growthUpTo: '-11.68' } },
                { type: 'Group Yearly Renewable Premium', values: { for23: '9.72', for24: '12.74', growthFor: '31.06', upTo23: '104.89', upTo24: '104.05', growthUpTo: '-0.80' } },
            ]
        },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Growth Summary of First Year Premium > ${selectedPeriod}`}
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
                                    <th colSpan="3" style={{ textAlign: 'center', fontWeight: 'bold' }}>For the Month</th>
                                    <th colSpan="3" style={{ textAlign: 'center', fontWeight: 'bold' }}>Up to the Month</th>
                                </tr>
                                <tr>
                                    <th style={{ minWidth: '200px', fontWeight: 'bold' }}>Insurer Name</th>
                                    <th style={{ fontWeight: 'bold' }}>For Sept 2023</th>
                                    <th style={{ fontWeight: 'bold' }}>For Sept 2024</th>
                                    <th style={{ fontWeight: 'bold' }}>Growth Over same period of prev year</th>
                                    <th style={{ fontWeight: 'bold' }}>Up to Sept 2023</th>
                                    <th style={{ fontWeight: 'bold' }}>Up to Sept 2024</th>
                                    <th style={{ fontWeight: 'bold' }}>Growth Over same period of prev year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {growthData.map((row, idx) => (
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
                                            <td>{row.values.for23}</td>
                                            <td>{row.values.for24}</td>
                                            <td>{row.values.growthFor}</td>
                                            <td>{row.values.upTo23}</td>
                                            <td>{row.values.upTo24}</td>
                                            <td>{row.values.growthUpTo}</td>
                                        </tr>
                                        {expandedInsurers[idx] && row.subRows.map((sub, sIdx) => (
                                            <tr key={`${idx}-${sIdx}`} style={{ backgroundColor: '#f9f9f9' }}>
                                                <td style={{ paddingLeft: '20px', color: '#555' }}>{sub.type}</td>
                                                <td>{sub.values.for23}</td>
                                                <td>{sub.values.for24}</td>
                                                <td>{sub.values.growthFor}</td>
                                                <td>{sub.values.upTo23}</td>
                                                <td>{sub.values.upTo24}</td>
                                                <td>{sub.values.growthUpTo}</td>
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

export default IrdaiGrowth;
