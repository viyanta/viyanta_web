import React, { useState } from 'react';
import TabLayout from './IrdaiSharedLayout';

const IrdaiPvtVsPublic = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [pvtOrPublic, setPvtOrPublic] = useState('Private OR Public');
    const [premiumTypeSelection, setPremiumTypeSelection] = useState('Individual Single Premium');

    // Mock Options
    const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual'];
    const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24'];
    const pvtTypes = ['Private OR Public', 'Private', 'Public']; // Assuming options
    const premiumTypes = ['Individual Single Premium', 'Group Non-Single', 'Group Yearly'];

    // Mock KPI Data
    const kpiData = [
        { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    ];

    // Mock Pvt Vs Public Data
    const pvtVsPublicData = [
        {
            section: 'Grand Total',
            values: { premium: '35020.28', policies: '3217880', lives: '18838049', sum: '937961' },
            rows: [
                { name: 'Individual Single Premium', premium: '5141.99', policies: '149887', lives: '0', sum: '4485' },
                { name: 'Individual Non-Single Premium', premium: '11500.11', policies: '3063667', lives: '0', sum: '338448' },
                { name: 'Group Single Premium', premium: '17052.25', policies: '253', lives: '11500485', sum: '155795' },
                { name: 'Group Non-Single Premium', premium: '115.62', policies: '584', lives: '528875', sum: '6777' },
                { name: 'Group Yearly Renewable Premium', premium: '1210.31', policies: '3489', lives: '6808689', sum: '432455' }
            ]
        },
        {
            section: 'Private Total',
            values: { premium: '14651.02', policies: '866447', lives: '15388596', sum: '707453' },
            rows: [
                { name: 'Individual Single Premium', premium: '1908.55', policies: '28076', lives: '0', sum: '2172' },
                { name: 'Individual Non-Single Premium', premium: '7638.09', policies: '837646', lives: '0', sum: '261541' },
                { name: 'Group Single Premium', premium: '4265.64', policies: '224', lives: '11494299', sum: '155713' },
                { name: 'Group Non-Single Premium', premium: '12.49', policies: '8', lives: '4008', sum: '279' },
                { name: 'Group Yearly Renewable Premium', premium: '826.25', policies: '493', lives: '3890289', sum: '287747' }
            ]
        },
        {
            section: 'Public Total',
            values: { premium: '20369.26', policies: '2351433', lives: '3449453', sum: '230508.25' },
            rows: [
                { name: 'Individual Single Premium', premium: '3233.44', policies: '121811', lives: '0', sum: '2312.75' },
                { name: 'Individual Non-Single Premium', premium: '3862.02', policies: '2226021', lives: '0', sum: '76906.91' },
                { name: 'Group Single Premium', premium: '12786.61', policies: '29', lives: '6186', sum: '81.87' },
                { name: 'Group Non-Single Premium', premium: '103.13', policies: '576', lives: '524867', sum: '6498.56' },
                { name: 'Group Yearly Renewable Premium', premium: '384.06', policies: '2996', lives: '2918400', sum: '144708.15' }
            ]
        }
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`${viewMode === 'visuals' ? 'Pvt. Vs Public-Visual' : 'Pvt. Vs Public Data'} > ${selectedPeriod}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Private or Public</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
                            value={pvtOrPublic}
                            onChange={(e) => setPvtOrPublic(e.target.value)}
                        >
                            {pvtTypes.map(name => (
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
                <div className="visuals-view" style={{ padding: '0 20px' }}>
                    {pvtVsPublicData.map((section, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: '10px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                {section.section === 'Grand Total' ? 'TOTAL' : section.section}
                            </h4>
                            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                <div className="kpi-card blue">
                                    <span className="kpi-unit">In Crs.</span>
                                    <h3 className="kpi-title">Premium</h3>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{section.values.premium}</div>
                                </div>
                                <div className="kpi-card">
                                    <span className="kpi-unit">In Crs.</span>
                                    <h3 className="kpi-title">Sum Assured</h3>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{section.values.sum}</div>
                                </div>
                                <div className="kpi-card green-border">
                                    <span className="kpi-unit">In Nos.</span>
                                    <h3 className="kpi-title">Lives Covered</h3>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{section.values.lives}</div>
                                </div>
                                <div className="kpi-card purple-border">
                                    <span className="kpi-unit">In Nos.</span>
                                    <h3 className="kpi-title">No. of Policies</h3>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{section.values.policies}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="charts-row">
                        <div className="chart-placeholder">Chart 1</div>
                        <div className="chart-placeholder">Chart 2</div>
                        <div className="chart-placeholder">Chart 3</div>
                        <div className="chart-placeholder">Chart 4</div>
                    </div>
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper">
                        <table className="irdai-data-table">
                            <thead>
                                <tr>
                                    <th colSpan="8" style={{ borderBottom: 'none', backgroundColor: '#fff' }}>
                                        <div style={{ color: 'blue', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                                            Pvt and Public Summary &gt; &gt;  {selectedPeriod}
                                        </div>
                                    </th>
                                </tr>
                                <tr>
                                    <th style={{ minWidth: '200px', backgroundColor: 'rgb(54, 101, 155)', color: 'white' }}>PARTICULARS</th>
                                    <th style={{ textAlign: 'right', backgroundColor: 'rgb(54, 101, 155)', color: 'white' }}>PREMIUM<br /><span style={{ fontSize: '10px' }}>(In Crs.)</span></th>
                                    <th style={{ textAlign: 'right', backgroundColor: 'rgb(54, 101, 155)', color: 'white' }}>POLICIES<br /><span style={{ fontSize: '10px' }}>(In Nos.)</span></th>
                                    <th style={{ textAlign: 'right', backgroundColor: 'rgb(54, 101, 155)', color: 'white' }}>LIVES<br /><span style={{ fontSize: '10px' }}>(In Nos.)</span></th>
                                    <th style={{ textAlign: 'right', backgroundColor: 'rgb(54, 101, 155)', color: 'white' }}>SUM ASSURED<br /><span style={{ fontSize: '10px' }}>(In Crs.)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pvtVsPublicData.map((section, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                                            <td>{section.section}</td>
                                            <td style={{ textAlign: 'right' }}>{section.values.premium}</td>
                                            <td style={{ textAlign: 'right' }}>{section.values.policies}</td>
                                            <td style={{ textAlign: 'right' }}>{section.values.lives}</td>
                                            <td style={{ textAlign: 'right' }}>{section.values.sum}</td>
                                        </tr>
                                        {section.rows.map((row, rIdx) => (
                                            <tr key={rIdx} style={{ backgroundColor: '#fff' }}>
                                                <td style={{ paddingLeft: '20px', color: '#555' }}>{row.name}</td>
                                                <td style={{ textAlign: 'right' }}>{row.premium}</td>
                                                <td style={{ textAlign: 'right' }}>{row.policies}</td>
                                                <td style={{ textAlign: 'right' }}>{row.lives}</td>
                                                <td style={{ textAlign: 'right' }}>{row.sum}</td>
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

export default IrdaiPvtVsPublic;
