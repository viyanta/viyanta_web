import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import './EconomyDomestic.css';
import StandardPageLayout from '../components/StandardPageLayout';
import EconomySharedLayout from './EconomySharedLayout';

const MetricsDomestic = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('Domestic Metrics');
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedDescription, setSelectedDescription] = useState('');
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // API data states
  const [insurers, setInsurers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [metricData, setMetricData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedDescriptions, setSelectedDescriptions] = useState([]); // For dashboard selection
  const [selectedRowIds, setSelectedRowIds] = useState(new Set()); // Track which row IDs are selected for dashboard

  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [formData, setFormData] = useState({
    CompanyInsurerShortName: '',
    ProcessedPeriodType: '',
    ProcessedFYYear: [], // Array for multi-select
    DataType: '',
    CountryName: '',
    PremiumTypeLongName: '',
    CategoryLongName: '',
    Description: '',
    ReportedUnit: '',
    ReportedValue: '',
    IsActive: true
  });

  // Economy-style modal states
  const [uniqueValues, setUniqueValues] = useState({
    ProcessedPeriodType: [],
    ProcessedFYYear: [],
    CountryName: [],
    Description: [],
    ReportedUnit: [],
    ReportedValue: []
  });
  const [showCustomInputs, setShowCustomInputs] = useState({
    CompanyInsurerShortName: false,
    ProcessedPeriodType: false,
    ProcessedFYYear: false,
    CountryName: false,
    Description: false,
    ReportedUnit: false,
    ReportedValue: false
  });
  const [showCustomPremiumType, setShowCustomPremiumType] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [selectedPremiumTypeOption, setSelectedPremiumTypeOption] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [modalCategories, setModalCategories] = useState([]);

  // Refs to prevent duplicate API calls
  const fetchingInsurersRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);
  const fetchingSubCategoriesRef = useRef(false);
  const fetchingDescriptionsRef = useRef(false);
  const fetchingDataRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch companies (insurers) on component mount and auto-select (or use stored selection from Dashboard)
  useEffect(() => {
    if (fetchingInsurersRef.current) return;

    const fetchInsurers = async () => {
      fetchingInsurersRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log('🔵 Calling Company Metrics API: /api/company-metrics/companies');
        const companies = await ApiService.getCompaniesforMetrics();
        console.log('✅ Companies (Insurers) received:', companies);
        const companiesList = companies || [];
        setInsurers(companiesList);

        // Prefer stored selection from Dashboard, else keep existing, else first
        const stored = localStorage.getItem('selectedInsurer');
        const fallback = companiesList.length > 0 ? companiesList[0] : '';
        const nextInsurer = stored || selectedInsurer || fallback;
        if (nextInsurer) {
          setSelectedInsurer(nextInsurer);
          if (stored) {
            console.log('✅ Loaded insurer from Dashboard selection:', stored);
          } else if (!selectedInsurer && fallback) {
            console.log('✅ Auto-selected first insurer:', fallback);
          }
        }
      } catch (err) {
        console.error('❌ Error fetching companies:', err);
        setError('Failed to load insurers. Please try again.');
        setInsurers([]);
      } finally {
        setLoading(false);
        fetchingInsurersRef.current = false;
      }
    };

    fetchInsurers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch categories (Premium Types) when insurer is selected
  // Category Long Name = Premium Type
  useEffect(() => {
    if (fetchingCategoriesRef.current) return;

    const fetchCategories = async () => {
      if (!selectedInsurer) {
        setCategories([]);
        setSubCategories([]);
        setDescriptions([]);
        setSelectedCategory('');
        setSelectedSubCategory('');
        setSelectedDescription('');
        return;
      }

      fetchingCategoriesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Calling Company Premium Types API for: ${selectedInsurer}`);
        // Get premium types - these will be used as "Category Long Name"
        const premiumTypes = await ApiService.getCompanyPremiumTypesforMetrics(selectedInsurer);
        console.log('✅ Premium types (Category Long Name) received:', premiumTypes);
        setCategories(premiumTypes || []);

        // Reset dependent dropdowns
        setSelectedCategory('');
        setSelectedSubCategory('');
        setSelectedDescription('');
        setSubCategories([]);
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
  }, [selectedInsurer]);

  // Fetch sub categories (Categories) when category (Premium Type) is selected
  // Sub Category Long Name = Category (CategoryLongName)
  useEffect(() => {
    if (fetchingSubCategoriesRef.current) return;

    const fetchSubCategories = async () => {
      if (!selectedInsurer || !selectedCategory) {
        setSubCategories([]);
        setDescriptions([]);
        setSelectedSubCategory('');
        setSelectedDescription('');
        return;
      }

      fetchingSubCategoriesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Fetching sub categories (Categories) for Premium Type: ${selectedCategory}`);
        // Get categories for the selected premium type - these will be used as "Sub Category Long Name"
        const categoriesData = await ApiService.getCompanyCategoriesforMetrics(selectedInsurer, selectedCategory);
        console.log('✅ Sub categories (Categories) received:', categoriesData);
        setSubCategories(categoriesData || []);

        // Reset dependent dropdowns
        setSelectedSubCategory('');
        setSelectedDescription('');
        setDescriptions([]);
      } catch (err) {
        console.error('❌ Error fetching sub categories:', err);
        setError('Failed to load sub categories. Please try again.');
        setSubCategories([]);
      } finally {
        setLoading(false);
        fetchingSubCategoriesRef.current = false;
      }
    };

    fetchSubCategories();
  }, [selectedInsurer, selectedCategory]);

  // Fetch descriptions when category (Premium Type) and sub category (Category) are selected
  useEffect(() => {
    if (fetchingDescriptionsRef.current) return;

    const fetchDescriptions = async () => {
      if (!selectedInsurer || !selectedCategory || !selectedSubCategory) {
        setDescriptions([]);
        setSelectedDescription('');
        setMetricData(null);
        return;
      }

      fetchingDescriptionsRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Fetching descriptions for Premium Type: ${selectedCategory}, Category: ${selectedSubCategory}`);
        // Get descriptions for the selected premium type and category
        const descriptionsData = await ApiService.getCompanyDescriptionsforMetrics(
          selectedInsurer,
          selectedCategory, // Premium Type
          selectedSubCategory // Category (CategoryLongName)
        );
        console.log('✅ Descriptions received:', descriptionsData);
        setDescriptions(descriptionsData || []);

        // Reset description selection
        setSelectedDescription('');
        setMetricData(null);
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
  }, [selectedInsurer, selectedCategory, selectedSubCategory]);

  // Fetch metric details when all selections are made
  useEffect(() => {
    if (fetchingDataRef.current) return;

    const fetchMetricDetails = async () => {
      if (!selectedInsurer || !selectedCategory || !selectedSubCategory || !selectedDescription) {
        setMetricData(null);
        return;
      }

      fetchingDataRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Fetching metric details for: ${selectedInsurer}, ${selectedCategory}, ${selectedSubCategory}, ${selectedDescription}`);
        // Get full details for the selected filters
        const data = await ApiService.getMetricDetails(
          selectedInsurer,
          selectedCategory, // Premium Type
          selectedSubCategory, // Category
          selectedDescription
        );
        console.log('✅ Metric details received:', data);

        // Filter data based on admin status:
        // - Admin: Show all records (active and inactive)
        // - Non-admin: Only show active records (IsActive === 1 or IsActive === true)
        if (data && data.data && Array.isArray(data.data)) {
          let filteredData = [...data.data];

          if (!isAdmin) {
            filteredData = filteredData.filter(row => row.IsActive === 1 || row.IsActive === true);
            console.log('🔒 Non-admin user: Filtered to active records only. Count:', filteredData.length);
          } else {
            console.log('👑 Admin user: Showing all records (active and inactive). Count:', filteredData.length);
          }

          setMetricData({
            ...data,
            data: filteredData,
            count: filteredData.length
          });
        } else {
          setMetricData(data);
        }
      } catch (err) {
        console.error('❌ Error fetching metric details:', err);
        setError('Failed to load metric data. Please try again.');
        setMetricData(null);
      } finally {
        setLoading(false);
        fetchingDataRef.current = false;
      }
    };

    fetchMetricDetails();
  }, [selectedInsurer, selectedCategory, selectedSubCategory, selectedDescription, isAdmin]);

  // Fetch selected descriptions on mount (for dashboard selection)
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

  // Check if current description is selected in dashboard
  const isDescriptionSelectedInDashboard = useMemo(() => {
    return selectedDescription && selectedDescriptions.includes(selectedDescription);
  }, [selectedDescription, selectedDescriptions]);

  // Create descriptions with context from metricData
  const descriptionsWithContext = useMemo(() => {
    if (!metricData || !metricData.data || metricData.data.length === 0) return [];

    const descriptionMap = new Map();
    metricData.data.forEach(item => {
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
  }, [metricData]);

  // Transform data into pivot table format grouped by PeriodType for non-admin users
  const pivotTableData = useMemo(() => {
    if (isAdmin || !metricData || !metricData.data || metricData.data.length === 0) {
      return {};
    }

    try {
      // Group by ProcessedPeriodType
      const groupedByPeriodType = {};

      metricData.data.forEach(item => {
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

        // Get company, premium type, and category from first item (should be same for all items in a periodType group)
        const firstItem = groupData[0];
        const companyName = firstItem?.CompanyInsurerShortName || '';
        const premiumTypeName = firstItem?.PremiumTypeLongName || selectedCategory || '';
        const categoryName = firstItem?.CategoryLongName || selectedSubCategory || '';

        // Get all unique periods (columns) - sorted
        const periods = [...new Set(groupData.map(item => item?.ProcessedFYYear || '').filter(p => p))].sort();

        // Get all unique descriptions (rows)
        const descriptions = [...new Set(groupData.map(item => item?.Description || '').filter(d => d))];

        // Create pivot structure: { description: { period: value, unit: unit } }
        const pivot = {};
        const units = {}; // Store unit for each description
        const descriptionMetadata = {}; // Store metadata for each description

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
                  category: item.CategoryLongName || categoryName || '',
                  premiumType: item.PremiumTypeLongName || premiumTypeName || '',
                  company: item.CompanyInsurerShortName || companyName || ''
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
          companyName,
          premiumTypeName,
          categoryName
        };
      });

      return pivotData;
    } catch (error) {
      console.error('Error creating pivot table data:', error);
      return {};
    }
  }, [metricData, isAdmin, selectedCategory, selectedSubCategory]);

  // Handle description toggle - Save globally via API (admin only)
  const handleDescriptionToggle = async (description) => {
    if (!isAdmin) {
      return; // Only admin can toggle descriptions
    }

    const isRemoving = selectedDescriptions.includes(description);
    const updatedDescriptions = isRemoving
      ? selectedDescriptions.filter(d => d !== description)
      : [...selectedDescriptions, description];

    // If no change, don't proceed
    if (updatedDescriptions.length === selectedDescriptions.length && !isRemoving) {
      return;
    }

    // Update local state first for immediate UI update
    setSelectedDescriptions(updatedDescriptions);

    // Call API to save globally
    try {
      await ApiService.updateSelectedDescriptionsMetrics(updatedDescriptions, isRemoving ? description : null);
      console.log(`✅ Description "${description}" ${isRemoving ? 'deselected' : 'selected'} successfully - saved globally`);

      // If removing description, clear selected row IDs for that description
      if (isRemoving) {
        try {
          // Clear selected row IDs for both Domestic and International (if applicable)
          await ApiService.updateSelectedRowIdsMetrics('Domestic', description, []);
          await ApiService.updateSelectedRowIdsMetrics('International', description, []);
          console.log(`✅ Cleared selected row IDs for removed description: "${description}"`);

          // If the removed description is the currently selected one, clear local state and refetch data
          if (selectedDescription === description) {
            setSelectedRowIds(new Set());
            // Refetch data to update checkboxes immediately
            if (selectedInsurer && selectedCategory && selectedSubCategory) {
              fetchingDataRef.current = false; // Reset ref to allow refetch
              // Trigger refetch by updating a dependency
              const data = await ApiService.getMetricDetails(
                selectedInsurer,
                selectedCategory,
                selectedSubCategory,
                selectedDescription
              );

              if (data && data.data && Array.isArray(data.data)) {
                let filteredData = [...data.data];
                if (!isAdmin) {
                  filteredData = filteredData.filter(row => row.IsActive === 1 || row.IsActive === true);
                }
                setMetricData({
                  ...data,
                  data: filteredData,
                  count: filteredData.length
                });
              }
            }
          }
        } catch (err) {
          console.error('Error clearing selected row IDs:', err);
        }
      }

      // Refresh from backend to ensure sync
      const refreshedDescriptions = await ApiService.getSelectedDescriptionsMetrics();
      setSelectedDescriptions(Array.isArray(refreshedDescriptions) ? refreshedDescriptions : updatedDescriptions);
    } catch (err) {
      console.error('Error updating selected descriptions:', err);
      // Revert on error
      setSelectedDescriptions(selectedDescriptions);
      alert('Failed to update selection. Please try again.');
    }
  };

  // Handle row selection for dashboard
  const handleRowSelection = async (rowId, isSelected) => {
    if (!isDescriptionSelectedInDashboard) return;

    const newSelectedRowIds = new Set(selectedRowIds);
    if (isSelected) {
      newSelectedRowIds.add(rowId);
    } else {
      newSelectedRowIds.delete(rowId);
    }
    setSelectedRowIds(newSelectedRowIds);

    // Save to backend
    try {
      await ApiService.updateSelectedRowIdsMetrics('Domestic', selectedDescription, Array.from(newSelectedRowIds));
    } catch (err) {
      console.error('Error updating selected row IDs:', err);
    }
  };

  // Handle select all rows
  const handleSelectAll = async (isSelected) => {
    if (!isDescriptionSelectedInDashboard || !metricData || !metricData.data) return;

    const newSelectedRowIds = new Set();
    if (isSelected) {
      metricData.data.forEach(row => {
        if (row.id) {
          newSelectedRowIds.add(row.id);
        }
      });
    }
    setSelectedRowIds(newSelectedRowIds);

    // Save to backend
    try {
      await ApiService.updateSelectedRowIdsMetrics('Domestic', selectedDescription, Array.from(newSelectedRowIds));
    } catch (err) {
      console.error('Error updating selected row IDs:', err);
    }
  };

  // Fetch selected row IDs when description changes
  useEffect(() => {
    const fetchSelectedRowIds = async () => {
      if (!selectedDescription || !isDescriptionSelectedInDashboard) {
        setSelectedRowIds(new Set());
        return;
      }

      try {
        const rowIds = await ApiService.getSelectedRowIdsMetrics('Domestic', selectedDescription);
        setSelectedRowIds(new Set(Array.isArray(rowIds) ? rowIds : []));
      } catch (err) {
        console.error('Error fetching selected row IDs:', err);
        setSelectedRowIds(new Set());
      }
    };

    fetchSelectedRowIds();
  }, [selectedDescription, isDescriptionSelectedInDashboard]);

  // Fetch unique values for form fields
  const fetchUniqueValues = async () => {
    const companyToUse = selectedInsurer || formData.CompanyInsurerShortName;
    if (!companyToUse) {
      console.warn('No company selected for fetching unique values');
      return;
    }

    try {
      const fields = ['ProcessedPeriodType', 'ProcessedFYYear', 'CountryName', 'Description', 'ReportedUnit', 'ReportedValue'];
      const values = {};

      for (const field of fields) {
        try {
          console.log(`🔵 Fetching unique values for ${field} from company: ${companyToUse}`);
          const data = await ApiService.getCompanyMetricUniqueValues(companyToUse, field);
          console.log(`✅ Received unique values for ${field}:`, data);
          // Ensure data is an array
          values[field] = Array.isArray(data) ? data : (data ? [data] : []);
        } catch (err) {
          console.error(`❌ Error fetching unique values for ${field}:`, err);
          values[field] = [];
        }
      }

      console.log('📊 All unique values fetched:', values);
      setUniqueValues(values);
    } catch (err) {
      console.error('❌ Error fetching unique values:', err);
    }
  };

  // CRUD Handler Functions
  const handleAdd = async () => {
    // Use selectedInsurer or first available insurer
    const companyName = selectedInsurer || (insurers.length > 0 ? insurers[0] : '');
    if (!companyName) {
      setError('No insurers available. Please wait for data to load.');
      return;
    }

    setFormData({
      CompanyInsurerShortName: companyName,
      ProcessedPeriodType: '',
      ProcessedFYYear: [], // Array for multi-select
      DataType: '', // Hidden field, not shown in UI
      CountryName: '',
      PremiumTypeLongName: selectedCategory || '',
      CategoryLongName: selectedSubCategory || '',
      Description: selectedDescription || '',
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
      CompanyInsurerShortName: false,
      ProcessedPeriodType: false,
      ProcessedFYYear: false,
      CountryName: false,
      Description: false,
      ReportedUnit: false,
      ReportedValue: false
    });

    // Fetch unique values when opening modal - ensure company name is set
    await fetchUniqueValues();
    setShowAddModal(true);
  };

  const handleEdit = async (record) => {
    const premiumTypeValue = record.PremiumTypeLongName || '';
    const categoryValue = record.CategoryLongName || '';
    const companyValue = record.CompanyInsurerShortName || selectedInsurer || '';

    setFormData({
      CompanyInsurerShortName: companyValue,
      ProcessedPeriodType: record.ProcessedPeriodType || '',
      ProcessedFYYear: record.ProcessedFYYear ? [record.ProcessedFYYear] : [], // Single year as array for edit
      DataType: record.DataType || '',
      CountryName: record.CountryName || '',
      PremiumTypeLongName: premiumTypeValue,
      CategoryLongName: categoryValue,
      Description: record.Description || '',
      ReportedUnit: record.ReportedUnit || '',
      ReportedValue: record.ReportedValue || '',
      IsActive: record.IsActive !== undefined ? record.IsActive : true
    });

    // Check if the values exist in the dropdowns
    const isCompanyInList = insurers.includes(companyValue);
    const isPremiumTypeInList = categories.includes(premiumTypeValue);
    const isCategoryInList = subCategories.includes(categoryValue);

    setShowCustomInputs({
      CompanyInsurerShortName: !isCompanyInList && companyValue !== '',
      ProcessedPeriodType: !uniqueValues.ProcessedPeriodType.includes(record.ProcessedPeriodType || '') && (record.ProcessedPeriodType || '') !== '',
      ProcessedFYYear: !uniqueValues.ProcessedFYYear.includes(record.ProcessedFYYear || '') && (record.ProcessedFYYear || '') !== '',
      CountryName: !uniqueValues.CountryName.includes(record.CountryName || '') && (record.CountryName || '') !== '',
      Description: !uniqueValues.Description.includes(record.Description || '') && (record.Description || '') !== '',
      ReportedUnit: !uniqueValues.ReportedUnit.includes(record.ReportedUnit || '') && (record.ReportedUnit || '') !== '',
      ReportedValue: !uniqueValues.ReportedValue.includes(record.ReportedValue || '') && (record.ReportedValue || '') !== ''
    });

    setShowCustomPremiumType(!isPremiumTypeInList && premiumTypeValue !== '');
    setShowCustomCategory(!isCategoryInList && categoryValue !== '');
    setSelectedPremiumTypeOption(isPremiumTypeInList ? premiumTypeValue : '');
    setSelectedCategoryOption(isCategoryInList ? categoryValue : '');

    // Fetch categories for the premium type if it exists
    if (premiumTypeValue && isPremiumTypeInList) {
      try {
        const categoryData = await ApiService.getCompanyCategories(selectedInsurer, premiumTypeValue);
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
      await ApiService.deleteMetric(recordToDelete.id);
      setSuccessMessage('Record deleted successfully!');
      setShowDeleteConfirm(false);
      setRecordToDelete(null);

      // Refresh data
      if (selectedInsurer && selectedCategory && selectedSubCategory && selectedDescription) {
        const data = await ApiService.getMetricDetails(
          selectedInsurer,
          selectedCategory,
          selectedSubCategory,
          selectedDescription
        );

        // Filter data based on admin status
        if (data && data.data && Array.isArray(data.data)) {
          let filteredData = [...data.data];

          if (!isAdmin) {
            filteredData = filteredData.filter(row => row.IsActive === 1 || row.IsActive === true);
          }

          setMetricData({
            ...data,
            data: filteredData,
            count: filteredData.length
          });
        } else {
          setMetricData(data);
        }
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting record:', err);
      const errorMessage = err.message || 'Failed to delete record. Please try again.';
      setError(errorMessage);
      // Keep the modal open so user can see the error
      // setShowDeleteConfirm(false);
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
        // Update existing record - use first year from array
        const updateData = {
          ...formData,
          ProcessedFYYear: formData.ProcessedFYYear[0] || ''
        };
        await ApiService.updateMetric(editingRecord.id, updateData);
        setSuccessMessage('Record updated successfully!');
      } else {
        // Create multiple records - one for each selected year
        const selectedYears = Array.isArray(formData.ProcessedFYYear) && formData.ProcessedFYYear.length > 0
          ? formData.ProcessedFYYear
          : [];

        if (selectedYears.length === 0) {
          setError('Please select at least one Processed FY Year');
          setLoading(false);
          return;
        }

        // Create records for each selected year
        const createPromises = selectedYears.map(year => {
          const recordData = {
            ...formData,
            ProcessedFYYear: year
          };
          return ApiService.createMetric(recordData);
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
        CompanyInsurerShortName: false,
        ProcessedPeriodType: false,
        ProcessedFYYear: false,
        CountryName: false,
        Description: false,
        ReportedUnit: false,
        ReportedValue: false
      });

      // Refresh categories dropdown if premium type is selected
      if (selectedInsurer && (selectedCategory || newPremiumType)) {
        try {
          const premiumTypeToUse = selectedCategory || newPremiumType;
          const updatedCategories = await ApiService.getCompanyPremiumTypes(selectedInsurer);
          setCategories(updatedCategories || []);

          // If new premium type was added and it's not in the list, add it
          if (newPremiumType && !updatedCategories.includes(newPremiumType)) {
            setCategories([...updatedCategories, newPremiumType]);
          }
        } catch (err) {
          console.error('Error refreshing categories:', err);
        }
      }

      // Refresh sub categories dropdown if category is selected
      if (selectedInsurer && selectedCategory && (selectedSubCategory || newCategory)) {
        try {
          const categoryToUse = selectedCategory;
          const updatedSubCategories = await ApiService.getCompanyCategories(selectedInsurer, categoryToUse);
          setSubCategories(updatedSubCategories || []);

          // If new category was added and it's not in the list, add it
          if (newCategory && !updatedSubCategories.includes(newCategory)) {
            setSubCategories([...updatedSubCategories, newCategory]);
          }
        } catch (err) {
          console.error('Error refreshing sub categories:', err);
        }
      }

      // Refresh data if filters are selected
      if (selectedInsurer && selectedCategory && selectedSubCategory && selectedDescription) {
        const data = await ApiService.getMetricDetails(
          selectedInsurer,
          selectedCategory,
          selectedSubCategory,
          selectedDescription
        );

        // Filter data based on admin status
        if (data && data.data && Array.isArray(data.data)) {
          let filteredData = [...data.data];

          if (!isAdmin) {
            filteredData = filteredData.filter(row => row.IsActive === 1 || row.IsActive === true);
          }

          setMetricData({
            ...data,
            data: filteredData,
            count: filteredData.length
          });
        } else {
          setMetricData(data);
        }
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving record:', err);
      setError('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Only show Dashboard and Domestic Metrics tabs
  const tabs = ['Dashboard', 'Domestic Metrics'];

  const handleTabClick = (tab) => {
    if (tab === 'Dashboard') {
      setActiveTab('Dashboard');
      navigate('/metrics');
    } else if (tab === 'Domestic Metrics') {
      setActiveTab('Domestic Metrics');
      return; // Stay on current page
    }
  };

  return (
    <StandardPageLayout
      title="Metrics - Domestic"
      onMenuClick={onMenuClick}
      sidebar={<CompanyInformationSidebar />}
    >
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
          Metrics
        </span>
        <span className="breadcrumb-separator" style={{ color: '#999' }}>{'>>'}</span>
        <span className="breadcrumb-current" style={{ color: '#36659b', fontWeight: '500' }}>Domestic</span>
      </div>

      {/* Navigation Tabs */}
      <div className="navigation-tabs-container">
        <div className="navigation-tabs">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`nav-tab active ${isSelected ? 'selected' : ''}`}
              >
                {tab}
              </button>
            );
          })}
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

      <EconomySharedLayout
        viewMode={viewMode}
        setViewMode={setViewMode}
        visualsEnabled={false}
        summaryText=""
        controls={
          <>
            {/* Filter Dropdowns */}
            <div className="period-select-container">
              <label className="control-label">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="custom-select"
                disabled={!selectedInsurer || loading}
              >
                <option value="">Select Category...</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="period-select-container">
              <label className="control-label">Sub Category</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="custom-select"
                disabled={!selectedCategory || loading}
              >
                <option value="">{selectedCategory ? 'Select Sub Category...' : 'Please select a Category first'}</option>
                {subCategories.map((subCategory, index) => (
                  <option key={index} value={subCategory}>{subCategory}</option>
                ))}
              </select>
            </div>

            <div className="period-select-container">
              <label className="control-label">Description</label>
              <select
                value={selectedDescription}
                onChange={(e) => setSelectedDescription(e.target.value)}
                className="custom-select"
                disabled={!selectedSubCategory || loading}
              >
                <option value="">{selectedSubCategory ? 'Select Description...' : 'Please select Category and Sub Category first'}</option>
                {descriptions.map((description, index) => (
                  <option key={index} value={description}>{description}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons - Only visible to Admin */}
            {isAdmin && (
              <div style={{ marginLeft: '10px' }}>
                <button
                  onClick={handleAdd}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#36659b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(54, 101, 155, 0.2)'
                  }}
                >
                  <span>+</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Add New</span>
                </button>
              </div>
            )}
          </>
        }
      >

        {/* Description Selection Section - Only visible to Admin */}
        {isAdmin && selectedInsurer && selectedCategory && selectedSubCategory && selectedDescription && descriptionsWithContext.length > 0 && (
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



        {/* Content Area */}
        <div style={{ marginTop: '20px' }}>
          {viewMode === 'data' ? (
            // For non-admin users, show pivot tables grouped by ProcessedPeriodType
            !isAdmin && pivotTableData && Object.keys(pivotTableData).length > 0 ? (
              <div className="pivot-tables-container" style={{ marginTop: '20px' }}>
                {Object.keys(pivotTableData).sort().map(periodType => {
                  const periodData = pivotTableData[periodType];
                  if (!periodData) return null;

                  const { periods = [], descriptions = [], pivot = {}, units = {}, descriptionMetadata = {},
                    companyName = '', premiumTypeName = '', categoryName = '' } = periodData;

                  if (!periods || !descriptions || periods.length === 0 || descriptions.length === 0) {
                    return null;
                  }

                  // Build breadcrumb: Company >> Premium Type >> Category >> Period Type
                  const displayCompanyName = companyName || selectedInsurer || '';
                  const displayPremiumTypeName = selectedCategory || premiumTypeName || '';
                  const displayCategoryName = selectedSubCategory || categoryName || '';

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
            ) : (
              // For admin users or when no pivot data, show regular table
              metricData && metricData.data && metricData.data.length > 0 ? (
                <div className="table-container" style={{ marginTop: '20px' }}>
                  <table className="economy-table">
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
                              {metricData && metricData.data && metricData.data.length > 0 && isDescriptionSelectedInDashboard && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>
                                  <input
                                    type="checkbox"
                                    checked={metricData.data.length > 0 && metricData.data.every(row => row.id && selectedRowIds.has(row.id))}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      cursor: 'pointer'
                                    }}
                                    title="Select All"
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
                        <th>CategoryLongName</th>
                        <th>SubCategoryLongName</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricData.data.map((row, index) => (
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
                                  checked={row.IsActive === 1 || row.IsActive === true || row.IsActive === undefined}
                                  onChange={async (e) => {
                                    const newStatus = e.target.checked;
                                    try {
                                      await ApiService.patchMetric(row.id, { IsActive: newStatus ? 1 : 0 });
                                      // Update local state
                                      setMetricData(prevData => {
                                        if (!prevData || !prevData.data) return prevData;
                                        return {
                                          ...prevData,
                                          data: prevData.data.map(item =>
                                            item.id === row.id ? { ...item, IsActive: newStatus ? 1 : 0 } : item
                                          )
                                        };
                                      });
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
                                    backgroundColor: (row.IsActive === 1 || row.IsActive === true || row.IsActive === undefined) ? '#4CAF50' : '#ccc',
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
                                      left: (row.IsActive === 1 || row.IsActive === true || row.IsActive === undefined) ? '26px' : '3px',
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Fallback messages
                !isAdmin && (!pivotTableData || Object.keys(pivotTableData).length === 0) ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    {!selectedCategory || !selectedSubCategory || !selectedDescription
                      ? (!selectedCategory && 'Please select a Category Long Name') ||
                      (selectedCategory && !selectedSubCategory && 'Please select a Sub Category Long Name') ||
                      (selectedCategory && selectedSubCategory && !selectedDescription && 'Please select a Description')
                      : 'No data available for selected filters'}
                  </div>
                ) : metricData && metricData.count === 0 ? (
                  <div className="no-data" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No data found for the selected filters.
                  </div>
                ) : !loading && selectedInsurer && selectedCategory && selectedSubCategory && selectedDescription ? (
                  <div className="no-data" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    Loading data...
                  </div>
                ) : (
                  <div className="no-data" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    {!selectedCategory && 'Please select a Category Long Name'}
                    {selectedCategory && !selectedSubCategory && 'Please select a Sub Category Long Name'}
                    {selectedCategory && selectedSubCategory && !selectedDescription && 'Please select a Description'}
                  </div>
                )
              )
            )
          ) : (
            <div className="visuals-container" style={{ marginTop: '20px' }}>
              {metricData && metricData.data && metricData.data.length > 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  <p>Charts will be displayed here</p>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                    Data available: {metricData.count} records
                  </p>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {!selectedCategory && 'Please select a Category Long Name'}
                  {selectedCategory && !selectedSubCategory && 'Please select a Sub Category Long Name'}
                  {selectedCategory && selectedSubCategory && !selectedDescription && 'Please select a Description'}
                  {selectedCategory && selectedSubCategory && selectedDescription && 'No data available for visualization.'}
                </div>
              )}
            </div>
          )}
        </div>
      </EconomySharedLayout>

      {/* Add/Edit Modal */}
      {
        showAddModal && (
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
                  CompanyInsurerShortName: false,
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
                      CompanyInsurerShortName: false,
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
                    Company Insurer Short Name:
                  </label>
                  {!showCustomInputs.CompanyInsurerShortName ? (
                    <select
                      value={formData.CompanyInsurerShortName}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setShowCustomInputs(prev => ({ ...prev, CompanyInsurerShortName: true }));
                          setFormData({ ...formData, CompanyInsurerShortName: '' });
                        } else {
                          setFormData({ ...formData, CompanyInsurerShortName: e.target.value });
                          // Refetch unique values when company changes
                          if (e.target.value) {
                            fetchUniqueValues();
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      required
                    >
                      <option value="">Select Company...</option>
                      {insurers.map((insurer, index) => (
                        <option key={index} value={insurer}>{insurer}</option>
                      ))}
                      <option value="__ADD_NEW__">--- Add New ---</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.CompanyInsurerShortName}
                      onChange={(e) => setFormData({ ...formData, CompanyInsurerShortName: e.target.value })}
                      placeholder="Enter new Company Insurer Short Name..."
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      onBlur={() => {
                        if (!formData.CompanyInsurerShortName.trim()) {
                          setShowCustomInputs(prev => ({ ...prev, CompanyInsurerShortName: false }));
                        }
                      }}
                      required
                    />
                  )}
                </div>

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
                      {uniqueValues.ProcessedPeriodType && uniqueValues.ProcessedPeriodType.length > 0 ? (
                        uniqueValues.ProcessedPeriodType.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))
                      ) : (
                        <option value="" disabled>No values available</option>
                      )}
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
                          {uniqueValues.ProcessedFYYear && uniqueValues.ProcessedFYYear.length > 0 ? (
                            uniqueValues.ProcessedFYYear.map((value, index) => (
                              <option key={index} value={value}>{value}</option>
                            ))
                          ) : (
                            <option value="" disabled>No values available</option>
                          )}
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
                            {uniqueValues.ProcessedFYYear && uniqueValues.ProcessedFYYear.length > 0 ? (
                              uniqueValues.ProcessedFYYear.map((value, index) => (
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
                              ))
                            ) : (
                              <div style={{ padding: '8px', color: '#999', fontSize: '13px' }}>No years available</div>
                            )}
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
                      {uniqueValues.CountryName && uniqueValues.CountryName.length > 0 ? (
                        uniqueValues.CountryName.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))
                      ) : (
                        <option value="" disabled>No values available</option>
                      )}
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
                          const categoryData = await ApiService.getCompanyCategories(selectedInsurer || formData.CompanyInsurerShortName, value);
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
                    {categories.map((type, index) => (
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
                    Sub Category Long Name:
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
                      placeholder="Enter new Sub Category Long Name..."
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
                      {uniqueValues.Description && uniqueValues.Description.length > 0 ? (
                        uniqueValues.Description.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))
                      ) : (
                        <option value="" disabled>No values available</option>
                      )}
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
                      {uniqueValues.ReportedUnit && uniqueValues.ReportedUnit.length > 0 ? (
                        uniqueValues.ReportedUnit.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))
                      ) : (
                        <option value="" disabled>No values available</option>
                      )}
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
                      {uniqueValues.ReportedValue && uniqueValues.ReportedValue.length > 0 ? (
                        uniqueValues.ReportedValue.map((value, index) => (
                          <option key={index} value={value}>{value}</option>
                        ))
                      ) : (
                        <option value="" disabled>No values available</option>
                      )}
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
                        CompanyInsurerShortName: false,
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
        )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteConfirm && recordToDelete && (
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
                    <strong>Company:</strong> {recordToDelete.CompanyInsurerShortName || '-'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Premium Type:</strong> {recordToDelete.PremiumTypeLongName || '-'}
                  </div>
                  <div>
                    <strong>Category:</strong> {recordToDelete.CategoryLongName || '-'}
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
        )
      }
    </StandardPageLayout>
  );
};

export default MetricsDomestic;

