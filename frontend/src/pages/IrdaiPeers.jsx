import React, { useState } from 'react';
import './IrdaiPeers.css';

const IrdaiPeers = () => {
    // State for filters
    const [selectedInsurers, setSelectedInsurers] = useState(['Select Insurers Name']);
    const [selectedCategory, setSelectedCategory] = useState('Select Category Name');
    const [selectedPremiumType, setSelectedPremiumType] = useState('Select Premium Type Name');
    const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
    const [selectedDate, setSelectedDate] = useState('Dec 24');
    const [viewMode, setViewMode] = useState('Data'); // 'Data' or 'Visuals'

    // Mock Data for the table
    const tableData = [
        {
            type: 'Group Non-Single Premium',
            rows: [
                { label: 'First Year Premium', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] },
                { label: 'No of Policies / Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'No. of lives covered under Group Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'Sum Assured', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] }
            ]
        },
        {
            type: 'Individual Single Premium',
            rows: [
                { label: 'First Year Premium', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] },
                { label: 'No of Policies / Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'No. of lives covered under Group Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'Sum Assured', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] }
            ]
        },
        {
            type: 'Individual Non-Single Premium',
            rows: [
                { label: 'First Year Premium', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] },
                { label: 'No of Policies / Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'No. of lives covered under Group Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'Sum Assured', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] }
            ]
        },
        {
            type: 'Group Yearly Renewable Premium',
            rows: [
                { label: 'First Year Premium', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] },
                { label: 'No of Policies / Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'No. of lives covered under Group Schemes', unit: 'In Nos', values: ['-', '-', '-', '-', '-'] },
                { label: 'Sum Assured', unit: 'In Crs', values: ['-', '-', '-', '-', '-'] }
            ]
        }
    ];

    return (
        <div className="irdai-peers-container">


            {/* Main Filters Container */}
            <div className="filters-layout-container">

                <div className="peers-filters-left-group">
                    {/* Left Side: Stacked Dropdowns */}
                    <div className="filters-left-stack">
                        <div className="control-group">
                            <label className="control-label">Select Insurers Name</label>
                            <select className="peers-dropdown wide full-width">
                                <option>Select Insurers Name</option>
                                <option>LIC</option>
                                <option>SBI Life</option>
                                <option>HDFC Life</option>
                            </select>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Select Category Name</label>
                            <select className="peers-dropdown wide full-width">
                                <option>Select Category Name</option>
                            </select>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Select Premium Type Name</label>
                            <select className="peers-dropdown wide full-width">
                                <option>Select Premium Type Name</option>
                            </select>
                        </div>
                    </div>

                    {/* Right Side of Filters: Period Controls */}
                    <div className="filters-period-controls">
                        <div className="control-group">
                            <label className="control-label">Select Period</label>
                            <select
                                className="peers-dropdown small"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option>Monthly</option>
                                <option>Quarterly</option>
                                <option>Halfyearly</option>
                                <option>Annual</option>
                            </select>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Select Period</label>
                            <select
                                className="peers-dropdown small"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            >
                                <option>Dec 24</option>
                                <option>Sep 24</option>
                                <option>Jun 24</option>
                                <option>Mar 24</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Far Right: View Mode Toggle */}
                <div className="peers-toggle-right">
                    <div className="view-toggle-container">
                        <button
                            className={`view-toggle-btn ${viewMode === 'Visuals' ? 'active' : ''}`}
                            onClick={() => setViewMode('Visuals')}
                        >
                            Visuals
                        </button>
                        <span style={{ color: '#ccc' }}>|</span>
                        <button
                            className={`view-toggle-btn ${viewMode === 'Data' ? 'active' : ''}`}
                            onClick={() => setViewMode('Data')}
                        >
                            Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Dynamic Title */}
            <div className="peers-dynamic-title">
                <span className="title-text">Peer comparison of First Year Premium</span>
                <span className="title-separator">{">>"}</span>
                <span className="title-date">{selectedDate}</span>
            </div>

            {/* Content Area */}
            {viewMode === 'Data' ? (
                <div className="peers-table-container">
                    <table className="peers-comparison-table">
                        <thead>
                            <tr>
                                <th style={{ width: '30%' }}></th>
                                <th style={{ width: '5%' }}></th>
                                <th style={{ width: '5%' }}></th>
                                <th>Selected Company 1</th>
                                <th>Selected Company 2</th>
                                <th>Selected Company 3</th>
                                <th>Selected Company 4</th>
                                <th>Selected Company 5</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((section, sIndex) => (
                                <React.Fragment key={sIndex}>
                                    {/* Section Header */}
                                    <tr className="section-header-row">
                                        <td className="section-header-cell" colSpan={8}>
                                            <span className="premium-type-badge">Premium Type - {section.type}</span>
                                        </td>
                                    </tr>
                                    {/* Sub Header for columns if needed, but per screenshot just data rows */}
                                    <tr className="col-header-row">
                                        <td className="col-header">Category Long Name</td>
                                        <td className="col-header">Units</td>
                                        <td className="col-header">Period</td>
                                        <td colSpan={5}></td>
                                    </tr>

                                    {/* Data Rows */}
                                    {section.rows.map((row, rIndex) => (
                                        <tr key={rIndex} className="data-row">
                                            <td className="row-label">{row.label}</td>
                                            <td className="row-unit">{row.unit}</td>
                                            <td className="row-period">Nov 24</td>
                                            {row.values.map((val, vIndex) => (
                                                <td key={vIndex} className="row-value">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="placeholder-visuals">
                    Visuals coming soon...
                </div>
            )}
        </div>
    );
};

export default IrdaiPeers;
