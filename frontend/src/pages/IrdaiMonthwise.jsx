import React, { useState, useEffect } from 'react';
import TabLayout from './IrdaiSharedLayout';
import api from '../services/api';

const IrdaiMonthwise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('MONTH');
    const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('');
    const [insurerName, setInsurerName] = useState('');
    const [insurerNames, setInsurerNames] = useState([]);

    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);

    // Data State
    const [companyMetrics, setCompanyMetrics] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Initial Data (Insurers & Period Types)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Fetch Insurers
                const companies = await api.getCompanyList();
                const uniqueNames = companies.map(c => c.label);
                setInsurerNames(uniqueNames);
                if (uniqueNames.length > 0 && !insurerName) {
                    setInsurerName(uniqueNames[0]);
                }

                // 2. Fetch Period Types
                const types = await api.getIrdaiPeriodTypes();
                setPeriodTypes(types);
                // Set default period type if available (e.g., 'MONTH')
                if (types.length > 0) {
                    setPeriodType(types[0].value);
                }

            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch Period Options when Type Changes
    useEffect(() => {
        const fetchPeriodOptions = async () => {
            if (!periodType) return;
            try {
                const options = await api.getIrdaiPeriodOptions(periodType);
                setPeriodOptions(options);
                if (options.length > 0) {
                    setSelectedPeriodLabel(options[0].label);
                }
            } catch (err) {
                console.error("Failed to fetch period options", err);
            }
        };
        fetchPeriodOptions();
    }, [periodType]);

    // Fetch Company Metrics Data
    useEffect(() => {
        const fetchData = async () => {
            if (!insurerName || !selectedPeriodLabel || periodOptions.length === 0) return;

            const selectedOpt = periodOptions.find(o => o.label === selectedPeriodLabel);
            if (!selectedOpt) return;

            setLoading(true);
            try {
                const data = await api.getMonthwiseCompanyAllMetrics(
                    insurerName,
                    selectedOpt.start_date,
                    selectedOpt.end_date
                );
                setCompanyMetrics(data);
            } catch (err) {
                console.error("Failed to fetch company metrics", err);
                setCompanyMetrics([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [insurerName, selectedPeriodLabel, periodOptions]);

    // KPI Data (Simple aggregation or take from first row if total exists - usually API provides totals or we sum up)
    // For now, let's sum up the current values for a quick KPI view
    const totals = companyMetrics.reduce((acc, row) => {
        acc.fyp += row.fyp_current || 0;
        acc.sa += row.sa_current || 0;
        acc.nol += row.nol_current || 0;
        acc.nop += row.nop_current || 0;
        return acc;
    }, { fyp: 0, sa: 0, nol: 0, nop: 0 });

    const kpiData = [
        { title: 'First Year Premium', value: totals.fyp.toFixed(2), unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: totals.sa.toFixed(2), unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: totals.nol.toLocaleString(), unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: totals.nop.toLocaleString(), unit: 'In Nos.', color: 'purple' }
    ];

    // Helper to get previous year label
    // If selected is 'Sept 2024', previous is 'Sept 2023' (simplified logic for UI labels)
    const getPrevLabel = (label) => {
        if (!label) return '';
        const parts = label.split(' ');
        if (parts.length > 1) {
            const year = parseInt(parts[parts.length - 1]);
            if (!isNaN(year)) {
                // Try to keep the prefix and decrement year
                return label.replace(year.toString(), (year - 1).toString());
            }
        }
        return 'Prev Year';
    };
    const prevLabel = getPrevLabel(selectedPeriodLabel);

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Monthwise Data Summary of ${insurerName} > ${selectedPeriodLabel}`}
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
                        <label className="control-label">Select Period Type</label>
                        <select
                            className="custom-select"
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value)}
                        >
                            {periodTypes.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period</label>
                        <select
                            className="custom-select"
                            value={selectedPeriodLabel}
                            onChange={(e) => setSelectedPeriodLabel(e.target.value)}
                        >
                            {periodOptions.map(p => (
                                <option key={p.label} value={p.label}>{p.label}</option>
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
                                <div className="kpi-period">{selectedPeriodLabel}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row">
                        {/* Simple visual representation for now - could be enhanced */}
                        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h3>Premium Breakdown</h3>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
                                {companyMetrics.filter(m => m.premium_type !== insurerName).map((metric, i) => (
                                    <li key={i} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontWeight: 500 }}>{metric.premium_type}</span>
                                            <span style={{ fontWeight: 'bold', color: '#0088FE' }}>{metric.fyp_current?.toFixed(2)}</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#f0f0f0', height: '8px', borderRadius: '4px' }}>
                                            <div style={{
                                                width: `${(metric.fyp_current / totals.fyp * 100) || 0}%`,
                                                backgroundColor: '#0088FE',
                                                height: '100%',
                                                borderRadius: '4px',
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="irdai-data-table" style={{ width: 'max-content' }}>
                            <thead>
                                <tr>
                                    <th colSpan="30" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                        New Business Statement of {insurerName} for the Period ended {selectedPeriodLabel}
                                        <span style={{ float: 'right', fontSize: '12px', fontWeight: 'normal' }}>
                                            (Premium & Sum Assured In Rs. Crores)
                                        </span>
                                    </th>
                                </tr>
                                <tr>
                                    <th rowSpan="2" style={{ minWidth: '50px' }}>Sl No.</th>
                                    <th rowSpan="2" style={{ minWidth: '200px' }}>Premium Type</th>

                                    <th colSpan="7" style={{ textAlign: 'center' }}>First Year Premium</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>Sum Assured</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of Policies / Schemes</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of lives covered under Group Schemes</th>
                                </tr>
                                <tr>
                                    {/* Repeat headers for each metric section */}
                                    {[1, 2, 3, 4].map((section) => (
                                        <React.Fragment key={section}>
                                            <th>For<br />{prevLabel}</th>
                                            <th>For<br />{selectedPeriodLabel}</th>
                                            <th>Growth<br />in %</th>
                                            <th>Up to<br />{prevLabel}</th>
                                            <th>Up to<br />{selectedPeriodLabel}</th>
                                            <th>Growth<br />in %</th>
                                            <th>Market<br />Share</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="30" style={{ textAlign: 'center', padding: '20px' }}>Loading data...</td></tr>
                                ) : companyMetrics.length > 0 ? (
                                    companyMetrics.map((row, index) => (
                                        <tr key={index} style={{ backgroundColor: row.premium_type === insurerName ? '#f9f9f9' : '#fff', fontWeight: row.premium_type === insurerName ? 'bold' : 'normal' }}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: 'bold' }}>{row.premium_type === insurerName ? 'Total' : row.premium_type}</td>

                                            {/* FYP */}
                                            <td>{row.fyp_previous?.toFixed(2)}</td>
                                            <td>{row.fyp_current?.toFixed(2)}</td>
                                            <td>{row.fyp_growth?.toFixed(2)}</td>
                                            <td>{row.fyp_ytd_previous?.toFixed(2)}</td>
                                            <td>{row.fyp_ytd_current?.toFixed(2)}</td>
                                            <td>{row.fyp_ytd_growth?.toFixed(2)}</td>
                                            <td>{row.fyp_market_share?.toFixed(2)}</td>

                                            {/* SA */}
                                            <td>{row.sa_previous?.toFixed(2)}</td>
                                            <td>{row.sa_current?.toFixed(2)}</td>
                                            <td>{row.sa_growth?.toFixed(2)}</td>
                                            <td>{row.sa_ytd_previous?.toFixed(2)}</td>
                                            <td>{row.sa_ytd_current?.toFixed(2)}</td>
                                            <td>{row.sa_ytd_growth?.toFixed(2)}</td>
                                            <td>{row.sa_market_share?.toFixed(2)}</td>

                                            {/* NOP */}
                                            <td>{row.nop_previous}</td>
                                            <td>{row.nop_current}</td>
                                            <td>{row.nop_growth?.toFixed(2)}</td>
                                            <td>{row.nop_ytd_previous}</td>
                                            <td>{row.nop_ytd_current}</td>
                                            <td>{row.nop_ytd_growth?.toFixed(2)}</td>
                                            <td>{row.nop_market_share?.toFixed(2)}</td>

                                            {/* NOL */}
                                            <td>{row.nol_previous}</td>
                                            <td>{row.nol_current}</td>
                                            <td>{row.nol_growth?.toFixed(2)}</td>
                                            <td>{row.nol_ytd_previous}</td>
                                            <td>{row.nol_ytd_current}</td>
                                            <td>{row.nol_ytd_growth?.toFixed(2)}</td>
                                            <td>{row.nol_market_share?.toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="30" style={{ textAlign: 'center', padding: '20px' }}>No data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiMonthwise;
