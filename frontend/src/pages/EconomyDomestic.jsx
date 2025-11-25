import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './EconomyDomestic.css';

const EconomyDomestic = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const [selectedPremiumType, setSelectedPremiumType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'visuals'

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Domestic', 'International'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Sample data - in production, this would come from an API
  const economyData = [
    // Insurance Premium - Growth
    {
      category: 'Insurance Premium',
      categoryLongName: 'Growth',
      description: 'Total Insurance Premium expected growth in India over 5 years',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2024',
      units: '%',
      reportedValue: '12.5'
    },
    {
      category: 'Insurance Premium',
      categoryLongName: 'Growth',
      description: 'Total Insurance Premium expected growth in Global over 5 years',
      countryName: 'Global',
      period: 'Annual',
      year: 'FY2024',
      units: '%',
      reportedValue: '8.3'
    },
    {
      category: 'Insurance Premium',
      categoryLongName: 'Growth',
      description: 'Total Insurance Premium expected growth in Emerging Economies over 5 years',
      countryName: 'Emerging Economies',
      period: 'Annual',
      year: 'FY2024',
      units: '%',
      reportedValue: '10.2'
    },
    {
      category: 'Insurance Premium',
      categoryLongName: 'Growth',
      description: 'Total Insurance Premium expected growth in Advanced Economies over 5 years',
      countryName: 'Advanced Economies',
      period: 'Annual',
      year: 'FY2024',
      units: '%',
      reportedValue: '6.8'
    },
    // Demographics - Population
    {
      category: 'Demographics',
      categoryLongName: 'Population',
      description: 'Less than 20 years - Total',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2024',
      units: 'INR Million',
      reportedValue: '450.2'
    },
    {
      category: 'Demographics',
      categoryLongName: 'Population',
      description: '20 years to 64 years - Total',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2024',
      units: 'INR Million',
      reportedValue: '850.5'
    },
    {
      category: 'Demographics',
      categoryLongName: 'Population',
      description: '65 years and above - Total',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2024',
      units: 'INR Million',
      reportedValue: '120.8'
    },
    // Demographics - People
    {
      category: 'Demographics',
      categoryLongName: 'People',
      description: 'Number of Households - 0.2 mn - Total Estimate',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2012',
      units: 'INR Million',
      reportedValue: '280.5'
    },
    {
      category: 'Demographics',
      categoryLongName: 'People',
      description: 'Households distribution by income - 0.3 mn - Estimate',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2012',
      units: 'INR Million',
      reportedValue: '320.8'
    },
    // Life Insurance Penetration - Business
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'Hongkong',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '15.8'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'Taiwan',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '12.3'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'Singapore',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '11.5'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'Malaysia',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '9.2'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'Thailand',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '7.8'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'India',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '4.2'
    },
    {
      category: 'Life Insurance Penetration',
      categoryLongName: 'Business',
      description: 'Life Insurance Penetration',
      countryName: 'China',
      period: 'Annual',
      year: 'FY2000',
      units: '%',
      reportedValue: '3.5'
    }
  ];

  // Get unique premium types and categories for dropdowns
  const premiumTypes = [...new Set(economyData.map(item => item.categoryLongName))];
  const categories = [...new Set(economyData.map(item => item.category))];

  // Filter data based on selections
  useEffect(() => {
    let filtered = economyData;
    
    if (selectedPremiumType) {
      filtered = filtered.filter(item => item.categoryLongName === selectedPremiumType);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredData(filtered);
  }, [selectedPremiumType, selectedCategory]);

  // Initialize filtered data
  useEffect(() => {
    setFilteredData(economyData);
  }, []);

  const handleTabClick = (tab) => {
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      navigate('/economy-dashboard');
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
                >
                  <option value="">All Premium Types</option>
                  {premiumTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="category">Select Category Long Name</label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Table or Visuals */}
            {viewMode === 'data' ? (
              <div className="table-container">
                <table className="economy-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>CategoryLongName</th>
                      <th>Description</th>
                      <th>CountryName</th>
                      <th>Period</th>
                      <th>Year</th>
                      <th>Units</th>
                      <th>ReportedVideo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.category}</td>
                          <td>{row.categoryLongName}</td>
                          <td>{row.description}</td>
                          <td>{row.countryName}</td>
                          <td>{row.period}</td>
                          <td>{row.year}</td>
                          <td>{row.units}</td>
                          <td>{row.reportedValue}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="no-data">No data available</td>
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
                        {filteredData
                          .filter(item => item.category === 'Insurance Premium')
                          .map((item, index) => (
                            <div key={index} className="chart-item">
                              <div className="chart-bar-container">
                                <div
                                  className="chart-bar"
                                  style={{
                                    height: `${(parseFloat(item.reportedValue) / 15) * 100}%`,
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
                                    height: `${(parseFloat(item.reportedValue) / 1000) * 100}%`,
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
                            .filter(item => item.units === '%')
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

export default EconomyDomestic;

