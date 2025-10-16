import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InsuranceDataTable from '../components/InsuranceDataTable';
import './InsuranceDataDemo.css';

const InsuranceDataDemo = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [insuranceData, setInsuranceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [activeNavItem, setActiveNavItem] = useState('L Forms');

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      try {
        // In a real app, this would be an API call
        const response = await import('../data/sampleInsuranceData.json');
        setInsuranceData(response.default);
        setLoading(false);
      } catch (error) {
        console.error('Error loading insurance data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
    console.log('Selected company:', company);
  };

  const handleNavClick = (navItem) => {
    setActiveNavItem(navItem);
    
    // Navigate to respective pages
    if (navItem === 'Dashboard') {
      navigate('/dashboard');
    } else if (navItem === 'Background') {
      navigate('/insurance-dashboard');
    } else if (navItem === 'L Forms') {
      navigate('/lform');
    } else {
      // For other tabs, you can add navigation logic later
      console.log(`Clicked ${navItem} tab`);
    }
  };



  if (loading) {
    return (
      <div className="demo-container">
        <div className="loading">
          <h2>Loading Insurance Data...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-container">


      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => {
              console.log('InsuranceDataDemo hamburger clicked!');
              if (onMenuClick) {
                onMenuClick();
              } else {
                console.log('onMenuClick is not defined');
              }
            }}
            style={{
              background: 'rgba(63, 114, 175, 0.1)',
              border: '1px solid rgba(63, 114, 175, 0.3)',
              color: 'var(--main-color)',
              borderRadius: '6px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '36px',
              minHeight: '36px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.2)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(63, 114, 175, 0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
          <h2 style={{ margin: 0 }}>Insurance Data Table</h2>
        </div>
        <p>Comprehensive view of insurance company performance metrics</p>
      </div>

      <div className="navigation-menu">
        <nav className="nav-links">
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('Dashboard')}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Background' ? 'active' : ''}`}
            onClick={() => handleNavClick('Background')}
          >
            Background
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'L Forms' ? 'active' : ''}`}
            onClick={() => handleNavClick('L Forms')}
          >
            L Forms
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Metrics' ? 'active' : ''}`}
            onClick={() => handleNavClick('Metrics')}
          >
            Metrics
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Analytics' ? 'active' : ''}`}
            onClick={() => handleNavClick('Analytics')}
          >
            Analytics
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Annual Data' ? 'active' : ''}`}
            onClick={() => handleNavClick('Annual Data')}
          >
            Annual Data
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Documents' ? 'active' : ''}`}
            onClick={() => handleNavClick('Documents')}
          >
            Documents
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'Peers' ? 'active' : ''}`}
            onClick={() => handleNavClick('Peers')}
          >
            Peers
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeNavItem === 'News' ? 'active' : ''}`}
            onClick={() => handleNavClick('News')}
          >
            News
          </a>
        </nav>
      </div>



      <div className="table-section">
        <InsuranceDataTable 
          data={insuranceData} 
          onCompanyChange={handleCompanyChange}
        />
      </div>


    </div>
  );
};

export default InsuranceDataDemo; 