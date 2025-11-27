import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import ApiService from '../services/api';
import './EconomyInternational.css';

const EconomyInternational = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive, activeNavItems, selectedSidebarItem } = useNavigation();
  const [selectedPremiumType, setSelectedPremiumType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriodType, setSelectedPeriodType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'
  
  // API data states
  const [premiumTypes, setPremiumTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    ProcessedPeriodType: '',
    ProcessedFYYear: '',
    DataType: 'International',
    CountryName: '',
    PremiumTypeLongName: '',
    CategoryLongName: '',
    Description: '',
    ReportedUnit: '',
    ReportedValue: ''
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

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

  // Fetch premium types from API when component loads (when International tab is clicked)
  useEffect(() => {
    const fetchPremiumTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Call API: http://localhost:8000/api/economy/premium-types?data_type=International
        console.log('🔵 Calling API: /api/economy/premium-types?data_type=International');
        const data = await ApiService.getPremiumTypes('International');
        console.log('✅ Premium types received from API:', data);
        console.log('📊 Number of premium types:', data?.length || 0);
        setPremiumTypes(data || []);
      } catch (err) {
        console.error('❌ Error fetching premium types:', err);
        setError('Failed to load premium types. Please try again.');
        setPremiumTypes([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately when component loads (when International tab is clicked)
    fetchPremiumTypes();
  }, []);

  // Fetch categories when premium type is selected
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedPremiumType) {
        setCategories([]);
        setFilteredData([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Call API: http://localhost:8000/api/economy/categories?data_type=International&premium={selectedPremiumType}
        console.log(`🔵 Calling Categories API: /api/economy/categories?data_type=International&premium=${selectedPremiumType}`);
        const data = await ApiService.getCategories('International', selectedPremiumType);
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
      }
    };

    fetchCategories();
  }, [selectedPremiumType]);

  // Fetch economy data when both premium type and category are selected
  useEffect(() => {
    const fetchEconomyData = async () => {
      if (!selectedPremiumType || !selectedCategory) {
        setFilteredData([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Call API: http://localhost:8000/api/economy/data?data_type=International&premium={selectedPremiumType}&category={selectedCategory}
        console.log(`🔵 Calling Economy Data API: /api/economy/data?data_type=International&premium=${selectedPremiumType}&category=${selectedCategory}`);
        const data = await ApiService.getEconomyData('International', selectedPremiumType, selectedCategory);
        console.log('✅ Economy data received from API:', data);
        console.log('📊 Number of records:', data?.length || 0);
        setFilteredData(data || []);
      } catch (err) {
        console.error('❌ Error fetching economy data:', err);
        setError('Failed to load economy data. Please try again.');
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEconomyData();
  }, [selectedPremiumType, selectedCategory]);

  // CRUD Handler Functions
  const handleAdd = () => {
    setFormData({
      ProcessedPeriodType: '',
      ProcessedFYYear: '',
      DataType: 'International',
      CountryName: '',
      PremiumTypeLongName: '',
      CategoryLongName: '',
      Description: '',
      ReportedUnit: '',
      ReportedValue: ''
    });
    setEditingRecord(null);
    setShowAddModal(true);
  };

  const handleEdit = (record) => {
    setFormData({
      ProcessedPeriodType: record.ProcessedPeriodType || '',
      ProcessedFYYear: record.ProcessedFYYear || '',
      DataType: record.DataType || 'International',
      CountryName: record.CountryName || '',
      PremiumTypeLongName: record.PremiumTypeLongName || '',
      CategoryLongName: record.CategoryLongName || '',
      Description: record.Description || '',
      ReportedUnit: record.ReportedUnit || '',
      ReportedValue: record.ReportedValue || ''
    });
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
      await ApiService.deleteEconomyData(recordToDelete.id);
      setSuccessMessage('Record deleted successfully!');
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      // Refresh data
      if (selectedPremiumType && selectedCategory) {
        const data = await ApiService.getEconomyData('International', selectedPremiumType, selectedCategory);
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
      // Refresh data
      if (selectedPremiumType && selectedCategory) {
        const data = await ApiService.getEconomyData('International', selectedPremiumType, selectedCategory);
        setFilteredData(data || []);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving record:', err);
      setError('Failed to save record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Old hardcoded data removed - now using API

  // Old hardcoded filtering logic removed - now using API

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
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      // Stay on current page
      return;
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
    <div className="economy-international-page">
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
        <h1>Economy - International</h1>
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

            {/* Action Buttons */}
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
                      <th style={{ textAlign: 'center', minWidth: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="no-data">Loading data...</td>
                      </tr>
                    ) : filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="no-data">
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
                <div className="visuals-grid">
                  {/* Chart 1: Insurance Premium Growth */}
                  <div className="visual-card">
                    <h3>Insurance Premium Growth</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {(() => {
                          const growthData = filteredData.filter(item => item.premiumTypeLongName === 'Growth');
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
                          const penetrationData = filteredData.filter(item => item.premiumTypeLongName === 'Penetration');
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
                          const gapData = filteredData.filter(item => item.premiumTypeLongName === 'Protection Gap');
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
                          const gdpData = filteredData.filter(item => item.premiumTypeLongName === 'Sum Assured % GDP');
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
                          const pensionData = filteredData.filter(item => item.premiumTypeLongName === 'Pension Penetration' && item.reportedValue);
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
                <input
                  type="text"
                  value={formData.PremiumTypeLongName}
                  onChange={(e) => setFormData({ ...formData, PremiumTypeLongName: e.target.value })}
                  placeholder="Enter Premium Type Long Name..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                {premiumTypes.length > 0 && (
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Suggestions: {premiumTypes.slice(0, 3).join(', ')}{premiumTypes.length > 3 ? '...' : ''}
                  </small>
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Category Long Name:
                </label>
                <input
                  type="text"
                  value={formData.CategoryLongName}
                  onChange={(e) => setFormData({ ...formData, CategoryLongName: e.target.value })}
                  placeholder="Enter Category Long Name..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                {categories.length > 0 && (
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Suggestions: {categories.slice(0, 3).join(', ')}{categories.length > 3 ? '...' : ''}
                  </small>
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

export default EconomyInternational;

