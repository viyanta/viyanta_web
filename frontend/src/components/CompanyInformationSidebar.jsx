import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import ApiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Factory,
    Building2,
    FileText,
    Search,
    Tag,
    Newspaper,
    Globe,
    Info
} from 'lucide-react';
import './CompanyInformationSidebar.css';

function CompanyInformationSidebar({ variant = 'default' }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { handleSidebarItemClick, selectedSidebarItem } = useNavigation();
    const { userId, selectedProduct } = useAuth();

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
            const ecoMetricsItem = menuItems.find(item => item.MainMenuName === 'Economy Metrics');
            const ecoId = ecoMetricsItem ? ecoMetricsItem.MainMenuID : 1007;
            setSelectedItem(ecoId);
            if (selectedSidebarItem !== ecoId) {
                handleSidebarItemClick(ecoId, 'Economy Metrics');
            }
        } else if (path.includes('/industry-metrics')) {
            // Always set and update for Industry Metrics pages
            setSelectedItem(301); // Industry Metrics (DB ID)
            handleSidebarItemClick(301, 'Industry Metrics');
        } else if (path.includes('/dashboard') && !path.includes('/economy') && !path.includes('/industry-metrics')) {
            setSelectedItem(101); // Company Information (DB ID)
            if (selectedSidebarItem !== 101) {
                handleSidebarItemClick(101, 'Company Information');
            }
        } else if (path.includes('/irdai-monthly-data')) {
            setSelectedItem(201); // IRDAI Monthly Data (DB ID)
            if (selectedSidebarItem !== 201) {
                handleSidebarItemClick(201, 'IRDAI Monthly Data');
            }
        } else if (path.includes('/lform') || path.includes('/annual-data')) {
            setSelectedItem(401); // Industry Aggregates
            if (selectedSidebarItem !== 401) {
                handleSidebarItemClick(401, 'Industry Aggregates');
            }
        } else if (path.includes('/template')) {
            setSelectedItem(501); // Report Generator
            if (selectedSidebarItem !== 501) {
                handleSidebarItemClick(501, 'Report Generator');
            }
        } else if (path.includes('/smart-extraction')) {
            setSelectedItem(601); // Screener
            if (selectedSidebarItem !== 601) {
                handleSidebarItemClick(601, 'Screener');
            }
        } else if (path.includes('/insurance-dashboard')) {
            setSelectedItem(701); // Products
            if (selectedSidebarItem !== 701) {
                handleSidebarItemClick(701, 'Products');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, menuItems]);

    // Fetch menu items from API
    useEffect(() => {
        const fetchMenus = async () => {
            if (!userId || !selectedProduct) {
                setLoading(false);
                return;
            }

            try {
                const data = await ApiService.getMainMenus(userId, selectedProduct);
                setMenuItems(data);
            } catch (error) {
                console.error('Failed to fetch sidebar menus:', error);
                setMenuItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMenus();
    }, [userId, selectedProduct]);

    // Route mapping for navigation
    const ROUTE_MAPPING = {
        1000: '/dashboard',
        1001: '/industry-metrics-dashboard',
        1006: '/irdai-monthly-data',
        1007: '/economy-dashboard',
        // DB IDs mapping
        101: '/dashboard',
        201: '/irdai-monthly-data',
        301: '/industry-metrics-dashboard',
        801: '/economy-dashboard',
        401: '/lform',
        501: '/template',
        601: '/smart-extraction',
        701: '/insurance-dashboard'
    };

    // Filter menu items based on theme
    // Filter menu items based on theme/access
    const getVisibleMenuItems = () => {
        return menuItems.filter(item => {
            // Remove "Navigation" header (assuming ID 1000 or Name "Navigation")
            if (item.MainMenuName === 'Navigation' || item.MainMenuID === 1000) return false;

            const features = item.features || {};
            // If features are missing, assume visible? Or strict? 
            // Better to rely on what features says.
            if (isDarkMode) {
                return features.IsDarkTheme;
            } else {
                return features.IsLightTheme;
            }
        });
    };

    // Icon and Description mapping for integrated view
    const ICON_MAPPING = {
        'IRDAI Monthly Data': { icon: LayoutDashboard, description: 'Monthly Data' },
        'Industry Metrics': { icon: Factory, description: 'Metrics & Analysis' },
        'Industry Aggregates': { icon: Building2, description: 'Aggregated Data' },
        'Report Generator': { icon: FileText, description: 'Create Reports' },
        'Screener': { icon: Search, description: 'Screen Data' },
        'Products': { icon: Tag, description: 'Product Info' },
        'News': { icon: Newspaper, description: 'Latest Updates' },
        'Economy Metrics': { icon: Globe, description: 'Economic Indicators' },
        'Company Information': { icon: Info, description: 'Company Details' }
    };

    if (variant === 'integrated') {
        return (
            <nav className="sidebar__navigation">
                <ul className="sidebar__menu">
                    {getVisibleMenuItems().map((item) => {

                        const isSelected = selectedItem === item.MainMenuID || selectedSidebarItem === item.MainMenuID;
                        const meta = ICON_MAPPING[item.MainMenuName] || { icon: FileText, description: 'Module' };
                        const IconComponent = meta.icon;

                        return (
                            <li key={item.MainMenuID} className="sidebar__menu-item">
                                <div
                                    className={`sidebar__menu-link ${isSelected ? 'sidebar__menu-link--active' : ''}`}
                                    onClick={() => {
                                        setSelectedItem(item.MainMenuID);
                                        handleSidebarItemClick(item.MainMenuID, item.MainMenuName);

                                        // Navigate based on sidebar item
                                        if (item.MainMenuName === 'News') {
                                            navigate('/news');
                                        } else if (item.MainMenuName === 'Economy Metrics') {
                                            navigate('/economy-dashboard');
                                        } else {
                                            const route = ROUTE_MAPPING[item.MainMenuID];
                                            if (route) {
                                                navigate(route);
                                            }
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <IconComponent className="sidebar-icon" size={18} />
                                    <div className="sidebar__menu-content" style={{ marginLeft: '4px' }}>
                                        <div className="sidebar__menu-label">
                                            {item.MainMenuName}
                                        </div>
                                        <div className="sidebar__menu-description">
                                            {meta.description}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="sidebar__menu-indicator" />
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        );
    }

    return (
        <div className="company-info-sidebar">
            <div className="sidebar-content-wrapper">
                {getVisibleMenuItems().map((item) => {
                    const isSelected = selectedItem === item.MainMenuID || selectedSidebarItem === item.MainMenuID;
                    const meta = ICON_MAPPING[item.MainMenuName] || { icon: FileText, description: 'Module' };
                    const IconComponent = meta.icon;

                    return (
                        <div
                            key={item.MainMenuID}
                            className={`sidebar-menu-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedItem(item.MainMenuID);
                                handleSidebarItemClick(item.MainMenuID, item.MainMenuName);

                                // Navigate based on sidebar item
                                if (item.MainMenuName === 'News') {
                                    navigate('/news');
                                } else if (item.MainMenuName === 'Economy Metrics') {
                                    navigate('/economy-dashboard');
                                } else {
                                    const route = ROUTE_MAPPING[item.MainMenuID];
                                    if (route) {
                                        navigate(route);
                                    }
                                }
                                // Add more navigation cases as needed
                            }}
                        >
                            <IconComponent className="sidebar-icon" size={20} />
                            <span className="sidebar-text">{item.MainMenuName}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CompanyInformationSidebar; 