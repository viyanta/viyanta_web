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
      <div className="insurance-table-container" style={{
        padding: 'clamp(15px, 4vw, 20px)',
        textAlign: 'center'
      }}>
        <div className="no-data">
          <h3 style={{
            fontSize: 'clamp(18px, 5vw, 28px)',
            marginBottom: 'clamp(10px, 3vw, 15px)'
          }}>Insurance Data Table</h3>
          <p style={{
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            color: '#666'
          }}>Please provide insurance data to display the table.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insurance-table-container" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>

      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: window.innerWidth <= 768 ? 'flex-start' : 'center',
        gap: 'clamp(0.3rem, 1.5vw, 0.5rem)',
        padding: 'clamp(0.8rem, 2vw, 1rem) 0',
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
        color: '#666',
        borderBottom: 'none',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        paddingLeft: 'clamp(10px, 3vw, 15px)',
        paddingRight: 'clamp(10px, 3vw, 15px)'
      }}>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          fontSize: 'clamp(12px, 3vw, 14px)'
        }}>L Forms</span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          margin: '0 clamp(4px, 1vw, 8px)'
        }}> &gt; </span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          fontSize: 'clamp(12px, 3vw, 14px)'
        }}>{selectedCompany || 'Select Company'}</span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          margin: '0 clamp(4px, 1vw, 8px)'
        }}> &gt; </span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          fontSize: 'clamp(12px, 3vw, 14px)'
        }}>L-4 Premium Schedule</span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          margin: '0 clamp(4px, 1vw, 8px)'
        }}> &gt; </span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          fontSize: 'clamp(12px, 3vw, 14px)'
        }}>Standalone</span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          margin: '0 clamp(4px, 1vw, 8px)'
        }}> &gt; </span>
        <span style={{ 
          color: 'var(--main-color)', 
          fontWeight: '500', 
          cursor: 'pointer',
          fontSize: 'clamp(12px, 3vw, 14px)'
        }}>{selectedMonth}</span>
      </div>

      {/* Main Content with Sidebar */}
      <div style={{ 
        display: 'flex', 
        gap: 'clamp(1rem, 3vw, 2rem)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Company Information Sidebar */}
        <CompanyInformationSidebar />

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filter Controls Section */}
          <div style={{ 
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: 'clamp(1rem, 3vw, 2rem)', 
<<<<<<< HEAD
=======
              // alignItems: 'center',
>>>>>>> e23839e (vikki:the data fetches and display from s3)
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
              alignItems: window.innerWidth <= 768 ? 'stretch' : 'center'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'clamp(0.3rem, 1.5vw, 0.5rem)',
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}>
                <label htmlFor="company-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', 
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
                    padding: 'clamp(0.4rem, 2vw, 0.5rem)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    minWidth: window.innerWidth <= 768 ? '100%' : '200px',
                    width: window.innerWidth <= 768 ? '100%' : 'auto'
                  }}
                >
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'clamp(0.3rem, 1.5vw, 0.5rem)',
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}>
                <label htmlFor="year-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', 
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
                    padding: 'clamp(0.4rem, 2vw, 0.5rem)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    minWidth: window.innerWidth <= 768 ? '100%' : '120px',
                    width: window.innerWidth <= 768 ? '100%' : 'auto'
                  }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'clamp(0.3rem, 1.5vw, 0.5rem)',
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}>
                <label htmlFor="month-select" style={{ 
                  color: 'var(--main-color)', 
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', 
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
                    padding: 'clamp(0.4rem, 2vw, 0.5rem)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    minWidth: window.innerWidth <= 768 ? '100%' : '120px',
                    width: window.innerWidth <= 768 ? '100%' : 'auto'
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
          <div className="table-wrapper" style={{
            overflowX: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'thin'
          }}>
            <table className="insurance-data-table" style={{
              width: '100%',
              minWidth: window.innerWidth <= 768 ? '800px' : '100%',
              fontSize: 'clamp(12px, 3vw, 14px)'
            }}>
              <thead>
                <tr className="table-header-row">
                  <th className="company-column" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minWidth: '200px',
                    whiteSpace: 'nowrap'
                  }}>Company/InsurerShortName</th>
                  <th className="year-column" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minWidth: '120px',
                    whiteSpace: 'nowrap'
                  }}>2020</th>
                  <th className="year-column" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minWidth: '120px',
                    whiteSpace: 'nowrap'
                  }}>2021</th>
                  <th className="year-column" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minWidth: '120px',
                    whiteSpace: 'nowrap'
                  }}>2022</th>
                  <th className="total-column" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minWidth: '120px',
                    whiteSpace: 'nowrap'
                  }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <React.Fragment key={company}>
                    {/* Company Summary Row */}
                    <tr key={`${company}-summary`} className="company-summary-row">
                      <td className="company-name" style={{
                        padding: 'clamp(8px, 2vw, 12px)',
                        fontSize: 'clamp(12px, 3vw, 14px)',
                        fontWeight: '600',
                        wordBreak: 'break-word'
                      }}>{getCompanyDisplayName(company)}</td>
                      <td className="year-data" style={{
                        padding: 'clamp(8px, 2vw, 12px)',
                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                        textAlign: 'right'
                      }}>
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2020'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2020'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="year-data" style={{
                        padding: 'clamp(8px, 2vw, 12px)',
                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                        textAlign: 'right'
                      }}>
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2021'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2021'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="year-data" style={{
                        padding: 'clamp(8px, 2vw, 12px)',
                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                        textAlign: 'right'
                      }}>
                        {data[company] && data[company]['Company Summary'] && data[company]['Company Summary']['2022'] ? (
                          <span className="year-value">{formatNumber(data[company]['Company Summary']['2022'])}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="total-value" style={{
                        padding: 'clamp(8px, 2vw, 12px)',
                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                        textAlign: 'right',
                        fontWeight: '600'
                      }}>
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
                        <td className="metric-name" style={{
                          padding: 'clamp(8px, 2vw, 12px)',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          paddingLeft: 'clamp(20px, 5vw, 30px)',
                          wordBreak: 'break-word'
                        }}>{metric}</td>
                        <td className="year-data" style={{
                          padding: 'clamp(8px, 2vw, 12px)',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          textAlign: 'right'
                        }}>
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
                        <td className="year-data" style={{
                          padding: 'clamp(8px, 2vw, 12px)',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          textAlign: 'right'
                        }}>
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
                        <td className="year-data" style={{
                          padding: 'clamp(8px, 2vw, 12px)',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          textAlign: 'right'
                        }}>
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
                        <td className="total-value" style={{
                          padding: 'clamp(8px, 2vw, 12px)',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>
                          {formatNumber(calculateTotal(company, metric))}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Grand Total Row */}
                <tr className="grand-total-row">
                  <td className="total-label" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    fontWeight: '700',
                    backgroundColor: '#f8f9fa'
                  }}>Total</td>
                  <td className="year-total" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {formatNumber(calculateYearTotal('2020'))}
                  </td>
                  <td className="year-total" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {formatNumber(calculateYearTotal('2021'))}
                  </td>
                  <td className="year-total" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    textAlign: 'right',
                    fontWeight: '600',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {formatNumber(calculateYearTotal('2022'))}
                  </td>
                  <td className="grand-total" style={{
                    padding: 'clamp(10px, 2.5vw, 15px)',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    textAlign: 'right',
                    fontWeight: '700',
                    backgroundColor: '#f8f9fa'
                  }}>
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