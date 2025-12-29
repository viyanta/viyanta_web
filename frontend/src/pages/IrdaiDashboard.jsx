import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TabLayout from './IrdaiSharedLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';

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

    // Check if we need to set default sort config or just initialize
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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
                        groupNonSingle: (rowData['Group Non-Single Premium'] || 0),
                        indSingle: (rowData['Individual Single Premium'] || 0),
                        indNonSingle: (rowData['Individual Non-Single Premium'] || 0),
                        groupYearly: (rowData['Group Yearly Renewable Premium'] || 0),
                        groupSingle: (rowData['Group Single Premium'] || 0)
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
            color: 'blue',
            targetId: 'chart-fyp'
        },
        {
            title: 'Sum Assured',
            value: dashboardTotals ? dashboardTotals.SA.grand.toLocaleString('en-IN') : '0',
            unit: 'In INR Crs.',
            color: 'green',
            targetId: 'chart-sa'
        },
        {
            title: 'Number of Lives',
            value: dashboardTotals ? dashboardTotals.NOL.grand.toLocaleString('en-IN') : '0',
            unit: 'In Nos.',
            color: 'purple',
            targetId: 'chart-nol'
        },
        {
            title: 'No of Policies',
            value: dashboardTotals ? dashboardTotals.NOP.grand.toLocaleString('en-IN') : '0',
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
        let sortableItems = [...tableData];
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
    }, [tableData, sortConfig]);

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
        return ' ⇅'; // Unicode options: ↕ ⇅
    };



    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`${viewMode === 'visuals' ? 'Dashboard-Visual' : 'Dashboard Data'} for the ${periodType === 'MONTH' ? 'Month' : ''} Period > ${selectedPeriod ? selectedPeriod.label : ''}`}
            controls={
                <>
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
                                <BarChart data={chartData.fyp} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `₹${val / 1000}k`} width={50} />
                                    <Tooltip formatter={(value) => [`₹ ${value.toLocaleString('en-IN')}`, 'Premium']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#0088FE" name="FYP" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SA Chart */}
                        <div id="chart-sa" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Sum Assured</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.sa} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `₹${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [`₹ ${value.toLocaleString('en-IN')}`, 'Sum Assured']} />
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
                                <BarChart data={chartData.nol} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [value.toLocaleString('en-IN'), 'Lives']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#8884d8" name="Lives" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOP Chart */}
                        <div id="chart-nop" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No of Policies</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.nop} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(val) => `${val / 100000}L`} width={50} />
                                    <Tooltip formatter={(value) => [value.toLocaleString('en-IN'), 'Policies']} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#FF8042" name="Policies" radius={[4, 4, 0, 0]}>
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
                                    <th onClick={() => requestSort('groupNonSingle')} style={{ cursor: 'pointer' }}>Group Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('groupNonSingle')}</th>
                                    <th onClick={() => requestSort('indSingle')} style={{ cursor: 'pointer' }}>Individual Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('indSingle')}</th>
                                    <th onClick={() => requestSort('indNonSingle')} style={{ cursor: 'pointer' }}>Individual Non-Single<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('indNonSingle')}</th>
                                    <th onClick={() => requestSort('groupYearly')} style={{ cursor: 'pointer' }}>Group Yearly<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Renewable Premium</span>{getSortIndicator('groupYearly')}</th>
                                    <th onClick={() => requestSort('groupSingle')} style={{ cursor: 'pointer' }}>Group Single Premium<br /><span style={{ fontSize: '10px', textDecoration: 'underline' }}>Premium</span>{getSortIndicator('groupSingle')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTableData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.category}</td>
                                        <td>{row.unit}</td>
                                        <td>{row.period}</td>
                                        <td>{row.groupNonSingle.toLocaleString('en-IN')}</td>
                                        <td>{row.indSingle.toLocaleString('en-IN')}</td>
                                        <td>{row.indNonSingle.toLocaleString('en-IN')}</td>
                                        <td>{row.groupYearly.toLocaleString('en-IN')}</td>
                                        <td>{row.groupSingle.toLocaleString('en-IN')}</td>
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
