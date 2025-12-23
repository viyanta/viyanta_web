import React, { useState, useEffect } from 'react';
import TabLayout from './IrdaiSharedLayout';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

const shortenCompanyName = (name) => {
    if (!name) return '';
    let shortName = name
        .replace('Life Insurance Corporation of India', 'LIC')
        .replace('Life Insurance Company Limited', '')
        .replace('Life Insurance Company Ltd', '')
        .replace('Like Insurance Company', '')
        .replace('Life Insurance Co. Ltd', '')
        .replace('Life Insurance', '')
        .replace('Limited', '')
        .replace('Ltd', '')
        .replace('Company', '')
        .replace('Co.', '')
        .trim();

    // Take first 2 words if still too long
    if (shortName.length > 15) {
        const words = shortName.split(' ');
        if (words.length > 2) {
            shortName = words.slice(0, 2).join(' ');
        }
    }
    return shortName;
};

const CustomizedContent = (props) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

    // Safeguard against missing root or children to prevent division by zero or access errors
    const childrenLength = root && root.children ? root.children.length : 0;

    if (!childrenLength) return null;

    // Only show text if there's enough space
    const showName = width > 80 && height > 30;
    const showRank = width > 30 && height > 30;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? colors[Math.floor((index / childrenLength) * 6) % colors.length] : 'none',
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {
                depth === 1 && showName ? (
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 7}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={14}
                        style={{ fontWeight: 500 }}
                    >
                        {shortenCompanyName(name)}
                    </text>
                ) : null
            }
            {
                depth === 1 && showRank ? (
                    <text
                        x={x + 4}
                        y={y + 18}
                        fill="#fff"
                        fontSize={12}
                        fillOpacity={0.9}
                    >
                        {index + 1}
                    </text>
                ) : null
            }
        </g>
    );
};

