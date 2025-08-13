/**
 * Utility functions for insurance data handling
 */

/**
 * Formats a number to Indian locale with proper comma separation and two decimal places
 * @param {number|string} value - The value to format
 * @returns {string} Formatted number string or '-' if invalid/empty
 */
export const formatIndianNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Remove existing commas and convert to number
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  
  if (isNaN(numValue)) return value; // Return original value if it's not a valid number after parsing

  // Format to Indian locale with exactly two decimal places
  return numValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Validates insurance data structure
 * @param {Object} data - The data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateInsuranceData = (data) => {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }
  
  const companies = Object.keys(data);
  if (companies.length === 0) {
    errors.push('No companies found in data');
    return { isValid: false, errors };
  }
  
  const requiredMetrics = [
    'First Year Premium',
    'No of Policies / Schemes',
    'No. of lives covered under Group Schemes',
    'Sum Assured'
  ];
  
  const requiredYears = ['2020', '2021', '2022'];
  const requiredMonths = [
    'May-24', 'Jun-24', 'Jul-24', 'Aug-24', 'Sep-24', 'Oct-24', 'Nov-24'
  ];
  
  companies.forEach(company => {
    const companyData = data[company];
    
    if (typeof companyData !== 'object') {
      errors.push(`Company '${company}' data must be an object`);
      return;
    }
    
    requiredMetrics.forEach(metric => {
      if (!companyData[metric]) {
        errors.push(`Missing metric '${metric}' for company '${company}'`);
        return;
      }
      
      const metricData = companyData[metric];
      if (typeof metricData !== 'object') {
        errors.push(`Metric '${metric}' data must be an object for company '${company}'`);
        return;
      }
      
      requiredYears.forEach(year => {
        if (!metricData[year]) {
          errors.push(`Missing year '${year}' for metric '${metric}' in company '${company}'`);
          return;
        }
        
        // Check if 2022 has monthly breakdown
        if (year === '2022') {
          const yearData = metricData[year];
          if (typeof yearData === 'object') {
            requiredMonths.forEach(month => {
              if (!yearData[month]) {
                errors.push(`Missing month '${month}' for year '${year}' in metric '${metric}' for company '${company}'`);
              }
            });
          }
        }
      });
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculates total for a specific metric across all companies
 * @param {Object} data - The insurance data
 * @param {string} metric - The metric to calculate total for
 * @returns {number} Total value
 */
export const calculateMetricTotal = (data, metric) => {
  if (!data || !metric) return 0;
  
  let total = 0;
  Object.keys(data).forEach(company => {
    const companyData = data[company];
    if (companyData && companyData[metric]) {
      total += calculateCompanyMetricTotal(companyData[metric]);
    }
  });
  
  return total;
};

/**
 * Calculates total for a specific metric for a single company
 * @param {Object} metricData - The metric data for a company
 * @returns {number} Total value
 */
export const calculateCompanyMetricTotal = (metricData) => {
  if (!metricData) return 0;
  
  let total = 0;
  const years = ['2020', '2021', '2022'];
  
  years.forEach(year => {
    if (metricData[year]) {
      if (typeof metricData[year] === 'object') {
        // Monthly breakdown for 2022
        Object.values(metricData[year]).forEach(monthValue => {
          const numValue = parseFloat(monthValue.toString().replace(/,/g, '')) || 0;
          total += numValue;
        });
      } else {
        // Yearly value
        const numValue = parseFloat(metricData[year].toString().replace(/,/g, '')) || 0;
        total += numValue;
      }
    }
  });
  
  return total;
};

/**
 * Exports data to CSV format
 * @param {Object} data - The insurance data
 * @param {string} filename - The filename for download
 */
export const exportToCSV = (data, filename = 'insurance_data.csv') => {
  if (!data) return;
  
  const companies = Object.keys(data);
  const metrics = [
    'First Year Premium',
    'No of Policies / Schemes',
    'No. of lives covered under Group Schemes',
    'Sum Assured'
  ];
  const years = ['2020', '2021', '2022'];
  const months = [
    'May-24', 'Jun-24', 'Jul-24', 'Aug-24', 'Sep-24', 'Oct-24', 'Nov-24'
  ];
  
  let csvContent = 'Company,Metric,2020,2021,';
  months.forEach(month => {
    csvContent += `${month},`;
  });
  csvContent += 'Total\n';
  
  companies.forEach(company => {
    metrics.forEach(metric => {
      csvContent += `"${company}","${metric}",`;
      
      years.forEach(year => {
        if (year === '2022') {
          // Monthly breakdown
          months.forEach(month => {
            const value = data[company][metric][year]?.[month] || '';
            csvContent += `"${value}",`;
          });
        } else {
          // Yearly value
          const value = data[company][metric][year] || '';
          csvContent += `"${value}","","","","","","","",`;
        }
      });
      
      // Total
      const total = calculateCompanyMetricTotal(data[company][metric]);
      csvContent += `"${total}"\n`;
    });
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 