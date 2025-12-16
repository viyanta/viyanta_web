import React from 'react';

const TabLayout = ({ controls, summaryText, viewMode, setViewMode, children }) => (
    <div className="dashboard-content-wrapper">
        <div className="dashboard-controls">
            <div className="controls-left">
                {controls}
            </div>
            <div className="controls-right">
                <div className="view-toggle-container">
                    <button
                        className={`view-toggle-btn ${viewMode === 'visuals' ? 'active' : ''}`}
                        onClick={() => setViewMode('visuals')}
                    >
                        Visuals
                    </button>
                    <span style={{ color: '#ccc' }}>|</span>
                    <button
                        className={`view-toggle-btn ${viewMode === 'data' ? 'active' : ''}`}
                        onClick={() => setViewMode('data')}
                    >
                        Data
                    </button>
                </div>
            </div>
        </div>

        <div className="visual-summary-header">
            {summaryText}
        </div>

        {children}
    </div>
);

export default TabLayout;
