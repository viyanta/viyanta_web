import React from 'react';
import './EconomySharedLayout.css';

const EconomySharedLayout = ({ controls, summaryText, viewMode, setViewMode, children, visualsEnabled = true }) => (
    <div className="economy-dashboard-wrapper">
        <div className="dashboard-controls">
            <div className="controls-left">
                {controls}
            </div>
            <div className="controls-right">
                <div className="view-toggle-container">
                    <button
                        className={`view-toggle-btn ${viewMode === 'visuals' ? 'active' : ''}`}
                        onClick={() => visualsEnabled && setViewMode('visuals')}
                        disabled={!visualsEnabled}
                        style={{ opacity: visualsEnabled ? 1 : 0.5, cursor: visualsEnabled ? 'pointer' : 'not-allowed' }}
                    >
                        Visuals
                    </button>
                    <div className="view-toggle-separator"></div>
                    <button
                        className={`view-toggle-btn ${viewMode === 'data' ? 'active' : ''}`}
                        onClick={() => setViewMode('data')}
                    >
                        Data
                    </button>
                </div>
            </div>
        </div>

        {summaryText && (
            <div className="visual-summary-header">
                {summaryText}
            </div>
        )}

        {children}
    </div>
);

export default EconomySharedLayout;
