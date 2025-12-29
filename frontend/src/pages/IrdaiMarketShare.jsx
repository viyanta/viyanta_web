import React, { useState, useEffect } from 'react';
import TabLayout from './IrdaiSharedLayout';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

const IrdaiMarketShare = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [insurerName, setInsurerName] = useState('');


    const [premiumTypeSelection, setPremiumTypeSelection] = useState('Individual Single Premium');
    const [expandedInsurers, setExpandedInsurers] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Scroll Handler
    const handleCardClick = (targetId) => {
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

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



    // Toggle Insurer Expansion
    const toggleInsurer = (idx) => {
        setExpandedInsurers(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    // State for options
    const [insurerNames, setInsurerNames] = useState([]);

    // Fetch Insurers on Mount
    useEffect(() => {
        const fetchInsurers = async () => {
            try {
                const data = await api.getInsurers();
                setInsurerNames(data);
                // Default to first insurer if available and none selected
                if (data.length > 0 && !insurerName) {
                    setInsurerName(data[0].value);
                }
            } catch (error) {
                console.error("Failed to fetch insurers", error);
            }
        };
        fetchInsurers();
    }, []);

    // State for options
    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);

    // Fetch Period Types
    useEffect(() => {
        const fetchPeriodTypes = async () => {
            try {
                const types = await api.getIrdaiPeriodTypes();
                setPeriodTypes(types);
                // Ensure default periodType is valid
                if (types.length > 0) {
                    // Check if current periodType is in the new list, if not set to first
                    const currentExists = types.find(t => t.value === periodType || t.label === periodType);
                    if (!currentExists) {
                        setPeriodType(types[0].value);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch period types", error);
            }
        };
        fetchPeriodTypes();
    }, []);

    // Fetch Period Options when Period Type changes
    useEffect(() => {
        const fetchPeriodOptions = async () => {
            if (!periodType) return;
            setLoadingPeriods(true);
            try {
                let typeValue = periodType;
                const typeObj = periodTypes.find(t => t.label === periodType || t.value === periodType);
                if (typeObj) typeValue = typeObj.value;

                const options = await api.getIrdaiPeriodOptions(typeValue);
                setPeriodOptions(options);

                // Default selection
                if (options && options.length > 0) {
                    setSelectedPeriod(options[0].label);
                } else {
                    setSelectedPeriod('');
                }
            } catch (error) {
                console.error("Failed to fetch period options", error);
                setPeriodOptions([]);
            } finally {
                setLoadingPeriods(false);
            }
        };
        fetchPeriodOptions();
    }, [periodType, periodTypes]);
    // State for options
    const [premiumTypes, setPremiumTypes] = useState([]);

    // Fetch Premium Types
    useEffect(() => {
        const fetchPremiumTypes = async () => {
            try {
                const types = await api.getIrdaiPremiumTypes();
                // Ensure unique values and proper format
                const uniqueTypes = [...new Set(types.map(t => t.value || t.label || t))];
                setPremiumTypes(uniqueTypes);

                // Set default selection if not already set or invalid
                if (uniqueTypes.length > 0 && !uniqueTypes.includes(premiumTypeSelection)) {
                    setPremiumTypeSelection(uniqueTypes[0]);
                }
            } catch (error) {
                console.error("Failed to fetch premium types", error);
            }
        };
        fetchPremiumTypes();
    }, []);

    // Data State
    const [marketShareData, setMarketShareData] = useState([]);
    const [kpiData, setKpiData] = useState([
        { title: 'First Year Premium', value: '0.00', unit: '% Share', color: 'blue', targetId: 'chart-fyp' },
        { title: 'Sum Assured', value: '0.00', unit: '% Share', color: 'green', targetId: 'chart-sa' },
        { title: 'Number of Lives', value: '0.00', unit: '% Share', color: 'purple', targetId: 'chart-nol' },
        { title: 'No of Policies', value: '0.00', unit: '% Share', color: 'orange', targetId: 'chart-nop' }
    ]);
    const [loadingData, setLoadingData] = useState(false);

    // Sort Data
    const sortedMarketShareData = React.useMemo(() => {
        return marketShareData.map(row => {
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
                        // Numeric columns (stored as strings in values object)
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
    }, [marketShareData, sortConfig]);

    // Fetch Market Share Data
    useEffect(() => {
        const fetchData = async () => {
            if (!insurerName || !selectedPeriod || periodOptions.length === 0) return;

            // Find dates from periodOptions based on selectedPeriod label
            // (Assuming periodOptions contains objects with {label, start_date, end_date})
            const periodObj = periodOptions.find(p => (p.label || p) === selectedPeriod);
            if (!periodObj || !periodObj.start_date) return;

            setLoadingData(true);
            try {
                const data = await api.getMarketSharePremiumByInsurer(
                    insurerName,
                    periodObj.start_date,
                    periodObj.end_date
                );

                // Calculate Totals
                const totalFyp = data.reduce((acc, curr) => acc + (curr.fyp_pct || 0), 0);
                const totalSa = data.reduce((acc, curr) => acc + (curr.sa_pct || 0), 0);
                const totalNol = data.reduce((acc, curr) => acc + (curr.nol_pct || 0), 0);
                const totalNop = data.reduce((acc, curr) => acc + (curr.nop_pct || 0), 0);

                // Update Table Data
                const totalRow = {
                    insurer: insurerName,
                    values: {
                        premium: totalFyp.toFixed(2),
                        policies: totalNop.toFixed(2),
                        lives: totalNol.toFixed(2),
                        sum: totalSa.toFixed(2),
                    },
                    subRows: data.map(d => ({
                        type: d.premium_type,
                        values: {
                            premium: (d.fyp_pct || 0).toFixed(2),
                            policies: (d.nop_pct || 0).toFixed(2),
                            lives: (d.nol_pct || 0).toFixed(2),
                            sum: (d.sa_pct || 0).toFixed(2),
                        }
                    }))
                };
                setMarketShareData([totalRow]);

                // Update KPIs
                setKpiData([
                    { title: 'First Year Premium', value: totalFyp.toFixed(2) + '%', unit: '% Share', color: 'blue', targetId: 'chart-fyp' },
                    { title: 'Sum Assured', value: totalSa.toFixed(2) + '%', unit: '% Share', color: 'green', targetId: 'chart-sa' },
                    { title: 'Number of Lives', value: totalNol.toFixed(2) + '%', unit: '% Share', color: 'purple', targetId: 'chart-nol' },
                    { title: 'No of Policies', value: totalNop.toFixed(2) + '%', unit: '% Share', color: 'orange', targetId: 'chart-nop' }
                ]);

            } catch (e) {
                console.error("Failed to fetch market share data", e);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [insurerName, selectedPeriod, periodOptions]);

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
                            style={{ width: '140px', minWidth: '140px' }}
                            value={insurerName}
                            onChange={(e) => setInsurerName(e.target.value)}
                        >
                            {insurerNames.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Premium Type</label>
                        <select
                            className="custom-select"
                            style={{ width: '140px', minWidth: '140px' }}
                            value={premiumTypeSelection}
                            onChange={(e) => setPremiumTypeSelection(e.target.value)}
                        >
                            {premiumTypes.map((type, idx) => (
                                <option key={idx} value={type.value || type}>{type.label || type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period Type</label>
                        <select
                            className="custom-select"
                            style={{ width: '100px', minWidth: '100px' }}
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value)}
                        >
                            {periodTypes.map((p, idx) => (
                                <option key={idx} value={p.value || p}>{p.label || p}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period</label>
                        <select
                            className="custom-select"
                            style={{ width: '100px', minWidth: '100px' }}
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            disabled={loadingPeriods}
                        >
                            {periodOptions.map((p, idx) => (
                                <option key={idx} value={p.label || p}>{p.label || p}</option>
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
                                <h3 className={`kpi-title ${kpi.color}`}>{kpi.title}</h3>
                                <div className={`kpi-value ${kpi.color}`}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
                        {/* FYP Chart */}
                        <div id="chart-fyp" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>First Year Premium (%)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={marketShareData.length > 0 && marketShareData[0].subRows ? marketShareData[0].subRows : []}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="type"
                                        tickFormatter={(val) => val.replace(' Individual', ' Ind').replace(' Group', ' Grp').replace(' Premium', '').replace(' Renewable', ' Ren')}
                                        tick={{ fontSize: 10 }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Share']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="values.premium" fill="#0088FE" name="FYP" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="values.premium" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* SA Chart */}
                        <div id="chart-sa" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>Sum Assured (%)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={marketShareData.length > 0 && marketShareData[0].subRows ? marketShareData[0].subRows : []}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="type"
                                        tickFormatter={(val) => val.replace(' Individual', ' Ind').replace(' Group', ' Grp').replace(' Premium', '').replace(' Renewable', ' Ren')}
                                        tick={{ fontSize: 10 }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Share']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="values.sum" fill="#00C49F" name="Sum Assured" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="values.sum" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOP Chart */}
                        <div id="chart-nop" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Policies (%)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={marketShareData.length > 0 && marketShareData[0].subRows ? marketShareData[0].subRows : []}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="type"
                                        tickFormatter={(val) => val.replace(' Individual', ' Ind').replace(' Group', ' Grp').replace(' Premium', '').replace(' Renewable', ' Ren')}
                                        tick={{ fontSize: 10 }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Share']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="values.policies" fill="#8884d8" name="Policies" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="values.policies" position="top" style={{ fontSize: '10px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* NOL Chart */}
                        <div id="chart-nol" className="chart-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '15px', color: '#555' }}>No. of Lives (%)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={marketShareData.length > 0 && marketShareData[0].subRows ? marketShareData[0].subRows : []}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="type"
                                        tickFormatter={(val) => val.replace(' Individual', ' Ind').replace(' Group', ' Grp').replace(' Premium', '').replace(' Renewable', ' Ren')}
                                        tick={{ fontSize: 10 }}
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Share']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="values.lives" fill="#FF8042" name="Lives" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="values.lives" position="top" style={{ fontSize: '10px', fill: '#666' }} />
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
                                    <th style={{ backgroundColor: '#fff', border: 'none' }}></th>
                                    <th colSpan="4" style={{ textAlign: 'center', fontWeight: 'bold' }}>Market Share in First Year Premium <br /> (Based on Premium Amount)</th>
                                </tr>
                                <tr>
                                    <th
                                        style={{ minWidth: '200px', fontWeight: 'bold' }}
                                    >
                                        Insurer Name
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('premium')}
                                    >
                                        First Year Premium{getSortIndicator('premium')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('policies')}
                                    >
                                        No. of Policies / Schemes{getSortIndicator('policies')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('lives')}
                                    >
                                        No. of lives covered under Group Schemes{getSortIndicator('lives')}
                                    </th>
                                    <th
                                        style={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => handleSort('sum')}
                                    >
                                        Sum Assured{getSortIndicator('sum')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMarketShareData.map((row, idx) => (
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
