import React, { useState, useEffect } from 'react';
import CompanyInformationSidebar from './CompanyInformationSidebar';
import './InsuranceDataTable.css';

const InsuranceDataTable = ({ data, onCompanyChange }) => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState('2022');
  const [selectedMonth, setSelectedMonth] = useState('All');


  const companies = data ? Object.keys(data) : [];
  const years = ['2020', '2021', '2022'];
  const months = ['All', 'May-24', 'Jun-24', 'Jul-24', 'Aug-24', 'Sep-24', 'Oct-24', 'Nov-24'];
  const metrics = ['First Year Premium', 'No of Policies / Schemes', 'No. of lives covered under Group Schemes', 'Sum Assured'];

  // Company display names mapping (for table display only)
  const getCompanyDisplayName = (companyKey) => {
    const displayNames = {
      'HDFC Life Insurance Company Limited': 'Acko Life',
      'ICICI Prudential Life Insurance Company Limited': 'Aditya Birla Sun Life',
      'Life Insurance Corporation of India': 'Aegon Life',
      'SBI Life Insurance Company Limited': 'Ageas Federal Life'
    };
    return displayNames[companyKey] || companyKey;
  };

  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
    if (onCompanyChange) {
      onCompanyChange(company);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    // Remove existing commas and convert to number
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    
    if (isNaN(numValue)) return value;
    
    // Format to Indian locale with exactly two decimal places
    return numValue.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateTotal = (company, metric) => {
    if (!data[company] || !data[company][metric]) return 0;
    
    let total = 0;
    const years = ['2020', '2021', '2022'];
    
    years.forEach(year => {
      if (data[company][metric][year]) {
        if (typeof data[company][metric][year] === 'object') {
          // Monthly breakdown
          months.slice(1).forEach(month => { // Skip 'All' option
            if (data[company][metric][year][month]) {
              total += parseFloat(data[company][metric][year][month]) || 0;
            }
          });
        } else {
          // Yearly value
          total += parseFloat(data[company][metric][year]) || 0;
        }
      }
    });
    return total;
  };

  const calculateYearTotal = (year) => {
    let yearTotal = 0;
    companies.forEach(company => {
      metrics.forEach(metric => {
        if (data[company] && data[company][metric] && data[company][metric][year]) {
          if (typeof data[company][metric][year] === 'object') {
            // Monthly breakdown
            months.slice(1).forEach(month => {
              yearTotal += parseFloat(data[company][metric][year][month]) || 0;
            });
          } else {
            // Yearly value
            yearTotal += parseFloat(data[company][metric][year]) || 0;
          }
        }
      });
    });
    return yearTotal;
  };

  const calculateGrandTotal = () => {
    let grandTotal = 0;
    companies.forEach(company => {
      metrics.forEach(metric => {
        grandTotal += calculateTotal(company, metric);
      });
    });
    return grandTotal;
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="insurance-table-container">
        <div className="no-data">
          <h3>No data available</h3>
          <p>Please provide insurance data to display the table.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insurance-table-container">




      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '1rem 0',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: '#666',
        borderBottom: 'none'
      }}>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>L Forms</span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}> &gt; </span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{selectedCompany || 'Select Company'}</span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}> &gt; </span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>L-4 Premium Schedule</span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}> &gt; </span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>Standalone</span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}> &gt; </span>
        <span style={{ color: 'var(--main-color)', fontWeight: '500', cursor: 'pointer' }}>{selectedMonth}</span>
      </div>

      {/* Main Content with Sidebar */}
      <div style={{ display: 'flex', gap: '2rem' }}>
                     {/* Company Information Sidebar */}
             <CompanyInformationSidebar />

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Filter Controls Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="company-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  textTransform: 'lowercase'
                }}>
                  select company
                </label>
                <select 
                  id="company-select"
                  value={selectedCompany} 
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    minWidth: '200px'
                  }}
                >
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="year-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  textTransform: 'lowercase'
                }}>
                  year
                </label>
                <select 
                  id="year-select"
                  value={selectedYear} 
                  onChange={(e) => handleYearChange(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    minWidth: '120px'
                  }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="month-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: '0.9rem', 
                  fontWeight: '500',
                  textTransform: 'lowercase'
                }}>
                  month
                </label>
                <select 
                  id="month-select"
                  value={selectedMonth} 
                  onChange={(e) => handleMonthChange(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    minWidth: '120px'
                  }}
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="table-wrapper">
            <table className="insurance-data-table">
              <thead>
                <tr className="table-header-row">
                  <th className="company-column">Company/InsurerShortName</th>
                  <th className="year-column">2020</th>
                  <th className="year-column">2021</th>
                  <th className="year-column">2022</th>
                  <th className="total-column">Total</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <React.Fragment key={company}>
                    {/* Company Summary Row */}
                    <tr key={`${company}-summary`} className="company-summary-row">
                      <td className="company-name">{getCompanyDisplayName(company)}</td>
                      <td className="year-data">
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2020'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2020'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="year-data">
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2021'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2021'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="year-data">
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2022'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2022'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="total-value">
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['Total'] ? (
                          formatNumber(data[company]['Company Summary']['Total'])
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    
                    {/* Metrics Rows */}
                    {metrics.map(metric => (
                      <tr key={`${company}-${metric}`} className="metric-row">
                        <td className="metric-name">{metric}</td>
                        <td className="year-data">
                          {data[company] && data[company][metric] && data[company][metric]['2020'] ? (
                            typeof data[company][metric]['2020'] === 'object' ? (
                              <span className="year-value">
                                {formatNumber(data[company][metric]['2020']['May-24'] || data[company][metric]['2020']['Jun-24'] || '-')}
                              </span>
                            ) : (
                              <span className="year-value">{formatNumber(data[company][metric]['2020'])}</span>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="year-data">
                          {data[company] && data[company][metric] && data[company][metric]['2021'] ? (
                            typeof data[company][metric]['2021'] === 'object' ? (
                              <span className="year-value">
                                {formatNumber(data[company][metric]['2021']['May-24'] || data[company][metric]['2021']['Jun-24'] || '-')}
                              </span>
                            ) : (
                              <span className="year-value">{formatNumber(data[company][metric]['2021'])}</span>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="year-data">
                          {data[company] && data[company][metric] && data[company][metric]['2022'] ? (
                            typeof data[company][metric]['2022'] === 'object' ? (
                              <span className="year-value">
                                {formatNumber(data[company][metric]['2022']['May-24'] || data[company][metric]['2022']['Jun-24'] || '-')}
                              </span>
                            ) : (
                              <span className="year-value">{formatNumber(data[company][metric]['2022'])}</span>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="total-value">
                          {formatNumber(calculateTotal(company, metric))}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Grand Total Row */}
                <tr className="grand-total-row">
                  <td className="total-label">Total</td>
                  <td className="year-total">
                    {formatNumber(calculateYearTotal('2020'))}
                  </td>
                  <td className="year-total">
                    {formatNumber(calculateYearTotal('2021'))}
                  </td>
                  <td className="year-total">
                    {formatNumber(calculateYearTotal('2022'))}
                  </td>
                  <td className="grand-total">
                    {formatNumber(calculateGrandTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsuranceDataTable; 