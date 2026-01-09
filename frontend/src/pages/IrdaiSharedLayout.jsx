import React from 'react';
import './IrdaiCommon.css';

const TabLayout = ({ controls, summaryText, children }) => (
    <div className="dashboard-content-wrapper">
        <div className="dashboard-controls">
            <div className="controls-left">
                {controls}
            </div>
            {/* Toggle moved to IrdaiPageLayout */}
        </div>

        <div className="visual-summary-header">
            {summaryText}
        </div>

        {children}
    </div>
);

export default TabLayout;
