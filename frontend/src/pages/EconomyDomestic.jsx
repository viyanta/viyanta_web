import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import './EconomyDomestic.css';

const EconomyDomestic = ({ onMenuClick }) => {
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
  const [selectedPremiumType, setSelectedPremiumType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriodType, setSelectedPeriodType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'
  
  // API data states
  const [premiumTypes, setPremiumTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalCategories, setModalCategories] = useState([]); // Categories for modal dropdown
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    ProcessedPeriodType: '',
    ProcessedFYYear: '',
    DataType: 'Domestic',
    CountryName: '',
    PremiumTypeLongName: '',
    CategoryLongName: '',
    Description: '',
    ReportedUnit: '',
    ReportedValue: '',
    IsActive: true
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showCustomPremiumType, setShowCustomPremiumType] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [selectedPremiumTypeOption, setSelectedPremiumTypeOption] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [yearSortOrder, setYearSortOrder] = useState('asc'); // 'asc' or 'desc'
  
  // Refs to prevent duplicate API calls
  const fetchingPremiumTypesRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);
  const fetchingDataRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International', 'Domestic Metrics', 'International Metrics',
    'Irdai Monthly Data'
  ];

  // Filter to show only active tabs, preserving order from activeNavItems
  const tabs = activeNavItems.filter(tab => allTabs.includes(tab));

  // Fetch premium types from API when component loads or when navigating to this page
  useEffect(() => {
    // Only fetch if we're on the domestic page
    if (!location.pathname.includes('/economy-domestic')) {
      return;
    }

    // Prevent duplicate calls
    if (fetchingPremiumTypesRef.current) return;
    
    const fetchPremiumTypes = async () => {
      fetchingPremiumTypesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        // Call API: http://localhost:8000/api/economy/premium-types?data_type=Domestic
        console.log('🔵 Calling API: /api/economy/premium-types?data_type=Domestic');
        const data = await ApiService.getPremiumTypes('Domestic');
        console.log('✅ Premium types received from API:', data);
        console.log('📊 Number of premium types:', data?.length || 0);
        setPremiumTypes(data || []);
      } catch (err) {
        console.error('❌ Error fetching premium types:', err);
        setError('Failed to load premium types. Please try again.');
        setPremiumTypes([]);
      } finally {
        setLoading(false);
        fetchingPremiumTypesRef.current = false;
      }
    };

    // Fetch when on the domestic page
    fetchPremiumTypes();
  }, [location.pathname]);

  // Fetch categories when premium type is selected
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingCategoriesRef.current) return;
    
    const fetchCategories = async () => {
      if (!selectedPremiumType) {
        setCategories([]);
        setFilteredData([]);
        return;
      }

      fetchingCategoriesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        // Call API: http://localhost:8000/api/economy/categories?data_type=Domestic&premium={selectedPremiumType}
        console.log(`🔵 Calling Categories API: /api/economy/categories?data_type=Domestic&premium=${selectedPremiumType}`);
        const data = await ApiService.getCategories('Domestic', selectedPremiumType);
        console.log('✅ Categories received from API:', data);
        console.log('📊 Number of categories:', data?.length || 0);
        setCategories(data || []);
        // Reset category selection when premium type changes
        setSelectedCategory('');
      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
        setCategories([]);
      } finally {
        setLoading(false);
        fetchingCategoriesRef.current = false;
      }
    };

    fetchCategories();
  }, [selectedPremiumType]);

  // Fetch economy data when both premium type and category are selected
  const fetchEconomyData = useCallback(async () => {
    if (!selectedPremiumType || !selectedCategory) {
      setFilteredData([]);
      setLoading(false);
      return;
    }

    // Prevent duplicate calls only if already fetching
    if (fetchingDataRef.current) {
      return;
    }

    fetchingDataRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Call API: http://localhost:8000/api/economy/data?data_type=Domestic&premium={selectedPremiumType}&category={selectedCategory}
      console.log(`🔵 Calling Economy Data API: /api/economy/data?data_type=Domestic&premium=${selectedPremiumType}&category=${selectedCategory}`);
      const data = await ApiService.getEconomyData('Domestic', selectedPremiumType, selectedCategory);
      console.log('✅ Economy data received from API:', data);
      console.log('📊 Number of records:', data?.length || 0);
      
      // Filter data based on admin status:
      // - Admin: Show all records (active and inactive)
      // - Non-admin: Only show active records (IsActive === 1 or IsActive === true)
      let filtered = data || [];
      if (!isAdmin) {
        filtered = filtered.filter(row => row.IsActive === 1 || row.IsActive === true);
        console.log('🔒 Non-admin user: Filtered to active records only. Count:', filtered.length);
      } else {
        console.log('👑 Admin user: Showing all records (active and inactive). Count:', filtered.length);
      }
      
      setFilteredData(filtered);
    } catch (err) {
      console.error('❌ Error fetching economy data:', err);
      setError('Failed to load economy data. Please try again.');
      setFilteredData([]);
    } finally {
      setLoading(false);
      fetchingDataRef.current = false;
    }
  }, [selectedPremiumType, selectedCategory, isAdmin]);

  useEffect(() => {
    fetchEconomyData();
  }, [fetchEconomyData]);

  // Refresh data only when navigating to this page (not on filter changes)
  useEffect(() => {
    if (location.pathname.includes('/economy-domestic')) {
      // Reset refs to allow fresh fetch
      fetchingDataRef.current = false;
      fetchingCategoriesRef.current = false;
      
      // Only refresh if both filters are selected and we're on the page
      // Don't trigger on filter changes - that's handled by fetchEconomyData useEffect above
      if (selectedPremiumType && selectedCategory) {
        const timer = setTimeout(() => {
          if (!fetchingDataRef.current) {
            fetchEconomyData();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    // Only depend on location.pathname, not on selectedPremiumType or selectedCategory
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Get unique descriptions with their premium type and category
  const descriptionsWithContext = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const descriptionMap = new Map();
    filteredData.forEach(item => {
      const description = item.Description || '';
      if (description) {
        if (!descriptionMap.has(description)) {
          descriptionMap.set(description, {
            description: description,
            premiumType: item.PremiumTypeLongName || '',
            category: item.CategoryLongName || ''
          });
        }
      }
    });
    
    return Array.from(descriptionMap.values());
  }, [filteredData]);

  // Handle description toggle - Save globally via API (admin only)
  const handleDescriptionToggle = async (description) => {
    if (!isAdmin) {
      return; // Only admin can toggle descriptions
    }

    const isRemoving = selectedDescriptions.includes(description);
    const updatedDescriptions = isRemoving
      ? selectedDescriptions.filter(d => d !== description)
      : selectedDescriptions.length >= 4
        ? (alert('You can select maximum 4 descriptions only.'), selectedDescriptions)
        : [...selectedDescriptions, description];

    // If max limit reached, don't proceed
    if (updatedDescriptions === selectedDescriptions && !isRemoving) {
      return;
    }

    // Update local state first for immediate UI update
    setSelectedDescriptions(updatedDescriptions);

    // Call API to save globally
    try {
      await ApiService.updateSelectedDescriptions(updatedDescriptions, isRemoving ? description : null);
      console.log(`✅ Description "${description}" ${isRemoving ? 'deselected' : 'selected'} successfully - saved globally`);
      
      // Refresh from backend to ensure sync
      const refreshedDescriptions = await ApiService.getSelectedDescriptions();
      setSelectedDescriptions(Array.isArray(refreshedDescriptions) ? refreshedDescriptions : updatedDescriptions);
    } catch (err) {
      console.error('Error updating selected descriptions:', err);
      // Revert on error
      setSelectedDescriptions(selectedDescriptions);
      alert('Failed to update selection. Please try again.');
    }
  };

  // Sort data by year when sort order changes (no filtering by selected descriptions - those are only for Dashboard)
  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return filteredData;
    
    // Sort by year (show all data, not filtered by selected descriptions)
    const sorted = [...filteredData].sort((a, b) => {
      const yearA = a.ProcessedFYYear || '';
      const yearB = b.ProcessedFYYear || '';
      
      // Try to parse as numbers first, fallback to string comparison
      const numA = parseInt(yearA);
      const numB = parseInt(yearB);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return yearSortOrder === 'asc' ? numA - numB : numB - numA;
      }
      
      // String comparison fallback
      if (yearSortOrder === 'asc') {
        return yearA.localeCompare(yearB);
      } else {
        return yearB.localeCompare(yearA);
      }
    });
    
    return sorted;
  }, [filteredData, yearSortOrder]);

  const toggleYearSort = () => {
    setYearSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // CRUD Handler Functions
  const handleAdd = () => {
    setFormData({
      ProcessedPeriodType: '',
      ProcessedFYYear: '',
      DataType: 'Domestic',
      CountryName: '',
      PremiumTypeLongName: '',
      CategoryLongName: '',
      Description: '',
      ReportedUnit: '',
      ReportedValue: '',
      IsActive: true
    });
    setEditingRecord(null);
    setShowCustomPremiumType(false);
    setShowCustomCategory(false);
    setSelectedPremiumTypeOption('');
    setSelectedCategoryOption('');
    setModalCategories([]);
    setShowAddModal(true);
  };

  const handleEdit = async (record) => {
    const premiumTypeValue = record.PremiumTypeLongName || '';
    const categoryValue = record.CategoryLongName || '';
    
    setFormData({
      ProcessedPeriodType: record.ProcessedPeriodType || '',
      ProcessedFYYear: record.ProcessedFYYear || '',
      DataType: record.DataType || 'Domestic',
      CountryName: record.CountryName || '',
      PremiumTypeLongName: premiumTypeValue,
      CategoryLongName: categoryValue,
      Description: record.Description || '',
      ReportedUnit: record.ReportedUnit || '',
      ReportedValue: record.ReportedValue || '',
      IsActive: record.IsActive !== undefined ? record.IsActive : true
    });
    
    // Check if the values exist in the dropdowns
    const isPremiumTypeInList = premiumTypes.includes(premiumTypeValue);
    const isCategoryInList = categories.includes(categoryValue);
    
    setShowCustomPremiumType(!isPremiumTypeInList && premiumTypeValue !== '');
    setShowCustomCategory(!isCategoryInList && categoryValue !== '');
    setSelectedPremiumTypeOption(isPremiumTypeInList ? premiumTypeValue : '');
    setSelectedCategoryOption(isCategoryInList ? categoryValue : '');
    
    // Fetch categories for the premium type if it exists
    if (premiumTypeValue && isPremiumTypeInList) {
      try {
        const categoryData = await ApiService.getCategories('Domestic', premiumTypeValue);
        setModalCategories(categoryData || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setModalCategories([]);
      }
    } else {
      setModalCategories([]);
    }
    
    setEditingRecord(record);
    setShowAddModal(true);
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    setLoading(true);
    setError(null);
    try {
      const deletedPremiumType = recordToDelete.PremiumTypeLongName;
      const deletedCategory = recordToDelete.CategoryLongName;
      
      await ApiService.deleteEconomyData(recordToDelete.id);
      setSuccessMessage('Record deleted successfully!');
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      
      // Refresh premium types dropdown
      try {
        const updatedPremiumTypes = await ApiService.getPremiumTypes('Domestic');
        setPremiumTypes(updatedPremiumTypes || []);
        
        // If the deleted record's premium type is no longer in the list, remove it from selection
        if (deletedPremiumType && !updatedPremiumTypes.includes(deletedPremiumType)) {
          if (selectedPremiumType === deletedPremiumType) {
            setSelectedPremiumType('');
            setSelectedCategory('');
            setCategories([]);
            setFilteredData([]);
          }
        }
      } catch (err) {
        console.error('Error refreshing premium types:', err);
      }
      
      // Refresh categories dropdown if premium type is still selected
      if (selectedPremiumType && selectedPremiumType === deletedPremiumType) {
        try {
          const updatedCategories = await ApiService.getCategories('Domestic', selectedPremiumType);
          setCategories(updatedCategories || []);
          
          // If the deleted record's category is no longer in the list, remove it from selection
          if (deletedCategory && !updatedCategories.includes(deletedCategory)) {
            if (selectedCategory === deletedCategory) {
              setSelectedCategory('');
              setFilteredData([]);
            }
          }
        } catch (err) {
          console.error('Error refreshing categories:', err);
        }
      }
      
      // Refresh data if filters are still selected
      if (selectedPremiumType && selectedCategory) {
        const data = await ApiService.getEconomyData('Domestic', selectedPremiumType, selectedCategory);
        setFilteredData(data || []);
      } else {
        // Clear data if filters were cleared
        setFilteredData([]);
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting record:', err);
      setError('Failed to delete record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setRecordToDelete(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newPremiumType = formData.PremiumTypeLongName;
      const newCategory = formData.CategoryLongName;
      
      if (editingRecord) {
        // Update existing record
        await ApiService.updateEconomyData(editingRecord.id, formData);
        setSuccessMessage('Record updated successfully!');
      } else {
        // Create new record
        await ApiService.createEconomyData(formData);
        setSuccessMessage('Record added successfully!');
      }

      setShowAddModal(false);
      setEditingRecord(null);
      setShowCustomPremiumType(false);
      setShowCustomCategory(false);
      setSelectedPremiumTypeOption('');
      setSelectedCategoryOption('');
      setModalCategories([]);
      
      // Refresh premium types dropdown
      try {
        const updatedPremiumTypes = await ApiService.getPremiumTypes('Domestic');
        setPremiumTypes(updatedPremiumTypes || []);
        
        // If new premium type was added and it's not in the list, add it
        if (newPremiumType && !updatedPremiumTypes.includes(newPremiumType)) {
          setPremiumTypes([...updatedPremiumTypes, newPremiumType]);
        }
      } catch (err) {
        console.error('Error refreshing premium types:', err);
      }
      
      // Refresh categories dropdown if premium type is selected
      if (selectedPremiumType || newPremiumType) {
        try {
          const premiumTypeToUse = selectedPremiumType || newPremiumType;
          const updatedCategories = await ApiService.getCategories('Domestic', premiumTypeToUse);
          setCategories(updatedCategories || []);
          
          // If new category was added and it's not in the list, add it
          if (newCategory && !updatedCategories.includes(newCategory)) {
            setCategories([...updatedCategories, newCategory]);
          }
        } catch (err) {
          console.error('Error refreshing categories:', err);
        }
      }
      
      // Refresh data if filters are selected
      if (selectedPremiumType && selectedCategory) {
        const data = await ApiService.getEconomyData('Domestic', selectedPremiumType, selectedCategory);
        setFilteredData(data || []);
      } else if (newPremiumType && newCategory) {
        // If new record was added with new premium/category, refresh with those
        const data = await ApiService.getEconomyData('Domestic', newPremiumType, newCategory);
        setFilteredData(data || []);
        // Also update the selected filters
        setSelectedPremiumType(newPremiumType);
        setSelectedCategory(newCategory);
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving record:', err);
      setError('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
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
        navigate('/economy-dashboard');
      }
    } else if (tab === 'Domestic') {
      // Stay on current page
      return;
    } else if (tab === 'International') {
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
    <div className="economy-domestic-page">
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
        <h1>Economy - Domestic</h1>
      </div>

      <div className="main-content-wrapper">
        <div className="content-layout">
          {/* Left Sidebar */}
          <div className="sidebar-container">
            <CompanyInformationSidebar />
          </div>

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Breadcrumb */}
            <div className="breadcrumb" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(6px, 1.5vw, 8px)',
              fontSize: 'clamp(13px, 2.5vw, 14px)',
              marginBottom: 'clamp(10px, 2vw, 15px)',
              flexWrap: 'wrap'
            }}>
              <span 
                onClick={() => handleTabClick('Dashboard')}
                style={{ 
                  color: '#36659b', 
                  cursor: 'pointer',
                  textDecoration: 'none',
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
                Economy
              </span>
              <span className="breadcrumb-separator" style={{ color: '#999' }}>›</span>
              <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>Domestic</span>
            </div>

            {/* Navigation Tabs */}
            <div className="navigation-tabs-container">
              <div className="navigation-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'}`}
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
                  disabled
                >
                  Visuals
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="success-message" style={{ 
                padding: '10px', 
                margin: '10px 0', 
                backgroundColor: '#dfd', 
                color: '#3a3', 
                borderRadius: '4px' 
              }}>
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{ 
                padding: '10px', 
                margin: '10px 0', 
                backgroundColor: '#fee', 
                color: '#c33', 
                borderRadius: '4px' 
              }}>
                {error}
              </div>
            )}

            {/* Action Buttons - Only visible to Admin */}
            {isAdmin && (
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAdd}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#36659b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(54, 101, 155, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2d5280';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(54, 101, 155, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#36659b';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(54, 101, 155, 0.2)';
                }}
              >
                  <span>+</span>
                  <span>Add New Record</span>
                </button>
              </div>
            )}

            {/* Filter Dropdowns */}
            <div className="filters-section">
              <div className="filter-group">
                <label htmlFor="premium-type">Select Premium Type Long name</label>
                <select
                  id="premium-type"
                  value={selectedPremiumType}
                  onChange={(e) => setSelectedPremiumType(e.target.value)}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">Select Premium Type...</option>
                  {premiumTypes.length > 0 ? (
                    premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                    ))
                  ) : (
                    !loading && <option value="" disabled>No premium types available</option>
                  )}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="category">Select Category Long Name</label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                  disabled={loading || !selectedPremiumType}
                >
                  <option value="">Select Category...</option>
                  {categories.length > 0 ? (
                    categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                    ))
                  ) : (
                    selectedPremiumType && !loading && <option value="" disabled>No categories available</option>
                  )}
                </select>
                {!selectedPremiumType && (
                  <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Please select a Premium Type first
                  </small>
                )}
              </div>

              {loading && (
                <div style={{ padding: '10px', color: '#666' }}>
                  Loading...
                </div>
              )}
            </div>

            {/* Description Selection Section - Only visible to Admin */}
            {isAdmin && selectedPremiumType && selectedCategory && descriptionsWithContext.length > 0 && (
              <div className="description-selection-container">
                <div className="description-selection-card">
                  {/* Header Section */}
                  <div className="description-selection-header">
                    <div className="description-selection-header-content">
                      <div>
                        <h3 className="description-selection-title">
                          Select Descriptions
                        </h3>
                        <p className="description-selection-subtitle">
                          Choose up to 4 descriptions to visualize in Dashboard
                        </p>
                      </div>
                      {selectedDescriptions && selectedDescriptions.length > 0 && (
                        <div className="description-selection-counter">
                          {selectedDescriptions.length}/4
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Cards Container */}
                  <div className="description-cards-container">
                    {descriptionsWithContext.map((item, index) => {
                      const isSelected = selectedDescriptions && selectedDescriptions.includes(item.description);
                      const isDisabled = !isSelected && selectedDescriptions && selectedDescriptions.length >= 4;
                      
                      return (
                        <div
                          key={index}
                          onClick={() => !isDisabled && handleDescriptionToggle(item.description)}
                          className={`description-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          onMouseEnter={(e) => {
                            if (!isDisabled && !isMobile) {
                              e.currentTarget.style.borderColor = '#3F72AF';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(63, 114, 175, 0.2), 0 0 0 4px rgba(63, 114, 175, 0.1)';
                              e.currentTarget.style.transform = 'translateY(-4px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDisabled && !isMobile) {
                              e.currentTarget.style.borderColor = isSelected ? '#3F72AF' : '#e5e7eb';
                              e.currentTarget.style.boxShadow = isSelected 
                                ? '0 8px 16px rgba(63, 114, 175, 0.15), 0 0 0 4px rgba(63, 114, 175, 0.1)' 
                                : '0 2px 4px rgba(0, 0, 0, 0.06)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          {/* Custom Checkbox */}
                          <div className="description-checkbox">
                            <div className={`description-checkbox-box ${isSelected ? 'selected' : ''}`}>
                              {isSelected && (
                                <svg className="description-checkbox-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path 
                                    d="M13.3333 4L6 11.3333L2.66667 8" 
                                    stroke="white" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          {/* Description Text */}
                          <div className="description-text">
                            <div className={`description-text-content ${isSelected ? 'selected' : ''}`}>
                              {item.description}
                            </div>
                          </div>
                          
                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="description-indicator" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Sort Year Button */}
            {sortedData && sortedData.length > 0 && (
              <div style={{ 
                marginBottom: 'clamp(15px, 3vw, 20px)',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={toggleYearSort}
                  style={{
                    padding: 'clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)',
                    backgroundColor: '#36659b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(13px, 2.5vw, 14px)',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(54, 101, 155, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2d5280';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(54, 101, 155, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#36659b';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(54, 101, 155, 0.2)';
                  }}
                >
                  <span>Sort Year</span>
                  <span style={{ fontSize: '16px' }}>
                    {yearSortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>
                    ({yearSortOrder === 'asc' ? 'Ascending' : 'Descending'})
                  </span>
                </button>
              </div>
            )}

            {/* Data Table or Visuals */}
            {viewMode === 'data' ? (
              <div className="table-container">
                <table className="economy-table">
                  <thead>
                    <tr>
                      <th>ProcessedPeriodType</th>
                      <th>ProcessedFYYear</th>
                      <th>DataType</th>
                      <th>CountryName</th>
                      <th>PremiumTypeLongName</th>
                      <th>CategoryLongName</th>
                      <th>Description</th>
                      <th>ReportedUnit</th>
                      <th>ReportedValue</th>
                      {isAdmin && <th>Status</th>}
                      {isAdmin && <th style={{ textAlign: 'center', minWidth: '140px' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 11 : 9} className="no-data">Loading data...</td>
                      </tr>
                    ) : sortedData.length > 0 ? (
                      sortedData.map((row, index) => (
                        <tr key={row.id || index}>
                          <td>{row.ProcessedPeriodType || '-'}</td>
                          <td>{row.ProcessedFYYear || '-'}</td>
                          <td>{row.DataType || '-'}</td>
                          <td>{row.CountryName || '-'}</td>
                          <td>{row.PremiumTypeLongName || '-'}</td>
                          <td>{row.CategoryLongName || '-'}</td>
                          <td>{row.Description || '-'}</td>
                          <td>{row.ReportedUnit || '-'}</td>
                          <td>{row.ReportedValue || '-'}</td>
                          {isAdmin && (
                            <td>
                              <label
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  width: '50px',
                                  height: '24px',
                                  cursor: 'pointer'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={row.IsActive === 1 || row.IsActive === true}
                                  onChange={async (e) => {
                                    const newStatus = e.target.checked;
                                    try {
                                      await ApiService.updateEconomyData(row.id, { IsActive: newStatus });
                                      // Update local state
                                      setFilteredData(prevData =>
                                        prevData.map(item =>
                                          item.id === row.id ? { ...item, IsActive: newStatus ? 1 : 0 } : item
                                        )
                                      );
                                    } catch (err) {
                                      console.error('Error updating status:', err);
                                      alert('Failed to update status. Please try again.');
                                    }
                                  }}
                                  style={{
                                    opacity: 0,
                                    width: 0,
                                    height: 0
                                  }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: (row.IsActive === 1 || row.IsActive === true) ? '#4CAF50' : '#ccc',
                                    borderRadius: '24px',
                                    transition: 'background-color 0.3s',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      content: '""',
                                      height: '18px',
                                      width: '18px',
                                      left: (row.IsActive === 1 || row.IsActive === true) ? '26px' : '3px',
                                      bottom: '3px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      transition: 'left 0.3s',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                  />
                                </span>
                              </label>
                            </td>
                          )}
                          {isAdmin && (
                            <td>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleEdit(row)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#0056b3';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#007bff';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                  }}
                                >
                                  <span>✏️</span>
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(row)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#c82333';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#dc3545';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                  }}
                                >
                                  <span>🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="no-data">
                          {selectedPremiumType && selectedCategory 
                            ? 'No data available for selected filters' 
                            : 'Please select Premium Type and Category to view data'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="visuals-container">
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>Loading visuals...</div>
                ) : sortedData.length > 0 ? (
                <div className="visuals-grid">
                    {/* Chart 1: Data by Country */}
                  <div className="visual-card">
                      <h3>Data by Country</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {sortedData
                            .filter(item => item.CountryName && item.ReportedValue)
                            .slice(0, 10)
                          .map((item, index) => (
                              <div key={item.id || index} className="chart-item">
                              <div className="chart-bar-container">
                                <div
                                  className="chart-bar"
                                  style={{
                                      height: `${Math.min((parseFloat(item.ReportedValue) || 0) / Math.max(...sortedData.map(d => parseFloat(d.ReportedValue) || 0)) * 100, 100)}%`,
                                    backgroundColor: '#36659b'
                                  }}
                                >
                                    <span className="bar-value">{item.ReportedValue}</span>
                  </div>
                                </div>
                                <div className="chart-label">{item.CountryName}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                    {/* Chart 2: Summary Statistics */}
                  <div className="visual-card">
                    <h3>Summary Statistics</h3>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">
                          {sortedData.length}
                        </div>
                        <div className="stat-label">Total Records</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                            {[...new Set(sortedData.map(item => item.CategoryLongName).filter(Boolean))].length}
                        </div>
                        <div className="stat-label">Categories</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                            {[...new Set(sortedData.map(item => item.CountryName).filter(Boolean))].length}
                        </div>
                        <div className="stat-label">Countries</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {sortedData
                              .filter(item => item.ReportedValue)
                              .reduce((sum, item) => sum + parseFloat(item.ReportedValue || 0), 0)
                              .toFixed(1)}
                          </div>
                          <div className="stat-label">Total Value</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    {selectedPremiumType && selectedCategory 
                      ? 'No data available for selected filters' 
                      : 'Please select Premium Type and Category to view visuals'}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: isMobile ? 'flex-start' : 'center',
            zIndex: 9999,
            padding: isMobile ? '80px 10px 20px' : '20px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setEditingRecord(null);
              setShowCustomPremiumType(false);
              setShowCustomCategory(false);
              setSelectedPremiumTypeOption('');
              setSelectedCategoryOption('');
              setModalCategories([]);
            }
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : 'clamp(20px, 4vw, 30px)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 120px)',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            marginTop: isMobile ? '0' : '80px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>
                {editingRecord ? 'Edit Record' : 'Add New Record'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRecord(null);
                  setShowCustomPremiumType(false);
                  setShowCustomCategory(false);
                  setSelectedPremiumTypeOption('');
                  setSelectedCategoryOption('');
                  setModalCategories([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f0f0f0';
                  e.target.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Processed Period Type:
                </label>
                <input
                  type="text"
                  value={formData.ProcessedPeriodType}
                  onChange={(e) => setFormData({ ...formData, ProcessedPeriodType: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Processed FY Year:
                </label>
                <input
                  type="text"
                  value={formData.ProcessedFYYear}
                  onChange={(e) => setFormData({ ...formData, ProcessedFYYear: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Data Type:
                </label>
                <input
                  type="text"
                  value={formData.DataType}
                  onChange={(e) => setFormData({ ...formData, DataType: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  disabled
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Country Name:
                </label>
                <input
                  type="text"
                  value={formData.CountryName}
                  onChange={(e) => setFormData({ ...formData, CountryName: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Premium Type Long Name:
                </label>
                <select
                  value={selectedPremiumTypeOption}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setSelectedPremiumTypeOption(value);
                    if (value === '__ADD_NEW__') {
                      setShowCustomPremiumType(true);
                      setFormData({ ...formData, PremiumTypeLongName: '' });
                      setModalCategories([]);
                      setSelectedCategoryOption('');
                    } else {
                      setShowCustomPremiumType(false);
                      setFormData({ ...formData, PremiumTypeLongName: value });
                      // Fetch categories for the selected premium type
                      try {
                        const categoryData = await ApiService.getCategories('Domestic', value);
                        setModalCategories(categoryData || []);
                        setSelectedCategoryOption('');
                        setFormData(prev => ({ ...prev, CategoryLongName: '' }));
                      } catch (err) {
                        console.error('Error fetching categories:', err);
                        setModalCategories([]);
                      }
                    }
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">Select Premium Type...</option>
                  {premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                  <option value="__ADD_NEW__">--- Add New Premium Type ---</option>
                </select>
                {showCustomPremiumType && (
                  <input
                    type="text"
                    value={formData.PremiumTypeLongName}
                    onChange={(e) => setFormData({ ...formData, PremiumTypeLongName: e.target.value })}
                    placeholder="Enter new Premium Type Long Name..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginTop: '8px' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Category Long Name:
                </label>
                <select
                  value={selectedCategoryOption}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCategoryOption(value);
                    if (value === '__ADD_NEW__') {
                      setShowCustomCategory(true);
                      setFormData({ ...formData, CategoryLongName: '' });
                    } else {
                      setShowCustomCategory(false);
                      setFormData({ ...formData, CategoryLongName: value });
                    }
                  }}
                  disabled={!formData.PremiumTypeLongName || (showCustomPremiumType && !formData.PremiumTypeLongName.trim())}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    backgroundColor: (!formData.PremiumTypeLongName || (showCustomPremiumType && !formData.PremiumTypeLongName.trim())) ? '#f5f5f5' : 'white',
                    cursor: (!formData.PremiumTypeLongName || (showCustomPremiumType && !formData.PremiumTypeLongName.trim())) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Select Category...</option>
                  {modalCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                  <option value="__ADD_NEW__">--- Add New Category ---</option>
                </select>
                {(!formData.PremiumTypeLongName || (showCustomPremiumType && !formData.PremiumTypeLongName.trim())) && (
                  <small style={{ display: 'block', marginTop: '4px', color: '#999', fontSize: '12px' }}>
                    {showCustomPremiumType ? 'Please enter a Premium Type first' : 'Please select a Premium Type first'}
                  </small>
                )}
                {showCustomCategory && (
                  <input
                    type="text"
                    value={formData.CategoryLongName}
                    onChange={(e) => setFormData({ ...formData, CategoryLongName: e.target.value })}
                    placeholder="Enter new Category Long Name..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginTop: '8px' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description:
                </label>
                <textarea
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reported Unit:
                </label>
                <input
                  type="text"
                  value={formData.ReportedUnit}
                  onChange={(e) => setFormData({ ...formData, ReportedUnit: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reported Value:
                </label>
                <input
                  type="text"
                  value={formData.ReportedValue}
                  onChange={(e) => setFormData({ ...formData, ReportedValue: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>


              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                    setShowCustomPremiumType(false);
                    setShowCustomCategory(false);
                    setSelectedPremiumTypeOption('');
                    setSelectedCategoryOption('');
                    setModalCategories([]);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Saving...' : (editingRecord ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && recordToDelete && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDelete();
            }
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#dc3545', fontSize: '24px' }}>
                ⚠️ Confirm Delete
              </h2>
              <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
            </div>

            {recordToDelete && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Premium Type:</strong> {recordToDelete.PremiumTypeLongName || '-'}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Category:</strong> {recordToDelete.CategoryLongName || '-'}
                </div>
                <div>
                  <strong>Country:</strong> {recordToDelete.CountryName || '-'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancelDelete}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#c82333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#dc3545';
                  }
                }}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomyDomestic;