const IrdaiPremiumWise = () => {
    // Local State
    const [viewMode, setViewMode] = useState('visuals');
    const [periodType, setPeriodType] = useState('Monthly');
    const [selectedPeriod, setSelectedPeriod] = useState('Dec 24');
    const [premiumTypeSelection, setPremiumTypeSelection] = useState('Individual Single Premium');
    const [premiumTypes, setPremiumTypes] = useState([]);
    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [companyData, setCompanyData] = useState([]);

    // Fetch Premium Types
    useEffect(() => {
        const fetchPremiumTypes = async () => {
            try {
                const types = await api.getPremiumTypes();
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
                // Find the value for the selected label if needed, or assume periodType matches value/label logic
                // The API expects 'MONTH', 'Q', 'H', 'FY'. 
                // Checks if periodType is a label or value. 
                // Let's assume we store VALUE in state.
                let typeValue = periodType;
                const typeObj = periodTypes.find(t => t.label === periodType || t.value === periodType);
                if (typeObj) typeValue = typeObj.value;

                console.log("Fetching options for:", typeValue);
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

    // Fetch KPI Data (Grand Totals)
    useEffect(() => {
        const fetchKpiData = async () => {
            if (!premiumTypeSelection || !selectedPeriod || periodOptions.length === 0) return;

            // Find start/end date for selected period
            const selectedOpt = periodOptions.find(p => p.label === selectedPeriod);
            if (!selectedOpt) return;

            try {
                const data = await api.getPremiumGrandTotals(
                    premiumTypeSelection,
                    selectedOpt.start_date,
                    selectedOpt.end_date
                );

                setKpiData([
                    { title: 'First Year Premium', value: data.FYP?.toLocaleString('en-IN') || '0', unit: 'In INR Crs.', color: 'blue' },
                    { title: 'Sum Assured', value: data.SA?.toLocaleString('en-IN') || '0', unit: 'In INR Crs.', color: 'gray' },
                    { title: 'Number of Lives', value: data.NOL?.toLocaleString('en-IN') || '0', unit: 'In Nos.', color: 'green' },
                    { title: 'No of Policies', value: data.NOP?.toLocaleString('en-IN') || '0', unit: 'In Nos.', color: 'purple' }
                ]);
            } catch (error) {
                console.error("Failed to fetch KPI data", error);
            }
        };
        fetchKpiData();
    }, [premiumTypeSelection, selectedPeriod, periodOptions]);

    // Fetch Company Data
    useEffect(() => {
        const fetchCompanyData = async () => {
            if (!premiumTypeSelection || !selectedPeriod || periodOptions.length === 0) return;

            const selectedOpt = periodOptions.find(p => p.label === selectedPeriod);
            if (!selectedOpt) return;

            try {
                const data = await api.getPremiumWiseCompanies(
                    premiumTypeSelection,
                    selectedOpt.start_date,
                    selectedOpt.end_date
                );
                setCompanyData(data);
            } catch (error) {
                console.error("Failed to fetch company data", error);
                setCompanyData([]);
            }
        };
        fetchCompanyData();
    }, [premiumTypeSelection, selectedPeriod, periodOptions]);

    // Mock KPI Data
    const [kpiData, setKpiData] = useState([
        { title: 'First Year Premium', value: '0', unit: 'In INR Crs.', color: 'blue' },
        { title: 'Sum Assured', value: '0', unit: 'In INR Crs.', color: 'gray' },
        { title: 'Number of Lives', value: '0', unit: 'In Nos.', color: 'green' },
        { title: 'No of Policies', value: '0', unit: 'In Nos.', color: 'purple' }
    ]);

    // Mock Table Data for Premium Wise
    const premiumTableData = [
        { category: 'First Year Premium', unit: 'In Crs', period: 'Dec 24', value: '123.11' },
        { category: 'Sum Assured', unit: 'In Crs', period: 'Dec 24', value: '123.11' },
        { category: 'No. of lives covered under Group Schemes', unit: 'In Nos', period: 'Dec 24', value: '123.11' },
        { category: 'No of Policies / Schemes', unit: 'In Nos', period: 'Dec 24', value: '123.11' },
    ];

    return (
        <TabLayout
            viewMode={viewMode}
            setViewMode={setViewMode}
            summaryText={`Data Summary of ${premiumTypeSelection} > ${selectedPeriod}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Premium Type</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
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
                            <div key={idx} className={`kpi-card ${kpi.color}`}>
                                <span className="kpi-unit">{kpi.unit}</span>
                                <h3 className="kpi-title">{kpi.title}</h3>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriod}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-row">
                        <div className="chart-placeholder" style={{ flex: '2', minHeight: '400px', backgroundColor: '#fff', borderRadius: '8px', padding: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '10px', color: '#555' }}>Company Premium Distribution</h4>
                            <ResponsiveContainer width="100%" height={400}>
                                <Treemap
                                    width={400}
                                    height={200}
                                    data={companyData.slice(0, 5)}
                                    dataKey="fyp"
                                    nameKey="insurer_name"
                                    aspectRatio={4 / 3}
                                    stroke="#fff"
                                    fill="#8884d8"
                                    content={<CustomizedContent colors={COLORS} />}
                                >
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const formattedVal = value.toLocaleString('en-IN');
                                            // Ensure we check payload for the name source
                                            const displayName = props.payload.insurer_name || props.payload.name || name;
                                            return [`₹${formattedVal} Crs`, displayName];
                                        }}
                                        itemStyle={{ color: '#333' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    />
                                </Treemap>
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
                                    <th style={{ borderBottom: 'none', color: '#333' }}>Insurer Name</th>
                                    <th>FYP (Crs)</th>
                                    <th>SA (Crs)</th>
                                    <th>NOP (Nos)</th>
                                    <th>NOL (Nos)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companyData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.insurer_name}</td>
                                        <td style={{ textAlign: 'right' }}>{row.fyp ? row.fyp.toLocaleString('en-IN') : '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{row.sa ? row.sa.toLocaleString('en-IN') : '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{row.nop ? row.nop.toLocaleString('en-IN') : '0'}</td>
                                        <td style={{ textAlign: 'right' }}>{row.nol ? row.nol.toLocaleString('en-IN') : '0'}</td>
                                    </tr>
                                ))}
                                {companyData.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center' }}>No data available</td>
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

export default IrdaiPremiumWise;
