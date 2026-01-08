import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';
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
import './IrdaiPeers.css';

// Custom MultiSelect Component with Premium Design
const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        let newSelected;
        if (selected.includes(value)) {
            newSelected = selected.filter(item => item !== value);
        } else {
            // Limit to 5 selections if needed, or allow unlimited. Authenticity?
            // Backend validation says max 5.
            if (selected.length >= 5) {
                alert("You can select a maximum of 5 insurers.");
                return;
            }
            newSelected = [...selected, value];
        }
        onChange(newSelected);
    };

    const handleRemove = (e, value) => {
        e.stopPropagation();
        onChange(selected.filter(item => item !== value));
    };

    return (
        <div className="custom-multiselect" ref={dropdownRef} style={{ position: 'relative' }}>
            <div
                className="peers-dropdown wide full-width"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '38px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    maxWidth: '100%',
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1, minWidth: 0 }}>
                    {selected.length > 0 ? (
                        selected.slice(0, 2).map(val => (
                            <span key={val} style={{
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                            }}>
                                {val}
                                <span
                                    onClick={(e) => handleRemove(e, val)}
                                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                >×</span>
                            </span>
                        ))
                    ) : (
                        <span style={{ color: '#999', fontSize: '14px' }}>{placeholder}</span>
                    )}
                    {selected.length > 2 && (
                        <span style={{
                            fontSize: '11px',
                            color: '#666',
                            alignSelf: 'center',
                            background: '#f3f4f6',
                            padding: '2px 6px',
                            borderRadius: '10px'
                        }}>
                            +{selected.length - 2} more
                        </span>
                    )}
                </div>
                <span style={{ color: '#666', fontSize: '10px', marginLeft: '8px' }}>▼</span>
            </div>

            {isOpen && (
                <div className="multiselect-options" style={{
                    position: 'absolute',
                    zIndex: 1000,
                    background: 'white',
                    border: '1px solid #d1d5db',
                    width: '100%',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}>
                    {options.length > 0 ? (
                        options.map(opt => (
                            <div
                                key={opt.value}
                                className="multiselect-option"
                                onClick={() => toggleOption(opt.value)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    borderBottom: '1px solid #f3f4f6',
                                    background: selected.includes(opt.value) ? '#f0f9ff' : 'white'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.background = selected.includes(opt.value) ? '#f0f9ff' : 'white'}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt.value)}
                                    readOnly
                                    style={{ cursor: 'pointer', accentColor: '#36659b' }}
                                />
                                <span style={{ fontSize: '13px', color: '#374151' }}>{opt.label}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                            Loading insurers...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const IrdaiPeers = () => {
    // State for filters
    const [selectedInsurers, setSelectedInsurers] = useState([]);
    const [insurerOptions, setInsurerOptions] = useState([]);
    const [premiumOptions, setPremiumOptions] = useState([]); // New state for premium types
    const [loadingInsurers, setLoadingInsurers] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedPremiumType, setSelectedPremiumType] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [periodTypeOptions, setPeriodTypeOptions] = useState([]);
    const [periodOptions, setPeriodOptions] = useState([]);
    const [comparisonData, setComparisonData] = useState(null);
    const [viewMode, setViewMode] = useState('Data'); // 'Data' or 'Visuals'

    // Fetch Insurers on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingInsurers(true);
            try {
                // Fetch Insurers
                const insurersData = await ApiService.getCompanyInsurersList();
                if (insurersData && Array.isArray(insurersData)) {
                    setInsurerOptions(insurersData);
                }

                // Fetch Premium Types
                const premiumData = await ApiService.getIrdaiPremiumTypes();
                if (premiumData && Array.isArray(premiumData)) {
                    setPremiumOptions(premiumData);
                }

                // Fetch Period Types
                const periodTypesData = await ApiService.getIrdaiPeriodTypes();
                if (periodTypesData && Array.isArray(periodTypesData)) {
                    setPeriodTypeOptions(periodTypesData);
                    // Default to first type if available
                    if (periodTypesData.length > 0) {
                        setSelectedPeriod(periodTypesData[0].value);
                    }
                }

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            } finally {
                setLoadingInsurers(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch Period Options when selectedPeriod (Type) changes
    useEffect(() => {
        const fetchPeriodOptions = async () => {
            if (!selectedPeriod) return;
            try {
                const optionsData = await ApiService.getIrdaiPeriodOptions(selectedPeriod);
                if (optionsData && Array.isArray(optionsData)) {
                    setPeriodOptions(optionsData);
                    // Default to first option
                    if (optionsData.length > 0) {
                        setSelectedDate(optionsData[0].label);
                    } else {
                        setSelectedDate('');
                    }
                }
            } catch (error) {
                console.error("Failed to fetch period options:", error);
            }
        };

        fetchPeriodOptions();
    }, [selectedPeriod]);

    // Fetch Comparison Data when all filters are ready
    useEffect(() => {
        const fetchComparison = async () => {
            // Basic Validation
            if (
                selectedInsurers.length === 0 ||
                selectedInsurers.length > 5 ||
                !selectedCategory ||
                !selectedPremiumType ||
                !selectedDate ||
                periodOptions.length === 0
            ) {
                return;
            }

            // Find start_date and end_date from periodOptions based on selectedDate (label)
            const selectedPeriodObj = periodOptions.find(opt => opt.label === selectedDate);
            if (!selectedPeriodObj) return;

            setLoadingInsurers(true);
            try {
                const data = await ApiService.getIrdaiPeersComparison(
                    selectedInsurers,
                    selectedCategory, // Metric (e.g., FYP)
                    selectedPremiumType,
                    selectedPeriodObj.start_date,
                    selectedPeriodObj.end_date
                );
                setComparisonData(data);
            } catch (error) {
                console.error("Failed to fetch comparison data:", error);
            } finally {
                setLoadingInsurers(false);
            }
        };

        fetchComparison();
    }, [selectedInsurers, selectedCategory, selectedPremiumType, selectedDate, periodOptions]);

    // Prepare chart data
    const prepareChartData = () => {
        if (!comparisonData || !comparisonData.data) return [];

        return Object.keys(comparisonData.data).map(insurer => ({
            name: insurer,
            value: comparisonData.data[insurer],
            // Use full insurer name for axis as requested
            shortName: insurer
        }));
    };

    const chartData = prepareChartData();

    return (
        <TabLayout
            viewMode={viewMode === 'Visuals' ? 'visuals' : 'data'}
            setViewMode={(mode) => setViewMode(mode === 'visuals' ? 'Visuals' : 'Data')}
            summaryText={`Peer comparison of First Year Premium >> ${selectedDate}`}
            controls={
                <>
                    <div className="period-select-container">
                        <label className="control-label">Select Insurers (Max 5)</label>
                        <MultiSelectDropdown
                            options={insurerOptions}
                            selected={selectedInsurers}
                            onChange={setSelectedInsurers}
                            placeholder="Select Insurers"
                        />
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Category</label>
                        <select
                            className="custom-select"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Select Category</option>
                            <option value="FYP">First Year Premium (FYP)</option>
                            <option value="SA">Sum Assured (SA)</option>
                            <option value="NOP">Number of Policies (NOP)</option>
                            <option value="NOL">Number of Lives (NOL)</option>
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Premium Type</label>
                        <select
                            className="custom-select"
                            value={selectedPremiumType}
                            onChange={(e) => setSelectedPremiumType(e.target.value)}
                        >
                            <option value="">Select Premium Type</option>
                            {premiumOptions.map((opt, index) => (
                                <option key={index} value={opt.value || opt.label || opt}>
                                    {opt.label || opt.value || opt}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period Type</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '120px' }}
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {periodTypeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="period-select-container">
                        <label className="control-label">Select Period</label>
                        <select
                            className="custom-select"
                            style={{ minWidth: '120px' }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {periodOptions.map((opt, index) => (
                                <option key={index} value={opt.label}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            }
        >
            {viewMode === 'Data' ? (
                <div className="peers-table-container">
                    <table className="peers-comparison-table">
                        <thead>
                            <tr>
                                <th style={{ width: '30%', textAlign: 'left', paddingLeft: '15px' }}>Metric</th>
                                <th style={{ width: '8%', textAlign: 'center' }}>Unit</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Period</th>
                                {/* Dynamic Headers for Selected Companies */}
                                {selectedInsurers.length > 0 ? (
                                    selectedInsurers.map((insurer, i) => (
                                        <th key={i} style={{ textAlign: 'right', paddingRight: '15px' }}>
                                            {insurer}
                                        </th>
                                    ))
                                ) : (
                                    <th>Select Insurers</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonData ? (
                                <tr className="data-row" style={{ display: 'table-row' }}>
                                    <td className="row-label" style={{ paddingLeft: '15px', verticalAlign: 'middle' }}>
                                        <div style={{ fontWeight: '600', color: '#111827' }}>{comparisonData.metric}</div>
                                        <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '4px' }}>
                                            {comparisonData.premium_type}
                                        </div>
                                    </td>
                                    <td className="row-unit" style={{ textAlign: 'center', verticalAlign: 'middle' }}>In Crs</td>
                                    <td className="row-period" style={{ textAlign: 'center', verticalAlign: 'middle' }}>{selectedDate}</td>
                                    {/* Render values for matched insurers */}
                                    {selectedInsurers.map((insurer, i) => {
                                        const value = comparisonData.data && comparisonData.data[insurer] !== undefined
                                            ? comparisonData.data[insurer]
                                            : null;

                                        return (
                                            <td key={i} className="row-value" style={{ textAlign: 'right', paddingRight: '15px', fontWeight: '500', verticalAlign: 'middle' }}>
                                                {value !== null ? value.toLocaleString() : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={selectedInsurers.length + 3} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                        {selectedInsurers.length === 0
                                            ? "Please select at least one insurer to view comparison."
                                            : "Select Category, Premium Type, and Period to view comparison."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="peers-visuals-container" style={{ width: '100%', height: '500px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    {comparisonData && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{
                                    top: 30,
                                    right: 30,
                                    left: 20,
                                    bottom: 40,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="shortName"
                                    tick={{ fontSize: 12, fill: '#666' }}
                                    interval={0}
                                    angle={0}
                                    textAnchor="middle"
                                    height={30}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#666' }}
                                    tickFormatter={(value) => value.toLocaleString()}
                                />
                                <Tooltip />
                                <Legend />
                                <Bar
                                    dataKey="value"
                                    name={comparisonData.metric || "Value"}
                                    fill={
                                        selectedCategory === 'FYP' ? '#0088FE' :
                                            selectedCategory === 'SA' ? '#00C49F' :
                                                selectedCategory === 'NOL' ? '#8884d8' :
                                                    selectedCategory === 'NOP' ? '#FF8042' : '#0088FE'
                                    }
                                    radius={[4, 4, 0, 0]}
                                    barSize={60}
                                >
                                    <LabelList
                                        dataKey="value"
                                        position="top"
                                        formatter={(val) => val.toLocaleString()}
                                        style={{ fontSize: '12px', fill: '#666', fontWeight: '600' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                            {selectedInsurers.length === 0 ? (
                                <>
                                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
                                    <p className="text-gray-500">Select insurers to compare visuals</p>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }} className="animate-pulse">⏳</div>
                                    <p>Loading chart data...</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </TabLayout>
    );
};

export default IrdaiPeers;
