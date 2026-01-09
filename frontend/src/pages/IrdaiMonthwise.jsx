import React, { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import TabLayout from './IrdaiSharedLayout';
import { IrdaiViewModeContext } from '../components/IrdaiPageLayout';
import api from '../services/api';

const IrdaiMonthwise = () => {
    // Local State
    const { viewMode, setViewMode } = useContext(IrdaiViewModeContext);
    const [periodType, setPeriodType] = useState('MONTH');
    const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('');
    const [insurerName, setInsurerName] = useState('');
    const [insurerNames, setInsurerNames] = useState([]);
    const [expandedInsurers, setExpandedInsurers] = useState({});

    const toggleInsurer = (name) => {
        setExpandedInsurers(prev => ({ ...prev, [name]: !prev[name] }));
    };

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
                const companies = await api.getCompanyInsurersList();
                const uniqueNames = companies.map(c => c.label);
                setInsurerNames(uniqueNames);
                if (uniqueNames.length > 0 && !insurerName) {
                    setInsurerName(uniqueNames[0]);
                }

                // 2. Fetch Period Types
                const types = await api.getIrdaiPeriodTypes();
                // Filter to only include Monthly
                const monthlyTypes = types.filter(t => t.label === 'Monthly');
                setPeriodTypes(monthlyTypes);
                // Set default period type if available (e.g., 'MONTH')
                if (monthlyTypes.length > 0) {
                    setPeriodType(monthlyTypes[0].value);
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
                const allData = await api.getMonthwiseCompanyAllMetrics(
                    insurerName, // Passed but ignored by API call now
                    selectedOpt.start_date,
                    selectedOpt.end_date
                );
                // Backend returns all companies now, and user wants full list.
                // WE DO NOT FILTER BY INSURER ANYMORE

                // Sort data: Private Total and Grand Total at the bottom
                const sortedData = (allData || []).slice().sort((a, b) => {
                    const isTotalA = a.insurer_name === 'Grand Total' || a.insurer_name === 'Private Total';
                    const isTotalB = b.insurer_name === 'Grand Total' || b.insurer_name === 'Private Total';

                    if (isTotalA && !isTotalB) return 1;
                    if (!isTotalA && isTotalB) return -1;
                    if (isTotalA && isTotalB) {
                        // Grand Total should be last, so if A is Grand Total, it comes after Private Total
                        if (a.insurer_name === 'Grand Total') return 1;
                        if (b.insurer_name === 'Grand Total') return -1;
                        return 0;
                    }
                    return 0; // Keep original order for others
                });

                setCompanyMetrics(sortedData);
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
    // KPI Data - Display Grand Total
    const grandTotalRow = companyMetrics.find(row => row.insurer_name === 'Grand Total');
    const totals = grandTotalRow ? {
        fyp: grandTotalRow.fyp_current || 0,
        sa: grandTotalRow.sa_current || 0,
        nol: grandTotalRow.nol_current || 0,
        nop: grandTotalRow.nop_current || 0
    } : { fyp: 0, sa: 0, nol: 0, nop: 0 };

    const kpiData = [
        { title: 'First Year Premium', value: totals.fyp.toFixed(2), unit: 'In INR Crs.', color: 'blue', targetId: 'chart-fyp' },
        { title: 'Sum Assured', value: totals.sa.toFixed(2), unit: 'In INR Crs.', color: 'green', targetId: 'chart-sa' },
        { title: 'Number of Lives', value: totals.nol.toLocaleString(), unit: 'In Nos.', color: 'purple', targetId: 'chart-nol' },
        { title: 'No of Policies', value: totals.nop.toLocaleString(), unit: 'In Nos.', color: 'orange', targetId: 'chart-nop' }
    ];

    const scrollToChart = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

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
            summaryText={`Monthwise Data Summary of ${insurerName} > ${selectedPeriodLabel}`}
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
                            <div
                                key={idx}
                                className={`kpi-card ${kpi.color}`}
                                onClick={() => scrollToChart(kpi.targetId)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span className="kpi-unit">{kpi.unit}</span>
                                <h3 className="kpi-title">{kpi.title}</h3>
                                <div className="kpi-value">{kpi.value}</div>
                                <div className="kpi-period">{selectedPeriodLabel}</div>
                            </div>
                        ))}
                    </div>
                    <div className="charts-grid">
                        {/* Filter out totals for charts */}
                        {(() => {
                            // Aggregate data by insurer name
                            const rawData = companyMetrics.filter(m => m.insurer_name !== 'Grand Total' && m.insurer_name !== 'Private Total');
                            const aggregatedMap = new Map();

                            rawData.forEach(item => {
                                if (aggregatedMap.has(item.insurer_name)) {
                                    const existing = aggregatedMap.get(item.insurer_name);
                                    existing.fyp_current += item.fyp_current || 0;
                                    existing.sa_current += item.sa_current || 0;
                                    existing.nol_current += item.nol_current || 0;
                                    existing.nop_current += item.nop_current || 0;
                                } else {
                                    aggregatedMap.set(item.insurer_name, {
                                        insurer_name: item.insurer_name,
                                        fyp_current: item.fyp_current || 0,
                                        sa_current: item.sa_current || 0,
                                        nol_current: item.nol_current || 0,
                                        nop_current: item.nop_current || 0
                                    });
                                }
                            });

                            const chartData = Array.from(aggregatedMap.values());

                            const minBarHeight = 40; // Minimum height per bar in pixels
                            // Ensure enough height for all bars + padding
                            const dynamicHeight = Math.max(chartData.length * minBarHeight + 100, 400);

                            const CustomTooltip = ({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', zIndex: 1000 }}>
                                            <p className="label" style={{ fontWeight: 'bold' }}>{label}</p>
                                            <p className="intro" style={{ color: payload[0].fill }}>
                                                {`${payload[0].name}: ${payload[0].value.toLocaleString()}`}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            };

                            const renderChart = (title, dataKey, name, color, id) => (
                                <div id={id} className="chart-section">
                                    <h4 style={{ textAlign: 'left', marginBottom: '15px', color: '#555' }}>{title}</h4>
                                    <div className="chart-container" style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        {/* Outer Scroll Wrapper for Mobile/Tablet */}
                                        <div className="chart-scroll-wrapper">
                                            <div className="chart-content" style={{ height: 'auto' }}>
                                                {/* Inner Vertical Scroll for many bars */}
                                                <div style={{ width: '100%', height: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
                                                    {/* Chart Height Logic */}
                                                    <div style={{ width: '100%', height: `${dynamicHeight}px` }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart
                                                                layout="vertical" data={chartData}
                                                                margin={{ top: 20, right: 80, left: 100, bottom: 20 }}
                                                                barSize={20}
                                                            >
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                                {/* YAxis is now Insurer Name (Category) */}
                                                                <YAxis dataKey="insurer_name" type="category" width={180} tick={{ fontSize: 11 }} />
                                                                {/* XAxis is now Value (Number) */}
                                                                <XAxis type="number" />
                                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
                                                                <Legend verticalAlign="top" height={36} />
                                                                <Bar dataKey={dataKey} name={name} fill={color} radius={[0, 4, 4, 0]}>
                                                                    <LabelList dataKey={dataKey} position="right" formatter={(value) => value.toLocaleString()} style={{ fontSize: '11px', fill: '#333' }} />
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );

                            return (
                                <>
                                    {renderChart("First Year Premium", "fyp_current", "FYP", "#0088FE", "chart-fyp")}
                                    {renderChart("Sum Assured", "sa_current", "Sum Assured", "#00C49F", "chart-sa")}
                                    {renderChart("No. of Lives", "nol_current", "No. of Lives", "#8884d8", "chart-nol")}
                                    {renderChart("No of Policies", "nop_current", "No of Policies", "#FF8042", "chart-nop")}
                                </>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div className="data-view">
                    <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="irdai-data-table" style={{ width: 'max-content' }}>
                            <thead>
                                <tr>
                                    <th colSpan="31" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                        New Business Statement of {insurerName} for the Period ended {selectedPeriodLabel}
                                        <span style={{ float: 'right', fontSize: '12px', fontWeight: 'normal' }}>
                                            (Premium & Sum Assured In Rs. Crores)
                                        </span>
                                    </th>
                                </tr>
                                <tr>
                                    <th rowSpan="2" style={{ minWidth: '50px', textAlign: 'left' }}>Sl No.</th>
                                    <th rowSpan="2" style={{ minWidth: '200px', textAlign: 'left' }}>Insurer Name</th>
                                    <th rowSpan="2" style={{ minWidth: '200px', textAlign: 'left' }}>Premium Type</th>

                                    <th colSpan="7" style={{ textAlign: 'center' }}>First Year Premium</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>Sum Assured</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of Policies / Schemes</th>
                                    <th colSpan="7" style={{ textAlign: 'center' }}>No. of lives covered under Group Schemes</th>
                                </tr>
                                <tr>
                                    {/* Repeat headers for each metric section */}
                                    {[1, 2, 3, 4].map((section) => (
                                        <React.Fragment key={section}>
                                            <th style={{ textAlign: 'right' }}>For<br />{prevLabel}</th>
                                            <th style={{ textAlign: 'right' }}>For<br />{selectedPeriodLabel}</th>
                                            <th style={{ textAlign: 'right' }}>Growth<br />in %</th>
                                            <th style={{ textAlign: 'right' }}>Up to<br />{prevLabel}</th>
                                            <th style={{ textAlign: 'right' }}>Up to<br />{selectedPeriodLabel}</th>
                                            <th style={{ textAlign: 'right' }}>Growth<br />in %</th>
                                            <th style={{ textAlign: 'right' }}>Market<br />Share</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="31" style={{ textAlign: 'center', padding: '20px' }}>Loading data...</td></tr>
                                ) : companyMetrics.length > 0 ? (
                                    (() => {
                                        // Group data by Insurer Name
                                        const grouped = {};
                                        companyMetrics.forEach(row => {
                                            if (!grouped[row.insurer_name]) grouped[row.insurer_name] = [];
                                            grouped[row.insurer_name].push(row);
                                        });

                                        return Object.keys(grouped).map((insurer, idx) => {
                                            const rows = grouped[insurer];
                                            // Find the "Total" row (where premium_type == insurer_name)
                                            // Fallback to first row if not found (though backend should provide it)
                                            const totalRow = rows.find(r => r.premium_type === insurer) || rows[0];
                                            const subRows = rows.filter(r => r !== totalRow);

                                            const isExpanded = expandedInsurers[insurer];
                                            const hasSubRows = subRows.length > 0;

                                            return (
                                                <React.Fragment key={insurer}>
                                                    {/* TOTAL ROW (BOLD) */}
                                                    <tr style={{ backgroundColor: '#fff', fontWeight: 'bold' }}>
                                                        <td style={{ textAlign: 'left' }}>{idx + 1}</td>
                                                        <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {hasSubRows && (
                                                                <button
                                                                    onClick={() => toggleInsurer(insurer)}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        border: '1px solid #ccc',
                                                                        borderRadius: '4px',
                                                                        backgroundColor: '#f0f0f0',
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '14px',
                                                                        padding: 0
                                                                    }}
                                                                >
                                                                    {isExpanded ? '−' : '+'}
                                                                </button>
                                                            )}
                                                            {totalRow.insurer_name}
                                                        </td>
                                                        <td style={{ textAlign: 'left' }}>Total</td>

                                                        {/* FYP */}
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_previous || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_current || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_ytd_previous || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_ytd_current || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_ytd_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.fyp_market_share || 0).toFixed(2)}</td>

                                                        {/* SA */}
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_previous || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_current || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_ytd_previous || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_ytd_current || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_ytd_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.sa_market_share || 0).toFixed(2)}</td>

                                                        {/* NOP */}
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nop_previous || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nop_current || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nop_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nop_ytd_previous || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nop_ytd_current || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nop_ytd_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nop_market_share || 0).toFixed(2)}</td>

                                                        {/* NOL */}
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nol_previous || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nol_current || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nol_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nol_ytd_previous || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{totalRow.nol_ytd_current || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nol_ytd_growth || 0).toFixed(2)}</td>
                                                        <td style={{ textAlign: 'right' }}>{(totalRow.nol_market_share || 0).toFixed(2)}</td>
                                                    </tr>

                                                    {/* SUB ROWS (NORMAL) */}
                                                    {isExpanded && subRows.map((sub, sIdx) => (
                                                        <tr key={`${insurer}-${sIdx}`} style={{ backgroundColor: '#f9f9f9' }}>
                                                            <td></td> {/* Empty Sl No */}
                                                            <td></td> {/* Empty Insurer Name */}
                                                            <td style={{ textAlign: 'left' }}>{sub.premium_type}</td>

                                                            {/* FYP */}
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_previous || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_current || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_ytd_previous || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_ytd_current || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_ytd_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.fyp_market_share || 0).toFixed(2)}</td>

                                                            {/* SA */}
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_previous || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_current || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_ytd_previous || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_ytd_current || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_ytd_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.sa_market_share || 0).toFixed(2)}</td>

                                                            {/* NOP */}
                                                            <td style={{ textAlign: 'right' }}>{sub.nop_previous || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nop_current || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nop_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nop_ytd_previous || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nop_ytd_current || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nop_ytd_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nop_market_share || 0).toFixed(2)}</td>

                                                            {/* NOL */}
                                                            <td style={{ textAlign: 'right' }}>{sub.nol_previous || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nol_current || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nol_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nol_ytd_previous || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{sub.nol_ytd_current || 0}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nol_ytd_growth || 0).toFixed(2)}</td>
                                                            <td style={{ textAlign: 'right' }}>{(sub.nol_market_share || 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        });
                                    })()
                                ) : (
                                    <tr><td colSpan="31" style={{ textAlign: 'center', padding: '20px' }}>No data available</td></tr>
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
