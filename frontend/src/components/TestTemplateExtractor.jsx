import React, { useState, useEffect } from 'react';

const TestTemplateExtractor = () => {
  const [testData, setTestData] = useState(null);

  useEffect(() => {
    // Create test data with 148 rows
    const createTestData = () => {
      const headers = [
        'Particulars', 'Schedule', 'Unit_Linked_Life', 'Unit_Linked_Pension', 
        'Unit_Linked_Total', 'Participating_Life', 'Participating_Pension', 
        'Participating_Var_Ins', 'Participating_Total', 'Non_Participating_Life',
        'Non_Participating_Annuity', 'Non_Participating_Pension', 
        'Non_Participating_Health', 'Non_Participating_Var_Ins', 
        'Non_Participating_Total', 'Grand_Total'
      ];

      const rows = [];
      for (let i = 1; i <= 148; i++) {
        const row = {};
        headers.forEach((header, index) => {
          if (index === 0) {
            row[header] = `Test Row ${i}`;
          } else if (index === 1) {
            row[header] = `S${i}`;
          } else {
            row[header] = `${i * 1000}`;
          }
        });
        rows.push(row);
      }

      return {
        Form: 'L-1-A-REVENUE',
        Title: 'REVENUE ACCOUNT FOR THE QUARTER ENDED MARCH 31, 2023',
        Period: 'Quarter ended March 31, 2023',
        PagesUsed: '3-6',
        Currency: 'Rs in Lakhs',
        TotalRows: 148,
        FlatHeaders: headers,
        Rows: rows
      };
    };

    setTestData(createTestData());
  }, []);

  if (!testData) return <div>Loading test data...</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ color: '#007bff', marginBottom: '1rem' }}>🧪 Test Template Extractor - 148 Rows</h2>
      
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginTop: '1rem'
      }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#007bff' }}>📊 Test Results</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              📋 Total Rows: {testData.TotalRows}
            </span>
          </div>
        </div>

        <div style={{ 
          overflowX: 'auto', 
          overflowY: 'auto', 
          maxHeight: '70vh',
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem'
          }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                {testData.FlatHeaders.map((header, index) => (
                  <th key={index} style={{
                    padding: '0.75rem 0.5rem',
                    border: '1px solid #dee2e6',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testData.Rows.map((row, rowIndex) => (
                <tr key={rowIndex} style={{
                  backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f8f9fa'
                }}>
                  {testData.FlatHeaders.map((header, colIndex) => (
                    <td key={colIndex} style={{
                      padding: '0.5rem',
                      border: '1px solid #dee2e6',
                      fontSize: '0.75rem',
                      textAlign: colIndex === 0 ? 'left' : 'right',
                      whiteSpace: 'nowrap'
                    }}>
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: '#e9ecef', borderRadius: '8px' }}>
          <h4>✅ Test Results:</h4>
          <ul>
            <li>Total Rows: {testData.Rows.length}</li>
            <li>Headers: {testData.FlatHeaders.length}</li>
            <li>Container has maxHeight: 70vh</li>
            <li>Container has overflowY: auto</li>
            <li>Table has sticky header</li>
            <li>All 148 rows should be visible and scrollable</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestTemplateExtractor;
