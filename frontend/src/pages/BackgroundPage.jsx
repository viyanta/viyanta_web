import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import './BackgroundPage.css';

const BackgroundPage = ({ selectedInsurer, onTabChange, onInsurerChange }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();
  const [activeTab, setActiveTab] = useState('Data');
  const [selectedCompany, setSelectedCompany] = useState(selectedInsurer || '');

  // Navigation tabs
  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  const handleTabClick = (tab) => {
    // Only allow clicks on active items
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      // Navigate to Dashboard page
      navigate('/dashboard');
    } else if (tab === 'Background') {
      // Stay on Background page
      return;
    } else if (tab === 'L Forms') {
      // Navigate to L Forms page
      navigate('/lform');
    } else if (tab === 'Metrics') {
      navigate('/metrics');
    } else if (tab === 'Analytics') {
        // Navigate to Analytics page
        navigate('/analytics');
      } else if (tab === 'Annual Data') {
        navigate('/annual-data');
      } else if (tab === 'Documents') {
        navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      navigate('/news');
    } else if (tab === 'Define Template') {
      console.log('Define Template clicked');
    } else if (tab === 'Save Template') {
      console.log('Save Template clicked');
    } else if (tab === 'Screener Inputs') {
      console.log('Screener Inputs clicked');
    } else if (tab === 'Screener Output Sheets') {
      console.log('Screener Output Sheets clicked');
    } else if (tab === 'Child Plans') {
      console.log('Child Plans clicked');
    } else if (tab === 'Investment Plans') {
      console.log('Investment Plans clicked');
    } else if (tab === 'Protection Plans') {
      console.log('Protection Plans clicked');
    } else if (tab === 'Term Plans') {
      console.log('Term Plans clicked');
    } else if (tab === 'New Launches') {
      console.log('New Launches clicked');
    } else {
      // For other tabs, you can add functionality later
      console.log(`Clicked on ${tab} tab`);
    }
  };

  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
    onInsurerChange && onInsurerChange(company);
  };

  // Dummy data for different insurers
  const companyData = {
    'hdfc': {
      companyName: 'HDFC Life Insurance Company Limited',
      shortName: 'HDFC Life',
      logo: 'https://via.placeholder.com/200x100/0066CC/FFFFFF?text=HDFC+Life',
      data: {
        InsuranceCategoryName: 'Life',
        CINNumber: 'U66010MH2000PLC120563',
        MCARegdName: 'HDFC Life Insurance Company Limited',
        CompanyInsurerID: '500002',
        CompanyInsurerLongName: 'HDFC Life Insurance Company Limited',
        CompanyInsurerAliasName: 'HDFC Life Insurance Company Limited+HDFC Life',
        IRDAIRegNumber: '101',
        CompanyInsurerShortName: 'HDFC Life',
        ListedUnlisted: 'Listed Company',
        WhetherListed: '1',
        ListedExchange1: 'BSE',
        ListedExchange2: 'NSE',
        CompanyWebsitePDLink: 'https://www.hdfclife.com/public-disclosure',
        CompanyWebsiteLink: 'https://www.hdfclife.com',
        CompanyImageLink: 'https://www.hdfclife.com/images/logo.png',
        CompanyEMail: 'info[at]hdfclife[dot]com',
        CompanyAddress1: 'HDFC House',
        CompanyAddress2: '2nd Floor, H.T. Parekh Marg',
        CompanyAddress3: 'Churchgate',
        CompanyAddress4: 'Mumbai',
        CompanyAddressCity: 'Mumbai',
        CompanyAddressState: 'Maharashtra',
        CompanyAddressPincode: '400020',
        CompanyAddressCountry: 'India',
        KeyPersonnelName: 'Mr. Vibha Padalkar',
        KeyPersonnelDesignation: 'CEO & MD',
        ActuaryName: 'Mr. Amitabh Chaudhry',
        TelephoneNumber: '022-66521000'
      }
    },
    'sbi': {
      companyName: 'SBI Life Insurance Company Limited',
      shortName: 'SBI Life',
      logo: 'https://via.placeholder.com/200x100/FF6B35/FFFFFF?text=SBI+Life',
      data: {
        InsuranceCategoryName: 'Life',
        CINNumber: 'U66010MH2000PLC120564',
        MCARegdName: 'SBI Life Insurance Company Limited',
        CompanyInsurerID: '500003',
        CompanyInsurerLongName: 'SBI Life Insurance Company Limited',
        CompanyInsurerAliasName: 'SBI Life Insurance Company Limited+SBI Life',
        IRDAIRegNumber: '102',
        CompanyInsurerShortName: 'SBI Life',
        ListedUnlisted: 'Listed Company',
        WhetherListed: '1',
        ListedExchange1: 'BSE',
        ListedExchange2: 'NSE',
        CompanyWebsitePDLink: 'https://www.sbilife.co.in/public-disclosure',
        CompanyWebsiteLink: 'https://www.sbilife.co.in',
        CompanyImageLink: 'https://www.sbilife.co.in/images/logo.png',
        CompanyEMail: 'info[at]sbilife[dot]co[dot]in',
        CompanyAddress1: 'Natraj',
        CompanyAddress2: 'M.V. Road',
        CompanyAddress3: 'Andheri West',
        CompanyAddress4: 'Mumbai',
        CompanyAddressCity: 'Mumbai',
        CompanyAddressState: 'Maharashtra',
        CompanyAddressPincode: '400058',
        CompanyAddressCountry: 'India',
        KeyPersonnelName: 'Mr. Mahesh Kumar Sharma',
        KeyPersonnelDesignation: 'MD & CEO',
        ActuaryName: 'Mr. Rajesh Kumar',
        TelephoneNumber: '022-26716000'
      }
    },
    'icici': {
      companyName: 'ICICI Prudential Life Insurance Company Limited',
      shortName: 'ICICI Prudential',
      logo: 'https://via.placeholder.com/200x100/1E3A8A/FFFFFF?text=ICICI+Prudential',
      data: {
        InsuranceCategoryName: 'Life',
        CINNumber: 'U66010MH2000PLC120565',
        MCARegdName: 'ICICI Prudential Life Insurance Company Limited',
        CompanyInsurerID: '500004',
        CompanyInsurerLongName: 'ICICI Prudential Life Insurance Company Limited',
        CompanyInsurerAliasName: 'ICICI Prudential Life Insurance Company Limited+ICICI Prudential',
        IRDAIRegNumber: '103',
        CompanyInsurerShortName: 'ICICI Prudential',
        ListedUnlisted: 'Listed Company',
        WhetherListed: '1',
        ListedExchange1: 'BSE',
        ListedExchange2: 'NSE',
        CompanyWebsitePDLink: 'https://www.iciciprulife.com/public-disclosure',
        CompanyWebsiteLink: 'https://www.iciciprulife.com',
        CompanyImageLink: 'https://www.iciciprulife.com/images/logo.png',
        CompanyEMail: 'info[at]iciciprulife[dot]com',
        CompanyAddress1: 'ICICI Prudential House',
        CompanyAddress2: '1089 Appasaheb Marathe Marg',
        CompanyAddress3: 'Prabhadevi',
        CompanyAddress4: 'Mumbai',
        CompanyAddressCity: 'Mumbai',
        CompanyAddressState: 'Maharashtra',
        CompanyAddressPincode: '400025',
        CompanyAddressCountry: 'India',
        KeyPersonnelName: 'Ms. Naina Lal Kidwai',
        KeyPersonnelDesignation: 'Chairman',
        ActuaryName: 'Mr. Sandeep Batra',
        TelephoneNumber: '022-66595000'
      }
    },
    'lic': {
      companyName: 'Life Insurance Corporation of India',
      shortName: 'LIC of India',
      logo: 'https://via.placeholder.com/200x100/FFD700/000000?text=LIC',
      data: {
        InsuranceCategoryName: 'Life',
        CINNumber: 'U74899PB2000PLC045626',
        MCARegdName: 'Life Insurance Corporation of India',
        CompanyInsurerID: '500001',
        CompanyInsurerLongName: 'Life Insurance Corporation of India',
        CompanyInsurerAliasName: 'Life Insurance Corporation of India+LIC of India',
        IRDAIRegNumber: '512',
        CompanyInsurerShortName: 'LIC of India',
        ListedUnlisted: 'Listed Company',
        WhetherListed: '1',
        ListedExchange1: 'BSE',
        ListedExchange2: 'NSE',
        CompanyWebsitePDLink: 'https://www.licindia.in/public-disclosure',
        CompanyWebsiteLink: 'https://www.licindia.in',
        CompanyImageLink: 'https://licindia.in/o/lic-theme/images/lic_logo.png',
        CompanyEMail: 'co_gif[at]licindia[dot]com',
        CompanyAddress1: 'Yogakshema',
        CompanyAddress2: 'Jeevan Bima Marg',
        CompanyAddress3: 'Post Box No. 19953',
        CompanyAddress4: 'Nariman Point',
        CompanyAddressCity: 'Mumbai',
        CompanyAddressState: 'Maharashtra',
        CompanyAddressPincode: '400021',
        CompanyAddressCountry: 'India',
        KeyPersonnelName: 'Mr. Siddharth Mohanty',
        KeyPersonnelDesignation: 'CHAIRMAN',
        ActuaryName: 'Mr. Dinesh Pant',
        TelephoneNumber: '022-68276827'
      }
    },
    'bajaj': {
      companyName: 'Bajaj Allianz Life Insurance Company Limited',
      shortName: 'Bajaj Allianz',
      logo: 'https://via.placeholder.com/200x100/00A651/FFFFFF?text=Bajaj+Allianz',
      data: {
        InsuranceCategoryName: 'Life',
        CINNumber: 'U66010MH2000PLC120566',
        MCARegdName: 'Bajaj Allianz Life Insurance Company Limited',
        CompanyInsurerID: '500005',
        CompanyInsurerLongName: 'Bajaj Allianz Life Insurance Company Limited',
        CompanyInsurerAliasName: 'Bajaj Allianz Life Insurance Company Limited+Bajaj Allianz',
        IRDAIRegNumber: '104',
        CompanyInsurerShortName: 'Bajaj Allianz',
        ListedUnlisted: 'Listed Company',
        WhetherListed: '1',
        ListedExchange1: 'BSE',
        ListedExchange2: 'NSE',
        CompanyWebsitePDLink: 'https://www.bajajallianzlife.com/public-disclosure',
        CompanyWebsiteLink: 'https://www.bajajallianzlife.com',
        CompanyImageLink: 'https://www.bajajallianzlife.com/images/logo.png',
        CompanyEMail: 'info[at]bajajallianzlife[dot]com',
        CompanyAddress1: 'Bajaj Allianz House',
        CompanyAddress2: 'Bajaj Allianz House',
        CompanyAddress3: 'Survey No. 72/1',
        CompanyAddress4: 'Pune',
        CompanyAddressCity: 'Pune',
        CompanyAddressState: 'Maharashtra',
        CompanyAddressPincode: '411001',
        CompanyAddressCountry: 'India',
        KeyPersonnelName: 'Mr. Tarun Chugh',
        KeyPersonnelDesignation: 'MD & CEO',
        ActuaryName: 'Mr. Anup Rau',
        TelephoneNumber: '020-66026789'
      }
    }
  };

  const currentCompany = companyData[selectedCompany] || companyData['lic'];

  return (
    <div className="background-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Background Page Header */}
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div style={{ 
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(0.5rem, 2vw, 1rem)', 
            marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
            flexWrap: 'wrap'
          }}>
            {/* Hamburger Menu Icon */}
            <button
              onClick={() => {
                console.log('Background hamburger clicked!');
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
                padding: 'clamp(0.4rem, 2vw, 0.5rem)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: 'clamp(32px, 8vw, 36px)',
                minHeight: 'clamp(32px, 8vw, 36px)'
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
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(18px, 5vw, 28px)',
              lineHeight: '1.2',
              color: '#36659b',
              fontWeight: '700',
              wordBreak: 'break-word'
            }}>
              Background
            </h1>
          </div>
          <p style={{
            margin: '0',
            color: '#666',
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            lineHeight: '1.4'
          }}>
            Comprehensive view of company background information and details
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="navigation-tabs-container" style={{
        marginBottom: 'clamp(15px, 3vw, 20px)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        <div className="navigation-tabs" style={{
          display: 'flex',
          gap: tabs.length <= 3 ? 'clamp(15px, 3vw, 20px)' : 'clamp(8px, 2vw, 12px)',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'visible',
          paddingBottom: '5px',
          justifyContent: tabs.length <= 3 ? 'center' : 'flex-start'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`nav-tab ${isNavItemActive(tab) ? 'active' : 'inactive'}`}
              style={{
                padding: tabs.length <= 3 ? 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 18px)' : 'clamp(6px, 2vw, 8px) clamp(10px, 2vw, 12px)',
                fontSize: tabs.length <= 3 ? 'clamp(13px, 2.5vw, 15px)' : 'clamp(12px, 2.5vw, 13px)',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isNavItemActive(tab) ? 'var(--main-color)' : 'transparent',
                color: isNavItemActive(tab) ? 'white' : '#666',
                fontWeight: isNavItemActive(tab) ? '600' : '400',
                cursor: isNavItemActive(tab) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: tabs.length <= 3 ? '36px' : '32px',
                opacity: isNavItemActive(tab) ? 1 : 0.5
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div style={{ 
        display: 'flex',
        gap: 'clamp(15px, 3vw, 20px)',
        alignItems: 'flex-start',
        marginTop: 'clamp(5px, 1vw, 10px)',
        padding: '0 clamp(10px, 3vw, 20px)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Left Sidebar - Company Information */}
        <div style={{
          flex: '0 0 clamp(200px, 25vw, 220px)',
          minWidth: '200px',
          maxWidth: '220px'
        }}>
          <CompanyInformationSidebar />
        </div>

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0,
          paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)'
        }}>
          {/* Company Selection Section */}
          <div className="company-selection-section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)', 
              marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
              flexWrap: 'wrap'
            }}>
              <h3 className="company-selection-title" style={{ margin: 0 }}>Select Company</h3>
            </div>
            <div className="company-controls">
              <select
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="company-dropdown"
              >
                <option value="">Choose a company</option>
                <option value="hdfc">HDFC Life S FY2023 9M</option>
                <option value="sbi">SBI Life S FY2024 HY</option>
                <option value="icici">ICICI Prudential S FY2025 Q1</option>
                <option value="lic">LIC S FY2024 FY</option>
                <option value="bajaj">Bajaj Allianz S FY2023 Q3</option>
              </select>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <span>Company Information</span>
            <span className="breadcrumb-separator">›</span>
            <span>Background</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{currentCompany.companyName}</span>
          </div>

          {/* Visuals/Data Tabs */}
          <div className="content-tabs">
            <button 
              className={`content-tab ${activeTab === 'Visuals' ? 'active' : ''}`}
              onClick={() => setActiveTab('Visuals')}
            >
              Visuals
            </button>
            <button 
              className={`content-tab ${activeTab === 'Data' ? 'active' : ''}`}
              onClick={() => setActiveTab('Data')}
            >
              Data
            </button>
          </div>

          {/* Main Content */}
          <div className="main-content">
            {/* Company Logo */}
            <div className="company-logo-section">
              <img 
                src={currentCompany.logo} 
                alt={`${currentCompany.shortName} Logo`}
                className="company-logo"
              />
            </div>

            {/* Company Information Table */}
            {activeTab === 'Data' && (
              <div className="company-data-table">
                <h3 className="table-title">Company Information</h3>
                <div className="data-grid">
                  {Object.entries(currentCompany.data).map(([key, value]) => (
                    <div key={key} className="data-row">
                      <div className="data-label">{key}:</div>
                      <div className="data-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Visuals' && (
              <div className="visuals-content">
                <h3 className="visuals-title">Company Visuals</h3>
                <div className="visuals-placeholder">
                  <div className="visual-card">
                    <h4>Company Overview</h4>
                    <p>Visual representation of {currentCompany.companyName} data will be displayed here.</p>
                  </div>
                  <div className="visual-card">
                    <h4>Financial Metrics</h4>
                    <p>Charts and graphs showing financial performance metrics.</p>
                  </div>
                  <div className="visual-card">
                    <h4>Market Position</h4>
                    <p>Market share and competitive positioning visualizations.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundPage;
