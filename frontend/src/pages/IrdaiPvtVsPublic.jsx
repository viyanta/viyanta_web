import React, { useState, useEffect, useContext } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
    PieChart, Pie, Cell
} from 'recharts';
import TabLayout from './IrdaiSharedLayout';
import api from '../services/api';
import { IrdaiViewModeContext } from '../components/IrdaiPageLayout';

const IrdaiPvtVsPublic = () => {
    // Local State
    const { viewMode, setViewMode } = useContext(IrdaiViewModeContext);
    const [loading, setLoading] = useState(false);

    // Filters
    const [periodTypes, setPeriodTypes] = useState([]);
    const [periodType, setPeriodType] = useState('MONTH'); // Default to MONTH value
    const [periodOptions, setPeriodOptions] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(''); // This will store the full object or JSON string to get start/end dates

    // New Filters
    const [sector, setSector] = useState('BOTH'); // PRIVATE | PUBLIC | BOTH
    const [premiumTypes, setPremiumTypes] = useState([]);
    const [selectedPremiumType, setSelectedPremiumType] = useState('ALL');

    // Data
    const [tableData, setTableData] = useState([]);

    // Constants
    const sectorOptions = [
        { label: 'Both', value: 'BOTH' },
        { label: 'Private', value: 'PRIVATE' },
        { label: 'Public', value: 'PUBLIC' }
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 1. Fetch Initial Data (Period Types & Premium Types) on Mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Period Types
                const irdaiTypes = await api.getIrdaiPeriodTypes();
                setPeriodTypes(irdaiTypes);

                if (irdaiTypes.length > 0) {
                    setPeriodType(irdaiTypes[0].value);
                }

                // Fetch Premium Types
                const pTypes = await api.getIrdaiPremiumTypes();
                // Add "All" option if not present, though backend handles "ALL"
                const allOption = { label: 'All Premium Types', value: 'ALL' };
                setPremiumTypes([allOption, ...pTypes]);

            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };
        fetchInitialData();
    }, []);

    // 2. Fetch Period Options when Period Type Changes
    useEffect(() => {
        const fetchPeriodOptions = async () => {
            if (!periodType) return;
            try {
                const opts = await api.getIrdaiPeriodOptions(periodType);
                setPeriodOptions(opts);

                // Select first option by default
                if (opts.length > 0) {
                    setSelectedPeriod(JSON.stringify(opts[0]));
                } else {
                    setSelectedPeriod('');
                }
            } catch (err) {
                console.error("Error fetching period options", err);
                setPeriodOptions([]);
            }
        };
        fetchPeriodOptions();
    }, [periodType]);

    // 3. Fetch Table Data when any Filter Changes
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedPeriod) return;

            try {
                setLoading(true);
                const periodObj = JSON.parse(selectedPeriod);
                const { start_date, end_date } = periodObj;

                const data = await api.getPvtVsPublicTable(start_date, end_date, sector, selectedPremiumType);
                processTableData(data);
            } catch (err) {
                console.error("Error fetching table data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedPeriod, sector, selectedPremiumType]);

    // Helper to process flat API data into nested structure
    const processTableData = (rawData) => {
        // rawData is ordered by section_order, row_order
        // We need to group by section (insurer_name maps to section)

        const sectionsMap = {};

        rawData.forEach(row => {
            const sectionName = row.insurer_name;

            if (!sectionsMap[sectionName]) {
                sectionsMap[sectionName] = {
                    section: sectionName === 'LIC of India' ? 'Public Total' : sectionName, // Rename LIC to Public Total for consistency
                    values: {}, // Will hold the total row values
                    rows: [] // Will hold the breakdown rows
                };
            }

            // Format numbers
            const formattedRow = {
                name: row.row_name,
                premium: formatNumber(row.fyp),
                policies: formatNumber(row.nop),
                lives: formatNumber(row.nol),
                sum: formatNumber(row.sa)
            };

            if (row.row_order === 0) {
                // This is the total row
                sectionsMap[sectionName].values = formattedRow;
            } else {
                sectionsMap[sectionName].rows.push(formattedRow);
            }
        });

        // Convert map to array, respecting original order from data
        const sections = [];
        const seenSections = new Set();

        rawData.forEach(row => {
            if (!seenSections.has(row.insurer_name)) {
                seenSections.add(row.insurer_name);
                sections.push(sectionsMap[row.insurer_name]);
            }
        });

        // Handle case where we have a section but no total row (happens when filtering by premium type)
        // Ensure every section has a 'values' object populated by summing rows if necessary
        sections.forEach(sec => {
            if (!sec.values || Object.keys(sec.values).length === 0) {
                // Calculate totals from rows
                let totalPremium = 0;
                let totalPolicies = 0;
                let totalLives = 0;
                let totalSum = 0;

                sec.rows.forEach(r => {
                    totalPremium += parseValue(r.premium);
                    totalPolicies += parseValue(r.policies);
                    totalLives += parseValue(r.lives);
                    totalSum += parseValue(r.sum);
                });

                sec.values = {
                    premium: formatNumber(totalPremium),
                    policies: formatNumber(totalPolicies),
                    lives: formatNumber(totalLives),
                    sum: formatNumber(totalSum)
                };
            }
        });

        setTableData(sections);
    };

    const formatNumber = (val) => {
        if (val === null || val === undefined) return '0';
        if (typeof val === 'string' && val.includes(',')) return val;
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);
    };

    const parseValue = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        // Handle string number parsing properly: remove commas and parse
        return parseFloat(String(val).replace(/,/g, ''));
    };

    const getSelectedPeriodLabel = () => {
        if (!selectedPeriod) return '';
        try {
            return JSON.parse(selectedPeriod).label;
        } catch {
            return '';
        }
    };

    // --- Chart Renderers ---

    const getSectionColor = (sectionName) => {
        switch (sectionName) {
            case 'Grand Total': return '#8884d8'; // Purple
            case 'Private Total': return '#0088FE'; // Blue
            case 'Public Total': return '#00C49F'; // Green (or Teal)
            default: return '#FF8042'; // Orange default
        }
    };

    const renderCharts = () => {
        if (loading || tableData.length === 0) return null;

        // Breakdown Data (Rows within sections)
        // We will create specific charts for each section available, including Grand Total now as requested
        const sectionBreakdowns = tableData
            .filter(s => s.rows.length > 0)
            .map(s => ({
                sectionName: s.section,
                color: getSectionColor(s.section),
                data: s.rows.map(r => ({
                    name: r.name,
                    premium: parseValue(r.premium),
                    policies: parseValue(r.policies)
                }))
            }));

        return (
            <div className="charts-container" style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* Breakdown Section */}
                {sectionBreakdowns.map((sec, idx) => (
                    <div key={idx} className="chart-section">
                        <h4 style={{ textAlign: 'left', marginBottom: '15px', color: '#555' }}>{sec.sectionName}</h4>
                        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <div className="chart-scroll-wrapper">
                                <div className="chart-content" style={{ height: Math.max(sec.data.length * 50, 300) + 'px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={sec.data} margin={{ left: 20, right: 50 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(val) => val.toLocaleString()} />
                                            <Bar dataKey="premium" fill={sec.color} name="Premium" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="premium" position="right" formatter={(val) => val.toLocaleString()} fontSize={12} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <TabLayout
            summaryText={`${viewMode === 'visuals' ? 'Pvt. Vs Public-Visual' : 'Pvt. Vs Public Data'} > ${getSelectedPeriodLabel()}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Private or Public</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                        >
                            {sectorOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Premium Type</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '180px' }}
                            value={selectedPremiumType}
                            onChange={(e) => setSelectedPremiumType(e.target.value)}
                        >
                            {premiumTypes.map(pt => (
                                <option key={pt.value} value={pt.value}>{pt.label}</option>
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
                            {periodOptions.map((p, idx) => (
                                <option key={idx} value={JSON.stringify(p)}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </>
            }
        >
            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading data...</div>
            ) : viewMode === 'visuals' ? (
                <div className="visuals-view" style={{ padding: '0 20px' }}>
                    {tableData.map((section, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: '10px 0', fontSize: '1.1rem', fontWeight: 'bold', color: getSectionColor(section.section) }}>
                                {section.section === 'Grand Total' ? 'TOTAL' : section.section}
                            </h4>
                            <div className="kpi-grid">
                                <div className="kpi-card" style={{ border: `1px solid ${getSectionColor(section.section)}`, borderLeftWidth: '5px' }}>
                                    <span className="kpi-unit">In Crs.</span>
                                    <h3 className="kpi-title">Premium</h3>
                                    <div className="kpi-value">{section.values.premium}</div>
                                </div>
                                <div className="kpi-card" style={{ border: `1px solid ${getSectionColor(section.section)}`, borderLeftWidth: '5px' }}>
                                    <span className="kpi-unit">In Crs.</span>
                                    <h3 className="kpi-title">Sum Assured</h3>
                                    <div className="kpi-value">{section.values.sum}</div>
                                </div>
                                <div className="kpi-card" style={{ border: `1px solid ${getSectionColor(section.section)}`, borderLeftWidth: '5px' }}>
                                    <span className="kpi-unit">In Nos.</span>
                                    <h3 className="kpi-title">Lives Covered</h3>
                                    <div className="kpi-value">{section.values.lives}</div>
                                </div>
                                <div className="kpi-card" style={{ border: `1px solid ${getSectionColor(section.section)}`, borderLeftWidth: '5px' }}>
                                    <span className="kpi-unit">In Nos.</span>
                                    <h3 className="kpi-title">No. of Policies</h3>
                                    <div className="kpi-value">{section.values.policies}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {renderCharts()}

                    {tableData.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>No data available for selected filters</div>
                    )}
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper">
                        <table className="irdai-data-table">
                            <thead>
                                <tr>
                                    <th colSpan="8" style={{ borderBottom: 'none', backgroundColor: '#fff' }}>
                                        <div style={{ color: 'blue', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                                            Pvt and Public Summary &gt; &gt;  {getSelectedPeriodLabel()}
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
                                {tableData.map((section, idx) => (
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
                                {tableData.length === 0 && (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No data available for selected period</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiPvtVsPublic;
