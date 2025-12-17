import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import './Metrics.css';
import './EconomyDomestic.css'; // Reuse Economy styles for dashboard

function Metrics({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [viewMode, setViewMode] = useState('visuals'); // 'data' or 'visuals'
  const [dashboardData, setDashboardData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [selectedInsurer, setSelectedInsurer] = useState(''); // Filter: Insurer Name
  const [selectedPremium, setSelectedPremium] = useState(''); // Filter: Premium Type (Category Long Name)
  const [selectedCategory, setSelectedCategory] = useState(''); // Filter: Category (Sub Category Long Name)
  const [insurers, setInsurers] = useState([]);
  // Dynamic chart options - keyed by description index
  const [chartOptions, setChartOptions] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  const fetchingDashboardDataRef = useRef(false);
  const lastFetchedDescriptionsRef = useRef(JSON.stringify([]));

  const tabs = ['Dashboard', 'Domestic Metrics'];

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/metrics-domestic')) {
      setActiveTab('Domestic Metrics');
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

  // Fetch insurers on mount
  useEffect(() => {
    const fetchInsurers = async () => {
      try {
        const companies = await ApiService.getCompanies();
        setInsurers(Array.isArray(companies) ? companies : []);
      } catch (err) {
        console.error('Error fetching insurers:', err);
        setInsurers([]);
      }
    };
    fetchInsurers();
  }, []);

  // Fetch selected descriptions on mount
  useEffect(() => {
    const fetchSelectedDescriptions = async () => {
      try {
        const descriptions = await ApiService.getSelectedDescriptionsMetrics();
        setSelectedDescriptions(Array.isArray(descriptions) ? descriptions : []);
      } catch (err) {
        console.error('Error fetching selected descriptions:', err);
        setSelectedDescriptions([]);
      }
    };
    fetchSelectedDescriptions();
  }, []);

  // Single useEffect to fetch data when needed
  useEffect(() => {
    // Only fetch if we're on the dashboard route
    if (!location.pathname.includes('/metrics') || activeTab !== 'Dashboard') {
      return;
    }

    // Prevent duplicate calls
    if (fetchingDashboardDataRef.current) {
      return;
    }

    // Reset tracking when navigating to dashboard to allow fresh fetch
    if (location.pathname.includes('/metrics') && activeTab === 'Dashboard') {
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
        const allData = await ApiService.getMetricsDashboardData(selectedDescriptions);
        
        // Track which descriptions have data
        const foundDescriptions = new Set();
        if (Array.isArray(allData)) {
          allData.forEach(item => {
            if (item && item.Description) {
              foundDescriptions.add(item.Description);
            }
          });
        }
        
        // Remove descriptions from selection if they have no data
        const descriptionsWithData = Array.from(foundDescriptions);
        const missingDescriptions = selectedDescriptions.filter(desc => !descriptionsWithData.includes(desc));
        
        if (missingDescriptions.length > 0) {
          console.log('Removing descriptions with no data:', missingDescriptions);
          const updatedDescriptions = selectedDescriptions.filter(desc => descriptionsWithData.includes(desc));
          setSelectedDescriptions(updatedDescriptions);
          try {
            await ApiService.updateSelectedDescriptionsMetrics(updatedDescriptions, null);
          } catch (updateErr) {
            console.error('Error updating selected descriptions:', updateErr);
          }
        }
        
        setDashboardData(Array.isArray(allData) ? allData : []);
        
        // Debug: Log data structure for first description
        if (Array.isArray(allData) && allData.length > 0 && selectedDescriptions.length > 0) {
          const firstDescData = allData.filter(item => item.Description === selectedDescriptions[0]);
          if (firstDescData.length > 0) {
            console.log(`📊 Dashboard data for "${selectedDescriptions[0]}":`, {
              totalRows: firstDescData.length,
              sampleRow: firstDescData[0],
              hasYear: firstDescData.some(item => item.ProcessedFYYear),
              hasCompany: firstDescData.some(item => item.CompanyInsurerShortName),
              hasPremium: firstDescData.some(item => item.PremiumTypeLongName),
              hasCategory: firstDescData.some(item => item.CategoryLongName),
              hasCountry: firstDescData.some(item => item.CountryName),
              hasValue: firstDescData.some(item => item.ReportedValue)
            });
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (err.response) {
          // Server responded with error status
          if (err.response.status === 404) {
            console.error('Dashboard data endpoint not found. Please ensure the backend server is running and the route is registered.');
          } else {
            console.error(`Server error: ${err.response.status} - ${err.response.statusText}`);
          }
        } else if (err.request) {
          // Request was made but no response received
          console.error('No response from server. Please check if the backend server is running.');
        } else {
          // Error setting up the request
          console.error('Error setting up request:', err.message);
        }
        setDashboardData([]);
      } finally {
        setLoadingData(false);
        fetchingDashboardDataRef.current = false;
      }
    };

    fetchData();
  }, [selectedDescriptions, location.pathname, activeTab]);

  // Get selected descriptions with their context from dashboardData
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
            company: item.CompanyInsurerShortName || 'N/A'
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

  // Get unique Premium types for dropdown filter (filtered by selectedInsurer if set)
  const premiumOptions = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) {
      return [];
    }

    const premiums = new Set();
    dashboardData.forEach(item => {
      if (item && item.PremiumTypeLongName) {
        // Filter by selectedInsurer if set
        if (!selectedInsurer || item.CompanyInsurerShortName === selectedInsurer) {
          premiums.add(item.PremiumTypeLongName);
        }
      }
    });

    return Array.from(premiums).sort();
  }, [dashboardData, selectedInsurer]);

  // Get unique Category types filtered by selected Premium
  const categoryOptions = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) {
      return [];
    }

    // If no premium is selected, return empty array (category dropdown should be disabled)
    if (!selectedPremium) {
      return [];
    }

    const categories = new Set();
    dashboardData.forEach(item => {
      if (item && 
          item.PremiumTypeLongName === selectedPremium && 
          item.CategoryLongName) {
        categories.add(item.CategoryLongName);
      }
    });

    return Array.from(categories).sort();
  }, [dashboardData, selectedPremium]);

  // Reset category when premium changes
  useEffect(() => {
    setSelectedCategory('');
  }, [selectedPremium]);

  // Transform data into pivot table format grouped by PeriodType, filtered by selected Premium
  const pivotTableData = useMemo(() => {
    try {
      if (!dashboardData || dashboardData.length === 0) {
        return {};
      }

      // Filter by selected Insurer, Premium and Category - Premium and Category are required to show data
      let filteredData = [];
      if (selectedPremium && selectedCategory) {
        // Filter by Insurer (if selected), Premium and Category
        filteredData = dashboardData.filter(item => 
          item && 
          (!selectedInsurer || item.CompanyInsurerShortName === selectedInsurer) &&
          item.PremiumTypeLongName === selectedPremium &&
          item.CategoryLongName === selectedCategory
        );
      }
      // If Premium or Category is not selected, return empty array (no data displayed)

      // Group by ProcessedPeriodType
      const groupedByPeriodType = {};
      
      filteredData.forEach(item => {
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
              // Store category, premium type, and company metadata
              if (!descriptionMetadata[desc]) {
                descriptionMetadata[desc] = {
                  category: item.CategoryLongName || 'N/A',
                  premiumType: item.PremiumTypeLongName || 'N/A',
                  company: item.CompanyInsurerShortName || 'N/A'
                };
              } else {
                // Update company if not set
                if (!descriptionMetadata[desc].company || descriptionMetadata[desc].company === 'N/A') {
                  descriptionMetadata[desc].company = item.CompanyInsurerShortName || 'N/A';
                }
              }
            }
          });
        });
        
        // Get company, premium type, and category from first item in group
        const firstItem = groupData[0];
        const companyName = firstItem?.CompanyInsurerShortName || '';
        const premiumTypeName = firstItem?.PremiumTypeLongName || '';
        const categoryName = firstItem?.CategoryLongName || '';
        
        pivotData[periodType] = {
          periods: periods || [],
          descriptions: descriptions || [],
          pivot: pivot || {},
          units: units || {},
          descriptionMetadata: descriptionMetadata || {},
          companyName: companyName,
          premiumTypeName: premiumTypeName,
          categoryName: categoryName
        };
      });

      return pivotData;
    } catch (error) {
      console.error('Error creating pivot table data:', error);
      return {};
    }
  }, [dashboardData, selectedPremium, selectedCategory]);

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
      await ApiService.updateSelectedDescriptionsMetrics(updatedDescriptions, description);
      console.log(`✅ Description "${description}" deselected successfully - saved globally`);
      
      // Clear selected row IDs for that description when removed from dashboard
      try {
        // Clear selected row IDs for both Domestic and International
        await ApiService.updateSelectedRowIdsMetrics('Domestic', description, []);
        await ApiService.updateSelectedRowIdsMetrics('International', description, []);
        console.log(`✅ Cleared selected row IDs for removed description: "${description}"`);
      } catch (err) {
        console.error('Error clearing selected row IDs:', err);
      }
      
      // Refresh from backend to ensure sync
      const refreshedDescriptions = await ApiService.getSelectedDescriptionsMetrics();
      setSelectedDescriptions(Array.isArray(refreshedDescriptions) ? refreshedDescriptions : updatedDescriptions);
    } catch (err) {
      console.error('Error updating selected descriptions:', err);
      // Revert on error
      setSelectedDescriptions(selectedDescriptions);
      alert('Failed to remove description. Please try again.');
    }
  };

  const handleTabClick = (tab) => {
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      // Stay on current page
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      navigate('/metrics-domestic');
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
        <h1>Metrics - Dashboard</h1>
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
                    className={`nav-tab active ${activeTab === tab ? 'selected' : ''}`}
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

            {/* Selected Descriptions Display - Only for Admin */}
            {isAdmin && selectedDescriptions.length > 0 && (
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
                <div className="selected-descriptions-header" style={{
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
                    <h3 className="selected-descriptions-title" style={{
                      margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '6px',
                        letterSpacing: '-0.01em'
                    }}>
                      Selected Descriptions for Dashboard
                    </h3>
                    <p className="selected-descriptions-subtitle" style={{
                      margin: 0,
                      fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: 400
                    }}>
                        {selectedDescriptions.length} selected. {isAdmin ? 'Click on a card to remove.' : 'Only admin can modify selections.'}
                    </p>
                  </div>
                  <div className="selected-descriptions-count" style={{
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
                    {selectedDescriptions.length}
                    </div>
                  </div>
                </div>
                
                {/* Cards Container */}
                <div className="selected-descriptions-cards" style={{
                  padding: '20px 24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                            <div className="description-card-title" style={{
                              fontWeight: 600,
                              color: '#111827',
                          lineHeight: '1.5',
                          fontSize: '15px',
                          paddingRight: isAdmin ? '80px' : '0',
                          marginTop: '4px',
                          wordBreak: 'break-word'
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
                              Company
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              {item.company}
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
                              backgroundColor: '#fef3c7',
                              color: '#d97706',
                              borderRadius: '6px',
                            fontWeight: 600,
                              fontSize: '11px',
                              minWidth: '80px',
                              textAlign: 'center'
                            }}>
                              Sub Category
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              {item.category}
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
                  Please select descriptions in Domestic Metrics page to view data and visuals
                </div>
              )}

              {!loadingData && selectedDescriptions.length > 0 && dashboardData.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No data found for selected descriptions. Please select rows in Domestic Metrics page.
                </div>
              )}

              {!loadingData && selectedDescriptions.length > 0 && dashboardData.length > 0 && viewMode === 'visuals' ? (
              <div className="dashboard-charts-grid">
                {/* Dynamically render charts for all selected descriptions */}
                {selectedDescriptions.map((description, index) => {
                  const chartIndex = index;
                  const option = chartOptions[chartIndex] || 'year';
                  let chartData = [];
                  let labels = [];
                  
                  // Filter data for this description
                  const descriptionData = dashboardData.filter(item => 
                    item && 
                    item.Description === description && 
                    item.ReportedValue
                  );
                  
                  // Helper function to parse numeric value
                  const parseValue = (val) => {
                    if (!val) return 0;
                    const num = parseFloat(String(val).replace(/,/g, ''));
                    return isNaN(num) ? 0 : num;
                  };
                  
                  if (option === 'year') {
                    const data = descriptionData
                      .filter(item => item.ProcessedFYYear)
                      .reduce((acc, item) => {
                        const year = item.ProcessedFYYear || 'Unknown';
                        if (!acc[year]) {
                          acc[year] = { label: year, value: 0 };
                        }
                        acc[year].value += parseValue(item.ReportedValue);
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));
                    labels = chartData.map(d => d.label);
                  } else if (option === 'company') {
                    const data = descriptionData
                      .filter(item => item.CompanyInsurerShortName)
                      .reduce((acc, item) => {
                        const company = item.CompanyInsurerShortName || 'Unknown';
                        if (!acc[company]) {
                          acc[company] = { label: company, value: 0 };
                        }
                        acc[company].value += parseValue(item.ReportedValue);
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 10);
                    labels = chartData.map(d => d.label);
                  } else if (option === 'premium') {
                    const data = descriptionData
                      .filter(item => item.PremiumTypeLongName)
                      .reduce((acc, item) => {
                        const premium = item.PremiumTypeLongName || 'Unknown';
                        if (!acc[premium]) {
                          acc[premium] = { label: premium, value: 0 };
                        }
                        acc[premium].value += parseValue(item.ReportedValue);
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 10);
                    labels = chartData.map(d => d.label);
                  } else if (option === 'category') {
                    const data = descriptionData
                      .filter(item => item.CategoryLongName)
                      .reduce((acc, item) => {
                        const category = item.CategoryLongName || 'Unknown';
                        if (!acc[category]) {
                          acc[category] = { label: category, value: 0 };
                        }
                        acc[category].value += parseValue(item.ReportedValue);
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 10);
                    labels = chartData.map(d => d.label);
                  } else if (option === 'country') {
                    const data = descriptionData
                      .filter(item => item.CountryName)
                      .reduce((acc, item) => {
                        const country = item.CountryName || 'Unknown';
                        if (!acc[country]) {
                          acc[country] = { label: country, value: 0 };
                        }
                        acc[country].value += parseValue(item.ReportedValue);
                        return acc;
                      }, {});
                    chartData = Object.values(data).sort((a, b) => b.value - a.value).slice(0, 10);
                    labels = chartData.map(d => d.label);
                  }
                  
                  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 1) : 1;
                  
                  return (
                    <div key={chartIndex} className="dashboard-chart-card">
                      <div className="chart-header">
                        <h3 className="chart-title">{description}</h3>
                        <select
                          value={option}
                          onChange={(e) => setChartOptions({ ...chartOptions, [chartIndex]: e.target.value })}
                          className="chart-dimension-select"
                        >
                          <option value="year">Year by Value</option>
                          <option value="company">Company by Value</option>
                          <option value="premium">Premium Type by Value</option>
                          <option value="category">Category by Value</option>
                          <option value="country">Country by Value</option>
                        </select>
                      </div>
                      <div className="chart-container">
                        <div className="bar-chart-vertical">
                          {chartData.length > 0 ? chartData.map((item, itemIndex) => (
                            <div key={itemIndex} className="bar-item">
                              <div className="bar-wrapper">
                                <div 
                                  className="bar-vertical" 
                                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                                >
                                  <span className="bar-value-top">{item.value.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="bar-label-bottom" style={{ fontSize: '11px' }}>
                                {item.label.length > 15 ? item.label.substring(0, 15) + '...' : item.label}
                              </div>
                            </div>
                          )) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                              No data available for this view. Try selecting a different dimension.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
              // Data Table View - Pivot Format
              !loadingData && selectedDescriptions && selectedDescriptions.length > 0 && dashboardData.length > 0 ? (
                <div className="pivot-tables-container">
                  {/* Insurer Name Filter Dropdown */}
                  <div className="insurer-filter" style={{
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    flexWrap: 'wrap'
                  }}>
                    <label className="filter-label" style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      minWidth: isMobile ? '100%' : '200px',
                      flex: isMobile ? '1 1 100%' : '0 0 auto'
                    }}>
                      Filter by Insurer Name:
                    </label>
                    <select
                      className="filter-select-dropdown"
                      value={selectedInsurer}
                      onChange={(e) => {
                        setSelectedInsurer(e.target.value);
                        // Reset dependent filters when insurer changes
                        setSelectedPremium('');
                        setSelectedCategory('');
                      }}
                      style={{
                        flex: isMobile ? '1 1 100%' : '1',
                        maxWidth: isMobile ? '100%' : '400px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3F72AF'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    >
                      <option value="">All Insurers</option>
                      {insurers.map((insurer, index) => (
                        <option key={index} value={insurer}>
                          {insurer}
                        </option>
                      ))}
                    </select>
                    {selectedInsurer && (
                      <button
                        className="clear-filter-btn"
                        onClick={() => {
                          setSelectedInsurer('');
                          setSelectedPremium('');
                          setSelectedCategory('');
                        }}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          flex: isMobile ? '1 1 100%' : '0 0 auto',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  {/* Premium Filter Dropdown */}
                  <div className="premium-filter" style={{
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    flexWrap: 'wrap'
                  }}>
                    <label className="filter-label" style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      minWidth: isMobile ? '100%' : '200px',
                      flex: isMobile ? '1 1 100%' : '0 0 auto'
                    }}>
                      Filter by Category Long Name:
                    </label>
                    <select
                      className="filter-select-dropdown"
                      value={selectedPremium}
                      onChange={(e) => setSelectedPremium(e.target.value)}
                      style={{
                        flex: isMobile ? '1 1 100%' : '1',
                        maxWidth: isMobile ? '100%' : '400px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3F72AF'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    >
                      <option value="">All Premiums</option>
                      {premiumOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {selectedPremium && (
                      <button
                        className="clear-filter-btn"
                        onClick={() => setSelectedPremium('')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          flex: isMobile ? '1 1 100%' : '0 0 auto',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  {/* Category Filter Dropdown - Only enabled when Premium is selected */}
                  <div className="category-filter" style={{
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    flexWrap: 'wrap',
                    opacity: selectedPremium ? 1 : 0.6
                  }}>
                    <label className="filter-label" style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      minWidth: isMobile ? '100%' : '200px',
                      flex: isMobile ? '1 1 100%' : '0 0 auto'
                    }}>
                      Filter by Sub Category Long Name:
                    </label>
                    <select
                      className="filter-select-dropdown"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={!selectedPremium}
                      style={{
                        flex: isMobile ? '1 1 100%' : '1',
                        maxWidth: isMobile ? '100%' : '400px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: selectedPremium ? '#ffffff' : '#f3f4f6',
                        color: selectedPremium ? '#111827' : '#9ca3af',
                        cursor: selectedPremium ? 'pointer' : 'not-allowed',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        if (selectedPremium) {
                          e.target.style.borderColor = '#3F72AF';
                        }
                      }}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    >
                      <option value="">All Categories</option>
                      {categoryOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {selectedCategory && (
                      <button
                        className="clear-filter-btn"
                        onClick={() => setSelectedCategory('')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          flex: isMobile ? '1 1 100%' : '0 0 auto',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                  
                  {/* Data Tables - Only show when data exists */}
                  {pivotTableData && Object.keys(pivotTableData).length > 0 ? (
                    <>
                  {Object.keys(pivotTableData).sort().map(periodType => {
                    const periodData = pivotTableData[periodType];
                    if (!periodData) return null;
                    
                    const { periods = [], descriptions = [], pivot = {}, units = {}, descriptionMetadata = {}, 
                            companyName = '', premiumTypeName = '', categoryName = '' } = periodData;
                    
                    if (!periods || !descriptions || periods.length === 0 || descriptions.length === 0) {
                      return null;
                    }

                    // Build breadcrumb for non-admin users: Company >> Premium Type >> Category >> Period Type
                    // Use stored values from periodData, fallback to selected filters, then metadata
                    const displayCompanyName = companyName || (selectedPremium && selectedCategory ? 
                      dashboardData.find(item => 
                        item.ProcessedPeriodType === periodType &&
                        item.PremiumTypeLongName === selectedPremium &&
                        item.CategoryLongName === selectedCategory
                      )?.CompanyInsurerShortName : '') || '';
                    const displayPremiumTypeName = selectedPremium || premiumTypeName || '';
                    const displayCategoryName = selectedCategory || categoryName || '';
                    
                    const breadcrumbParts = [];
                    if (displayCompanyName && displayCompanyName !== 'N/A') breadcrumbParts.push(displayCompanyName);
                    if (displayPremiumTypeName && displayPremiumTypeName !== 'N/A') breadcrumbParts.push(displayPremiumTypeName);
                    if (displayCategoryName && displayCategoryName !== 'N/A') breadcrumbParts.push(displayCategoryName);
                    if (periodType) breadcrumbParts.push(periodType);
                    const breadcrumbText = breadcrumbParts.join(' >> ');

                    return (
                      <div key={periodType} className="period-type-section" style={{ marginBottom: '40px' }}>
                        <h3 className="period-type-title" style={{ 
                          marginBottom: '16px', 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: '#111827',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #3F72AF'
                        }}>
                          {!isAdmin && breadcrumbText ? breadcrumbText : `${periodType} Data`}
                        </h3>
                        <div className="data-table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                          <table className="data-table pivot-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                                <th className="pivot-table-header-desc" style={{ 
                                  position: 'sticky', 
                                  left: 0, 
                                  backgroundColor: '#3F72AF', 
                                  color: '#ffffff',
                                  zIndex: 10, 
                                  minWidth: isMobile ? '200px' : '300px', 
                                  textAlign: 'left',
                                  padding: '12px',
                                  border: '1px solid #2c5a8a'
                                }}>
                                  Description
                                </th>
                                <th className="pivot-table-header-unit" style={{ 
                                  position: 'sticky', 
                                  left: isMobile ? '200px' : '300px', 
                                  backgroundColor: '#3F72AF', 
                                  color: '#ffffff',
                                  zIndex: 10, 
                                  minWidth: isMobile ? '60px' : '80px', 
                                  textAlign: 'center',
                                  padding: '12px',
                                  border: '1px solid #2c5a8a'
                                }}>
                                  Period Unit
                                </th>
                                {!isAdmin && (
                                  <th className="pivot-table-header-period-type" style={{ 
                                    position: 'sticky', 
                                    left: isMobile ? '260px' : '380px', 
                                    backgroundColor: '#3F72AF', 
                                    color: '#ffffff',
                                    zIndex: 10, 
                                    minWidth: isMobile ? '80px' : '100px', 
                                    textAlign: 'center',
                                    padding: '12px',
                                    border: '1px solid #2c5a8a'
                                  }}>
                                    Period
                                  </th>
                                )}
                                {periods.map(period => (
                                  <th key={period} className="pivot-table-header-period" style={{ 
                                    minWidth: isMobile ? '80px' : '100px', 
                                    textAlign: 'center',
                                    backgroundColor: '#3F72AF',
                                    color: '#ffffff',
                                    padding: '12px',
                                    border: '1px solid #2c5a8a'
                                  }}>
                                    {period}
                                  </th>
                                ))}
                    </tr>
                  </thead>
                  <tbody>
                              {descriptions.map((desc, descIndex) => {
                                const metadata = descriptionMetadata[desc] || { category: 'N/A', premiumType: 'N/A', company: 'N/A' };
                                const rowColor = isAdmin ? getCategoryPremiumColor(metadata.category, metadata.premiumType) : { bg: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb', border: '#e5e7eb' };
                                
                                return (
                                <tr key={descIndex} style={{
                                  backgroundColor: rowColor.bg,
                                  borderBottom: '1px solid #e5e7eb'
                                }}>
                                  <td className="pivot-table-cell-desc" style={{ 
                                    position: 'sticky', 
                                    left: 0, 
                                    backgroundColor: rowColor.bg, 
                                    zIndex: 5,
                                    padding: '12px',
                                    borderRight: '2px solid #e5e7eb',
                                    minWidth: isMobile ? '200px' : '300px',
                                    fontWeight: '500'
                                  }}>
                                    {isAdmin ? (
                                      <>
                                        <div style={{ 
                                          fontSize: '14px', 
                                          fontWeight: '600', 
                                          color: '#111827',
                                          wordBreak: 'break-word',
                                          lineHeight: '1.4'
                                        }}>
                                          {desc} - <span style={{ color: '#1e40af', fontWeight: '600' }}>{metadata.premiumType || 'N/A'}</span> - <span style={{ color: '#059669', fontWeight: '600' }}>{metadata.category || 'N/A'}</span>
                                        </div>
                                        <div style={{ 
                                          fontSize: '11px', 
                                          color: '#6b7280',
                                          marginTop: '4px'
                                        }}>
                                          Company: {metadata.company || 'N/A'}
                                        </div>
                                      </>
                                    ) : (
                                      desc
                                    )}
                                  </td>
                                  <td className="pivot-table-cell-unit" style={{ 
                                    position: 'sticky', 
                                    left: isMobile ? '200px' : '300px', 
                                    backgroundColor: rowColor.bg, 
                                    zIndex: 5,
                                    padding: '12px',
                                    borderRight: '2px solid #e5e7eb',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                  }}>
                                    {units[desc] || '-'}
                                  </td>
                                  {!isAdmin && (
                                    <td className="pivot-table-cell-period-type" style={{ 
                                      position: 'sticky', 
                                      left: isMobile ? '260px' : '380px', 
                                      backgroundColor: rowColor.bg, 
                                      zIndex: 5,
                                      padding: '12px',
                                      borderRight: '2px solid #e5e7eb',
                                      fontSize: '12px',
                                      color: '#374151',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'center',
                                      fontWeight: '500'
                                    }}>
                                      {periodType}
                                    </td>
                                  )}
                                  {periods.map(period => (
                                    <td key={period} className="pivot-table-cell-data" style={{ 
                                      textAlign: 'right', 
                                      padding: '12px',
                                      borderRight: '1px solid #e5e7eb',
                                      backgroundColor: rowColor.bg,
                                      fontSize: '13px',
                                      whiteSpace: 'nowrap'
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
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                      {!selectedPremium
                        ? 'Please select a Category Long Name to view data'
                        : !selectedCategory
                        ? 'Please select a Sub Category Long Name to view data'
                        : 'No data found for selected filters'}
                    </div>
                  )}
              </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {selectedDescriptions.length === 0 
                    ? 'Please select descriptions in Domestic Metrics page to view data' 
                    : 'No data available'}
                </div>
              )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Metrics;
