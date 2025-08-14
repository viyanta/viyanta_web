import React, { useState } from 'react';
import SmartTableViewer from './SmartTableViewer';

const BulkResultsViewer = ({ jobResults, jobId }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // Debug logging to see what data we're receiving
  console.log('BulkResultsViewer received jobResults:', jobResults);
  console.log('BulkResultsViewer received jobId:', jobId);

  if (!jobResults || !jobResults.summary) {
    console.log('No jobResults or summary found');
    return (
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Loading Results</h3>
        <p style={{ color: '#adb5bd' }}>Please wait while we load the extraction results...</p>
      </div>
    );
  }

  const summary = jobResults.summary;
  const filesWithTables = summary.files_with_tables || [];
  
  console.log('Summary:', summary);
  console.log('Files with tables:', filesWithTables);

  const containerStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginTop: '1rem'
  };

  const headerStyle = {
    marginBottom: '2rem',
    textAlign: 'center'
  };

  const tabStyle = {
    padding: '10px 20px',
    margin: '0 4px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    background: 'white'
  };

  const activeTabStyle = {
    ...tabStyle,
    background: 'var(--sub-color)',
    color: 'white',
    borderColor: 'var(--sub-color)'
  };

  const fileButtonStyle = {
    padding: '12px 16px',
    margin: '4px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    background: 'white',
    display: 'block',
    width: '100%',
    textAlign: 'left'
  };

  const activeFileButtonStyle = {
    ...fileButtonStyle,
    background: 'var(--main-color)',
    color: 'white',
    border: '2px solid var(--main-color)'
  };

  const statsCardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--main-color)' }}>
          📊 Bulk Extraction Results
        </h2>
        <p style={{ margin: 0, color: '#6c757d' }}>
          Job ID: {jobId} • {summary.total_files_processed} files processed
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button
          style={activeTab === 'overview' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        <button
          style={activeTab === 'tables' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('tables')}
          disabled={filesWithTables.length === 0}
        >
          📊 Tables ({filesWithTables.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={statsCardStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                {summary.total_files_processed}
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Files Processed</p>
            </div>
            <div style={statsCardStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                {summary.successful_extractions}
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Successful Extractions</p>
            </div>
            <div style={statsCardStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                {summary.total_tables_extracted}
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Tables Extracted</p>
            </div>
            <div style={statsCardStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                {Math.round(summary.success_rate)}%
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Success Rate</p>
            </div>
          </div>

          {/* File Details */}
          <div style={{
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--main-color)' }}>
              File Processing Details
            </h4>
            <div style={{ 
              display: 'grid', 
              gap: '0.75rem'
            }}>
              {summary.file_details?.map((file, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--main-color)' }}>
                      {file.filename}
                    </strong>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                      {file.tables_extracted} tables extracted
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: file.status === 'success' 
                      ? '#28a745' 
                      : file.status === 'error' 
                      ? '#dc3545' 
                      : '#6c757d',
                    color: 'white'
                  }}>
                    {file.status === 'success' ? '✓ Success' : 
                     file.status === 'error' ? '✗ Error' : 
                     '○ No Tables'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Summary */}
          {summary.verification_summary && summary.verification_summary.files_verified > 0 && (
            <div style={{
              background: '#e8f5e8',
              borderRadius: '8px',
              padding: '1.5rem',
              marginTop: '1rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#28a745' }}>
                🤖 AI Verification Summary
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                    {summary.verification_summary.files_verified}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Files Verified</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                    {Math.round(summary.verification_summary.average_accuracy_score)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Avg Accuracy</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                    {summary.verification_summary.total_issues_found}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Issues Found</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div>
          {filesWithTables.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6c757d'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3>No Tables Found</h3>
              <p>None of the processed files contained extractable tables.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {/* File List */}
              <div style={{ 
                flex: '0 0 300px',
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--main-color)' }}>
                  Files with Tables
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filesWithTables.map((file, index) => (
                    <button
                      key={index}
                      style={index === selectedFileIndex ? activeFileButtonStyle : fileButtonStyle}
                      onClick={() => setSelectedFileIndex(index)}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {file.filename}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        opacity: index === selectedFileIndex ? 0.9 : 0.7 
                      }}>
                        {file.table_count} table{file.table_count !== 1 ? 's' : ''}
                        {file.extraction_summary?.accuracy_score && (
                          <> • {file.extraction_summary.accuracy_score}% accuracy</>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Viewer */}
              <div style={{ flex: 1 }}>
                {filesWithTables[selectedFileIndex] && (
                  <SmartTableViewer
                    tables={filesWithTables[selectedFileIndex].tables}
                    filename={filesWithTables[selectedFileIndex].filename}
                    jobId={jobId}
                    extractionSummary={filesWithTables[selectedFileIndex].extraction_summary}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkResultsViewer;
