import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import ApiService from '../services/api';
import './IndustryMetricsDomestic.css';

const IndustryMetricsDomestic = ({ onMenuClick }) => {
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
  
  // Refs to prevent duplicate API calls
  const fetchingPremiumTypesRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);
  const fetchingDataRef = useRef(false);

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
        console.log('🔵 Calling API: /api/industry/premium-types?data_type=Domestic');
        const data = await ApiService.getPremiumTypesIndustry('Domestic');
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
        return;
      }

      fetchingCategoriesRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Calling Categories API: /api/industry/categories?data_type=Domestic&premium=${selectedPremiumType}`);
        const data = await ApiService.getCategoriesIndustry('Domestic', selectedPremiumType);
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

  // Fetch industry data when both premium type and category are selected
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingDataRef.current) return;
    
    const fetchIndustryData = async () => {
      if (!selectedPremiumType || !selectedCategory) {
        setFilteredData([]);
        return;
      }

      fetchingDataRef.current = true;
      setLoading(true);
      setError(null);
      try {
        console.log(`🔵 Calling Industry Data API: /api/industry/data?data_type=Domestic&premium=${selectedPremiumType}&category=${selectedCategory}`);
        const data = await ApiService.getIndustryDataIndustry('Domestic', selectedPremiumType, selectedCategory);
        console.log('✅ Industry data received from API:', data);
        console.log('📊 Number of records:', data?.length || 0);
        setFilteredData(data || []);
      } catch (err) {
        console.error('❌ Error fetching industry data:', err);
        setError('Failed to load industry data. Please try again.');
        setFilteredData([]);
      } finally {
        setLoading(false);
        fetchingDataRef.current = false;
      }
    };

    fetchIndustryData();
  }, [selectedPremiumType, selectedCategory]);

  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      navigate('/industry-metrics-dashboard');
    } else if (tab === 'Domestic Metrics') {
      return; // Stay on current page
    } else if (tab === 'International Metrics') {
      navigate('/industry-metrics-international');
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
    <div className="industry-metrics-domestic-page">
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
        <h1>Industry Metrics - Domestic</h1>
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
                  <option value="">
                    {loading ? 'Loading premium types...' : 'Select Premium Type...'}
                  </option>
                  {premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
                {error && (
                  <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {error}
                  </small>
                )}
              </div>

              <div className="filter-group">
                <label htmlFor="category">Select Category Long Name</label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                  disabled={!selectedPremiumType || loading}
                >
                  <option value="">
                    {!selectedPremiumType 
                      ? 'Select a Premium Type first' 
                      : loading 
                      ? 'Loading categories...' 
                      : 'Select Category...'}
                  </option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Data Table or Visuals */}
            {viewMode === 'data' ? (
              <div className="table-container">
                <table className="industry-metrics-table">
                  <thead>
                    <tr>
                      <th>Premium Type</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Country Name</th>
                      <th>Period Type</th>
                      <th>FY Year</th>
                      <th>Reported Unit</th>
                      <th>Reported Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan="8" className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
                          Loading data...
                        </td>
                      </tr>
                    )}
                    {!loading && filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.PremiumTypeLongName || '-'}</td>
                          <td>{row.CategoryLongName || '-'}</td>
                          <td>{row.Description || '-'}</td>
                          <td>{row.CountryName || '-'}</td>
                          <td>{row.ProcessedPeriodType || '-'}</td>
                          <td>{row.ProcessedFYYear || '-'}</td>
                          <td>{row.ReportedUnit || '-'}</td>
                          <td>{row.ReportedValue || '-'}</td>
                        </tr>
                      ))
                    ) : !loading ? (
                      <tr>
                        <td colSpan="8" className="no-data">
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
              <div className="visuals-container">
                <div className="visuals-grid">
                  {/* Chart 1: Insurance Premium Growth */}
                  <div className="visual-card">
                    <h3>Insurance Premium Growth</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {filteredData
                          .filter(item => item.category === 'Insurance Premium')
                          .map((item, index) => (
                            <div key={index} className="chart-item">
                              <div className="chart-bar-container">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${(parseFloat(item.reportedValue) / 10) * 100}%`,
                                    backgroundColor: '#36659b'
                                  }}
                                >
                                  <span className="bar-value">{item.reportedValue}%</span>
                                </div>
                              </div>
                              <div className="chart-label">{item.countryName}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Demographics - Population */}
                  <div className="visual-card">
                    <h3>Population Demographics</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {filteredData
                          .filter(item => item.category === 'Demographics' && item.categoryLongName === 'Population')
                          .map((item, index) => (
                            <div key={index} className="chart-item">
                              <div className="chart-bar-container">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${(parseFloat(item.reportedValue) / 300) * 100}%`,
                                    backgroundColor: '#3F72AF'
                                  }}
                                >
                                  <span className="bar-value">{item.reportedValue}</span>
                                </div>
                              </div>
                              <div className="chart-label">{item.description.split(' - ')[0]}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart 3: Life Insurance Penetration */}
                  <div className="visual-card">
                    <h3>Life Insurance Penetration by Country</h3>
                    <div className="chart-wrapper">
                      <div className="bar-chart">
                        {filteredData
                          .filter(item => item.category === 'Life Insurance Penetration')
                          .map((item, index) => (
                            <div key={index} className="chart-item">
                              <div className="chart-bar-container">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${(parseFloat(item.reportedValue) / 20) * 100}%`,
                                    backgroundColor: '#5a8fc7'
                                  }}
                                >
                                  <span className="bar-value">{item.reportedValue}%</span>
                                </div>
                              </div>
                              <div className="chart-label">{item.countryName}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart 4: Summary Statistics */}
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
                          {[...new Set(filteredData.map(item => item.category))].length}
                        </div>
                        <div className="stat-label">Categories</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {[...new Set(filteredData.map(item => item.countryName))].length}
                        </div>
                        <div className="stat-label">Countries</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {filteredData
                            .filter(item => item.units === 'in %')
                            .reduce((sum, item) => sum + parseFloat(item.reportedValue || 0), 0)
                            .toFixed(1)}%
                        </div>
                        <div className="stat-label">Avg Growth</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryMetricsDomestic;
