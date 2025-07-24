import React, { useState } from 'react';

function DataTable({ columns, data, title, fileType, maxHeight = '600px', showFullData = false, complexTable = null }) {
  const [expandedCells, setExpandedCells] = useState(new Set());
  const [showAllRows, setShowAllRows] = useState(showFullData);
  
  // Auto-detect complex table structure from data
  const detectComplexTable = (data, columns) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    // Check if data contains complex table patterns
    const firstRow = data[0];
    const hasComplexStructure = Object.values(firstRow).some(value => {
      if (typeof value === 'string') {
        return value.includes('Form L-') || 
               value.includes('Revenue Account') || 
               value.includes('Policyholders') ||
               value.includes('Registration Number') ||
               (value.length > 500 && value.includes('\n')) ||
               /\d+,\d+/.test(value); // Contains formatted numbers
      }
      return false;
    });
    
    if (hasComplexStructure) {
      // Find the cell with the complex table data
      for (const [key, value] of Object.entries(firstRow)) {
        if (typeof value === 'string' && value.length > 200) {
          return value;
        }
      }
    }
    
    return null;
  };
  
  // Auto-detect complex table
  const autoDetectedComplexTable = !complexTable ? detectComplexTable(data, columns) : null;
  const finalComplexTable = complexTable || autoDetectedComplexTable;
  
  // Function to render complex table structures
  const renderComplexTable = (tableData, options) => {
    const { title, fileType, maxHeight, showFullData } = options;
    
    // Parse complex table structure
    const parseTableStructure = (rawData) => {
      if (typeof rawData === 'string') {
        // Parse string data into structured format
        const lines = rawData.split('\n').filter(line => line.trim());
        const structure = {
          headers: [],
          subHeaders: [],
          rows: [],
          documentInfo: []
        };
        
        let parsingState = 'header';
        
        lines.forEach((line, idx) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return;
          
          // Document information (first few lines)
          if (idx < 6 && (
            trimmedLine.includes('Form L-') || 
            trimmedLine.includes('Name of') || 
            trimmedLine.includes('Registration') ||
            trimmedLine.includes('REVENUE ACCOUNT') ||
            trimmedLine.includes('Policyholders')
          )) {
            structure.documentInfo.push(trimmedLine);
            return;
          }
          
          // Detect main column headers with specific patterns
          if (trimmedLine.includes('Particulars') && trimmedLine.includes('Schedule')) {
            parsingState = 'mainHeaders';
            // Parse main headers - split by multiple spaces or tabs
            const headerMatches = trimmedLine.match(/(?:Particulars|Schedule[^,]*|Linked Business[^,]*|Non-Linked Business[^,]*|GRAND TOTAL)/g);
            if (headerMatches) {
              structure.headers = headerMatches;
            } else {
              // Fallback parsing
              const parts = trimmedLine.split(/\s{3,}|\t+/).filter(part => part.trim());
              structure.headers = parts;
            }
            return;
          }
          
          // Start parsing data rows
          if (trimmedLine.includes('Premiums earned') || 
              trimmedLine.includes('Income from investments') ||
              trimmedLine.includes('Benefits paid') ||
              /^[a-zA-Z].*\d/.test(trimmedLine)) {
            parsingState = 'data';
          }
          
          // Parse data rows
          if (parsingState === 'data') {
            // Split by multiple spaces or tabs, keeping the structure
            const dataParts = trimmedLine.split(/\s{2,}|\t+/).filter(part => part.trim());
            
            // Clean up and format numeric values
            const cleanedParts = dataParts.map(part => {
              const cleaned = part.trim();
              // Format numbers with proper spacing
              if (/^[\d,.\-\(\)\s]+$/.test(cleaned) && cleaned !== '') {
                return cleaned.replace(/\s+/g, ' ');
              }
              return cleaned;
            });
            
            if (cleanedParts.length > 1) {
              structure.rows.push(cleanedParts);
            }
          }
        });
        
        // If no headers detected, create generic ones
        if (structure.headers.length === 0 && structure.rows.length > 0) {
          const maxCols = Math.max(...structure.rows.map(row => row.length));
          structure.headers = Array.from({ length: maxCols }, (_, i) => 
            i === 0 ? 'Description' : `Column ${i + 1}`
          );
        }
        
        return structure;
      }
      
      return tableData;
    };
    
    const tableStructure = parseTableStructure(tableData);
    
    return (
      <div style={{ marginBottom: '1.5rem', width: '100%' }}>
        {/* Document Header */}
        {tableStructure.documentInfo && tableStructure.documentInfo.length > 0 && (
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--background-color)',
            borderRadius: 'var(--border-radius)',
            border: '2px solid var(--main-color)',
            borderLeft: '6px solid var(--main-color)'
          }}>
            {tableStructure.documentInfo.map((info, idx) => (
              <div key={idx} style={{
                fontSize: idx === 0 ? '1.1em' : '0.9em',
                fontWeight: idx === 0 ? 'bold' : 'normal',
                color: idx === 0 ? 'var(--main-color)' : 'var(--text-color)',
                marginBottom: '0.25rem'
              }}>
                {info}
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Header */}
        {title && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '1rem',
            backgroundColor: 'var(--background-color)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏦</span>
                <h4 style={{ margin: 0, color: 'var(--main-color)' }}>{title}</h4>
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'white',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--sub-color)',
                borderRadius: 'var(--border-radius)'
              }}>
                Complex Financial Table
              </div>
            </div>
          </div>
        )}
        
        {/* Complex Table Container */}
        <div style={{ 
          border: '2px solid #e9ecef',
          borderRadius: 'var(--border-radius)',
          overflow: 'auto',
          maxHeight: maxHeight,
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}>
          <div style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxWidth: '100%',
            position: 'relative'
          }}>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse', 
              fontSize: '0.8rem',
              tableLayout: 'fixed',
              minWidth: '1400px'
            }}>
              {/* Multi-level Headers */}
              <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                {/* Main Headers */}
                <tr style={{ 
                  backgroundColor: 'var(--main-color)', 
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <th style={{ 
                    padding: '0.8rem 0.5rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    minWidth: '250px',
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    fontSize: '0.85em',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--main-color)',
                    zIndex: 101
                  }}>
                    Particulars
                  </th>
                  <th style={{ 
                    padding: '0.8rem 0.5rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    minWidth: '100px',
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.85em'
                  }}>
                    Schedule
                  </th>
                  <th colSpan="5" style={{ 
                    padding: '0.8rem 0.5rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    fontSize: '0.85em',
                    backgroundColor: 'rgba(138, 43, 226, 0.8)'
                  }}>
                    Linked Business
                  </th>
                  <th colSpan="12" style={{ 
                    padding: '0.8rem 0.5rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    fontSize: '0.85em',
                    backgroundColor: 'rgba(255, 140, 0, 0.8)'
                  }}>
                    Non-Linked Business
                  </th>
                  <th style={{ 
                    padding: '0.8rem 0.5rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    minWidth: '120px',
                    fontSize: '0.85em',
                    backgroundColor: 'rgba(40, 167, 69, 0.8)'
                  }}>
                    GRAND TOTAL
                  </th>
                </tr>
                
                {/* Sub Headers Row 1 */}
                <tr style={{ 
                  backgroundColor: 'var(--sub-color)', 
                  color: 'white'
                }}>
                  <th style={{ 
                    padding: '0.6rem 0.4rem', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    fontSize: '0.75em',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--sub-color)',
                    zIndex: 101
                  }}>
                    Description
                  </th>
                  <th style={{ 
                    padding: '0.6rem 0.4rem', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.75em'
                  }}>
                    Code
                  </th>
                  {/* Linked Business Sub-headers */}
                  {['LIFE', 'PENSION', 'HEALTH', 'VAR. INS', 'TOTAL'].map((header, idx) => (
                    <th key={`linked-${idx}`} style={{ 
                      padding: '0.6rem 0.4rem', 
                      textAlign: 'center', 
                      fontWeight: 500,
                      borderRight: idx === 4 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.2)',
                      fontSize: '0.75em',
                      minWidth: '90px',
                      backgroundColor: 'rgba(138, 43, 226, 0.7)'
                    }}>
                      {header}
                    </th>
                  ))}
                  
                  {/* Non-Linked Business - Participating */}
                  <th colSpan="6" style={{ 
                    padding: '0.6rem 0.4rem', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.75em',
                    backgroundColor: 'rgba(255, 140, 0, 0.7)'
                  }}>
                    PARTICIPATING
                  </th>
                  
                  {/* Non-Linked Business - Non-Participating */}
                  <th colSpan="6" style={{ 
                    padding: '0.6rem 0.4rem', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    fontSize: '0.75em',
                    backgroundColor: 'rgba(255, 140, 0, 0.7)'
                  }}>
                    NON-PARTICIPATING
                  </th>
                  
                  <th style={{ 
                    padding: '0.6rem 0.4rem', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    fontSize: '0.75em',
                    backgroundColor: 'rgba(40, 167, 69, 0.7)'
                  }}>
                    Amount
                  </th>
                </tr>
                
                {/* Sub Headers Row 2 - Detailed Categories */}
                <tr style={{ 
                  backgroundColor: 'rgba(108, 117, 125, 0.8)', 
                  color: 'white',
                  fontSize: '0.7em'
                }}>
                  <th style={{ 
                    padding: '0.5rem 0.3rem', 
                    textAlign: 'center', 
                    fontWeight: 400,
                    borderRight: '2px solid rgba(255,255,255,0.3)',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    zIndex: 101
                  }}></th>
                  <th style={{ 
                    padding: '0.5rem 0.3rem', 
                    textAlign: 'center', 
                    fontWeight: 400,
                    borderRight: '1px solid rgba(255,255,255,0.2)'
                  }}></th>
                  
                  {/* Linked Business empty cells */}
                  {Array(5).fill(0).map((_, idx) => (
                    <th key={`linked-empty-${idx}`} style={{ 
                      padding: '0.5rem 0.3rem', 
                      borderRight: idx === 4 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.2)',
                      minWidth: '80px'
                    }}></th>
                  ))}
                  
                  {/* Participating categories */}
                  {['LIFE', 'ANNUITY', 'PENSION', 'HEALTH', 'VAR.INS', 'TOTAL'].map((cat, idx) => (
                    <th key={`part-${idx}`} style={{ 
                      padding: '0.5rem 0.3rem', 
                      textAlign: 'center', 
                      fontWeight: 400,
                      borderRight: '1px solid rgba(255,255,255,0.2)',
                      minWidth: '80px'
                    }}>
                      {cat}
                    </th>
                  ))}
                  
                  {/* Non-Participating categories */}
                  {['LIFE', 'ANNUITY', 'PENSION', 'HEALTH', 'VAR.INS', 'TOTAL'].map((cat, idx) => (
                    <th key={`non-part-${idx}`} style={{ 
                      padding: '0.5rem 0.3rem', 
                      textAlign: 'center', 
                      fontWeight: 400,
                      borderRight: idx === 5 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.2)',
                      minWidth: '80px'
                    }}>
                      {cat}
                    </th>
                  ))}
                  
                  <th style={{ 
                    padding: '0.5rem 0.3rem', 
                    textAlign: 'center', 
                    fontWeight: 400
                  }}></th>
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody>
                {tableStructure.rows && tableStructure.rows.map((row, rowIdx) => {
                  // Ensure row has enough cells to match the complex header structure
                  const paddedRow = [...row];
                  const expectedColumns = 20; // 2 + 5 (linked) + 12 (non-linked) + 1 (total)
                  while (paddedRow.length < expectedColumns) {
                    paddedRow.push('');
                  }
                  
                  return (
                    <tr 
                      key={rowIdx} 
                      style={{ 
                        borderBottom: '1px solid #e9ecef',
                        backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f8f9fa'
                      }}
                    >
                      {paddedRow.slice(0, expectedColumns).map((cell, cellIdx) => {
                        const isNumeric = /^[\d,.\-\(\)\s]+$/.test(cell) && cell.trim() !== '';
                        const isFirstColumn = cellIdx === 0;
                        const isScheduleColumn = cellIdx === 1;
                        const isLinkedBusiness = cellIdx >= 2 && cellIdx <= 6;
                        const isParticipating = cellIdx >= 7 && cellIdx <= 12;
                        const isNonParticipating = cellIdx >= 13 && cellIdx <= 18;
                        const isGrandTotal = cellIdx === 19;
                        
                        // Determine styling based on column type
                        let columnStyle = {
                          padding: '0.6rem 0.4rem',
                          borderRight: '1px solid #e9ecef',
                          fontSize: '0.8em',
                          verticalAlign: 'middle'
                        };
                        
                        if (isFirstColumn) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'left',
                            fontWeight: '500',
                            backgroundColor: rowIdx % 2 === 0 ? '#f8f9fa' : '#e9ecef',
                            borderRight: '2px solid #dee2e6',
                            minWidth: '250px',
                            maxWidth: '300px',
                            position: 'sticky',
                            left: 0,
                            zIndex: 10
                          };
                        } else if (isScheduleColumn) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontSize: '0.75em',
                            backgroundColor: 'rgba(108, 117, 125, 0.05)',
                            borderRight: '1px solid #dee2e6'
                          };
                        } else if (isLinkedBusiness) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(138, 43, 226, 0.03)',
                            borderRight: cellIdx === 6 ? '2px solid rgba(138, 43, 226, 0.3)' : '1px solid rgba(138, 43, 226, 0.1)'
                          };
                        } else if (isParticipating) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(255, 140, 0, 0.03)',
                            borderRight: '1px solid rgba(255, 140, 0, 0.1)'
                          };
                        } else if (isNonParticipating) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(255, 140, 0, 0.05)',
                            borderRight: cellIdx === 18 ? '2px solid rgba(255, 140, 0, 0.3)' : '1px solid rgba(255, 140, 0, 0.1)'
                          };
                        } else if (isGrandTotal) {
                          columnStyle = {
                            ...columnStyle,
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderRight: 'none',
                            color: 'var(--success-color)'
                          };
                        }
                        
                        return (
                          <td key={cellIdx} style={columnStyle}>
                            {isNumeric && cell.trim() ? (
                              <span style={{
                                padding: '0.2rem 0.4rem',
                                backgroundColor: cell.includes('(') ? 'rgba(220, 53, 69, 0.1)' : 
                                                 isGrandTotal ? 'rgba(40, 167, 69, 0.2)' : 'rgba(40, 167, 69, 0.05)',
                                borderRadius: '3px',
                                border: `1px solid ${cell.includes('(') ? 'rgba(220, 53, 69, 0.2)' : 
                                                      isGrandTotal ? 'rgba(40, 167, 69, 0.3)' : 'rgba(40, 167, 69, 0.1)'}`,
                                fontWeight: isGrandTotal ? 'bold' : 'normal',
                                display: 'inline-block',
                                minWidth: '60px',
                                textAlign: 'right'
                              }}>
                                {cell.trim()}
                              </span>
                            ) : (
                              <span style={{
                                wordBreak: isFirstColumn ? 'break-word' : 'normal',
                                whiteSpace: isFirstColumn ? 'normal' : 'nowrap'
                              }}>
                                {cell || (isNumeric ? '-' : '')}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Footer with Table Information */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--background-color)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid #e9ecef',
          fontSize: '0.8rem',
          color: 'var(--text-color-light)'
        }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <span>📊 <strong>{tableStructure.rows ? tableStructure.rows.length : 0}</strong> data rows</span>
            <span>🗂️ <strong>{tableStructure.headers ? tableStructure.headers.length : 0}</strong> main columns</span>
            <span>📋 <strong>Complex Structure</strong> with multi-level headers</span>
            <span>💰 <strong>Financial Data</strong> with numeric formatting</span>
          </div>
        </div>
      </div>
    );
  };

  // Handle complex table structures (like financial statements)
  if (finalComplexTable) {
    return renderComplexTable(finalComplexTable, { title, fileType, maxHeight, showFullData });
  }
  
  if (!columns || columns.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-color-light)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
        <p>No columns available</p>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-color-light)',
        border: '2px dashed #e9ecef',
        borderRadius: 'var(--border-radius)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
        <p>No data available</p>
      </div>
    );
  }

  // Display all data when showFullData is true, otherwise limit to reasonable number
  const displayData = showAllRows ? data : data.slice(0, 50);
  const hasMoreData = data.length > 50;

  const toggleCellExpansion = (rowIdx, colIdx) => {
    const cellKey = `${rowIdx}-${colIdx}`;
    const newExpanded = new Set(expandedCells);
    if (newExpanded.has(cellKey)) {
      newExpanded.delete(cellKey);
    } else {
      newExpanded.add(cellKey);
    }
    setExpandedCells(newExpanded);
  };

  const formatCellContent = (value, rowIdx, colIdx) => {
    const cellKey = `${rowIdx}-${colIdx}`;
    const isExpanded = expandedCells.has(cellKey);
    
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return <span style={{ color: 'var(--text-color-light)', fontStyle: 'italic' }}>null</span>;
    }
    
    // Handle arrays - display as formatted table
    if (Array.isArray(value)) {
      const isLong = value.length > 5;
      const displayItems = isExpanded ? value : value.slice(0, 5);
      
      return (
        <div>
          <div style={{
            border: '1px solid rgba(138, 43, 226, 0.3)',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'rgba(138, 43, 226, 0.05)'
          }}>
            {/* Array Header */}
            <div style={{
              backgroundColor: 'rgba(138, 43, 226, 0.1)',
              padding: '0.5rem',
              borderBottom: '1px solid rgba(138, 43, 226, 0.2)',
              fontSize: '0.8em',
              fontWeight: 'bold',
              color: 'var(--main-color)'
            }}>
              Array ({value.length} items)
            </div>
            
            {/* Array Table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85em'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(138, 43, 226, 0.08)' }}>
                  <th style={{
                    padding: '0.4rem 0.6rem',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(138, 43, 226, 0.2)',
                    fontWeight: '600',
                    fontSize: '0.75em',
                    color: 'var(--text-color)',
                    width: '60px'
                  }}>
                    Index
                  </th>
                  <th style={{
                    padding: '0.4rem 0.6rem',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(138, 43, 226, 0.2)',
                    fontWeight: '600',
                    fontSize: '0.75em',
                    color: 'var(--text-color)'
                  }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => (
                  <tr key={idx} style={{
                    borderBottom: idx < displayItems.length - 1 ? '1px solid rgba(138, 43, 226, 0.1)' : 'none'
                  }}>
                    <td style={{
                      padding: '0.4rem 0.6rem',
                      textAlign: 'center',
                      backgroundColor: 'rgba(138, 43, 226, 0.05)',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                      fontWeight: 'bold',
                      color: 'var(--sub-color)',
                      borderRight: '1px solid rgba(138, 43, 226, 0.1)'
                    }}>
                      {idx}
                    </td>
                    <td style={{
                      padding: '0.4rem 0.6rem',
                      wordBreak: 'break-word',
                      maxWidth: '200px'
                    }}>
                      <span style={{
                        padding: '0.2rem 0.4rem',
                        backgroundColor: 'white',
                        border: '1px solid rgba(138, 43, 226, 0.2)',
                        borderRadius: '2px',
                        fontSize: '0.85em'
                      }}>
                        {typeof item === 'string' ? `"${item}"` : String(item)}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {/* Show "..." row if collapsed and there are more items */}
                {!isExpanded && isLong && (
                  <tr>
                    <td colSpan="2" style={{
                      padding: '0.4rem 0.6rem',
                      textAlign: 'center',
                      fontStyle: 'italic',
                      color: 'var(--text-color-light)',
                      backgroundColor: 'rgba(138, 43, 226, 0.03)'
                    }}>
                      ... and {value.length - 5} more items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Expand/Collapse Button */}
          {isLong && (
            <button
              onClick={() => toggleCellExpansion(rowIdx, colIdx)}
              style={{
                fontSize: '0.75em',
                padding: '0.4rem 0.8rem',
                margin: '0.5rem 0 0 0',
                border: '1px solid rgba(138, 43, 226, 0.4)',
                backgroundColor: isExpanded ? 'rgba(138, 43, 226, 0.1)' : 'white',
                color: 'rgba(138, 43, 226, 0.8)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(138, 43, 226, 0.15)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = isExpanded ? 'rgba(138, 43, 226, 0.1)' : 'white';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>{isExpanded ? '📋' : '📊'}</span>
              {isExpanded ? `Collapse (showing all ${value.length})` : `Expand (${value.length - 5} more)`}
            </button>
          )}
        </div>
      );
    }
    
    // Handle objects - display as formatted JSON
    if (typeof value === 'object') {
      const jsonString = JSON.stringify(value, null, 2);
      const isLong = jsonString.length > 100;
      
      return (
        <div>
          <pre style={{ 
            margin: 0, 
            fontSize: '0.8em', 
            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
            wordBreak: isExpanded ? 'break-word' : 'normal',
            overflow: isExpanded ? 'visible' : 'hidden',
            textOverflow: isExpanded ? 'clip' : 'ellipsis',
            maxWidth: isExpanded ? 'none' : '200px',
            padding: '0.25rem',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderRadius: '2px',
            border: '1px solid rgba(0, 123, 255, 0.2)'
          }}>
            {isExpanded ? jsonString : jsonString.slice(0, 100) + (isLong ? '...' : '')}
          </pre>
          {isLong && (
            <button
              onClick={() => toggleCellExpansion(rowIdx, colIdx)}
              style={{
                fontSize: '0.7em',
                padding: '2px 6px',
                margin: '4px 0 0 0',
                border: '1px solid var(--main-color)',
                backgroundColor: 'transparent',
                color: 'var(--main-color)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      );
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.8em',
          fontWeight: 'bold',
          backgroundColor: value ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
          color: value ? 'var(--success-color)' : 'var(--error-color)',
          border: `1px solid ${value ? 'var(--success-color)' : 'var(--error-color)'}20`
        }}>
          {value ? '✅ True' : '❌ False'}
        </span>
      );
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return (
        <span style={{
          fontFamily: 'monospace',
          padding: '0.25rem',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '2px',
          border: '1px solid rgba(255, 193, 7, 0.2)'
        }}>
          {value.toLocaleString()}
        </span>
      );
    }
    
    // Handle string values (including long text, URLs, emails, etc.)
    const stringValue = String(value);
    const isLongText = stringValue.length > 150;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue);
    const isUrl = /^https?:\/\//.test(stringValue);
    const isPhone = /^\+?[\d\s\-\(\)]+$/.test(stringValue) && stringValue.length > 8;
    const isDate = !isNaN(Date.parse(stringValue)) && stringValue.includes('-');
    
    // Style based on content type
    let contentStyle = {};
    if (isEmail) {
      contentStyle = {
        color: 'var(--info-color)',
        textDecoration: 'underline',
        cursor: 'pointer'
      };
    } else if (isUrl) {
      contentStyle = {
        color: 'var(--sub-color)',
        textDecoration: 'underline',
        cursor: 'pointer'
      };
    } else if (isPhone) {
      contentStyle = {
        fontFamily: 'monospace',
        color: 'var(--warning-color)'
      };
    } else if (isDate) {
      contentStyle = {
        fontFamily: 'monospace',
        color: 'var(--success-color)',
        fontWeight: '500'
      };
    }
    
    if (isLongText) {
      return (
        <div>
          <div style={{
            ...contentStyle,
            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
            overflow: isExpanded ? 'visible' : 'hidden',
            textOverflow: isExpanded ? 'clip' : 'ellipsis',
            maxWidth: isExpanded ? 'none' : '200px',
            wordBreak: isExpanded ? 'break-word' : 'normal',
            padding: '0.25rem',
            backgroundColor: 'rgba(108, 117, 125, 0.1)',
            borderRadius: '2px',
            border: '1px solid rgba(108, 117, 125, 0.2)'
          }}>
            {isExpanded ? stringValue : stringValue.slice(0, 150) + '...'}
          </div>
          <button
            onClick={() => toggleCellExpansion(rowIdx, colIdx)}
            style={{
              fontSize: '0.7em',
              padding: '2px 6px',
              margin: '4px 0 0 0',
              border: '1px solid var(--main-color)',
              backgroundColor: 'transparent',
              color: 'var(--main-color)',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      );
    }
    
    // Regular string value with type-specific styling
    return (
      <span style={{
        ...contentStyle,
        padding: '0.25rem',
        borderRadius: '2px'
      }}>
        {stringValue}
      </span>
    );
  };

  const getFileTypeIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'json': return '📋';
      case 'csv': return '📊';
      case 'parquet': return '📦';
      default: return '📁';
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
      {/* Enhanced Header with Data Controls */}
      {title && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem',
          backgroundColor: 'var(--background-color)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getFileTypeIcon(fileType)}</span>
              <h4 style={{ margin: 0, color: 'var(--main-color)' }}>{title}</h4>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {hasMoreData && !showAllRows && (
                <button
                  onClick={() => setShowAllRows(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--main-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  📋 Show All {data.length} Rows
                </button>
              )}
              {showAllRows && hasMoreData && (
                <button
                  onClick={() => setShowAllRows(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--sub-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  📊 Show Preview (50 rows)
                </button>
              )}
            </div>
          </div>
          <div style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-color-light)',
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <span><strong>Total Rows:</strong> {data.length.toLocaleString()}</span>
            <span><strong>Columns:</strong> {columns.length}</span>
            <span><strong>Showing:</strong> {displayData.length.toLocaleString()} rows</span>
            <span><strong>File Type:</strong> {fileType?.toUpperCase() || 'Unknown'}</span>
          </div>
        </div>
      )}
      
      {/* Comprehensive Table Container */}
      <div style={{ 
        border: '2px solid #e9ecef',
        borderRadius: 'var(--border-radius)',
        overflow: 'auto',
        maxHeight: showAllRows ? 'none' : maxHeight,
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse', 
          fontSize: '0.875rem',
          tableLayout: 'auto'
        }}>
          {/* Enhanced Header */}
          <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
            <tr style={{ 
              backgroundColor: 'var(--main-color)', 
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <th style={{
                padding: '1rem 0.75rem',
                textAlign: 'center',
                fontWeight: 600,
                minWidth: '60px',
                borderRight: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'var(--sub-color)'
              }}>
                #
              </th>
              {columns.map((col, idx) => (
                <th key={idx} style={{ 
                  padding: '1rem 0.75rem', 
                  textAlign: 'left', 
                  fontWeight: 600,
                  minWidth: '150px',
                  borderRight: '1px solid rgba(255,255,255,0.2)',
                  whiteSpace: 'nowrap',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{col}</span>
                    <span style={{ 
                      fontSize: '0.7em', 
                      opacity: 0.8,
                      padding: '2px 6px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: '10px'
                    }}>
                      Col {idx + 1}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {/* Enhanced Body with All Data */}
          <tbody>
            {displayData.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                style={{ 
                  borderBottom: '1px solid #e9ecef',
                  backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f8f9fa',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.transform = 'scale(1.001)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = rowIdx % 2 === 0 ? 'white' : '#f8f9fa';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Row Number Column */}
                <td style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: rowIdx % 2 === 0 ? '#f8f9fa' : '#e9ecef',
                  borderRight: '2px solid #dee2e6',
                  color: 'var(--sub-color)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 10,
                  minWidth: '60px'
                }}>
                  {rowIdx + 1}
                </td>
                
                {/* Data Columns */}
                {columns.map((col, colIdx) => {
                  const cellValue = row[col];
                  const hasContent = cellValue !== null && cellValue !== undefined && cellValue !== '';
                  
                  return (
                    <td key={colIdx} style={{ 
                      padding: '0.75rem',
                      minWidth: '150px',
                      maxWidth: '400px',
                      borderRight: '1px solid #e9ecef',
                      verticalAlign: 'top',
                      position: 'relative',
                      backgroundColor: hasContent ? 'transparent' : 'rgba(248, 249, 250, 0.8)'
                    }}>
                      <div style={{
                        minHeight: '20px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        {/* Cell Content with Enhanced Formatting */}
                        <div style={{ flex: 1 }}>
                          {formatCellContent(cellValue, rowIdx, colIdx)}
                        </div>
                        
                        {/* Data Type Indicator */}
                        <div style={{
                          fontSize: '0.6em',
                          color: 'var(--text-color-light)',
                          fontStyle: 'italic',
                          opacity: 0.7
                        }}>
                          {cellValue === null || cellValue === undefined ? 'null' :
                           Array.isArray(cellValue) ? 'array' :
                           typeof cellValue === 'object' ? 'object' :
                           typeof cellValue === 'boolean' ? 'boolean' :
                           typeof cellValue === 'number' ? 'number' :
                           'string'}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Enhanced Footer with Comprehensive Information */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--background-color)',
        borderRadius: 'var(--border-radius)',
        border: '1px solid #e9ecef'
      }}>
        {/* Main Stats Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem' }}>
              📊 <strong>{displayData.length.toLocaleString()}</strong> rows displayed
            </span>
            <span style={{ fontSize: '0.9rem' }}>
              📋 <strong>{data.length.toLocaleString()}</strong> total rows
            </span>
            <span style={{ fontSize: '0.9rem' }}>
              🗂️ <strong>{columns.length}</strong> columns
            </span>
            <span style={{ fontSize: '0.9rem' }}>
              📁 File Type: <strong>{fileType?.toUpperCase() || 'Unknown'}</strong>
            </span>
          </div>
          {!showAllRows && hasMoreData && (
            <div style={{ color: 'var(--warning-color)', fontSize: '0.8rem' }}>
              ⚠️ Showing preview only - {data.length - displayData.length} more rows available
            </div>
          )}
        </div>
        
        {/* Feature Description Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          fontSize: '0.75rem', 
          color: 'var(--text-color-light)' 
        }}>
          <div>
            <strong>📊 Data Structure:</strong> Complete tabular format with row numbers, column headers, and data type indicators
          </div>
          <div>
            <strong>🔍 Interactive Features:</strong> Expandable content, hover effects, and data type recognition
          </div>
          <div>
            <strong>📊 Content Support:</strong> JSON objects, arrays, text, numbers, booleans, dates, emails, URLs
          </div>
          <div>
            <strong>⚡ Performance:</strong> Optimized rendering with scroll controls and progressive loading
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
