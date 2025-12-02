import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import './EconomyDashboard.css';

const EconomyDashboard = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationContext = useNavigation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { 
    isNavItemActive, 
    activeNavItems, 
    selectedSidebarItem, 
    selectedDescriptions = [], 
    setSelectedDescriptions 
  } = navigationContext || {};
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [viewMode, setViewMode] = useState('visuals'); // 'data' or 'visuals'
  const [dashboardData, setDashboardData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [chartOptions, setChartOptions] = useState({
    0: 'country', // Chart 1 option
    1: 'country', // Chart 2 option
    2: 'country', // Chart 3 option
    3: 'country'   // Chart 4 option
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  const fetchingDashboardDataRef = useRef(false);
  const lastFetchedDescriptionsRef = useRef(JSON.stringify([]));

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International', 'Domestic Metrics', 'International Metrics',
    'Irdai Monthly Data'
  ];

  // Filter to show only active tabs, preserving order from activeNavItems
  const tabs = activeNavItems.filter(tab => allTabs.includes(tab));

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/economy-domestic')) {
      setActiveTab('Domestic');
    } else if (path.includes('/economy-international')) {
      setActiveTab('International');
    } else {
      setActiveTab('Dashboard');
    }
  }, [location.pathname]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Single useEffect to fetch data when needed
  useEffect(() => {
    // Only fetch if we're on the dashboard route
    if (!location.pathname.includes('/economy-dashboard') && activeTab !== 'Dashboard') {
      return;
    }

    // Prevent duplicate calls
    if (fetchingDashboardDataRef.current) {
      return;
    }

    // Reset tracking when navigating to dashboard to allow fresh fetch
    if (location.pathname.includes('/economy-dashboard')) {
      lastFetchedDescriptionsRef.current = JSON.stringify([]);
    }
    
    // Only fetch if descriptions have actually changed
    const sortedDescriptions = [...selectedDescriptions].sort();
    const currentDescriptionsStr = JSON.stringify(sortedDescriptions);
    
    if (currentDescriptionsStr === lastFetchedDescriptionsRef.current) {
      return; // Already fetched for these descriptions
    }
    
    // Mark as fetching and update last fetched
    lastFetchedDescriptionsRef.current = currentDescriptionsStr;
    fetchingDashboardDataRef.current = true;
    
    // Fetch data
    const fetchData = async () => {
      if (selectedDescriptions.length === 0) {
        setDashboardData([]);
        setLoadingData(false);
        fetchingDashboardDataRef.current = false;
        return;
      }

      setLoadingData(true);
      try {
        // Use optimized endpoint that returns all data for selected descriptions in one query
        const allData = await ApiService.getDashboardData(selectedDescriptions);
        
        // Track which descriptions have data
        const foundDescriptions = new Set();
        allData.forEach(item => {
          if (item.Description) {
            foundDescriptions.add(item.Description);
          }
        });
        
        // Remove descriptions from selection if they have no data
        const descriptionsWithData = Array.from(foundDescriptions);
        const missingDescriptions = selectedDescriptions.filter(desc => !descriptionsWithData.includes(desc));
        
        if (missingDescriptions.length > 0) {
          console.log('Removing descriptions with no data:', missingDescriptions);
          setSelectedDescriptions(prev => prev.filter(desc => descriptionsWithData.includes(desc)));
        }
        
        setDashboardData(allData || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setDashboardData([]);
      } finally {
        setLoadingData(false);
        fetchingDashboardDataRef.current = false;
      }
    };

    fetchData();
  }, [selectedDescriptions, location.pathname, activeTab, setSelectedDescriptions]);

  // Get selected descriptions with their premium type and category from dashboardData
  const selectedDescriptionsWithContext = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0 || selectedDescriptions.length === 0) {
      return [];
    }

    const descriptionMap = new Map();
    dashboardData.forEach(item => {
      const description = item.Description || '';
      if (description && selectedDescriptions.includes(description)) {
        if (!descriptionMap.has(description)) {
          descriptionMap.set(description, {
            description: description,
            premiumType: item.PremiumTypeLongName || 'N/A',
            category: item.CategoryLongName || 'N/A',
            dataType: item.DataType || 'N/A'
          });
        }
      }
    });

    return Array.from(descriptionMap.values());
  }, [dashboardData, selectedDescriptions]);

  // Generate color mapping for Category + Premium Type combinations
  const categoryPremiumColorMap = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) {
      return new Map();
    }

    const colorMap = new Map();
    const colors = [
      { bg: '#f0f9ff', border: '#bae6fd' }, // Light blue
      { bg: '#f0fdf4', border: '#bbf7d0' }, // Light green
      { bg: '#fef3c7', border: '#fde68a' }, // Light yellow
      { bg: '#fce7f3', border: '#fbcfe8' }, // Light pink
      { bg: '#e0e7ff', border: '#c7d2fe' }, // Light indigo
      { bg: '#fef2f2', border: '#fecaca' }, // Light red
      { bg: '#ecfdf5', border: '#a7f3d0' }, // Light emerald
      { bg: '#f5f3ff', border: '#ddd6fe' }, // Light purple
      { bg: '#fff7ed', border: '#fed7aa' }, // Light orange
      { bg: '#f0fdfa', border: '#99f6e4' }, // Light teal
    ];

    // Get all unique category + premium type combinations
    const combinations = new Set();
    dashboardData.forEach(item => {
      if (item && item.CategoryLongName && item.PremiumTypeLongName) {
        const key = `${item.CategoryLongName}|||${item.PremiumTypeLongName}`;
        combinations.add(key);
      }
    });

    // Assign colors to each unique combination
    Array.from(combinations).forEach((key, index) => {
      const colorIndex = index % colors.length;
      colorMap.set(key, colors[colorIndex]);
    });

    return colorMap;
  }, [dashboardData]);

  // Function to get color for a category + premium type combination
  const getCategoryPremiumColor = (category, premiumType) => {
    const key = `${category}|||${premiumType}`;
    return categoryPremiumColorMap.get(key) || { bg: '#ffffff', border: '#e5e7eb' };
  };

  // Transform data into pivot table format grouped by PeriodType
  const pivotTableData = useMemo(() => {
    try {
      if (!dashboardData || dashboardData.length === 0) {
        return {};
      }

      // Group by ProcessedPeriodType
      const groupedByPeriodType = {};
      
      dashboardData.forEach(item => {
        if (!item) return;
        const periodType = item.ProcessedPeriodType || 'Other';
        if (!groupedByPeriodType[periodType]) {
          groupedByPeriodType[periodType] = [];
        }
        groupedByPeriodType[periodType].push(item);
      });

      // Transform each group into pivot format
      const pivotData = {};
      
      Object.keys(groupedByPeriodType).forEach(periodType => {
        const groupData = groupedByPeriodType[periodType];
        if (!groupData || groupData.length === 0) return;
        
        // Get all unique periods (columns)
        const periods = [...new Set(groupData.map(item => item?.ProcessedFYYear || '').filter(p => p))].sort();
        
        // Get all unique descriptions (rows)
        const descriptions = [...new Set(groupData.map(item => item?.Description || '').filter(d => d))];
        
        // Create pivot structure: { description: { period: value, unit: unit } }
        const pivot = {};
        const units = {}; // Store unit for each description
        const descriptionMetadata = {}; // Store category and premium type for each description
        
        descriptions.forEach(desc => {
          if (!desc) return;
          pivot[desc] = {};
          groupData.forEach(item => {
            if (item && item.Description === desc) {
              const period = item.ProcessedFYYear || '';
              pivot[desc][period] = item.ReportedValue || '-';
              // Store unit (assuming same unit for all periods of a description)
              if (!units[desc] && item.ReportedUnit) {
                units[desc] = item.ReportedUnit;
              }
              // Store category and premium type metadata
              if (!descriptionMetadata[desc]) {
                descriptionMetadata[desc] = {
                  category: item.CategoryLongName || 'N/A',
                  premiumType: item.PremiumTypeLongName || 'N/A'
                };
              }
            }
          });
        });
        
        pivotData[periodType] = {
          periods: periods || [],
          descriptions: descriptions || [],
          pivot: pivot || {},
          units: units || {},
          descriptionMetadata: descriptionMetadata || {}
        };
      });

      return pivotData;
    } catch (error) {
      console.error('Error creating pivot table data:', error);
      return {};
    }
  }, [dashboardData]);

  // Handle description deselection with API call (admin only)
  const handleDescriptionDeselect = async (description) => {
    if (!isAdmin) {
      return; // Only admin can remove descriptions
    }

    // Remove from state first for immediate UI update
    const updatedDescriptions = selectedDescriptions.filter(d => d !== description);
    setSelectedDescriptions(updatedDescriptions);
    
    // Call API to save globally
    try {
      await ApiService.updateSelectedDescriptions(updatedDescriptions, description);
      console.log(`✅ Description "${description}" deselected successfully - saved globally`);
      
      // Refresh from backend to ensure sync
      const refreshedDescriptions = await ApiService.getSelectedDescriptions();
      setSelectedDescriptions(Array.isArray(refreshedDescriptions) ? refreshedDescriptions : updatedDescriptions);
    } catch (err) {
      console.error('Error updating selected descriptions:', err);
      // Revert on error
      setSelectedDescriptions(selectedDescriptions);
      alert('Failed to remove description. Please try again.');
    }
  };

  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      // Check which sidebar item is selected
      if (selectedSidebarItem === 1001) { // Industry Metrics
        navigate('/industry-metrics-dashboard');
      } else {
        setActiveTab('Dashboard');
        navigate('/economy-dashboard');
      }
    } else if (tab === 'Domestic') {
      setActiveTab('Domestic');
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      setActiveTab('International');
      navigate('/economy-international');
    } else if (tab === 'Background') {
      navigate('/insurance-dashboard?tab=Background');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Metrics') {
      navigate('/metrics');
    } else if (tab === 'Analytics') {
      navigate('/analytics');
    } else if (tab === 'Annual Data') {
      navigate('/annual-data');
    } else if (tab === 'Documents') {
      navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      navigate('/news');
    } else if (tab === 'Domestic Metrics') {
      navigate('/industry-metrics-domestic');
    } else if (tab === 'International Metrics') {
      navigate('/industry-metrics-international');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="economy-dashboard-page">
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
        <h1>Economy - Dashboard</h1>
      </div>

      <div className="main-content-wrapper">
        <div className="content-layout">
          {/* Left Sidebar */}
          <div className="sidebar-container">
            <CompanyInformationSidebar />
          </div>

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Navigation Tabs */}
            <div className="navigation-tabs-container">
              <div className="navigation-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'} ${activeTab === tab ? 'selected' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* View Toggle */}
            <div className="page-title-section">
              <div className="view-toggle-container">
                <button
                  className={`view-toggle-btn ${viewMode === 'data' ? 'active' : ''}`}
                  onClick={() => setViewMode('data')}
                >
                  Data
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'visuals' ? 'active' : ''}`}
                  onClick={() => setViewMode('visuals')}
                >
                  Visuals
                </button>
              </div>
            </div>

            {/* Selected Descriptions Display */}
            {selectedDescriptions.length > 0 && (
              <div style={{
                marginBottom: '24px',
                padding: '0',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                overflow: 'hidden'
              }}>
                {/* Header Section */}
                <div style={{
                  background: 'linear-gradient(135deg, #3F72AF 0%, #5a8fc7 100%)',
                  padding: '20px 24px',
                  color: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                  <div>
                    <h3 style={{
                      margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '6px',
                        letterSpacing: '-0.01em'
                    }}>
                      Selected Descriptions for Dashboard
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 400
                    }}>
                        {selectedDescriptions.length} of 4 selected. {isAdmin ? 'Click on a card to remove.' : 'Only admin can modify selections.'}
                    </p>
                  </div>
                  <div style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#ffffff',
                      minWidth: '60px',
                      textAlign: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {selectedDescriptions.length}/4
                    </div>
                  </div>
                </div>
                
                {/* Cards Container */}
                <div style={{
                  padding: '20px 24px',
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px',
                  backgroundColor: '#f9fafb'
                }}>
                  {selectedDescriptionsWithContext.length > 0 ? (
                    selectedDescriptionsWithContext.map((item, index) => (
                      <div
                        key={index}
                        onClick={isAdmin ? () => handleDescriptionDeselect(item.description) : undefined}
                        style={{
                          padding: '18px',
                          backgroundColor: '#ffffff',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: isAdmin ? 'pointer' : 'default',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          opacity: isAdmin ? 1 : 0.95
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile && isAdmin) {
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile && isAdmin) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {/* Remove Button - Only visible to Admin */}
                        {isAdmin && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '6px 10px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            border: '1px solid #fecaca',
                            transition: 'all 0.2s ease'
                          }}>
                            Remove
                          </div>
                        )}
                        
                        {/* Description Title */}
                            <div style={{
                              fontWeight: 600,
                              color: '#111827',
                          lineHeight: '1.5',
                          fontSize: '15px',
                          paddingRight: isAdmin ? '80px' : '0',
                          marginTop: '4px'
                            }}>
                              {item.description}
                            </div>
                        
                        {/* Metadata */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                          gap: '8px',
                          paddingTop: '12px',
                          borderTop: '1px solid #f3f4f6'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#eff6ff',
                              color: '#1e40af',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '11px',
                              minWidth: '80px',
                              textAlign: 'center'
                            }}>
                              Premium Type
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              {item.premiumType}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                          }}>
                            <span style={{
                            padding: '4px 8px',
                              backgroundColor: '#f0fdf4',
                              color: '#059669',
                            borderRadius: '6px',
                              fontWeight: 600,
                            fontSize: '11px',
                              minWidth: '80px',
                              textAlign: 'center'
                            }}>
                              Category
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              {item.category}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#fef3c7',
                              color: '#d97706',
                              borderRadius: '6px',
                            fontWeight: 600,
                              fontSize: '11px',
                              minWidth: '80px',
                              textAlign: 'center'
                            }}>
                              Data Type
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              {item.dataType}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    selectedDescriptions.map((description, index) => (
                      <div
                        key={index}
                        onClick={isAdmin ? () => handleDescriptionDeselect(description) : undefined}
                        style={{
                          padding: '18px',
                          backgroundColor: '#ffffff',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: isAdmin ? 'pointer' : 'default',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
                          position: 'relative',
                          opacity: isAdmin ? 1 : 0.95
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile && isAdmin) {
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile && isAdmin) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {/* Remove Button - Only visible to Admin */}
                        {isAdmin && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '6px 10px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            border: '1px solid #fecaca'
                          }}>
                            Remove
                          </div>
                        )}
                            <div style={{
                              fontWeight: 600,
                              color: '#111827',
                          lineHeight: '1.5',
                          fontSize: '15px',
                          paddingRight: isAdmin ? '80px' : '0',
                          marginTop: '4px'
                            }}>
                              {description}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#9ca3af',
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #f3f4f6',
                          fontStyle: 'italic'
                            }}>
                              Loading context...
                        </div>
                      </div>
                    ))
                  )}
                    </div>
                  </div>
            )}

            {/* Dashboard Content */}
            <div className="dashboard-content">
              {loadingData && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading data for selected descriptions...
                </div>
              )}
              
              {!loadingData && selectedDescriptions.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  Please select up to 4 descriptions to view data and visuals
                </div>
              )}

              {!loadingData && selectedDescriptions.length > 0 && dashboardData.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No data found for selected descriptions
                </div>
              )}

              {!loadingData && selectedDescriptions.length > 0 && dashboardData.length > 0 && viewMode === 'visuals' ? (
              <div className="dashboard-charts-grid">
                {/* Chart 1: Top-Left - First Selected Description */}
                {selectedDescriptions[0] && (() => {
                  const option = chartOptions[0] || 'country';
                  let chartData = [];
                  let labels = [];
                  
                  if (option === 'country') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[0] && item.CountryName && item.ReportedValue)
                      .reduce((acc, item) => {
                        const country = item.CountryName;
                        if (!acc[country]) {
                          acc[country] = { label: country, value: 0 };
                        }
                        acc[country].value += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 6);
                    labels = chartData.map(d => d.label);
                  } else if (option === 'year') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[0] && item.ProcessedFYYear && item.ReportedValue)
                      .reduce((acc, item) => {
                        const year = item.ProcessedFYYear;
                        if (!acc[year]) {
                          acc[year] = { label: year, value: 0 };
                        }
                        acc[year].value += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));
                    labels = chartData.map(d => d.label);
                  }
                  
                  const maxValue = Math.max(...chartData.map(d => d.value), 1);
                  
                  return (
                <div className="dashboard-chart-card">
                      <div className="chart-header">
                        <h3 className="chart-title">{selectedDescriptions[0]}</h3>
                        <select
                          value={option}
                          onChange={(e) => setChartOptions({ ...chartOptions, 0: e.target.value })}
                          className="chart-dimension-select"
                        >
                          <option value="country">Country by Value</option>
                          <option value="year">Year by Value</option>
                        </select>
                      </div>
                  <div className="chart-container">
                    <div className="bar-chart-vertical">
                          {chartData.length > 0 ? chartData.map((item, index) => (
                        <div key={index} className="bar-item">
                          <div className="bar-wrapper">
                            <div 
                              className="bar-vertical" 
                                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                                >
                                  <span className="bar-value-top">{item.value.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="bar-label-bottom" style={{ fontSize: '11px' }}>
                                {item.label.length > 12 ? item.label.substring(0, 12) + '...' : item.label}
                              </div>
                            </div>
                          )) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Chart 2: Top-Right - Second Selected Description */}
                {selectedDescriptions[1] && (() => {
                  const option = chartOptions[1] || 'country';
                  let chartData = [];
                  
                  if (option === 'country') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[1] && item.CountryName && item.ReportedValue)
                      .reduce((acc, item) => {
                        const country = item.CountryName;
                        if (!acc[country]) {
                          acc[country] = { label: country, value: 0 };
                        }
                        acc[country].value += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 7);
                  } else if (option === 'year') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[1] && item.ProcessedFYYear && item.ReportedValue)
                      .reduce((acc, item) => {
                        const year = item.ProcessedFYYear;
                        if (!acc[year]) {
                          acc[year] = { label: year, value: 0 };
                        }
                        acc[year].value += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));
                  }
                  
                  const maxValue = Math.max(...chartData.map(d => d.value), 1);
                  
                  return (
                <div className="dashboard-chart-card">
                      <div className="chart-header">
                        <h3 className="chart-title">{selectedDescriptions[1]}</h3>
                        <select
                          value={option}
                          onChange={(e) => setChartOptions({ ...chartOptions, 1: e.target.value })}
                          className="chart-dimension-select"
                        >
                          <option value="country">Country by Value</option>
                          <option value="year">Year by Value</option>
                        </select>
                      </div>
                      <div className="chart-container">
                        <div className="bar-chart-vertical">
                          {chartData.length > 0 ? chartData.map((item, index) => (
                            <div key={index} className="bar-item">
                              <div className="bar-wrapper">
                                <div 
                                  className="bar-vertical" 
                                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                                >
                                  <span className="bar-value-top">{item.value.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="bar-label-bottom" style={{ fontSize: '11px' }}>
                                {item.label.length > 12 ? item.label.substring(0, 12) + '...' : item.label}
                              </div>
                            </div>
                          )) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data available</div>
                          )}
                        </div>
                      </div>
                        </div>
                  );
                })()}

                {/* Chart 3: Bottom-Left - Third Selected Description */}
                {selectedDescriptions[2] && (() => {
                  const option = chartOptions[2] || 'category';
                  let chartData = [];
                  
                  if (option === 'country') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[2] && item.CountryName && item.ReportedValue)
                      .reduce((acc, item) => {
                        const country = item.CountryName;
                        if (!acc[country]) {
                          acc[country] = { label: country, value: 0, items: [] };
                        }
                        const value = parseFloat(item.ReportedValue) || 0;
                        acc[country].value += value;
                        acc[country].items.push({ subLabel: item.ProcessedFYYear || 'N/A', value });
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 6);
                  } else if (option === 'year') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[2] && item.ProcessedFYYear && item.ReportedValue)
                      .reduce((acc, item) => {
                        const year = item.ProcessedFYYear;
                        if (!acc[year]) {
                          acc[year] = { label: year, value: 0, items: [] };
                        }
                        const value = parseFloat(item.ReportedValue) || 0;
                        acc[year].value += value;
                        acc[year].items.push({ subLabel: item.CountryName || 'N/A', value });
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));
                  }
                  
                  const totalValue = chartData.reduce((sum, c) => sum + c.value, 1);
                  const colors = ['#4CAF50', '#E0E0E0', '#64B5F6', '#FF9800', '#BA68C8'];
                  const sizeClasses = ['treemap-large', 'treemap-medium', 'treemap-medium', 'treemap-small', 'treemap-small'];
                  
                  return (
                    <div className="dashboard-chart-card">
                      <div className="chart-header">
                        <h3 className="chart-title">{selectedDescriptions[2]}</h3>
                        <select
                          value={option}
                          onChange={(e) => setChartOptions({ ...chartOptions, 2: e.target.value })}
                          className="chart-dimension-select"
                        >
                          <option value="country">Country by Value</option>
                          <option value="year">Year by Value</option>
                        </select>
                      </div>
                      <div className="chart-container">
                        <div className="treemap-container">
                          {chartData.length > 0 ? chartData.slice(0, 6).map((item, index) => {
                            const percentage = (item.value / totalValue) * 100;
                            const sizeClass = index < sizeClasses.length ? sizeClasses[index] : 'treemap-small';
                            const color = colors[index % colors.length];
                            
                            return (
                              <div 
                                key={index} 
                                className={`treemap-item ${sizeClass}`} 
                                style={{ backgroundColor: color }}
                              >
                                <div className="treemap-label">{item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label}</div>
                        <div className="treemap-sub">
                                  {item.items.slice(0, 2).map((subItem, subIndex) => (
                                    <div key={subIndex} className="treemap-sub-item">
                                      {subItem.subLabel || 'N/A'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Chart 4: Bottom-Right - Fourth Selected Description */}
                {selectedDescriptions[3] && (() => {
                  const option = chartOptions[3] || 'premium';
                  let chartData = [];
                  
                  if (option === 'country') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[3] && item.CountryName && item.ReportedValue)
                      .reduce((acc, item) => {
                        const country = item.CountryName;
                        if (!acc[country]) {
                          acc[country] = 0;
                        }
                        acc[country] += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.entries(data)
                      .map(([name, value]) => ({ name, value }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 5);
                  } else if (option === 'year') {
                    const data = dashboardData
                      .filter(item => item.Description === selectedDescriptions[3] && item.ProcessedFYYear && item.ReportedValue)
                      .reduce((acc, item) => {
                        const year = item.ProcessedFYYear;
                        if (!acc[year]) {
                          acc[year] = 0;
                        }
                        acc[year] += parseFloat(item.ReportedValue) || 0;
                        return acc;
                      }, {});
                    chartData = Object.entries(data)
                      .map(([name, value]) => ({ name, value }))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .slice(0, 5);
                  }
                  
                  const totalValue = chartData.reduce((sum, p) => sum + p.value, 1);
                  
                  // Calculate pie chart segments
                  const radius = 80;
                  const circumference = 2 * Math.PI * radius;
                  const colors = ['#64B5F6', '#BA68C8', '#FF9800', '#4CAF50', '#E0E0E0'];
                  let offset = 0;
                  
                  return (
                <div className="dashboard-chart-card">
                      <div className="chart-header">
                        <h3 className="chart-title">{selectedDescriptions[3]}</h3>
                        <select
                          value={option}
                          onChange={(e) => setChartOptions({ ...chartOptions, 3: e.target.value })}
                          className="chart-dimension-select"
                        >
                          <option value="country">Country by Value</option>
                          <option value="year">Year by Value</option>
                        </select>
                      </div>
                  <div className="chart-container">
                    <div className="pie-chart-container">
                          {chartData.length > 0 ? (
                            <>
                              <svg className="pie-chart" viewBox="0 0 200 200">
                                {chartData.map((item, index) => {
                                  const percentage = (item.value / totalValue) * 100;
                                  const length = (percentage / 100) * circumference;
                                  const currentOffset = offset;
                                  offset -= length;
                        
                        return (
                            <circle
                                      key={index}
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                                      stroke={colors[index % colors.length]}
                              strokeWidth="40"
                                      strokeDasharray={`${length} ${circumference}`}
                                      strokeDashoffset={currentOffset}
                              transform="rotate(-90 100 100)"
                            />
                                  );
                                })}
                          </svg>
                      <div className="pie-legend">
                                {chartData.map((item, index) => {
                                  const percentage = ((item.value / totalValue) * 100).toFixed(1);
                                  return (
                                    <div key={index} className="legend-item">
                                      <div className="legend-color" style={{ backgroundColor: colors[index % colors.length] }}></div>
                                      <span>{item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name} - {percentage}%</span>
                        </div>
                                  );
                                })}
                        </div>
                            </>
                          ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              ) : (
              // Data Table View - Pivot Format
              !loadingData && selectedDescriptions && selectedDescriptions.length > 0 && dashboardData.length > 0 && pivotTableData && Object.keys(pivotTableData).length > 0 ? (
                <div className="pivot-tables-container">
                  {Object.keys(pivotTableData).sort().map(periodType => {
                    const periodData = pivotTableData[periodType];
                    if (!periodData) return null;
                    
                    const { periods = [], descriptions = [], pivot = {}, units = {}, descriptionMetadata = {} } = periodData;
                    
                    if (!periods || !descriptions || periods.length === 0 || descriptions.length === 0) {
                      return null;
                    }

                    return (
                      <div key={periodType} style={{ marginBottom: '40px' }}>
                        <h3 style={{ 
                          marginBottom: '16px', 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: '#111827',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #3F72AF'
                        }}>
                          {periodType} Data
                        </h3>
                        <div className="data-table-container" style={{ overflowX: 'auto' }}>
                          <table className="data-table pivot-table">
                  <thead>
                    <tr>
                                <th style={{ position: 'sticky', left: 0, backgroundColor: '#3F72AF', zIndex: 10, minWidth: '300px' }}>
                                  Description
                                </th>
                                <th style={{ position: 'sticky', left: '300px', backgroundColor: '#3F72AF', zIndex: 10, minWidth: '80px' }}>
                                  Unit
                                </th>
                                {periods.map(period => (
                                  <th key={period} style={{ minWidth: '100px', textAlign: 'center' }}>
                                    {period}
                                  </th>
                                ))}
                    </tr>
                  </thead>
                  <tbody>
                              {descriptions.map((desc, descIndex) => {
                                const metadata = descriptionMetadata[desc] || { category: 'N/A', premiumType: 'N/A' };
                                const rowColor = getCategoryPremiumColor(metadata.category, metadata.premiumType);
                                return (
                                <tr key={descIndex} style={{
                                  backgroundColor: rowColor.bg,
                                  borderBottom: `2px solid ${rowColor.border}`
                                }}>
                                  <td style={{ 
                                    position: 'sticky', 
                                    left: 0, 
                                    backgroundColor: rowColor.bg, 
                                    zIndex: 5,
                                    padding: '12px',
                                    borderRight: `2px solid ${rowColor.border}`,
                                    minWidth: '300px'
                                  }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ 
                                        fontSize: '11px', 
                                        color: '#6b7280', 
                                        fontWeight: '500',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                      }}>
                                        <span style={{ color: '#3F72AF' }}>
                                          <strong>Category:</strong> {metadata.category}
                                        </span>
                                        <span style={{ color: '#059669' }}>
                                          <strong>Premium:</strong> {metadata.premiumType}
                                        </span>
                                      </div>
                                      <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '600', 
                                        color: '#111827',
                                        marginTop: '4px',
                                        paddingTop: '4px',
                                        borderTop: '1px solid #e5e7eb'
                                      }}>
                                        {desc}
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ 
                                    position: 'sticky', 
                                    left: '300px', 
                                    backgroundColor: rowColor.bg, 
                                    zIndex: 5,
                                    padding: '12px',
                                    borderRight: `2px solid ${rowColor.border}`,
                                    fontSize: '12px',
                                    color: '#6b7280'
                                  }}>
                                    {units[desc] || '-'}
                                  </td>
                                  {periods.map(period => (
                                    <td key={period} style={{ 
                                      textAlign: 'center', 
                                      padding: '12px',
                                      borderRight: '1px solid #e5e7eb',
                                      backgroundColor: rowColor.bg
                                    }}>
                                      {pivot[desc] && pivot[desc][period] !== undefined 
                                        ? pivot[desc][period] 
                                        : '-'}
                                    </td>
                                    ))}
                                </tr>
                              );
                              })}
                  </tbody>
                </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {selectedDescriptions.length === 0 
                    ? 'Please select up to 4 descriptions to view data' 
                    : 'No data found for selected descriptions'}
                </div>
              )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomyDashboard;

