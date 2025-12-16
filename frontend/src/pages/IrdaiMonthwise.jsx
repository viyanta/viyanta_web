import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiMonthwise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');

    // Mock Options
    const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual'];
    const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24'];

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Monthwise Data
    const monthwiseData = [
        {
            slNo: 1,
            insurer: 'Acko Life Insurance',
            premium: { f23: '1.50', f24: '3.54', gF: '136.35', u23: '1.62', u24: '30.29', gU: '1770.72', ms: '0.02' },
            policies: { f23: '320', f24: '768', gF: '140.00', u23: '350', u24: '1240', gU: '254.29', ms: '0.01' },
            lives: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '0.25' },
            sum: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '0.07' },
        },
        {
            slNo: 2,
            insurer: 'Aditya Birla Sun Life',
            premium: { f23: '575.95', f24: '1025.19', gF: '78.00', u23: '3300.75', u24: '4712.96', gU: '42.78', ms: '2.49' },
            policies: { f23: '1200', f24: '1500', gF: '25.00', u23: '4500', u24: '5200', gU: '15.56', ms: '1.13' },
            lives: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '1.84' },
            sum: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '4.67' },
        },
        {
            slNo: 3,
            insurer: 'Aegon Federal Life',
            premium: { f23: '130.37', f24: '156.88', gF: '20.33', u23: '471.08', u24: '670.24', gU: '42.28', ms: '0.35' },
            policies: { f23: '100', f24: '120', gF: '20.00', u23: '400', u24: '520', gU: '30.00', ms: '0.23' },
            lives: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '0.79' },
            sum: { f23: '', f24: '', gF: '', u23: '', u24: '', gU: '', ms: '0.26' },
        },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Monthwise Data Summary of First Year Premium > ${selectedPeriod}`}
            controls={
                <>
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
                    <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="irdai-data-table" style={{ width: 'max-content' }}>
                            <thead>
                                <tr>
                                    <th colSpan="32" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                        New Business Statement of Life Insurers for the Period ended {selectedPeriod}
                                        <span style={{ float: 'right', fontSize: '12px', fontWeight: 'normal' }}>
                                            (Premium & Sum Assured In Rs. Crores)
                                        </span>
                                    </th>
                                </tr>
                                <tr>
                                    <th rowSpan="2" style={{ minWidth: '50px' }}>Sl No.</th>
                                    <th rowSpan="2" style={{ minWidth: '200px' }}>Insurer</th>

                                    <th colSpan="7" style={{ textAlign: 'center' }}>First Year Premium</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of Policies / Schemes</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of lives covered under Group Schemes</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>Sum Assured</th>
                                </tr>
                                <tr>
                                    {[1, 2, 3, 4].map((section) => (
                                        <React.Fragment key={section}>
                                            <th>For<br />Sept,<br />2023</th>
                                            <th>For<br />Sept,<br />2024</th>
                                            <th>Growth<br />in %</th>
                                            <th>Up to<br />Sept,<br />2023</th>
                                            <th>Up to<br />Sept,<br />2024</th>
                                            <th>Growth<br />in %</th>
                                            <th>Market<br />Share</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {monthwiseData.map((row) => (
                                    <tr key={row.slNo} style={{ backgroundColor: '#fff' }}>
                                        <td>{row.slNo}</td>
                                        <td style={{ fontWeight: 'bold' }}>{row.insurer}</td>

                                        <td>{row.premium.f23}</td>
                                        <td>{row.premium.f24}</td>
                                        <td>{row.premium.gF}</td>
                                        <td>{row.premium.u23}</td>
                                        <td>{row.premium.u24}</td>
                                        <td>{row.premium.gU}</td>
                                        <td>{row.premium.ms}</td>

                                        <td>{row.policies.f23}</td>
                                        <td>{row.policies.f24}</td>
                                        <td>{row.policies.gF}</td>
                                        <td>{row.policies.u23}</td>
                                        <td>{row.policies.u24}</td>
                                        <td>{row.policies.gU}</td>
                                        <td>{row.policies.ms}</td>

                                        <td>{row.lives.f23}</td>
                                        <td>{row.lives.f24}</td>
                                        <td>{row.lives.gF}</td>
                                        <td>{row.lives.u23}</td>
                                        <td>{row.lives.u24}</td>
                                        <td>{row.lives.gU}</td>
                                        <td>{row.lives.ms}</td>

                                        <td>{row.sum.f23}</td>
                                        <td>{row.sum.f24}</td>
                                        <td>{row.sum.gF}</td>
                                        <td>{row.sum.u23}</td>
                                        <td>{row.sum.u24}</td>
                                        <td>{row.sum.gU}</td>
                                        <td>{row.sum.ms}</td>
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

export default IrdaiMonthwise;
