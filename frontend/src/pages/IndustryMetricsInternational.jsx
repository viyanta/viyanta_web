import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import './IndustryMetricsInternational.css';

const IndustryMetricsInternational = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationContext = useNavigation();
  const { user, isAdmin } = useAuth();
  const { 
    isNavItemActive, 
    activeNavItems, 
    selectedSidebarItem
  } = navigationContext || {};
  // Industry-specific selected descriptions (separate from Economy)
  const [selectedDescriptions, setSelectedDescriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('International Metrics'); // Track which tab is selected
  const [selectedPremiumType, setSelectedPremiumType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDescription, setSelectedDescription] = useState('');
  const [selectedPeriodType, setSelectedPeriodType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'
  
  // API data states
  const [premiumTypes, setPremiumTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [descriptions, setDescriptions] = useState([]); // Descriptions for dropdown
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set()); // Track which row IDs are selected for dashboard
  
  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    ProcessedPeriodType: '',
    ProcessedFYYear: [], // Changed to array for multi-select
    DataType: 'International',
    CountryName: '',
    PremiumTypeLongName: '',
    CategoryLongName: '',
    Description: '',
    ReportedUnit: '',
    ReportedValue: '',
    IsActive: true
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showCustomPremiumType, setShowCustomPremiumType] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [selectedPremiumTypeOption, setSelectedPremiumTypeOption] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [modalCategories, setModalCategories] = useState([]); // Categories for modal dropdown
  
  // Unique values for dropdowns
  const [uniqueValues, setUniqueValues] = useState({
    ProcessedPeriodType: [],
    ProcessedFYYear: [],
    CountryName: [],
    Description: [],
    ReportedUnit: [],
    ReportedValue: []
  });
  const [showCustomInputs, setShowCustomInputs] = useState({
    ProcessedPeriodType: false,
    ProcessedFYYear: false,
    CountryName: false,
    Description: false,
    ReportedUnit: false,
    ReportedValue: false
  });
  
  // Refs to prevent duplicate API calls
  const fetchingPremiumTypesRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);
  const fetchingDataRef = useRef(false);
  const fetchingDescriptionsRef = useRef(false);
  const lastPathRef = useRef('');
  const lastNavigationPathRef = useRef('');

  // Load Industry selected descriptions from backend on mount
  useEffect(() => {
    const loadSelectedDescriptions = async () => {
      try {
        const descriptions = await ApiService.getSelectedDescriptionsIndustry();
        const newDescriptions = Array.isArray(descriptions) ? descriptions : [];
        setSelectedDescriptions(newDescriptions);
        console.log('✅ Industry selected descriptions loaded:', newDescriptions);
      } catch (error) {
        console.error('Error loading Industry selected descriptions:', error);
        setSelectedDescriptions([]);
      }
    };

    loadSelectedDescriptions();

    // Refresh every 30 seconds (reduced frequency to prevent excessive calls)
    const refreshInterval = setInterval(loadSelectedDescriptions, 30000);
    
    // Also refresh when page becomes visible (user navigates back to this page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSelectedDescriptions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Refresh descriptions when navigating to this page (only once per navigation)
  useEffect(() => {
    if (location.pathname.includes('/industry-metrics-international') && lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      const loadSelectedDescriptions = async () => {
        try {
          const descriptions = await ApiService.getSelectedDescriptionsIndustry();
          const newDescriptions = Array.isArray(descriptions) ? descriptions : [];
          setSelectedDescriptions(newDescriptions);
        } catch (error) {
          console.error('Error loading Industry selected descriptions:', error);
        }
      };
      loadSelectedDescriptions();
    }
  }, [location.pathname]);

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

  // Fetch premium types from API when component loads
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingPremiumTypesRef.current) return;
    
    const fetchPremiumTypes = async () => {
      fetchingPremiumTypesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log('🔵 Calling API: /api/industry/premium-types?data_type=International');
        const data = await ApiService.getPremiumTypesIndustry('International');
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

    fetchPremiumTypes();
  }, []);

  // Fetch categories when premium type is selected
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingCategoriesRef.current) return;
    
    const fetchCategories = async () => {
      if (!selectedPremiumType) {
        setCategories([]);
        setFilteredData([]);
        setDescriptions([]);
        setSelectedCategory('');
        setSelectedDescription('');
        return;
      }

      fetchingCategoriesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Calling Categories API: /api/industry/categories?data_type=International&premium=${selectedPremiumType}`);
        const data = await ApiService.getCategoriesIndustry('International', selectedPremiumType);
        console.log('✅ Categories received from API:', data);
        console.log('📊 Number of categories:', data?.length || 0);
        setCategories(data || []);
        // Reset category and description selection when premium type changes
        setSelectedCategory('');
        setSelectedDescription('');
        setDescriptions([]);
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

  // Fetch descriptions when both Category and Sub Category are selected
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingDescriptionsRef.current) return;
    
    const fetchDescriptions = async () => {
      if (!selectedPremiumType || !selectedCategory) {
        setDescriptions([]);
        setSelectedDescription('');
        return;
      }

      fetchingDescriptionsRef.current = true;
      setLoading(true);
      setError(null);
      try {
        // Fetch descriptions from API endpoint
        console.log(`🔵 Fetching descriptions for Category: ${selectedPremiumType}, Sub Category: ${selectedCategory}`);
        const descriptions = await ApiService.getDescriptionsIndustry('International', selectedPremiumType, selectedCategory);
        console.log('✅ Descriptions received from API:', descriptions);
        setDescriptions(descriptions || []);
        setSelectedDescription(''); // Reset description when category changes
      } catch (err) {
        console.error('❌ Error fetching descriptions:', err);
        setError('Failed to load descriptions. Please try again.');
        setDescriptions([]);
      } finally {
        setLoading(false);
        fetchingDescriptionsRef.current = false;
      }
    };

    fetchDescriptions();
  }, [selectedPremiumType, selectedCategory]);

  // Check if current description is selected in dashboard (defined before fetchIndustryData)
  const isDescriptionSelectedInDashboard = useMemo(() => {
    return selectedDescription && selectedDescriptions.includes(selectedDescription);
  }, [selectedDescription, selectedDescriptions]);

  // Fetch industry data when Category, Sub Category, and Description are all selected
  const fetchIndustryData = useCallback(async () => {
    if (!selectedPremiumType || !selectedCategory || !selectedDescription) {
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
      console.log(`🔵 Calling Industry Data API: /api/industry/data?data_type=International&premium=${selectedPremiumType}&category=${selectedCategory}`);
      const data = await ApiService.getIndustryDataIndustry('International', selectedPremiumType, selectedCategory);
      console.log('✅ Industry data received from API:', data);
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
      
      // Filter by selected Description (required)
      filtered = filtered.filter(row => row.Description === selectedDescription);
      
      setFilteredData(filtered);
      
      // Load selected row IDs for dashboard from backend (only if description is selected in dashboard)
      if (selectedDescription && selectedDescriptions.includes(selectedDescription)) {
        try {
          const selectedIds = await ApiService.getSelectedRowIdsIndustry('International', selectedDescription);
          setSelectedRowIds(new Set(selectedIds));
        } catch (err) {
          console.error('Error loading selected row IDs:', err);
        }
      } else {
        // Description not in dashboard, clear selected row IDs
        setSelectedRowIds(new Set());
      }
    } catch (err) {
      console.error('❌ Error fetching industry data:', err);
      setError('Failed to load industry data. Please try again.');
      setFilteredData([]);
    } finally {
      setLoading(false);
      fetchingDataRef.current = false;
    }
  }, [selectedPremiumType, selectedCategory, selectedDescription, isAdmin, isDescriptionSelectedInDashboard, selectedDescriptions]);

  // Handle row selection for dashboard
  const handleRowSelection = async (rowId, isSelected) => {
    try {
      const newSelectedIds = new Set(selectedRowIds);
      if (isSelected) {
        newSelectedIds.add(rowId);
      } else {
        newSelectedIds.delete(rowId);
      }
      setSelectedRowIds(newSelectedIds);
      
      // Save to backend - ensure row IDs are numbers
      const rowIdsArray = Array.from(newSelectedIds).map(id => Number(id));
      console.log(`💾 Saving ${rowIdsArray.length} selected row IDs for "${selectedDescription}":`, rowIdsArray);
      await ApiService.updateSelectedRowIdsIndustry('International', selectedDescription, rowIdsArray);
      console.log('✅ Row IDs saved successfully');
    } catch (err) {
      console.error('❌ Error updating selected row IDs:', err);
      alert('Failed to update selection. Please try again.');
      // Revert on error
      setSelectedRowIds(new Set(selectedRowIds));
    }
  };
  
  // Handle select all for dashboard
  const handleSelectAll = async (selectAll) => {
    try {
      if (selectAll) {
        // Select all visible rows
        const allRowIds = filteredData.map(row => row.id).filter(id => id !== undefined && id !== null);
        const newSelectedIds = new Set(allRowIds);
        setSelectedRowIds(newSelectedIds);
        
        // Save to backend - ensure row IDs are numbers
        const rowIdsArray = allRowIds.map(id => Number(id));
        console.log(`💾 Saving ${rowIdsArray.length} selected row IDs (Select All) for "${selectedDescription}":`, rowIdsArray);
        await ApiService.updateSelectedRowIdsIndustry('International', selectedDescription, rowIdsArray);
        console.log('✅ All row IDs saved successfully');
      } else {
        // Deselect all
        setSelectedRowIds(new Set());
        
        // Save to backend
        console.log(`💾 Clearing all selected row IDs for "${selectedDescription}"`);
        await ApiService.updateSelectedRowIdsIndustry('International', selectedDescription, []);
        console.log('✅ Row IDs cleared successfully');
      }
    } catch (err) {
      console.error('❌ Error updating selected row IDs:', err);
      alert('Failed to update selection. Please try again.');
      // Revert on error
      setSelectedRowIds(new Set(selectedRowIds));
    }
  };
  
  // Check if all rows are selected
  const allRowsSelected = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return false;
    const allRowIds = filteredData.map(row => row.id).filter(id => id !== undefined && id !== null);
    return allRowIds.length > 0 && allRowIds.every(id => selectedRowIds.has(id));
  }, [filteredData, selectedRowIds]);
  
  // Check if some rows are selected (for indeterminate state)
  const someRowsSelected = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return false;
    const allRowIds = filteredData.map(row => row.id).filter(id => id !== undefined && id !== null);
    const selectedCount = allRowIds.filter(id => selectedRowIds.has(id)).length;
    return selectedCount > 0 && selectedCount < allRowIds.length;
  }, [filteredData, selectedRowIds]);
  
  // Ref for select all checkbox
  const selectAllCheckboxRef = useRef(null);
  
  // Update indeterminate state of select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someRowsSelected && !allRowsSelected;
    }
  }, [someRowsSelected, allRowsSelected]);

  // Clear selected row IDs if current description is removed from dashboard
  useEffect(() => {
    if (selectedDescription && !selectedDescriptions.includes(selectedDescription)) {
      // Description was removed from dashboard, clear selected row IDs
      setSelectedRowIds(new Set());
      // Refetch data to ensure checkboxes reflect cleared state only if not already fetching
      if (selectedPremiumType && selectedCategory && !fetchingDataRef.current) {
        fetchIndustryData();
      }
    }
  }, [selectedDescription, selectedDescriptions, selectedPremiumType, selectedCategory, fetchIndustryData]);

  useEffect(() => {
    fetchIndustryData();
  }, [fetchIndustryData]);

  // Refresh data only when navigating to this page (not on filter changes)
  useEffect(() => {
    if (location.pathname.includes('/industry-metrics-international') && lastNavigationPathRef.current !== location.pathname) {
      lastNavigationPathRef.current = location.pathname;
      // Reset refs to allow fresh fetch
      fetchingDataRef.current = false;
      fetchingCategoriesRef.current = false;
      
      // Only refresh if all filters (Category, Sub Category, and Description) are selected and we're on the page
      if (selectedPremiumType && selectedCategory && selectedDescription && !fetchingDataRef.current) {
        const timer = setTimeout(() => {
          if (!fetchingDataRef.current) {
            fetchIndustryData();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
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

  // Sort data in ascending order: Description, ProcessedPeriodType, CountryName, ProcessedFYYear, ReportedUnit
  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return filteredData;
    
    try {
      // Sort by multiple fields in ascending order
      const sorted = [...filteredData].sort((a, b) => {
        // Handle null/undefined values
        if (!a || !b) return 0;
        
        // 1. Sort by Description (Asc)
        const descA = (a.Description || '').toLowerCase();
        const descB = (b.Description || '').toLowerCase();
        if (descA !== descB) {
          return descA.localeCompare(descB);
        }
        
        // 2. Sort by ProcessedPeriodType (Asc)
        const periodA = (a.ProcessedPeriodType || '').toLowerCase();
        const periodB = (b.ProcessedPeriodType || '').toLowerCase();
        if (periodA !== periodB) {
          return periodA.localeCompare(periodB);
        }
        
        // 3. Sort by CountryName (Asc)
        const countryA = (a.CountryName || '').toLowerCase();
        const countryB = (b.CountryName || '').toLowerCase();
        if (countryA !== countryB) {
          return countryA.localeCompare(countryB);
        }
        
        // 4. Sort by ProcessedFYYear (Asc)
        const yearA = a.ProcessedFYYear || '';
        const yearB = b.ProcessedFYYear || '';
        const numA = parseInt(yearA);
        const numB = parseInt(yearB);
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) {
            return numA - numB;
          }
        } else {
          const yearCompare = (yearA || '').localeCompare(yearB || '');
          if (yearCompare !== 0) {
            return yearCompare;
          }
        }
        
        // 5. Sort by ReportedUnit (Asc)
        const unitA = (a.ReportedUnit || '').toLowerCase();
        const unitB = (b.ReportedUnit || '').toLowerCase();
        return unitA.localeCompare(unitB);
      });
      
      return sorted;
    } catch (error) {
      console.error('Error sorting data:', error);
      return filteredData; // Return unsorted data if sorting fails
    }
  }, [filteredData]);

  // Transform data into pivot table format grouped by PeriodType for non-admin users
  const pivotTableData = useMemo(() => {
    if (isAdmin || !sortedData || sortedData.length === 0) {
      return {};
    }

    try {
      // Group by ProcessedPeriodType
      const groupedByPeriodType = {};
      
      sortedData.forEach(item => {
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
        
        // Get category and subcategory from first item (should be same for all items in a periodType group)
        const firstItem = groupData[0];
        const categoryName = firstItem?.PremiumTypeLongName || selectedPremiumType || '';
        const subCategoryName = firstItem?.CategoryLongName || selectedCategory || '';
        
        // Get all unique periods (columns) - sorted
        const periods = [...new Set(groupData.map(item => item?.ProcessedFYYear || '').filter(p => p))].sort();
        
        // Get all unique descriptions (rows) - sorted
        const descriptions = [...new Set(groupData.map(item => item?.Description || '').filter(d => d))].sort((a, b) => {
          return (a || '').toLowerCase().localeCompare((b || '').toLowerCase());
        });
        
        // Create pivot structure: { description: { period: value, unit: unit } }
        const pivot = {};
        const units = {}; // Store unit for each description
        const descriptionMetadata = {}; // Store category and subcategory for each description
        
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
              // Store metadata
              if (!descriptionMetadata[desc]) {
                descriptionMetadata[desc] = {
                  category: item.PremiumTypeLongName || categoryName || '',
                  subCategory: item.CategoryLongName || subCategoryName || ''
                };
              }
            }
          });
        });
        
        pivotData[periodType] = {
          periods,
          descriptions,
          pivot,
          units,
          descriptionMetadata,
          categoryName,
          subCategoryName
        };
      });
      
      return pivotData;
    } catch (error) {
      console.error('Error creating pivot table data:', error);
      return {};
    }
  }, [sortedData, isAdmin, selectedPremiumType, selectedCategory]);

  // Fetch unique values for form fields
  const fetchUniqueValues = useCallback(async () => {
    try {
      const fields = ['ProcessedPeriodType', 'ProcessedFYYear', 'CountryName', 'Description', 'ReportedUnit', 'ReportedValue'];
      const values = {};
      
      for (const field of fields) {
        try {
          const data = await ApiService.getUniqueValuesIndustry('International', field);
          values[field] = data || [];
        } catch (err) {
          console.error(`Error fetching unique values for ${field}:`, err);
          values[field] = [];
        }
      }
      
      setUniqueValues(values);
    } catch (err) {
      console.error('Error fetching unique values:', err);
    }
  }, []);

  // Don't preload on mount - only fetch when modal opens to reduce API calls

  // Handle description toggle - Save globally via API (admin only)
  const handleDescriptionToggle = async (description) => {
    if (!isAdmin) {
      return; // Only admin can toggle descriptions
    }

    const isRemoving = selectedDescriptions.includes(description);
    const updatedDescriptions = isRemoving
      ? selectedDescriptions.filter(d => d !== description)
      : [...selectedDescriptions, description];

    // Update local state first for immediate UI update
    setSelectedDescriptions(updatedDescriptions);

    // Call Industry-specific API to save globally
    try {
      await ApiService.updateSelectedDescriptionsIndustry(updatedDescriptions, isRemoving ? description : null);
      console.log(`✅ Industry Description "${description}" ${isRemoving ? 'deselected' : 'selected'} successfully - saved globally`);
      
      // If removing description, clear selected row IDs for that description
      if (isRemoving) {
        try {
          // Clear selected row IDs for both Domestic and International
          await ApiService.updateSelectedRowIdsIndustry('Domestic', description, []);
          await ApiService.updateSelectedRowIdsIndustry('International', description, []);
          console.log(`✅ Cleared selected row IDs for removed description: "${description}"`);
          
          // If the removed description is the currently selected one, clear local state and refetch data
          if (selectedDescription === description) {
            setSelectedRowIds(new Set());
            // Refetch data to update checkboxes immediately
            if (selectedPremiumType && selectedCategory) {
              fetchingDataRef.current = false; // Reset ref to allow refetch
              fetchIndustryData();
            }
          }
        } catch (err) {
          console.error('Error clearing selected row IDs:', err);
        }
      }
      
      // Refresh from backend to ensure sync
      const refreshedDescriptions = await ApiService.getSelectedDescriptionsIndustry();
      setSelectedDescriptions(Array.isArray(refreshedDescriptions) ? refreshedDescriptions : updatedDescriptions);
    } catch (err) {
      console.error('Error updating Industry selected descriptions:', err);
      // Revert on error
      setSelectedDescriptions(selectedDescriptions);
      alert('Failed to update selection. Please try again.');
    }
  };

  const handleAddNew = async () => {
    setFormData({
      ProcessedPeriodType: '',
      ProcessedFYYear: [], // Array for multi-select
      DataType: 'International',
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
    setShowCustomInputs({
      ProcessedPeriodType: false,
      ProcessedFYYear: false,
      CountryName: false,
      Description: false,
      ReportedUnit: false,
      ReportedValue: false
    });
    
    // Fetch unique values when opening modal
    await fetchUniqueValues();
    setShowAddModal(true);
  };

  const handleEdit = async (record) => {
    const premiumTypeValue = record.PremiumTypeLongName || '';
    const categoryValue = record.CategoryLongName || '';
    
    setFormData({
      ProcessedPeriodType: record.ProcessedPeriodType || '',
      ProcessedFYYear: record.ProcessedFYYear ? [record.ProcessedFYYear] : [], // Single year as array for edit
      DataType: record.DataType || 'International',
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
    
    // Check if other fields exist in unique values
    setShowCustomInputs({
      ProcessedPeriodType: !uniqueValues.ProcessedPeriodType.includes(record.ProcessedPeriodType || '') && (record.ProcessedPeriodType || '') !== '',
      ProcessedFYYear: !uniqueValues.ProcessedFYYear.includes(record.ProcessedFYYear || '') && (record.ProcessedFYYear || '') !== '',
      CountryName: !uniqueValues.CountryName.includes(record.CountryName || '') && (record.CountryName || '') !== '',
      Description: !uniqueValues.Description.includes(record.Description || '') && (record.Description || '') !== '',
      ReportedUnit: !uniqueValues.ReportedUnit.includes(record.ReportedUnit || '') && (record.ReportedUnit || '') !== '',
      ReportedValue: !uniqueValues.ReportedValue.includes(record.ReportedValue || '') && (record.ReportedValue || '') !== ''
    });
    
    // Fetch categories for the premium type if it exists
    if (premiumTypeValue && isPremiumTypeInList) {
      try {
        const categoryData = await ApiService.getCategoriesIndustry('International', premiumTypeValue);
        setModalCategories(categoryData || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setModalCategories([]);
      }
    } else {
      setModalCategories([]);
    }
    
    // Fetch unique values when opening edit modal
    await fetchUniqueValues();
    
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
      await ApiService.deleteIndustryDataIndustry(recordToDelete.id);
      setSuccessMessage('Record deleted successfully!');
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      // Refresh data
      if (selectedPremiumType && selectedCategory) {
        const data = await ApiService.getIndustryDataIndustry('International', selectedPremiumType, selectedCategory);
        setFilteredData(data || []);
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
      // Ensure IsActive is set (default to true for new records)
      const submitData = {
        ...formData,
        IsActive: formData.IsActive !== undefined ? formData.IsActive : true
      };

      if (editingRecord) {
        // Update existing record - use first year from array
        const updateData = {
          ...submitData,
          ProcessedFYYear: submitData.ProcessedFYYear[0] || ''
        };
        await ApiService.updateIndustryDataIndustry(editingRecord.id, updateData);
        setSuccessMessage('Record updated successfully!');
      } else {
        // Create multiple records - one for each selected year
        const selectedYears = Array.isArray(submitData.ProcessedFYYear) && submitData.ProcessedFYYear.length > 0
          ? submitData.ProcessedFYYear
          : [];
        
        if (selectedYears.length === 0) {
          setError('Please select at least one Processed FY Year');
          setLoading(false);
          return;
        }

        // Create records for each selected year
        const createPromises = selectedYears.map(year => {
          const recordData = {
            ...submitData,
            ProcessedFYYear: year
          };
          return ApiService.createIndustryDataIndustry(recordData);
        });

        await Promise.all(createPromises);
        setSuccessMessage(`Successfully added ${selectedYears.length} record(s)!`);
      }

      setShowAddModal(false);
      setEditingRecord(null);
      setShowCustomPremiumType(false);
      setShowCustomCategory(false);
      setSelectedPremiumTypeOption('');
      setSelectedCategoryOption('');
      setModalCategories([]);
      setShowCustomInputs({
        ProcessedPeriodType: false,
        ProcessedFYYear: false,
        CountryName: false,
        Description: false,
        ReportedUnit: false,
        ReportedValue: false
      });
      
      // Refresh premium types dropdown
      try {
        const updatedPremiumTypes = await ApiService.getPremiumTypesIndustry('International');
        setPremiumTypes(updatedPremiumTypes || []);
        
        // If new premium type was added and it's not in the list, add it
        if (formData.PremiumTypeLongName && !updatedPremiumTypes.includes(formData.PremiumTypeLongName)) {
          setPremiumTypes([...updatedPremiumTypes, formData.PremiumTypeLongName]);
        }
      } catch (err) {
        console.error('Error refreshing premium types:', err);
      }
      
      // Refresh categories dropdown if premium type is selected
      if (selectedPremiumType || formData.PremiumTypeLongName) {
        try {
          const premiumTypeToUse = selectedPremiumType || formData.PremiumTypeLongName;
          const updatedCategories = await ApiService.getCategoriesIndustry('International', premiumTypeToUse);
          setCategories(updatedCategories || []);
          
          // If new category was added and it's not in the list, add it
          if (formData.CategoryLongName && !updatedCategories.includes(formData.CategoryLongName)) {
            setCategories([...updatedCategories, formData.CategoryLongName]);
          }
        } catch (err) {
          console.error('Error refreshing categories:', err);
        }
      }
      
      // Refresh unique values so new records appear in dropdowns
      await fetchUniqueValues();
      
      // Refresh data using the callback
      fetchingDataRef.current = false;
      await fetchIndustryData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving record:', err);
      setError('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle status toggle (Active/Inactive) - Admin only
  const handleStatusToggle = async (record) => {
    if (!isAdmin) return;

    const newStatus = (record.IsActive === 1 || record.IsActive === true) ? 0 : 1;
    
    setLoading(true);
    try {
      await ApiService.updateIndustryDataIndustry(record.id, {
        ...record,
        IsActive: newStatus
      });
      
      // Refresh data
      fetchingDataRef.current = false;
      await fetchIndustryData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      navigate('/industry-metrics-dashboard');
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      navigate('/industry-metrics-domestic');
    } else if (tab === 'International Metrics') {
      setActiveTab('International Metrics');
      return; // Stay on current page
    } else if (tab === 'Documents') {
      navigate('/documents');
    } else if (tab === 'News') {
      navigate('/news');
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
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'Domestic') {
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      navigate('/economy-international');
    } else {
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="industry-metrics-international-page">
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
        <h1>Industry Metrics - International</h1>
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
                Industry Metrics
              </span>
              <span className="breadcrumb-separator" style={{ color: '#999' }}>{'>>'}</span>
              <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>International</span>
            </div>

            {/* Navigation Tabs */}
            <div className="navigation-tabs-container">
              <div className="navigation-tabs">
                {tabs.map((tab) => {
                  const isActive = isNavItemActive(tab);
                  const isSelected = activeTab === tab;
                  // Build className: only selected tab gets 'selected' class
                  let className = 'nav-tab';
                  if (isActive) {
                    className += isSelected ? ' active selected' : ' active';
                  } else {
                    className += ' inactive';
                  }
                  return (
                    <button
                      key={tab}
                      onClick={() => isActive && handleTabClick(tab)}
                      className={className}
                    >
                      {tab}
                    </button>
                  );
                })}
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

            {/* Action Buttons */}
            {isAdmin && (
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAddNew}
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
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2a4d75';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#36659b';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <span>➕</span>
                  <span>Add New Record</span>
                </button>
              </div>
            )}

            {/* Filter Dropdowns */}
            <div className="filters-section">
              <div className="filter-group">
                <label htmlFor="premium-type">Select Category Long Name</label>
                <select
                  id="premium-type"
                  value={selectedPremiumType}
                  onChange={(e) => setSelectedPremiumType(e.target.value)}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">Select Category...</option>
                  {premiumTypes.length > 0 ? (
                    premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                    ))
                  ) : (
                    !loading && <option value="" disabled>No categories available</option>
                  )}
                </select>
                {error && (
                  <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {error}
                  </small>
                )}
              </div>

              <div className="filter-group">
                <label htmlFor="category">Select Sub Category Long Name</label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                  disabled={loading || !selectedPremiumType}
                >
                  <option value="">Select Sub Category...</option>
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
                    Please select a Category first
                  </small>
                )}
              </div>

              <div className="filter-group">
                <label htmlFor="description">Select Description</label>
                <select
                  id="description"
                  value={selectedDescription}
                  onChange={(e) => setSelectedDescription(e.target.value)}
                  className="filter-select"
                  disabled={loading || !selectedPremiumType || !selectedCategory}
                >
                  <option value="">Select Description...</option>
                  {descriptions.length > 0 ? (
                    descriptions.map((desc, index) => (
                    <option key={index} value={desc}>{desc}</option>
                    ))
                  ) : (
                    selectedPremiumType && selectedCategory && !loading && <option value="" disabled>No descriptions available</option>
                  )}
                </select>
                {(!selectedPremiumType || !selectedCategory) && (
                  <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Please select Category and Sub Category first
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
            {isAdmin && selectedPremiumType && selectedCategory && selectedDescription && descriptionsWithContext.length > 0 && (
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
                          Choose descriptions to visualize in Dashboard
                        </p>
                      </div>
                      {selectedDescriptions && selectedDescriptions.length > 0 && (
                        <div className="description-selection-counter">
                          {selectedDescriptions.length}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Cards Container */}
                  <div className="description-cards-container">
                    {descriptionsWithContext.map((item, index) => {
                      const isSelected = selectedDescriptions && selectedDescriptions.includes(item.description);
                      const isDisabled = false; // No limit on number of descriptions
                      
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

            {/* Data Table or Visuals */}
            {viewMode === 'data' ? (
              // For non-admin users, show pivot tables grouped by ProcessedPeriodType
              !isAdmin && pivotTableData && Object.keys(pivotTableData).length > 0 ? (
                <div className="pivot-tables-container" style={{ marginTop: '20px' }}>
                  {Object.keys(pivotTableData).sort().map(periodType => {
                    const periodData = pivotTableData[periodType];
                    if (!periodData) return null;
                    
                    const { periods = [], descriptions = [], pivot = {}, units = {}, descriptionMetadata = {}, categoryName = '', subCategoryName = '' } = periodData;
                    
                    if (!periods || !descriptions || periods.length === 0 || descriptions.length === 0) {
                      return null;
                    }

                    // Build breadcrumb: Category Long Name >> Sub Category Long Name >> Period Type
                    const categoryLongName = selectedPremiumType || categoryName || '';
                    const subCategoryLongName = selectedCategory || subCategoryName || '';
                    const breadcrumbParts = [];
                    if (categoryLongName) breadcrumbParts.push(categoryLongName);
                    if (subCategoryLongName) breadcrumbParts.push(subCategoryLongName);
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
                          {breadcrumbText}
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
                                const descMetadata = descriptionMetadata[desc] || {};
                                
                                return (
                                  <tr key={descIndex} style={{
                                    backgroundColor: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                  }}>
                                    <td className="pivot-table-cell-desc" style={{ 
                                      position: 'sticky', 
                                      left: 0, 
                                      backgroundColor: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                                      zIndex: 5,
                                      padding: '12px',
                                      borderRight: '2px solid #e5e7eb',
                                      minWidth: isMobile ? '200px' : '300px',
                                      fontWeight: '500'
                                    }}>
                                      {desc}
                                    </td>
                                    <td className="pivot-table-cell-unit" style={{ 
                                      position: 'sticky', 
                                      left: isMobile ? '200px' : '300px', 
                                      backgroundColor: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
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
                                    <td className="pivot-table-cell-period-type" style={{ 
                                      position: 'sticky', 
                                      left: isMobile ? '260px' : '380px', 
                                      backgroundColor: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
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
                                    {periods.map(period => (
                                      <td key={period} className="pivot-table-cell-data" style={{ 
                                        textAlign: 'right', 
                                        padding: '12px',
                                        borderRight: '1px solid #e5e7eb',
                                        backgroundColor: descIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
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
                </div>
              ) : isAdmin ? (
                // For admin users, show regular table
                <div className="table-container">
                  <table className="industry-metrics-table">
                    <thead>
                      <tr>
                        {isAdmin && <th>Status</th>}
                        {isAdmin && <th style={{ textAlign: 'center', minWidth: '140px' }}>Actions</th>}
                        {isAdmin && (
                          <th style={{ 
                            textAlign: 'center', 
                            minWidth: '120px',
                            opacity: isDescriptionSelectedInDashboard ? 1 : 0.5
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <span style={{ 
                                color: isDescriptionSelectedInDashboard ? '#333' : '#999',
                                fontWeight: isDescriptionSelectedInDashboard ? 'normal' : 'normal'
                              }}>
                                Select for Dashboard
                              </span>
                              {!isDescriptionSelectedInDashboard && selectedDescription && (
                                <span style={{ fontSize: '10px', color: '#ff6b6b', textAlign: 'center' }}>
                                  Select in Dashboard first
                                </span>
                              )}
                              {filteredData && filteredData.length > 0 && isDescriptionSelectedInDashboard && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>
                                  <input
                                    type="checkbox"
                                    checked={allRowsSelected}
                                    ref={selectAllCheckboxRef}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      cursor: 'pointer'
                                    }}
                                    title={allRowsSelected ? 'Deselect all' : someRowsSelected ? 'Select all' : 'Select all'}
                                  />
                                  <span style={{ fontSize: '11px', color: '#666' }}>Select All</span>
                                </label>
                              )}
                            </div>
                          </th>
                        )}
                        <th>Description</th>
                        <th>ProcessedPeriodType</th>
                        <th>CountryName</th>
                        <th>ProcessedFYYear</th>
                        <th>ReportedUnit</th>
                        <th>ReportedValue</th>
                        <th>Category Long Name</th>
                        <th>Sub Category Long Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={isAdmin ? 11 : 8} className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
                            Loading data...
                          </td>
                        </tr>
                      )}
                      {!loading && sortedData.length > 0 ? (
                        sortedData.map((row, index) => (
                        <tr key={row.id || index}>
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
                                      await ApiService.updateIndustryData(row.id, { IsActive: newStatus });
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
                          {isAdmin && (
                            <td style={{ 
                              textAlign: 'center',
                              opacity: isDescriptionSelectedInDashboard ? 1 : 0.5
                            }}>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.has(row.id)}
                                onChange={(e) => handleRowSelection(row.id, e.target.checked)}
                                disabled={!isDescriptionSelectedInDashboard}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: isDescriptionSelectedInDashboard ? 'pointer' : 'not-allowed',
                                  opacity: isDescriptionSelectedInDashboard ? 1 : 0.5
                                }}
                                title={isDescriptionSelectedInDashboard 
                                  ? "Select this row to display in dashboard" 
                                  : "Please select this description in the Dashboard first"}
                              />
                            </td>
                          )}
                          <td>{row.Description || '-'}</td>
                          <td>{row.ProcessedPeriodType || '-'}</td>
                          <td>{row.CountryName || '-'}</td>
                          <td>{row.ProcessedFYYear || '-'}</td>
                          <td>{row.ReportedUnit || '-'}</td>
                          <td>{row.ReportedValue || '-'}</td>
                          <td>{row.PremiumTypeLongName || '-'}</td>
                          <td>{row.CategoryLongName || '-'}</td>
                        </tr>
                      ))
                    ) : !loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 11 : 8} className="no-data">
                          {selectedPremiumType && selectedCategory 
                            ? 'No data available for the selected criteria.' 
                            : 'Please select Premium Type and Category to view data.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              ) : (
                // For non-admin users without pivot data, show message
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  {!selectedPremiumType || !selectedCategory
                    ? 'Please select Premium Type and Category to view data'
                    : 'No data available for selected filters'}
                </div>
              )
            ) : (
              <div className="visuals-container">
                <div className="visuals-grid">
                  {/* Chart 1: Insurance Premium Growth */}
                  <div className="visual-card">
                    <h3>Insurance Premium Growth</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const growthData = filteredData.filter(item => item.premiumTypeLongName === 'Insurance Premium');
                          const maxValue = Math.max(...growthData.map(item => parseFloat(item.reportedValue) || 0), 1);
                          return growthData.map((item, index) => {
                            const value = parseFloat(item.reportedValue) || 0;
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="chart-item">
                                <div className="chart-bar-container">
                                  <div
                                    className="chart-bar"
                                    style={{
                                      height: `${Math.max(heightPercent, 5)}%`,
                                      backgroundColor: '#36659b'
                                    }}
                                  >
                                    <span className="bar-value">{item.reportedValue}%</span>
                                  </div>
                                </div>
                                <div className="chart-label">{item.countryName}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Life Insurance Penetration */}
                  <div className="visual-card">
                    <h3>Life Insurance Penetration</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const penetrationData = filteredData.filter(item => item.premiumTypeLongName === 'Life Insurance Penetration');
                          const maxValue = Math.max(...penetrationData.map(item => parseFloat(item.reportedValue) || 0), 1);
                          return penetrationData.map((item, index) => {
                            const value = parseFloat(item.reportedValue) || 0;
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="chart-item">
                                <div className="chart-bar-container">
                                  <div
                                    className="chart-bar"
                                    style={{
                                      height: `${Math.max(heightPercent, 5)}%`,
                                      backgroundColor: '#3F72AF'
                                    }}
                                  >
                                    <span className="bar-value">{item.reportedValue}%</span>
                                  </div>
                                </div>
                                <div className="chart-label">{item.countryName}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chart 3: Protection Gap */}
                  <div className="visual-card">
                    <h3>Life Insurance Protection Gap</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const gapData = filteredData.filter(item => item.premiumTypeLongName === 'Life Insurance Protection Gap');
                          const maxValue = Math.max(...gapData.map(item => parseFloat(item.reportedValue) || 0), 1);
                          return gapData.map((item, index) => {
                            const value = parseFloat(item.reportedValue) || 0;
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="chart-item">
                                <div className="chart-bar-container">
                                  <div
                                    className="chart-bar"
                                    style={{
                                      height: `${Math.max(heightPercent, 5)}%`,
                                      backgroundColor: '#e74c3c'
                                    }}
                                  >
                                    <span className="bar-value">{item.reportedValue}%</span>
                                  </div>
                                </div>
                                <div className="chart-label">{item.countryName}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chart 4: Sum Assured as % of GDP */}
                  <div className="visual-card">
                    <h3>Sum Assured as % of GDP</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const gdpData = filteredData.filter(item => item.premiumTypeLongName === 'Sum Assured as % of GDP');
                          const maxValue = Math.max(...gdpData.map(item => parseFloat(item.reportedValue) || 0), 1);
                          return gdpData.map((item, index) => {
                            const value = parseFloat(item.reportedValue) || 0;
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="chart-item">
                                <div className="chart-bar-container">
                                  <div
                                    className="chart-bar"
                                    style={{
                                      height: `${Math.max(heightPercent, 5)}%`,
                                      backgroundColor: '#5a8fc7'
                                    }}
                                  >
                                    <span className="bar-value">{item.reportedValue}%</span>
                                  </div>
                                </div>
                                <div className="chart-label">{item.countryName}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chart 5: Pension Market Penetration */}
                  <div className="visual-card">
                    <h3>Pension Market Penetration</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const pensionData = filteredData.filter(item => item.premiumTypeLongName === 'Pension Market Penetration' && item.reportedValue);
                          const maxValue = Math.max(...pensionData.map(item => parseFloat(item.reportedValue) || 0), 1);
                          return pensionData.map((item, index) => {
                            const value = parseFloat(item.reportedValue) || 0;
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="chart-item">
                                <div className="chart-bar-container">
                                  <div
                                    className="chart-bar"
                                    style={{
                                      height: `${Math.max(heightPercent, 5)}%`,
                                      backgroundColor: '#27ae60'
                                    }}
                                  >
                                    <span className="bar-value">{item.reportedValue}%</span>
                                  </div>
                                </div>
                                <div className="chart-label">{item.countryName}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Chart 6: Summary Statistics */}
                  <div className="visual-card">
                    <h3>Summary Statistics</h3>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">
                          {filteredData.length}
                        </div>
                        <div className="stat-label">Total Records</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {[...new Set(filteredData.map(item => item.premiumTypeLongName))].length}
                        </div>
                        <div className="stat-label">Premium Types</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {[...new Set(filteredData.map(item => item.countryName))].length}
                        </div>
                        <div className="stat-label">Countries</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {(() => {
                            const validData = filteredData.filter(item => item.reportedValue && !isNaN(parseFloat(item.reportedValue)));
                            const sum = validData.reduce((sum, item) => sum + parseFloat(item.reportedValue), 0);
                            const avg = validData.length > 0 ? sum / validData.length : 0;
                            return avg.toFixed(1);
                          })()}
                        </div>
                        <div className="stat-label">Avg Value</div>
                      </div>
                    </div>
                  </div>
                </div>
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
              setShowCustomInputs({
                ProcessedPeriodType: false,
                ProcessedFYYear: false,
                CountryName: false,
                Description: false,
                ReportedUnit: false,
                ReportedValue: false
              });
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
                  setShowCustomInputs({
                    ProcessedPeriodType: false,
                    ProcessedFYYear: false,
                    CountryName: false,
                    Description: false,
                    ReportedUnit: false,
                    ReportedValue: false
                  });
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
                {!showCustomInputs.ProcessedPeriodType ? (
                  <select
                    value={formData.ProcessedPeriodType}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowCustomInputs(prev => ({ ...prev, ProcessedPeriodType: true }));
                        setFormData({ ...formData, ProcessedPeriodType: '' });
                      } else {
                        setFormData({ ...formData, ProcessedPeriodType: e.target.value });
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Processed Period Type...</option>
                    {uniqueValues.ProcessedPeriodType.map((value, index) => (
                      <option key={index} value={value}>{value}</option>
                    ))}
                    <option value="__ADD_NEW__">--- Add New ---</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.ProcessedPeriodType}
                    onChange={(e) => setFormData({ ...formData, ProcessedPeriodType: e.target.value })}
                    placeholder="Enter new Processed Period Type..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    onBlur={() => {
                      if (!formData.ProcessedPeriodType.trim()) {
                        setShowCustomInputs(prev => ({ ...prev, ProcessedPeriodType: false }));
                      }
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Processed FY Year {editingRecord ? '' : '(Select Multiple)'}:
                </label>
                {!showCustomInputs.ProcessedFYYear ? (
                  <div style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '8px', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    backgroundColor: '#fff'
                  }}>
                    {editingRecord ? (
                      // Single select for editing
                      <select
                        value={formData.ProcessedFYYear[0] || ''}
                        onChange={(e) => {
                          if (e.target.value === '__ADD_NEW__') {
                            setShowCustomInputs(prev => ({ ...prev, ProcessedFYYear: true }));
                            setFormData({ ...formData, ProcessedFYYear: [] });
                          } else {
                            setFormData({ ...formData, ProcessedFYYear: [e.target.value] });
                          }
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      >
                        <option value="">Select Processed FY Year...</option>
                        {uniqueValues.ProcessedFYYear.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))}
                        <option value="__ADD_NEW__">--- Add New ---</option>
                      </select>
                    ) : (
                      // Multi-select checkboxes for adding new
                      <>
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={formData.ProcessedFYYear.length === uniqueValues.ProcessedFYYear.length && uniqueValues.ProcessedFYYear.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, ProcessedFYYear: [...uniqueValues.ProcessedFYYear] });
                              } else {
                                setFormData({ ...formData, ProcessedFYYear: [] });
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <label style={{ cursor: 'pointer', fontWeight: '500' }}>Select All</label>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
                          {uniqueValues.ProcessedFYYear.map((value, index) => (
                            <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={formData.ProcessedFYYear.includes(value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, ProcessedFYYear: [...formData.ProcessedFYYear, value] });
                                  } else {
                                    setFormData({ ...formData, ProcessedFYYear: formData.ProcessedFYYear.filter(y => y !== value) });
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <label style={{ cursor: 'pointer', flex: 1 }}>{value}</label>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomInputs(prev => ({ ...prev, ProcessedFYYear: true }));
                              setFormData({ ...formData, ProcessedFYYear: [] });
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            --- Add New ---
                          </button>
                        </div>
                        {formData.ProcessedFYYear.length > 0 && (
                          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', fontSize: '13px' }}>
                            {formData.ProcessedFYYear.length} year(s) selected
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.ProcessedFYYear.join(', ')}
                      onChange={(e) => {
                        const years = e.target.value.split(',').map(y => y.trim()).filter(y => y);
                        setFormData({ ...formData, ProcessedFYYear: years });
                      }}
                      placeholder="Enter new Processed FY Year (comma-separated for multiple)..."
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '8px' }}
                      onBlur={() => {
                        if (formData.ProcessedFYYear.length === 0) {
                          setShowCustomInputs(prev => ({ ...prev, ProcessedFYYear: false }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInputs(prev => ({ ...prev, ProcessedFYYear: false }));
                        if (formData.ProcessedFYYear.length === 0) {
                          setFormData({ ...formData, ProcessedFYYear: [] });
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
                {!showCustomInputs.CountryName ? (
                  <select
                    value={formData.CountryName}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowCustomInputs(prev => ({ ...prev, CountryName: true }));
                        setFormData({ ...formData, CountryName: '' });
                      } else {
                        setFormData({ ...formData, CountryName: e.target.value });
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Country Name...</option>
                    {uniqueValues.CountryName.map((value, index) => (
                      <option key={index} value={value}>{value}</option>
                    ))}
                    <option value="__ADD_NEW__">--- Add New ---</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.CountryName}
                    onChange={(e) => setFormData({ ...formData, CountryName: e.target.value })}
                    placeholder="Enter new Country Name..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    onBlur={() => {
                      if (!formData.CountryName.trim()) {
                        setShowCustomInputs(prev => ({ ...prev, CountryName: false }));
                      }
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Category Long Name:
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
                        const categoryData = await ApiService.getCategoriesIndustry('International', value);
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
                  <option value="">Select Category...</option>
                  {premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                  <option value="__ADD_NEW__">--- Add New Category ---</option>
                </select>
                {showCustomPremiumType && (
                  <input
                    type="text"
                    value={formData.PremiumTypeLongName}
                    onChange={(e) => setFormData({ ...formData, PremiumTypeLongName: e.target.value })}
                    placeholder="Enter new Category Long Name..."
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
                  <option value="">Select Sub Category...</option>
                  {modalCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                  <option value="__ADD_NEW__">--- Add New Sub Category ---</option>
                </select>
                {(!formData.PremiumTypeLongName || (showCustomPremiumType && !formData.PremiumTypeLongName.trim())) && (
                  <small style={{ display: 'block', marginTop: '4px', color: '#999', fontSize: '12px' }}>
                    {showCustomPremiumType ? 'Please enter a Category first' : 'Please select a Category first'}
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
                {!showCustomInputs.Description ? (
                  <select
                    value={formData.Description}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowCustomInputs(prev => ({ ...prev, Description: true }));
                        setFormData({ ...formData, Description: '' });
                      } else {
                        setFormData({ ...formData, Description: e.target.value });
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Description...</option>
                    {uniqueValues.Description.map((value, index) => (
                      <option key={index} value={value}>{value}</option>
                    ))}
                    <option value="__ADD_NEW__">--- Add New ---</option>
                  </select>
                ) : (
                  <textarea
                    value={formData.Description}
                    onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                    placeholder="Enter new Description..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px' }}
                    onBlur={() => {
                      if (!formData.Description.trim()) {
                        setShowCustomInputs(prev => ({ ...prev, Description: false }));
                      }
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reported Unit:
                </label>
                {!showCustomInputs.ReportedUnit ? (
                  <select
                    value={formData.ReportedUnit}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowCustomInputs(prev => ({ ...prev, ReportedUnit: true }));
                        setFormData({ ...formData, ReportedUnit: '' });
                      } else {
                        setFormData({ ...formData, ReportedUnit: e.target.value });
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Reported Unit...</option>
                    {uniqueValues.ReportedUnit.map((value, index) => (
                      <option key={index} value={value}>{value}</option>
                    ))}
                    <option value="__ADD_NEW__">--- Add New ---</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.ReportedUnit}
                    onChange={(e) => setFormData({ ...formData, ReportedUnit: e.target.value })}
                    placeholder="Enter new Reported Unit..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    onBlur={() => {
                      if (!formData.ReportedUnit.trim()) {
                        setShowCustomInputs(prev => ({ ...prev, ReportedUnit: false }));
                      }
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Reported Value:
                </label>
                {!showCustomInputs.ReportedValue ? (
                  <select
                    value={formData.ReportedValue}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowCustomInputs(prev => ({ ...prev, ReportedValue: true }));
                        setFormData({ ...formData, ReportedValue: '' });
                      } else {
                        setFormData({ ...formData, ReportedValue: e.target.value });
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Reported Value...</option>
                    {uniqueValues.ReportedValue.map((value, index) => (
                      <option key={index} value={value}>{value}</option>
                    ))}
                    <option value="__ADD_NEW__">--- Add New ---</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.ReportedValue}
                    onChange={(e) => setFormData({ ...formData, ReportedValue: e.target.value })}
                    placeholder="Enter new Reported Value..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    onBlur={() => {
                      if (!formData.ReportedValue.trim()) {
                        setShowCustomInputs(prev => ({ ...prev, ReportedValue: false }));
                      }
                    }}
                  />
                )}
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
                    setShowCustomInputs({
                      ProcessedPeriodType: false,
                      ProcessedFYYear: false,
                      CountryName: false,
                      Description: false,
                      ReportedUnit: false,
                      ReportedValue: false
                    });
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
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Confirm Delete</h2>
            <p style={{ marginBottom: '20px' }}>
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
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
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
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

export default IndustryMetricsInternational;
