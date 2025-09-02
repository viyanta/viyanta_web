import React, { useState, useMemo } from 'react';
import ApiService from '../services/api';

const EnhancedTemplateBasedExtractor = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [aiExtractionResult, setAiExtractionResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await ApiService.getCompanies();
      setCompanies(data.companies || []);
    } catch (error) {
      setError('Failed to load companies');
    }
  };

  const loadFormsForCompany = async (company) => {
    try {
      const data = await ApiService.getCompanyTemplates(company);
      setForms(data.templates || []);
    } catch (error) {
      setError('Failed to load forms for company');
    }
  };

  const handleCompanyChange = (e) => {
    const company = e.target.value;
    setSelectedCompany(company);
    setSelectedForm('');
    setForms([]);
    if (company) {
      loadFormsForCompany(company);
    }
  };

  const handleFormExtraction = async () => {
    if (!selectedForm || !selectedCompany) return;

    setIsExtracting(true);
    setError(null);
    try {
      const data = await ApiService.extractTemplateForm(selectedCompany, selectedForm);
      setExtractionResult(data.data);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      setError(error.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // Enhanced rendering with pagination and search
  const renderEnhancedExtractionResult = () => {
    if (!extractionResult) return null;

    const flatHeaders = extractionResult.FlatHeaders || [];
    const allRows = extractionResult.Rows || [];
    
    // Filter rows based on search term
    const filteredRows = useMemo(() => {
      if (!searchTerm) return allRows;
      return allRows.filter(row => 
        Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }, [allRows, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentRows = filteredRows.slice(startIndex, endIndex);

    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginTop: '1rem'
      }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--main-color)' }}>📊 Extraction Results</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
              📋 Total Rows: {allRows.length}
              {searchTerm && ` (${filteredRows.length} filtered)`}
            </span>
          </div>
        </div>

        {/* Search and Controls */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search in data..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.9rem',
              minWidth: '200px'
            }}
          />
          
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            <option value={10}>10 rows/page</option>
            <option value={25}>25 rows/page</option>
            <option value={50}>50 rows/page</option>
            <option value={100}>100 rows/page</option>
            <option value={allRows.length}>All rows</option>
          </select>
        </div>

        {/* Pagination Info */}
        {totalPages > 1 && (
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-color-light)' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredRows.length)} of {filteredRows.length} rows
            </span>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: currentPage === 1 ? '#f8f9fa' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: currentPage === 1 ? '#f8f9fa' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: currentPage === totalPages ? '#f8f9fa' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: currentPage === totalPages ? '#f8f9fa' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {currentRows.length > 0 ? (
          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ backgroundColor: 'var(--main-color)', color: 'white' }}>
                  {flatHeaders.map((header, index) => (
                    <th key={index} style={{
                      padding: '0.75rem 0.5rem',
                      border: '1px solid var(--border-color)',
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
                {currentRows.map((row, rowIndex) => (
                  <tr key={startIndex + rowIndex} style={{
                    backgroundColor: (startIndex + rowIndex) % 2 === 0 ? 'white' : 'var(--bg-color-light)'
                  }}>
                    {flatHeaders.map((header, colIndex) => (
                      <td key={colIndex} style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
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
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-light)' }}>
            {searchTerm ? 'No rows match your search criteria' : 'No data extracted'}
          </div>
        )}

        {/* Export Options */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              const csvContent = [
                flatHeaders.join(','),
                ...allRows.map(row => flatHeaders.map(header => `"${row[header] || ''}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedCompany}_${selectedForm}_extraction.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--sub-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ color: 'var(--main-color)', marginBottom: '1rem' }}>📋 Enhanced Template-Based Extractor</h2>
      
      {/* Company and Form Selection */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          value={selectedCompany}
          onChange={handleCompanyChange}
          style={{
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            minWidth: '200px'
          }}
        >
          <option value="">Select Company</option>
          {companies.map(company => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>

        <select
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
          disabled={!selectedCompany}
          style={{
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            minWidth: '200px'
          }}
        >
          <option value="">Select Form</option>
          {forms.map(form => (
            <option key={form} value={form}>{form}</option>
          ))}
        </select>

        <button
          onClick={handleFormExtraction}
          disabled={!selectedForm || !selectedCompany || isExtracting}
          style={{
            padding: '0.5rem 1rem',
            background: isExtracting ? '#6c757d' : 'var(--main-color)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isExtracting ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {isExtracting ? '⏳ Extracting...' : '🚀 Extract Data'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          ❌ {error}
        </div>
      )}

      {renderEnhancedExtractionResult()}
    </div>
  );
};

export default EnhancedTemplateBasedExtractor;
