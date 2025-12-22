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
    ResponsiveContainer
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
                setInsurerOptions(data);
                // Default to first insurer if available
                if (data.length > 0) {
                    setInsurerName(data[0].value);
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
                setPeriodTypes(types);
                // Default to first type if available
                if (types.length > 0) {
                    setPeriodType(types[0].value);
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
                setPeriodOptions(options);
                // Default to first option (latest date) if available
                if (options.length > 0) {
                    setSelectedPeriod(options[0]);
                } else {
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

    // Fetch Metric Wise Premium
    useEffect(() => {
        if (!insurerName || !selectedPeriod || !selectedPeriod.start_date || !selectedPeriod.end_date) return;

        const fetchMetrics = async () => {
            try {
                const metrics = await api.getCompanyMetricWisePremium(
                    insurerName,
                    selectedPeriod.start_date,
                    selectedPeriod.end_date
                );

                // Process for Charts
                const grouped = {};
                // Metrics: FYP, SA, NOL, NOP
                metrics.forEach(item => {
                    if (!grouped[item.metric]) grouped[item.metric] = {};
                    grouped[item.metric][item.premium_type] = item.value;
                });

                const chartDataObj = { fyp: [], nop: [], sa: [], nol: [] };
                const metricMap = { 'FYP': 'fyp', 'NOP': 'nop', 'SA': 'sa', 'NOL': 'nol' };
                const shorten = (name) => name.replace(' Premium', '').replace(' Renewable', '');

                Object.keys(grouped).forEach(metricCode => {
                    const dataKey = metricMap[metricCode];
                    if (dataKey) {
                        chartDataObj[dataKey] = Object.entries(grouped[metricCode]).map(([type, val]) => ({
                            name: shorten(type),
                            value: val
                        }));
                    }
                });
                setCompanyChartData(chartDataObj);

                // Process for Table
                // We need rows for: First Year Premium, Sum Assured, Number of Lives, No of Policies
                const categoryMap = {
                    'FYP': { label: 'First Year Premium', unit: 'In Crs' },
                    'SA': { label: 'Sum Assured', unit: 'In Crs' },
                    'NOL': { label: 'No. of lives covered under Group Schemes', unit: 'In Nos' },
                    'NOP': { label: 'No of Policies / Schemes', unit: 'In Nos' }
                };

                // Keys for table columns based on premium type
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
                        period: selectedPeriod.label // or a shorter version
                    };

                    const metricGroup = grouped[metricCode] || {};
                    Object.entries(metricGroup).forEach(([pType, val]) => {
                        const key = typeKeyMap[pType];
                        if (key) {
                            rowData[key] = val; // format number if needed
                        }
                    });
                    return rowData;
                });
                setCompanyTableData(newTableData);

            } catch (error) {
                console.error("Failed to fetch metric wise premium", error);
            }
        };
        fetchMetrics();
    }, [insurerName, selectedPeriod]);

    // KPI Data derived from companyTotals
    const kpiData = [
        { title: 'First Year Premium', value: companyTotals ? companyTotals.fyp : '0', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: companyTotals ? companyTotals.sa : '0', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: companyTotals ? companyTotals.nol : '0', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: companyTotals ? companyTotals.nop : '0', unit: 'In Nos.', color: 'purple' }
    ];



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
                        <label className="control-label">Select Period</label>
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
                            <div key={idx} className={`kpi-card ${kpi.color}`}>
                                <span className="kpi-unit">{kpi.unit}</span>
                                <h3 className="kpi-title">{kpi.title}</h3>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod ? selectedPeriod.label : ''}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

                        {/* FYP Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>First Year Premium Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.fyp}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#0088FE" name="FYP" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SA Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Sum Assured Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.sa}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#00C49F" name="Sum Assured" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOP Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Policies Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.nop}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#8884d8" name="Policies" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOL Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Lives Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={companyChartData.nol}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#FF8042" name="Lives" radius={[4, 4, 0, 0]} />
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
                                    <th>Group Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Individual Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Individual Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                    <th>Group Yearly<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Renewable Premium</span></th>
                                    <th>Group Single Premium<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {companyTableData.length > 0 ? companyTableData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.category}</td>
                                        <td>{row.unit}</td>
                                        <td>{row.period}</td>
                                        <td>{row.groupNonSingle || 0}</td>
                                        <td>{row.indSingle || 0}</td>
                                        <td>{row.indNonSingle || 0}</td>
                                        <td>{row.groupYearly || 0}</td>
                                        <td>{row.groupSingle || 0}</td>
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
