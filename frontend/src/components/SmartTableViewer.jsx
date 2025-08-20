import React, { useState, useMemo } from 'react';

const SmartTableViewer = ({ tables, data, filename, jobId, extractionSummary }) => {
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle both 'tables' and 'data' props for backwards compatibility
  const tableData = tables || (data?.tables) || (data?.tabular_results) || (data?.results?.tables) || [];
  
  // Debug logging to understand data structure
  React.useEffect(() => {
    console.log('SmartTableViewer received:', { tables, data, tableData });
  }, [tables, data, tableData]);
  
  // Ensure we have valid table data
  const currentTable = tableData && tableData.length > 0 ? tableData[currentTableIndex] : null;
  
  const filteredData = useMemo(() => {
    if (!currentTable || !currentTable.data || !searchTerm) {
      return currentTable?.data || [];
    }
    
    return currentTable.data.filter(row =>
      row.some(cell => 
        cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [currentTable, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  // Reset page when table changes
  const handleTableChange = (index) => {
    setCurrentTableIndex(index);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const downloadTableCSV = (tableIndex) => {
    const table = tableData[tableIndex];
    if (!table) return;

    const csvContent = [
      table.headers.join(','),
      ...table.data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_table_${tableIndex + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!tableData || tableData.length === 0) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>No Tables Found</h3>
        <p style={{ color: '#adb5bd' }}>The PDF doesn't contain any extractable tables.</p>
      </div>
    );
  }

  const containerStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginTop: '1rem'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#f8f9fa',
    color: '#6c757d',
    border: '1px solid #e9ecef'
  };

  const activeTabStyle = {
    ...primaryButtonStyle,
    margin: '0 4px'
  };

  const inactiveTabStyle = {
    ...secondaryButtonStyle,
    margin: '0 4px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginTop: '1rem'
  };

  const thStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '2px solid #667eea'
  };

  const tdStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #e9ecef',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const paginationStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  };

  const searchStyle = {
    padding: '10px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    minWidth: '250px'
  };

  return (
    <div style={containerStyle}>
      {/* Header with extraction summary */}
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            📊 Extracted Tables
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            {filename} • {tableData.length} table{tableData.length > 1 ? 's' : ''} found
            {extractionSummary && (
              <> • {extractionSummary.pages_processed} pages processed</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {extractionSummary?.accuracy_score && (
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              background: extractionSummary.accuracy_score > 80 
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                : extractionSummary.accuracy_score > 60
                ? 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                : 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)',
              color: 'white'
            }}>
              {extractionSummary.accuracy_score}% Accuracy
            </span>
          )}
          <button
            style={secondaryButtonStyle}
            onClick={() => downloadTableCSV(currentTableIndex)}
            title="Download current table as CSV"
          >
            📥 CSV
          </button>
        </div>
      </div>

      {/* Table Navigation */}
      {tableData.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {tableData.map((table, index) => (
              <button
                key={index}
                style={index === currentTableIndex ? activeTabStyle : inactiveTabStyle}
                onClick={() => handleTableChange(index)}
              >
                {table.title || `Table ${index + 1}`}
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '12px', 
                  opacity: 0.8 
                }}>
                  ({table.data?.length || 0} rows)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <input
          type="text"
          placeholder="Search in table data..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: '10px 16px',
            border: searchTerm ? '2px solid #667eea' : '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s ease',
            minWidth: '250px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#6c757d' }}>Rows per page:</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Display */}
      {currentTable && (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {currentTable.headers?.map((header, index) => (
                  <th key={index} style={thStyle}>
                    {header || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((row, rowIndex) => (
                <tr 
                  key={startIndex + rowIndex}
                  style={{ 
                    backgroundColor: (startIndex + rowIndex) % 2 === 0 ? '#f8f9fa' : 'white'
                  }}
                >
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      style={tdStyle}
                      title={cell || ''}
                    >
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={paginationStyle}>
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} rows
          {searchTerm && (
            <span> (filtered from {currentTable?.data?.length || 0} total)</span>
          )}
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              style={currentPage === 1 ? { ...secondaryButtonStyle, opacity: 0.5 } : secondaryButtonStyle}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              ⏮️
            </button>
            <button
              style={currentPage === 1 ? { ...secondaryButtonStyle, opacity: 0.5 } : secondaryButtonStyle}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ⬅️
            </button>
            
            <span style={{ 
              padding: '8px 16px', 
              fontSize: '14px', 
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              {currentPage} of {totalPages}
            </span>
            
            <button
              style={currentPage === totalPages ? { ...secondaryButtonStyle, opacity: 0.5 } : secondaryButtonStyle}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ➡️
            </button>
            <button
              style={currentPage === totalPages ? { ...secondaryButtonStyle, opacity: 0.5 } : secondaryButtonStyle}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              ⏭️
            </button>
          </div>
        )}
      </div>

      {/* Table metadata */}
      {currentTable?.metadata && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <strong>Table Info:</strong> 
          {currentTable.metadata.page_number && (
            <span> Page {currentTable.metadata.page_number} • </span>
          )}
          {currentTable.metadata.table_type && (
            <span> Type: {currentTable.metadata.table_type} • </span>
          )}
          <span> {currentTable.headers?.length || 0} columns × {currentTable.data?.length || 0} rows</span>
        </div>
      )}
    </div>
  );
};

export default SmartTableViewer;
