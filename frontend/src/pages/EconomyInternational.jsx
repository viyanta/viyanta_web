import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './EconomyInternational.css';

const EconomyInternational = ({ onMenuClick }) => {
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

  // Sample data for International - in production, this would come from an API
  const economyData = [
    // Insurance Premium - Growth
    {
      premiumTypeLongName: 'Growth',
      countryName: 'Global',
      description: 'Total Insurance Premium expected growth over 5 years',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '2.4'
    },
    {
      premiumTypeLongName: 'Growth',
      countryName: 'Emerging Economies',
      description: 'Total Insurance Premium expected growth over 5 years',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '5.1'
    },
    {
      premiumTypeLongName: 'Growth',
      countryName: 'Advanced Economies',
      description: 'Total Insurance Premium expected growth over 5 years',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '1.7'
    },
    // Life Insurance Penetration
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'HongKong',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '19.2'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'Taiwan',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '14.0'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'Singapore',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '7.6'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'Japan',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '6.8'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'Malaysia',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '5.2'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'Thailand',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '4.1'
    },
    {
      premiumTypeLongName: 'Penetration',
      countryName: 'China',
      description: 'Life Insurance Penetration',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '3.2'
    },
    // Life Insurance Protection Gap
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'HongKong',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '41.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'Taiwan',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '14.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'Singapore',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '55.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'Japan',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '28.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'Malaysia',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '62.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'Thailand',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '75.0'
    },
    {
      premiumTypeLongName: 'Protection Gap',
      countryName: 'China',
      description: 'Life Insurance Protection Gap',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2018-2019',
      reportedValue: '68.0'
    },
    // Sum Assured as % of GDP
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'Singapore',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '332.0'
    },
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'Japan',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '252.0'
    },
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'Malaysia',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '153.0'
    },
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'Thailand',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '98.0'
    },
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'USA',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '145.0'
    },
    {
      premiumTypeLongName: 'Sum Assured % GDP',
      countryName: 'South Korea',
      description: 'Sum Assured as % of GDP',
      reportedUnit: '%',
      processedFinancialYearPeriod: '2021-2022',
      reportedValue: '178.0'
    },
    // Pension Market Penetration
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'Singapore',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '31.0'
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'Japan',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '146.0'
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'Australia',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '98.0'
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'Thailand',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '54.0'
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'USA',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '90.0'
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'South Korea',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: ''
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'HongKong',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: ''
    },
    {
      premiumTypeLongName: 'Pension Penetration',
      countryName: 'Canada',
      description: 'Pension Market Penetration',
      reportedUnit: '% of GDP',
      processedFinancialYearPeriod: '2023-2024',
      reportedValue: '85.0'
    }
  ];

  // Get unique premium types and categories for dropdowns
  const premiumTypes = [...new Set(economyData.map(item => item.premiumTypeLongName))];
  const categories = [...new Set(economyData.map(item => item.description))];

  // Filter data based on selections
  useEffect(() => {
    let filtered = economyData;
    
    if (selectedPremiumType) {
      filtered = filtered.filter(item => item.premiumTypeLongName === selectedPremiumType);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.description === selectedCategory);
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
                      <th>PremiumTypeLongName</th>
                      <th>CountryName</th>
                      <th>Description</th>
                      <th>ReportedUnit</th>
                      <th>ProcessedFinancialYearPeriod</th>
                      <th>ReportedValue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.premiumTypeLongName}</td>
                          <td>{row.countryName}</td>
                          <td>{row.description}</td>
                          <td>{row.reportedUnit}</td>
                          <td>{row.processedFinancialYearPeriod}</td>
                          <td>{row.reportedValue || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">No data available</td>
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
    </div>
  );
};

export default EconomyInternational;

