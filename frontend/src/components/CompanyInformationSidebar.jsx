import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';

function CompanyInformationSidebar() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { handleSidebarItemClick, selectedSidebarItem } = useNavigation();

    // Load theme preference from localStorage and listen for changes
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDarkMode(savedTheme === 'dark');
        }

        // Listen for theme changes from other components
        const handleStorageChange = (e) => {
            if (e.key === 'theme') {
                setIsDarkMode(e.newValue === 'dark');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Also listen for custom theme change events
        const handleThemeChange = (e) => {
            setIsDarkMode(e.detail.isDarkMode);
        };

        window.addEventListener('themeChanged', handleThemeChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('themeChanged', handleThemeChange);
        };
    }, []);

    // Set selected item based on current route
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/economy-dashboard') || path.includes('/economy-domestic') || path.includes('/economy-international')) {
            setSelectedItem(1007); // Economy
            if (selectedSidebarItem !== 1007) {
                handleSidebarItemClick(1007, 'Economy');
            }
        } else if (path.includes('/industry-metrics')) {
            setSelectedItem(1001); // Industry Metrics
        } else if (path.includes('/dashboard') && !path.includes('/economy') && !path.includes('/industry-metrics')) {
            setSelectedItem(1000); // Company Information
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Menu configuration - Company Information + 7 items, all clickable
    const menuConfig = [
        { id: 1000, name: 'Company Information', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1001, name: 'Industry Metrics', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1002, name: 'Industry Aggregates', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1003, name: 'Products', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1004, name: 'Report Generator', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1005, name: 'Screener', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1006, name: 'IRDAI Monthly Data', isDarkTheme: 1, isLightTheme: 1 },
        { id: 1007, name: 'Economy', isDarkTheme: 1, isLightTheme: 1 }
    ];

    // Filter menu items based on theme
    const getVisibleMenuItems = () => {
        return menuConfig.filter(item => {
            if (isDarkMode) {
                return item.isDarkTheme === 1;
            } else {
                return item.isLightTheme === 1;
            }
        });
    };

    return (
        <div style={{
            flex: '0 0 220px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            height: 'fit-content',
            marginBottom: '0',
            position: 'static',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            minWidth: '220px',
            maxWidth: '220px'
        }}>
            <div style={{ padding: 0 }}>
                {getVisibleMenuItems().map((item, index) => (
                    <div 
                        key={item.id}
                        style={{
                            padding: '8px 12px',
                            color: (selectedItem === item.id || selectedSidebarItem === item.id) ? '#ffffff' : '#495057',
                            backgroundColor: (selectedItem === item.id || selectedSidebarItem === item.id) ? '#36659b' : 'transparent',
                            fontSize: item.id === 1000 ? '13px' : '12px',
                            fontWeight: item.id === 1000 ? '600' : 'normal',
                            borderBottom: index < getVisibleMenuItems().length - 1 ? '1px solid #f1f3f4' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '32px'
                        }}
                        onMouseEnter={(e) => {
                            const isSelected = selectedItem === item.id || selectedSidebarItem === item.id;
                            if (!isSelected) {
                                e.target.style.backgroundColor = '#f8f9fa';
                            }
                        }}
                        onMouseLeave={(e) => {
                            const isSelected = selectedItem === item.id || selectedSidebarItem === item.id;
                            if (!isSelected) {
                                e.target.style.backgroundColor = 'transparent';
                            } else {
                                e.target.style.backgroundColor = '#36659b';
                            }
                        }}
                        onClick={() => {
                            setSelectedItem(item.id);
                            handleSidebarItemClick(item.id, item.name);
                            
                            // Navigate based on sidebar item
                            if (item.id === 1007) { // Economy
                                navigate('/economy-dashboard');
                            } else if (item.id === 1001) { // Industry Metrics
                                navigate('/industry-metrics-dashboard');
                            } else if (item.id === 1000) { // Company Information
                                navigate('/dashboard');
                            }
                            // Add more navigation cases as needed
                        }}
                    >
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CompanyInformationSidebar; 