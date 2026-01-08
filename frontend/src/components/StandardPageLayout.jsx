import React from 'react';
import './StandardPageLayout.css';

/**
 * StandardPageLayout
 * 
 * Reusable layout component based on EconomyDashboard structure.
 * 
 * @param {string} title - Page title
 * @param {function} onMenuClick - Callback for hamburger menu click
 * @param {React.ReactNode} sidebar - Sidebar component (e.g. CompanyInformationSidebar)
 * @param {React.ReactNode} children - Main content
 * @returns {JSX.Element}
 */
const StandardPageLayout = ({
    title,
    onMenuClick,
    sidebar,
    children
}) => {
    return (
        <div className="standard-page-layout">
            {/* Page Header with Hamburger and Title */}
            <div className="page-header">
                <button
                    onClick={() => {
                        if (onMenuClick) {
                            onMenuClick();
                        }
                    }}
                    className="hamburger-button"
                >
                    ☰
                </button>
                <h1>{title}</h1>
            </div>

            <div className="main-content-wrapper">
                <div className="content-layout">
                    {/* Left Sidebar */}
                    {sidebar && (
                        <div className="sidebar-container">
                            {sidebar}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="main-content-area">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandardPageLayout;
