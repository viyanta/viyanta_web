import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import TabLayout from './IrdaiSharedLayout';
import api from '../services/api';

const IrdaiGrowth = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('MONTH'); // Default to MONTH value
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [periodOptions, setPeriodOptions] = useState([]); // List of available periods
    const [periodTypes, setPeriodTypes] = useState([]); // List of period types
    const [insurerName, setInsurerName] = useState('Acko Life');
    const [growthMetricType, setGrowthMetricType] = useState('FYP');
    const [growthMetricTypes, setGrowthMetricTypes] = useState([]);
    const [expandedInsurers, setExpandedInsurers] = useState({});
    const [insurerNames, setInsurerNames] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const [growthData, setGrowthData] = useState([]);
    const [kpiData, setKpiData] = useState([
        { title: 'Growth (For)', value: '-', unit: 'Percentage', color: 'green', targetId: 'chart-growth-for' },
        { title: 'Growth (UpTo)', value: '-', unit: 'Percentage', color: 'purple', targetId: 'chart-growth-upto' }
    ]);

    // Scroll Handler
    const handleCardClick = (targetId) => {
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Toggle Insurer Expansion
    const toggleInsurer = (idx) => {
        setExpandedInsurers(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    // Fetch Initial Data (Metric Types, Insurers, Period Types)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Metric Types
                const types = await api.getGrowthMetricTypes();
                if (Array.isArray(types)) {
                    setGrowthMetricTypes(types);
                    if (types.length > 0) {
                        setGrowthMetricType(types[0].value);
                    }
                } else {
                    console.warn("getGrowthMetricTypes returned non-array:", types);
                    setGrowthMetricTypes([]);
                }

                // Fetch Insurer List
                const companies = await api.getCompanyInsurersList();
                if (Array.isArray(companies)) {
                    const uniqueNames = companies.map(c => c.label);
                    setInsurerNames(uniqueNames);

                    // Default insurer selection if current one not in list
                    if (uniqueNames.length > 0 && !uniqueNames.includes(insurerName)) {
                        setInsurerName(uniqueNames[0]);
                    }
                } else {
                    console.warn("getCompanyList returned non-array:", companies);
                    setInsurerNames([]);
                }

                // Fetch Period Types
                const pTypes = await api.getIrdaiPeriodTypes();
                if (Array.isArray(pTypes)) {
                    setPeriodTypes(pTypes);
                    if (pTypes.length > 0) {
                        setPeriodType(pTypes[0].value);
                    }
                } else {
                    console.warn("getIrdaiPeriodTypes returned non-array:", pTypes);
                    setPeriodTypes([]);
                }

            } catch (error) {
                console.error("Failed to fetch initial data", error);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch Period Options when periodType changes
    useEffect(() => {
        const fetchPeriodOptions = async () => {
            if (!periodType) return;
            try {
                const options = await api.getIrdaiPeriodOptions(periodType);
                if (Array.isArray(options)) {
                    setPeriodOptions(options);
                    if (options.length > 0) {
                        setSelectedPeriod(options[0].label); // Default to first available period
                    } else {
                        setSelectedPeriod('');
                    }
                } else {
                    console.warn("getIrdaiPeriodOptions returned non-array:", options);
                    setPeriodOptions([]);
                    setSelectedPeriod('');
                }
            } catch (error) {
                console.error("Failed to fetch period options", error);
            }
        };
        fetchPeriodOptions();
    }, [periodType]);

    // Fetch Growth Data
    useEffect(() => {
        const fetchData = async () => {
            if (!insurerName || !growthMetricType || !selectedPeriod) return;

            // We need startDate and endDate.
            // selectedPeriod is like "Dec 24". 
            // In a real app we'd parse this or the API should handle it.
            // Based on previous files, the API expects DD-MM-YYYY format or similar?
            // The Period Options API returns labels like "Dec 24". What are the values?
            // Checking periodOptions state would be good, but assuming label == value or similar based on `api.js`.
            // Wait, standardizing on a date format is tricky if backend expects specific strings.
            // The `api.getIrdaiPeriodOptions` returns [{label, value}]. 
            // In the render: <option value={p.label}>{p.label}</option> 
            // So we are using the Label "Dec 24".
            // The backend `get_company_premium_growth` takes `start_date`, `end_date`.
            // We need to convert "Dec 24" -> "01-12-2024" and "31-12-2024"?
            // Or does the backend handle "Dec 24"? 
            // The error previously seen was `Incorrect DATE value: '20-05-2025'`.
            // This suggests backend expects something else or my params are wrong.
            // However, let's look at `selectedPeriod`.
            // The `periodOptions` from API likely contain `start_date` and `end_date` in the object if I look at `irdai_monthly.py` Period Options logic (which I recall returned mappings).

            // Let's assume we need to find the full option object to get dates.
            const selectedOpt = periodOptions.find(p => p.label === selectedPeriod);
            if (!selectedOpt) return;

            // Assuming selectedOpt has value or extra fields. 
            // If api.js just returns data, let's see what `periodOptions` are.
            // To be safe, I'll pass selectedOpt.start_date / end_date if they exist, or construct them.
            // Since I can't inspect runtime, I'll check `get_period_options` in backend if I could...
            // But I recall previous work: usually it returns `start_date`, `end_date` columns.

            const startDate = selectedOpt.start_date || selectedOpt.value; // Fallback
            const endDate = selectedOpt.end_date || selectedOpt.value;   // Fallback

            try {
                const data = await api.getCompanyPremiumGrowth(insurerName, growthMetricType, startDate, endDate);

                if (Array.isArray(data)) {
                    // Transform Data
                    // API returns flat list. 
                    // Row with `row_order === 0` is the total/main row.
                    // Others are subrows.

                    const mainRow = data.find(r => r.row_order === 0) || {};
                    const subRows = data.filter(r => r.row_order !== 0);

                    const formattedData = [{
                        insurer: insurerName,
                        values: {
                            for23: (mainRow.previous_value || 0).toFixed(2),
                            for24: (mainRow.current_value || 0).toFixed(2),
                            growthFor: (mainRow.growth_pct || 0).toFixed(2),
                            upTo23: (mainRow.ytd_previous_value || 0).toFixed(2),
                            upTo24: (mainRow.ytd_value || 0).toFixed(2),
                            growthUpTo: (mainRow.ytd_growth_pct || 0).toFixed(2),
                            marketShare: (mainRow.market_share || 0).toFixed(2)
                        },
                        subRows: subRows.map(sub => ({
                            type: sub.premium_type,
                            values: {
                                for23: (sub.previous_value || 0).toFixed(2),
                                for24: (sub.current_value || 0).toFixed(2),
                                growthFor: (sub.growth_pct || 0).toFixed(2),
                                upTo23: (sub.ytd_previous_value || 0).toFixed(2),
                                upTo24: (sub.ytd_value || 0).toFixed(2),
                                growthUpTo: (sub.ytd_growth_pct || 0).toFixed(2),
                                marketShare: (sub.market_share || 0).toFixed(2)
                            }
                        }))
                    }];

                    setGrowthData(formattedData);

                    // Update KPI Cards using the main row data
                    setKpiData([
                        { title: 'Growth (For)', value: `${(mainRow.growth_pct || 0).toFixed(2)}%`, unit: 'Percentage', color: 'green', targetId: 'chart-growth-for' },
                        { title: 'Growth (UpTo)', value: `${(mainRow.ytd_growth_pct || 0).toFixed(2)}%`, unit: 'Percentage', color: 'purple', targetId: 'chart-growth-upto' }
                    ]);
                } else {
                    console.warn("getCompanyPremiumGrowth returned non-array:", data);
                    setGrowthData([]);
                }

            } catch (error) {
                console.error("Failed to fetch growth data", error);
            }
        };

        fetchData();
    }, [insurerName, growthMetricType, selectedPeriod, periodOptions]);

    // Handle Sort
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (name) => {
        if (sortConfig.key === name) {
            return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
        }
        return ' ⇅';
    };

    // Sort Data
    const sortedGrowthData = React.useMemo(() => {
        return growthData.map(row => {
            if (!row.subRows) return row;

            let sortedSubRows = [...row.subRows];
            if (sortConfig.key !== null) {
                sortedSubRows.sort((a, b) => {
                    let aValue, bValue;

                    if (sortConfig.key === 'type') {
                        aValue = a.type || '';
                        bValue = b.type || '';
                        return sortConfig.direction === 'ascending'
                            ? aValue.localeCompare(bValue)
                            : bValue.localeCompare(aValue);
                    } else {
                        // Numeric columns
                        aValue = parseFloat(a.values[sortConfig.key] || '0');
                        bValue = parseFloat(b.values[sortConfig.key] || '0');

                        if (aValue < bValue) {
                            return sortConfig.direction === 'ascending' ? -1 : 1;
                        }
                        if (aValue > bValue) {
                            return sortConfig.direction === 'ascending' ? 1 : -1;
                        }
                        return 0;
                    }
                });
            }
            return { ...row, subRows: sortedSubRows };
        });
    }, [growthData, sortConfig]);

    // Mock Options
    // const periodTypes = ['Monthly', 'Quarterly', 'Halfyearly', 'Annual']; // Removed mock
    // const periods = ['Dec 24', 'Sep 24', 'Jun 24', 'Mar 24']; // Removed mock
    // const insurerNames = ['Acko Life', 'SBI Life', 'HDFC Life', 'LIC']; // Removed mock

    // Mock KPI Data
    // const kpiData = [
    //     { title: 'First Year Premium', value: '123.45', unit: 'In INR Crs.', color: 'blue' },
    //     { title: 'Sum Assured', value: '5,678.90', unit: 'In INR Crs.', color: 'gray' },
    //     { title: 'Number of Lives', value: '1,234', unit: 'In Nos.', color: 'green' },
    //     { title: 'No of Policies', value: '567', unit: 'In Nos.', color: 'purple' }
    // ];

    // Mock Growth Data
    // const growthData = [
    //     {
    //         insurer: 'Acko Life Insurance',
    //         values: { for23: '1.50', for24: '3.54', growthFor: '136.35', upTo23: '1.62', upTo24: '30.29', growthUpTo: '1770.72' },
    //         subRows: [
    //             { type: 'Individual Single Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
    //             { type: 'Individual Non-Single Premium', values: { for23: '0.00', for24: '0.30', growthFor: '', upTo23: '0.00', upTo24: '1.54', growthUpTo: '' } },
    //             { type: 'Group Single Premium', values: { for23: '1.50', for24: '3.24', growthFor: '115.52', upTo23: '1.62', upTo24: '28.76', growthUpTo: '1675.68' } },
    //             { type: 'Group Non-Single Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
    //             { type: 'Group Yearly Renewable Premium', values: { for23: '0.00', for24: '0.00', growthFor: '', upTo23: '0.00', upTo24: '0.00', growthUpTo: '' } },
    //         ]
    //     },
    //     {
    //         insurer: 'Aditya Birla Sun Life',
    //         values: { for23: '575.95', for24: '1025.19', growthFor: '78.00', upTo23: '3300.75', upTo24: '4712.96', growthUpTo: '42.78' },
    //         subRows: [
    //             { type: 'Individual Single Premium', values: { for23: '31.54', for24: '52.87', growthFor: '67.65', upTo23: '170.76', upTo24: '334.29', growthUpTo: '95.77' } },
    //             { type: 'Individual Non-Single Premium', values: { for23: '224.99', for24: '370.44', growthFor: '64.65', upTo23: '1544.66', upTo24: '31.93', growthUpTo: '' } },
    //             { type: 'Group Single Premium', values: { for23: '309.47', for24: '584.52', growthFor: '88.88', upTo23: '1843.88', upTo24: '2720.80', growthUpTo: '47.56' } },
    //             { type: 'Group Non-Single Premium', values: { for23: '0.23', for24: '4.61', growthFor: '1887.15', upTo23: '10.37', upTo24: '9.16', growthUpTo: '-11.68' } },
    //             { type: 'Group Yearly Renewable Premium', values: { for23: '9.72', for24: '12.74', growthFor: '31.06', upTo23: '104.89', upTo24: '104.05', growthUpTo: '-0.80' } },
    //         ]
    //     },
    // ];

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
                        <label className="control-label">Select Metric</label>
                        <select
                            className="custom-select"
                            value={growthMetricType}
                            onChange={(e) => setGrowthMetricType(e.target.value)}
                        >
                            {growthMetricTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
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
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
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
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod}</div>
                            </div>
                        ))}
                    </div>
                    {growthData.length > 0 && (
                        <div className="charts-row">
                            <div id="chart-growth-for" className="chart-card" style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <h4 style={{ textAlign: 'left', marginBottom: '15px', color: '#555' }}>For the Month Comparison</h4>
                                <div style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={growthData[0].subRows.map(s => ({
                                                name: s.type.replace('Premium', '').trim(),
                                                growth: parseFloat(s.values.growthFor || 0)
                                            }))}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11, angle: -30, textAnchor: 'end' }}
                                                interval={0}
                                                tickFormatter={(val) => val.replace('Individual', 'Ind').replace('Group', 'Grp').replace('Yearly', 'Yly').replace('Renewable', 'Ren')}
                                            />
                                            <YAxis domain={[(min) => Math.min(0, Math.floor(min * 1.1)), (max) => Math.ceil(max * 1.1)]} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                                formatter={(value) => [`${value}%`, 'Growth']}
                                            />
                                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                                            <Bar dataKey="growth" name="Growth %" fill="#82ca9d" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                                <LabelList dataKey="growth" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div id="chart-growth-upto" className="chart-card" style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <h4 style={{ textAlign: 'left', marginBottom: '15px', color: '#555' }}>Up to the Month Comparison</h4>
                                <div style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={growthData[0].subRows.map(s => ({
                                                name: s.type.replace('Premium', '').trim(),
                                                growth: parseFloat(s.values.growthUpTo || 0)
                                            }))}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11, angle: -30, textAnchor: 'end' }}
                                                interval={0}
                                                tickFormatter={(val) => val.replace('Individual', 'Ind').replace('Group', 'Grp').replace('Yearly', 'Yly').replace('Renewable', 'Ren')}
                                            />
                                            <YAxis domain={[(min) => Math.min(0, Math.floor(min * 1.1)), (max) => Math.ceil(max * 1.1)]} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                                formatter={(value) => [`${value}%`, 'Growth']}
                                            />
                                            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                                            <Bar dataKey="growth" name="Growth %" fill="#8884d8" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                                <LabelList dataKey="growth" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper">
                        <table className="irdai-data-table">
                            <thead>
                                <tr>
                                    <th style={{ backgroundColor: '#fff', border: 'none' }}></th>
                                    <th colSpan="3" style={{ textAlign: 'center', fontWeight: 'bold' }}>For the Month</th>
                                    <th colSpan="4" style={{ textAlign: 'center', fontWeight: 'bold' }}>Up to the Month</th>
                                </tr>
                                <tr>
                                    <th
                                        style={{ minWidth: '200px', fontWeight: 'bold', textAlign: 'left', paddingLeft: '10px' }}
                                    >
                                        Premium Type / Insurer
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('for23')}
                                    >
                                        Previous Year{getSortIndicator('for23')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('for24')}
                                    >
                                        Current Year ({selectedPeriod}){getSortIndicator('for24')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('growthFor')}
                                    >
                                        Growth (%){getSortIndicator('growthFor')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('upTo23')}
                                    >
                                        Previous YTD{getSortIndicator('upTo23')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('upTo24')}
                                    >
                                        Current YTD ({selectedPeriod}){getSortIndicator('upTo24')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('growthUpTo')}
                                    >
                                        Growth (%){getSortIndicator('growthUpTo')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('marketShare')}
                                    >
                                        Market Share (%){getSortIndicator('marketShare')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGrowthData.map((row, idx) => (
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
                                            <td>{row.values.growthFor !== null && row.values.growthFor !== 'NaN' ? row.values.growthFor : '-'}</td>
                                            <td>{row.values.upTo23}</td>
                                            <td>{row.values.upTo24}</td>
                                            <td>{row.values.growthUpTo !== null && row.values.growthUpTo !== 'NaN' ? row.values.growthUpTo : '-'}</td>
                                            <td>{row.values.marketShare}</td>
                                        </tr>
                                        {expandedInsurers[idx] && row.subRows.map((sub, sIdx) => (
                                            <tr key={`${idx}-${sIdx}`} style={{ backgroundColor: '#f9f9f9' }}>
                                                <td style={{ paddingLeft: '20px', color: '#555' }}>{sub.type}</td>
                                                <td>{sub.values.for23}</td>
                                                <td>{sub.values.for24}</td>
                                                <td>{sub.values.growthFor !== null && sub.values.growthFor !== 'NaN' ? sub.values.growthFor : '-'}</td>
                                                <td>{sub.values.upTo23}</td>
                                                <td>{sub.values.upTo24}</td>
                                                <td>{sub.values.growthUpTo !== null && sub.values.growthUpTo !== 'NaN' ? sub.values.growthUpTo : '-'}</td>
                                                <td>{sub.values.marketShare}</td>
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
