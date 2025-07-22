import React, { useState } from 'react';

function DataTable({ columns, data, title, fileType, maxHeight = '600px', showFullData = false }) {
  const [expandedCells, setExpandedCells] = useState(new Set());
  const [showAllRows, setShowAllRows] = useState(showFullData);
  
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
    
    // Handle arrays - display as formatted list
    if (Array.isArray(value)) {
      const arrayString = value.join(', ');
      const isLong = arrayString.length > 100;
      
      return (
        <div>
          <div style={{
            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
            overflow: isExpanded ? 'visible' : 'hidden',
            textOverflow: isExpanded ? 'clip' : 'ellipsis',
            maxWidth: isExpanded ? 'none' : '200px',
            wordBreak: isExpanded ? 'break-word' : 'normal',
            padding: '0.25rem',
            backgroundColor: 'rgba(138, 43, 226, 0.1)',
            borderRadius: '2px',
            border: '1px solid rgba(138, 43, 226, 0.2)'
          }}>
            [{isExpanded ? arrayString : (isLong ? arrayString.slice(0, 100) + '...' : arrayString)}]
          </div>
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
            <strong>� Data Structure:</strong> Complete tabular format with row numbers, column headers, and data type indicators
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
