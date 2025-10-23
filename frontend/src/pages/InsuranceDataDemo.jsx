import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InsuranceDataTable from '../components/InsuranceDataTable';
import { useNavigation } from '../context/NavigationContext';
import './InsuranceDataDemo.css';

const InsuranceDataDemo = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
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
            className={`nav-link ${isNavItemActive('Dashboard') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Dashboard')}
            style={{ 
              opacity: isNavItemActive('Dashboard') ? 1 : 0.5,
              cursor: isNavItemActive('Dashboard') ? 'pointer' : 'not-allowed'
            }}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Background') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Background')}
            style={{ 
              opacity: isNavItemActive('Background') ? 1 : 0.5,
              cursor: isNavItemActive('Background') ? 'pointer' : 'not-allowed'
            }}
          >
            Background
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('L Forms') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('L Forms')}
            style={{ 
              opacity: isNavItemActive('L Forms') ? 1 : 0.5,
              cursor: isNavItemActive('L Forms') ? 'pointer' : 'not-allowed'
            }}
          >
            L Forms
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Metrics') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Metrics')}
            style={{ 
              opacity: isNavItemActive('Metrics') ? 1 : 0.5,
              cursor: isNavItemActive('Metrics') ? 'pointer' : 'not-allowed'
            }}
          >
            Metrics
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Analytics') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Analytics')}
            style={{ 
              opacity: isNavItemActive('Analytics') ? 1 : 0.5,
              cursor: isNavItemActive('Analytics') ? 'pointer' : 'not-allowed'
            }}
          >
            Analytics
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Annual Data') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Annual Data')}
            style={{ 
              opacity: isNavItemActive('Annual Data') ? 1 : 0.5,
              cursor: isNavItemActive('Annual Data') ? 'pointer' : 'not-allowed'
            }}
          >
            Annual Data
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Documents') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Documents')}
            style={{ 
              opacity: isNavItemActive('Documents') ? 1 : 0.5,
              cursor: isNavItemActive('Documents') ? 'pointer' : 'not-allowed'
            }}
          >
            Documents
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('Peers') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('Peers')}
            style={{ 
              opacity: isNavItemActive('Peers') ? 1 : 0.5,
              cursor: isNavItemActive('Peers') ? 'pointer' : 'not-allowed'
            }}
          >
            Peers
          </a>
          <a 
            href="#" 
            className={`nav-link ${isNavItemActive('News') ? 'active' : 'inactive'}`}
            onClick={() => handleNavClick('News')}
            style={{ 
              opacity: isNavItemActive('News') ? 1 : 0.5,
              cursor: isNavItemActive('News') ? 'pointer' : 'not-allowed'
            }}
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