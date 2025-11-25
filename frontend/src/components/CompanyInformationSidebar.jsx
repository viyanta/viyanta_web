import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';

function CompanyInformationSidebar() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
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
                            color: selectedItem === item.id ? '#ffffff' : '#495057',
                            backgroundColor: selectedItem === item.id ? '#36659b' : 'transparent',
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
                            if (selectedItem !== item.id) {
                                e.target.style.backgroundColor = '#f8f9fa';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedItem !== item.id) {
                                e.target.style.backgroundColor = 'transparent';
                            }
                        }}
                        onClick={() => {
                            setSelectedItem(item.id);
                            handleSidebarItemClick(item.id, item.name);
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