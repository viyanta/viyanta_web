import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StandardPageLayout from './StandardPageLayout';
import CompanyInformationSidebar from './CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import '../pages/IrdaiMonthlyData.css';

const IrdaiPageLayout = ({ activeTab, children }) => {
    const { isNavItemActive } = useNavigation();
    const navigate = useNavigate();

    // Define all available tabs and their corresponding routes
    const tabRoutes = useMemo(() => ({
        'Dashboard': '/irdai-monthly-dashboard',
        'Companywise': '/irdai-companywise',
        'Premiumwise': '/irdai-premium-wise',
        'Marketshare': '/irdai-market-share',
        'Growth': '/irdai-growth',
        'Monthwise': '/irdai-monthwise',
        'Pvt Vs. Public': '/irdai-pvt-vs-public',
        'Analytics': '/irdai-analytics',
        'Documents': '/irdai-documents',
        'Peers': '/irdai-peers'
    }), []);

    const allTabs = Object.keys(tabRoutes);

    // Filter to show only active tabs (defined in NavigationContext) available for user
    const tabs = allTabs.filter(tab => isNavItemActive(tab));

    const handleTabClick = (tab) => {
        if (!isNavItemActive(tab)) return;
        const route = tabRoutes[tab];
        if (route) {
            navigate(route);
        }
    };

    const getPageTitle = () => {
        return `IRDAI Monthly Data - ${activeTab}`;
    };

    return (
        <StandardPageLayout
            title={getPageTitle()}
            sidebar={<CompanyInformationSidebar />}
        >
            {/* Breadcrumb Navigation */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: '500'
            }}>
                <span
                    className="breadcrumb-link"
                    onClick={() => navigate('/irdai-monthly-dashboard')}
                    style={{
                        color: '#36659b',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.textDecoration = 'underline';
                        e.target.style.color = '#2d5280';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.textDecoration = 'none';
                        e.target.style.color = '#36659b';
                    }}
                >
                    Irdai Monthly Data
                </span>
                <span className="breadcrumb-separator" style={{ color: '#999', margin: '0 8px' }}>{'>>'}</span>
                <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>{activeTab}</span>
            </div>

            {/* Top Navigation Bar */}
            <div className="navigation-tabs-container">
                <div className="navigation-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabClick(tab)}
                            className={`nav-tab active ${activeTab === tab ? 'selected' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="irdai-monthly-dashboard-page">
                {children}
            </div>
        </StandardPageLayout>
    );
};

export default IrdaiPageLayout;
