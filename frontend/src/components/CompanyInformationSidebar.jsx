import React, { useState } from 'react';

function CompanyInformationSidebar() {
    const [companyInfoExpanded, setCompanyInfoExpanded] = useState(true);

    return (
        <div style={{
            flex: '0 0 280px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            height: 'fit-content',
            marginBottom: '2rem',
            position: 'static',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div 
                style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px 20px',
                    borderBottom: '1px solid #e0e0e0',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                }}
                onClick={() => setCompanyInfoExpanded(!companyInfoExpanded)}
                onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                }}
            >
                <h3 style={{ margin: 0, color: '#495057', fontSize: '16px', fontWeight: '600' }}>
                    Company Information
                </h3>
                <span style={{ 
                    color: '#333',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transform: companyInfoExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                }}>
                    &lt;
                </span>
            </div>
            <div style={{ padding: 0 }}>
                {companyInfoExpanded ? (
                    <>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Industry Metrics</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Industry Aggregates</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Economy</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Report Generator</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Screener</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>IRDAI Monthly Data</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Products - Life</div>
                    </>
                ) : (
                    <>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#e9ecef',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>L Forms</div>
                        <div style={{
                            padding: '12px 20px 12px 35px',
                            color: '#666',
                            fontSize: '13px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Metrics</div>
                        <div style={{
                            padding: '12px 20px 12px 35px',
                            color: '#666',
                            fontSize: '13px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Analytics</div>
                        <div style={{
                            padding: '12px 20px 12px 35px',
                            color: '#666',
                            fontSize: '13px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Annual Data</div>
                        <div style={{
                            padding: '12px 20px 12px 35px',
                            color: '#666',
                            fontSize: '13px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Documents</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Background</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Industry Metrics</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Industry Aggregates</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Economy</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Report Generator</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>Screener</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>IRDAI Monthly Data</div>
                        <div style={{
                            padding: '12px 20px',
                            color: '#495057',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f3f4',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}>News</div>
                    </>
                )}
            </div>
        </div>
    );
}

export default CompanyInformationSidebar; 