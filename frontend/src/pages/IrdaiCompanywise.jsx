import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList
} from 'recharts';
import TabLayout from './IrdaiSharedLayout';

const IrdaiCompanywise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [companyTotals, setCompanyTotals] = useState(null);

    // Chart and Table Data State
    const [companyChartData, setCompanyChartData] = useState({ fyp: [], nop: [], sa: [], nol: [] });
    const [companyTableData, setCompanyTableData] = useState([]);

    // Sort Config
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Data State
    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [insurerName, setInsurerName] = useState('');
    const [insurerOptions, setInsurerOptions] = useState([]);

    // Fetch Insurers on Mount
    useEffect(() => {
        const fetchInsurers = async () => {
            try {
                const data = await api.getInsurers();
                if (Array.isArray(data)) {
                    setInsurerOptions(data);
                    // Default to first insurer if available
                    if (data.length > 0) {
                        setInsurerName(data[0].value);
                    }
                } else {
                    console.warn("getInsurers returned non-array:", data);
                    setInsurerOptions([]);
                }
            } catch (error) {
                console.error("Failed to fetch insurers", error);
            }
        };
        fetchInsurers();
    }, []);

    // Fetch Period Types on Mount
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await api.getIrdaiPeriodTypes();
                if (Array.isArray(types)) {
                    setPeriodTypes(types);
                    // Default to first type if available
                    if (types.length > 0) {
                        setPeriodType(types[0].value);
                    }
                } else {
                    console.warn("getIrdaiPeriodTypes returned non-array:", types);
                    setPeriodTypes([]);
                }
            } catch (error) {
                console.error("Failed to fetch period types", error);
            }
        };
        fetchTypes();
    }, []);

    // Fetch Period Options when Period Type changes
    useEffect(() => {
        if (!periodType) return;

        const fetchOptions = async () => {
            setLoading(true);
            try {
                const options = await api.getIrdaiPeriodOptions(periodType);
                if (Array.isArray(options)) {
                    setPeriodOptions(options);
                    // Default to first option (latest date) if available
                    if (options.length > 0) {
                        setSelectedPeriod(options[0]);
                    } else {
                        setSelectedPeriod(null);
                    }
                } else {
                    console.warn("getIrdaiPeriodOptions returned non-array:", options);
                    setPeriodOptions([]);
                    setSelectedPeriod(null);
                }
            } catch (error) {
                console.error("Failed to fetch period options", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, [periodType]);

    // Fetch Company Totals when Insurer or Period changes
    useEffect(() => {
        if (!insurerName || !selectedPeriod || !selectedPeriod.start_date || !selectedPeriod.end_date) return;

        const fetchTotals = async () => {
            try {
                const totals = await api.getCompanyTotals(
                    insurerName,
                    selectedPeriod.start_date,
                    selectedPeriod.end_date
                );
                // API returns a single object now (normalized in backend)
                if (totals && Object.keys(totals).length > 0) {
                    setCompanyTotals(totals);
                } else {
                    setCompanyTotals(null);
                }
            } catch (error) {
                console.error("Failed to fetch company totals", error);
            }
        };
        fetchTotals();
    }, [insurerName, selectedPeriod]);

    // Fetch Premium Type Breakup
    useEffect(() => {
        if (!insurerName || !selectedPeriod || !selectedPeriod.start_date || !selectedPeriod.end_date) return;

        const fetchMetrics = async () => {
            try {
                // Use the new API
                const metrics = await api.getCompanyPremiumTypeBreakup(
                    insurerName,
                    selectedPeriod.start_date,
                    selectedPeriod.end_date
                );

                // metrics is an array of objects: 
                // { premium_type, fyp, sa, nop, nol }

                // 1. Process for Charts (We need to group by Metrics: FYP, SA, NOL, NOP)
                const chartDataObj = { fyp: [], nop: [], sa: [], nol: [] };

                const shorten = (name) => name.replace(' Premium', '').replace(' Renewable', '');

                if (Array.isArray(metrics)) {
                    metrics.forEach(item => {
                        const name = shorten(item.premium_type);
                        chartDataObj.fyp.push({ name, value: item.fyp });
                        chartDataObj.sa.push({ name, value: item.sa });
                        chartDataObj.nop.push({ name, value: item.nop });
                        chartDataObj.nol.push({ name, value: item.nol });
                    });
                } else {
                    console.warn("getCompanyPremiumTypeBreakup returned non-array:", metrics);
                }

                setCompanyChartData(chartDataObj);


                // 2. Process for Table
                // Rows: First Year Premium, Sum Assured, Number of Lives, No of Policies
                const categoryMap = {
                    'FYP': { label: 'First Year Premium', unit: 'In Crs' },
                    'SA': { label: 'Sum Assured', unit: 'In Crs' },
                    'NOL': { label: 'No. of lives covered under Group Schemes', unit: 'In Nos' },
                    'NOP': { label: 'No of Policies / Schemes', unit: 'In Nos' }
                };

                // Helper to map API premium type to table column keys
                const typeKeyMap = {
                    'Individual Single Premium': 'indSingle',
                    'Individual Non-Single Premium': 'indNonSingle',
                    'Group Single Premium': 'groupSingle',
                    'Group Non-Single Premium': 'groupNonSingle',
                    'Group Yearly Renewable Premium': 'groupYearly'
                };

                const newTableData = ['FYP', 'SA', 'NOL', 'NOP'].map(metricCode => {
                    const rowData = {
                        category: categoryMap[metricCode].label,
                        unit: categoryMap[metricCode].unit,
                        period: selectedPeriod.label
                    };

                    if (Array.isArray(metrics)) {
                        metrics.forEach(item => {
                            const key = typeKeyMap[item.premium_type];
                            if (key) {
                                // Extract correct value based on metricCode
                                let val = 0;
                                if (metricCode === 'FYP') val = item.fyp;
                                else if (metricCode === 'SA') val = item.sa;
                                else if (metricCode === 'NOL') val = item.nol;
                                else if (metricCode === 'NOP') val = item.nop;

                                rowData[key] = val;
                            }
                        });
                    }

                    return rowData;
                });
                setCompanyTableData(newTableData);

            } catch (error) {
                console.error("Failed to fetch company premium type breakup", error);
            }
        };
        fetchMetrics();
    }, [insurerName, selectedPeriod]);

    // KPI Data derived from companyTotals
    const kpiData = [
        {
            title: 'First Year Premium',
            value: companyTotals ? companyTotals.fyp : '0',
            unit: 'In INR Crs.',
            color: 'blue',
            targetId: 'chart-fyp'
        },
        {
            title: 'Sum Assured',
            value: companyTotals ? companyTotals.sa : '0',
            unit: 'In INR Crs.',
            color: 'green',
            targetId: 'chart-sa'
        },
        {
            title: 'Number of Lives',
            value: companyTotals ? companyTotals.nol : '0',
            unit: 'In Nos.',
            color: 'purple',
            targetId: 'chart-nol'
        },
        {
            title: 'No of Policies',
            value: companyTotals ? companyTotals.nop : '0',
            unit: 'In Nos.',
            color: 'orange',
            targetId: 'chart-nop'
        }
    ];

    const handleCardClick = (targetId) => {
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Sorting Logic
    const sortedTableData = React.useMemo(() => {
        let sortableItems = [...companyTableData];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle strings case-insensitive
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [companyTableData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (name) => {
        if (sortConfig.key === name) {
            return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
        }
        return ' ⇅';
    };



    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Data Summary of ${insurerName} > ${selectedPeriod ? selectedPeriod.label : ''}`}
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
                            {insurerOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                            value={selectedPeriod ? selectedPeriod.label : ''}
                            onChange={(e) => {
                                const selected = periodOptions.find(p => p.label === e.target.value);
                                setSelectedPeriod(selected);
                            }}
                            disabled={loading}
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
                            <div
                                key={idx}
                                className={`kpi-card ${kpi.color}`}
                                onClick={() => handleCardClick(kpi.targetId)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span className="kpi-unit">{kpi.unit}</span>
                                <h3 className="kpi-title">{kpi.title}</h3>
                                <div className="kpi-value" style={{ fontSize: '18px', fontWeight: 'bold' }}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod ? selectedPeriod.label : ''}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>

                        {/* FYP Chart */}
                        <div id="chart-fyp" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>First Year Premium</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.fyp} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#0088FE" name="First Year Premium" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SA Chart */}
                        <div id="chart-sa" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Sum Assured</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.sa} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#00C49F" name="Sum Assured" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOL Chart */}
                        <div id="chart-nol" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Number of Lives</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.nol} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#8884d8" name="Number of Lives" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOP Chart */}
                        <div id="chart-nop" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No of Policies</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.nop} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#FF8042" name="No of Policies" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

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
                                    <th onClick={() => requestSort('groupNonSingle')} style={{ cursor: 'pointer', textAlign: 'right' }}>Group Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('groupNonSingle')}</th>
                                    <th onClick={() => requestSort('indSingle')} style={{ cursor: 'pointer', textAlign: 'right' }}>Individual Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('indSingle')}</th>
                                    <th onClick={() => requestSort('indNonSingle')} style={{ cursor: 'pointer', textAlign: 'right' }}>Individual Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('indNonSingle')}</th>
                                    <th onClick={() => requestSort('groupYearly')} style={{ cursor: 'pointer', textAlign: 'right' }}>Group Yearly<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Renewable Premium</span>{getSortIndicator('groupYearly')}</th>
                                    <th onClick={() => requestSort('groupSingle')} style={{ cursor: 'pointer', textAlign: 'right' }}>Group Single Premium<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('groupSingle')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTableData.length > 0 ? sortedTableData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.category}</td>
                                        <td>{row.unit}</td>
                                        <td>{row.period}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.groupNonSingle || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.indSingle || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.indNonSingle || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.groupYearly || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.groupSingle || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No Data Available for selected period</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiCompanywise;
