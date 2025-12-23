import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TabLayout from './IrdaiSharedLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const IrdaiDashboard = () => {
    // Local State for Dashboard Tab
    // Local State for Dashboard Tab
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState(''); // Stores the 'value' (e.g., 'MONTH')
    const [selectedPeriod, setSelectedPeriod] = useState(null); // Stores the full period object

    // Data State
    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [dashboardTotals, setDashboardTotals] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [chartData, setChartData] = useState({ fyp: [], nop: [], sa: [], nol: [] });

    // 1. Fetch Period Types on Mount
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

    // 2. Fetch Period Options when Period Type changes
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


    // 3. Fetch Data when Selected Period changes
    useEffect(() => {
        if (!selectedPeriod) return;

        const fetchData = async () => {
            // If selectedPeriod is just a string (initial load state issue potentially), don't fetch yet or handle it
            if (typeof selectedPeriod === 'string') return;

            try {
                const [totals, metrics] = await Promise.all([
                    api.getDashboardTotals(selectedPeriod.start_date, selectedPeriod.end_date),
                    api.getMetricWisePremium(selectedPeriod.start_date, selectedPeriod.end_date)
                ]);
                setDashboardTotals(totals);

                // Process Metric Data
                const grouped = {};
                const chartDataObj = { fyp: [], nop: [], sa: [], nol: [] };

                metrics.forEach(item => {
                    if (!grouped[item.metric]) grouped[item.metric] = {};
                    grouped[item.metric][item.premium_type] = item.value;
                });

                // Prepare Chart Data
                const metricMap = { 'FYP': 'fyp', 'NOP': 'nop', 'SA': 'sa', 'NOL': 'nol' };
                // Helper to shorten names
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
                setChartData(chartDataObj);

                const categories = [
                    { code: 'FYP', label: 'First Year Premium', unit: 'In Crs' },
                    { code: 'SA', label: 'Sum Assured', unit: 'In Crs' },
                    { code: 'NOL', label: 'Number of Lives', unit: 'In Nos' },
                    { code: 'NOP', label: 'Number of Policies', unit: 'In Nos' }
                ];

                const processedTableData = categories.map(cat => {
                    const rowData = grouped[cat.code] || {};
                    return {
                        category: cat.label,
                        unit: cat.unit,
                        period: selectedPeriod.label,
                        groupNonSingle: (rowData['Group Non-Single Premium'] || 0).toLocaleString('en-IN'),
                        indSingle: (rowData['Individual Single Premium'] || 0).toLocaleString('en-IN'),
                        indNonSingle: (rowData['Individual Non-Single Premium'] || 0).toLocaleString('en-IN'),
                        groupYearly: (rowData['Group Yearly Renewable Premium'] || 0).toLocaleString('en-IN'),
                        groupSingle: (rowData['Group Single Premium'] || 0).toLocaleString('en-IN')
                    };
                });
                setTableData(processedTableData);

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };

        fetchData();
    }, [selectedPeriod]);

    // Mock KPI Data
    // KPI Data derived from dashboardTotals
    const kpiData = [
        {
            title: 'First Year Premium',
            value: dashboardTotals ? dashboardTotals.FYP.grand.toLocaleString('en-IN') : '0',
            unit: 'In INR Crs.',
            color: 'blue'
        },
        {
            title: 'Sum Assured',
            value: dashboardTotals ? dashboardTotals.SA.grand.toLocaleString('en-IN') : '0',
            unit: 'In INR Crs.',
            color: 'gray'
        },
        {
            title: 'Number of Lives',
            value: dashboardTotals ? dashboardTotals.NOL.grand.toLocaleString('en-IN') : '0',
            unit: 'In Nos.',
            color: 'green'
        },
        {
            title: 'No of Policies',
            value: dashboardTotals ? dashboardTotals.NOP.grand.toLocaleString('en-IN') : '0',
            unit: 'In Nos.',
            color: 'purple'
        }
    ];



    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`${viewMode === 'visuals' ? 'Dashboard-Visual' : 'Dashboard Data'} for the ${periodType === 'MONTH' ? 'Month' : ''} Period > ${selectedPeriod ? selectedPeriod.label : ''}`}
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
                            <option value="" disabled>Select Period</option>
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
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Final Year Premium Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.fyp}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `₹${val / 1000}k`} width={50} />
                                    <Tooltip formatter={(value) => [`₹ ${value.toLocaleString('en-IN')}`, 'Premium']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#0088FE" name="FYP" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SA Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Sum Assured Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.sa}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `₹${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [`₹ ${value.toLocaleString('en-IN')}`, 'Sum Assured']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#00C49F" name="Sum Assured" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOP Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Policies Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.nop}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [value.toLocaleString('en-IN'), 'Policies']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#8884d8" name="Policies" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOL Chart */}
                        <div className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Lives Breakup</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.nol}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [value.toLocaleString('en-IN'), 'Lives']} />
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

export default IrdaiDashboard;
