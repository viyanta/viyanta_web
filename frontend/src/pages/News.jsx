import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './News.css';

const News = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive } = useNavigation();

  // State for insurer selection and news data
  const [selectedInsurer, setSelectedInsurer] = useState('HDFC Life');
  const [insurers] = useState(['HDFC Life', 'SBI Life', 'ICICI Prudential', 'LIC']);

  // All news data organized by insurer
  const allNewsData = {
    'HDFC Life': {
      domestic: [
        {
          id: 1,
          title: "HDFC Life Reports Strong Q3 Growth",
          summary: "HDFC Life Insurance Company reported a 15% increase in new business premium for the third quarter, driven by strong digital adoption.",
          link: "https://www.hdfclife.com/investor-relations/quarterly-results",
          date: "2024-01-12",
          source: "HDFC Life"
        },
        {
          id: 2,
          title: "HDFC Life Launches New Term Insurance Product",
          summary: "HDFC Life has launched a new term insurance product with enhanced coverage and competitive pricing to attract young customers.",
          link: "https://www.hdfclife.com/products/term-insurance",
          date: "2024-01-08",
          source: "HDFC Life"
        },
        {
          id: 3,
          title: "HDFC Life Expands Digital Services",
          summary: "HDFC Life announces expansion of its digital services platform to improve customer experience and streamline policy management.",
          link: "https://www.hdfclife.com/digital-services",
          date: "2024-01-05",
          source: "HDFC Life"
        }
      ],
      international: [
        {
          id: 1,
          title: "HDFC Life Partners with Global Insurer for Reinsurance",
          summary: "HDFC Life enters into a strategic partnership with a leading global reinsurer to strengthen its risk management capabilities.",
          link: "https://www.insurancejournal.com/news/international/hdfc-life-reinsurance-partnership",
          date: "2024-01-10",
          source: "Insurance Journal"
        },
        {
          id: 2,
          title: "HDFC Life Adopts International Best Practices",
          summary: "HDFC Life implements international best practices in customer service and claims processing to enhance operational efficiency.",
          link: "https://www.reuters.com/business/finance/hdfc-life-best-practices",
          date: "2024-01-07",
          source: "Reuters"
        }
      ]
    },
    'SBI Life': {
      domestic: [
        {
          id: 1,
          title: "SBI Life Launches New Digital Platform",
          summary: "SBI Life Insurance has launched a comprehensive digital platform to improve customer experience and streamline operations.",
          link: "https://www.sbilife.co.in/news/sbi-life-digital-platform",
          date: "2024-01-10",
          source: "SBI Life"
        },
        {
          id: 2,
          title: "SBI Life Reports Record Premium Collection",
          summary: "SBI Life Insurance reports record premium collection in December 2023, marking a significant milestone in its growth journey.",
          link: "https://www.sbilife.co.in/investor-relations/premium-collection",
          date: "2024-01-06",
          source: "SBI Life"
        },
        {
          id: 3,
          title: "SBI Life Expands Rural Market Presence",
          summary: "SBI Life announces expansion of its rural market presence with new branch openings and agent recruitment programs.",
          link: "https://www.sbilife.co.in/rural-expansion",
          date: "2024-01-03",
          source: "SBI Life"
        }
      ],
      international: [
        {
          id: 1,
          title: "SBI Life Collaborates with International Tech Partners",
          summary: "SBI Life partners with international technology companies to enhance its digital infrastructure and customer service capabilities.",
          link: "https://www.insurancebusinessmag.com/asia/news/sbi-life-tech-partnership",
          date: "2024-01-09",
          source: "Insurance Business Magazine"
        },
        {
          id: 2,
          title: "SBI Life Implements Global Risk Management Standards",
          summary: "SBI Life adopts global risk management standards to strengthen its financial stability and regulatory compliance.",
          link: "https://www.risk.net/insurance/sbi-life-risk-management",
          date: "2024-01-04",
          source: "Risk.net"
        }
      ]
    },
    'ICICI Prudential': {
      domestic: [
        {
          id: 1,
          title: "ICICI Prudential Life Reports Strong Performance",
          summary: "ICICI Prudential Life Insurance reports strong performance in Q3 with significant growth in new business and customer acquisition.",
          link: "https://www.iciciprulife.com/investor-relations/q3-results",
          date: "2024-01-11",
          source: "ICICI Prudential"
        },
        {
          id: 2,
          title: "ICICI Prudential Launches AI-Powered Claims Processing",
          summary: "ICICI Prudential Life Insurance launches AI-powered claims processing system to reduce settlement time and improve customer satisfaction.",
          link: "https://www.iciciprulife.com/ai-claims-processing",
          date: "2024-01-07",
          source: "ICICI Prudential"
        },
        {
          id: 3,
          title: "ICICI Prudential Expands Health Insurance Portfolio",
          summary: "ICICI Prudential announces expansion of its health insurance portfolio with new products targeting different customer segments.",
          link: "https://www.iciciprulife.com/health-insurance-expansion",
          date: "2024-01-04",
          source: "ICICI Prudential"
        }
      ],
      international: [
        {
          id: 1,
          title: "ICICI Prudential Partners with Global Health Insurer",
          summary: "ICICI Prudential Life Insurance enters into a strategic partnership with a global health insurer to expand its product offerings.",
          link: "https://www.healthinsurance.org/news/icici-prudential-global-partnership",
          date: "2024-01-08",
          source: "Health Insurance.org"
        },
        {
          id: 2,
          title: "ICICI Prudential Adopts International ESG Standards",
          summary: "ICICI Prudential Life Insurance adopts international Environmental, Social, and Governance (ESG) standards in its operations.",
          link: "https://www.esgnews.com/icici-prudential-esg-standards",
          date: "2024-01-05",
          source: "ESG News"
        }
      ]
    },
    'LIC': {
      domestic: [
        {
          id: 1,
          title: "LIC Reports Strong Growth in Policy Sales",
          summary: "Life Insurance Corporation of India reports strong growth in policy sales with increased focus on digital channels and customer engagement.",
          link: "https://www.licindia.in/investor-relations/policy-sales-growth",
          date: "2024-01-13",
          source: "LIC"
        },
        {
          id: 2,
          title: "LIC Launches New Pension Scheme",
          summary: "LIC launches a new pension scheme with attractive returns and flexible payment options to cater to retirement planning needs.",
          link: "https://www.licindia.in/products/pension-scheme",
          date: "2024-01-09",
          source: "LIC"
        },
        {
          id: 3,
          title: "LIC Expands Digital Services Nationwide",
          summary: "LIC announces nationwide expansion of its digital services to improve accessibility and convenience for policyholders.",
          link: "https://www.licindia.in/digital-services-expansion",
          date: "2024-01-06",
          source: "LIC"
        }
      ],
      international: [
        {
          id: 1,
          title: "LIC Collaborates with International Reinsurers",
          summary: "LIC collaborates with leading international reinsurers to strengthen its risk management and expand its global presence.",
          link: "https://www.reinsurancemagazine.com/lic-international-collaboration",
          date: "2024-01-12",
          source: "Reinsurance Magazine"
        },
        {
          id: 2,
          title: "LIC Implements Global Best Practices in Customer Service",
          summary: "LIC implements global best practices in customer service to enhance policyholder experience and operational efficiency.",
          link: "https://www.customer-service-news.com/lic-best-practices",
          date: "2024-01-08",
          source: "Customer Service News"
        }
      ]
    }
  };

  // Get current insurer's news data
  const currentInsurerNews = allNewsData[selectedInsurer] || { domestic: [], international: [] };
  const domesticNews = currentInsurerNews.domestic;
  const internationalNews = currentInsurerNews.international;

  const handleInsurerChange = (insurer) => {
    setSelectedInsurer(insurer);
  };

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
    if (!isNavItemActive(tab)) {
      return;
    }
    
    if (tab === 'Dashboard') {
      navigate('/dashboard');
    } else if (tab === 'Background') {
      navigate('/insurance-dashboard?tab=Background');
    } else if (tab === 'L Forms') {
      navigate('/lform');
    } else if (tab === 'Metrics') {
      navigate('/metrics');
      } else if (tab === 'Analytics') {
        navigate('/analytics');
      } else if (tab === 'Annual Data') {
        navigate('/annual-data');
      } else if (tab === 'Documents') {
        navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      return; // Stay on current page
    } else if (tab === 'Define Template') {
      navigate('/template');
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
      console.log(`Clicked ${tab} tab`);
    }
  };

  return (
    <div className="news-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'clamp(0.5rem, 2vw, 1rem)', 
        marginBottom: 'clamp(1rem, 3vw, 2rem)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => {
            console.log('News hamburger clicked!');
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
          lineHeight: '1.2'
        }}>News</h1>
      </div>

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
      
      {/* Main Content Area with Sidebar */}
      <div style={{
        display: 'flex',
        gap: 'clamp(10px, 2vw, 15px)',
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
          {/* Insurer Selection */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: 'clamp(15px, 3vw, 20px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            marginBottom: 'clamp(15px, 3vw, 20px)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(10px, 2vw, 15px)',
              flexWrap: 'wrap'
            }}>
              <label style={{
                fontSize: 'clamp(14px, 2vw, 16px)',
                fontWeight: '600',
                color: '#374151',
                minWidth: '120px'
              }}>
                Insurer Name:
              </label>
              <select
                value={selectedInsurer}
                onChange={(e) => handleInsurerChange(e.target.value)}
                style={{
                  padding: 'clamp(8px, 2vw, 10px) clamp(12px, 2vw, 15px)',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  minWidth: 'clamp(150px, 20vw, 200px)',
                  cursor: 'pointer'
                }}
              >
                {insurers.map((insurer) => (
                  <option key={insurer} value={insurer}>
                    {insurer}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* News Content */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: 'clamp(20px, 4vw, 30px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)', 
              marginBottom: 'clamp(20px, 3vw, 25px)',
              flexWrap: 'wrap'
            }}>
              {/* Hamburger Menu Icon */}
              <button
                onClick={() => {
                  console.log('News hamburger clicked!');
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
              <h3 style={{
                fontSize: 'clamp(20px, 4vw, 24px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                📰 {selectedInsurer} - News & Updates
              </h3>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(25px, 4vw, 35px)'
            }}>
                {/* Domestic News Section */}
                <div>
                  <h4 style={{
                    fontSize: 'clamp(18px, 3vw, 20px)',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0 0 clamp(15px, 2vw, 20px) 0',
                    paddingBottom: 'clamp(8px, 1vw, 10px)',
                    borderBottom: '2px solid #3b82f6'
                  }}>
                    🇮🇳 Domestic News
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(12px, 2vw, 15px)'
                  }}>
                    {domesticNews.map((news) => (
                      <div key={news.id} style={{
                        padding: 'clamp(15px, 3vw, 20px)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 'clamp(10px, 2vw, 15px)',
                          marginBottom: 'clamp(8px, 1vw, 10px)'
                        }}>
                          <h5 style={{
                            fontSize: 'clamp(14px, 2vw, 16px)',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: 0,
                            flex: 1
                          }}>
                            {news.title}
                          </h5>
                          <span style={{
                            fontSize: 'clamp(11px, 1.5vw, 12px)',
                            color: '#6b7280',
                            whiteSpace: 'nowrap'
                          }}>
                            {news.date}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'clamp(12px, 1.8vw, 14px)',
                          color: '#4b5563',
                          lineHeight: '1.5',
                          margin: '0 0 clamp(10px, 2vw, 12px) 0'
                        }}>
                          {news.summary}
                        </p>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: 'clamp(11px, 1.5vw, 12px)',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            Source: {news.source}
                          </span>
                          <a
                            href={news.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 'clamp(12px, 1.8vw, 14px)',
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontWeight: '500',
                              padding: 'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 12px)',
                              border: '1px solid #3b82f6',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#3b82f6';
                              e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = '#3b82f6';
                            }}
                          >
                            Read More →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* International News Section */}
                <div>
                  <h4 style={{
                    fontSize: 'clamp(18px, 3vw, 20px)',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0 0 clamp(15px, 2vw, 20px) 0',
                    paddingBottom: 'clamp(8px, 1vw, 10px)',
                    borderBottom: '2px solid #10b981'
                  }}>
                    🌍 International News
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(12px, 2vw, 15px)'
                  }}>
                    {internationalNews.map((news) => (
                      <div key={news.id} style={{
                        padding: 'clamp(15px, 3vw, 20px)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#f0fdf4',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ecfdf5';
                        e.currentTarget.style.borderColor = '#10b981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 'clamp(10px, 2vw, 15px)',
                          marginBottom: 'clamp(8px, 1vw, 10px)'
                        }}>
                          <h5 style={{
                            fontSize: 'clamp(14px, 2vw, 16px)',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: 0,
                            flex: 1
                          }}>
                            {news.title}
                          </h5>
                          <span style={{
                            fontSize: 'clamp(11px, 1.5vw, 12px)',
                            color: '#6b7280',
                            whiteSpace: 'nowrap'
                          }}>
                            {news.date}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'clamp(12px, 1.8vw, 14px)',
                          color: '#4b5563',
                          lineHeight: '1.5',
                          margin: '0 0 clamp(10px, 2vw, 12px) 0'
                        }}>
                          {news.summary}
                        </p>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: 'clamp(11px, 1.5vw, 12px)',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            Source: {news.source}
                          </span>
                          <a
                            href={news.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 'clamp(12px, 1.8vw, 14px)',
                              color: '#10b981',
                              textDecoration: 'none',
                              fontWeight: '500',
                              padding: 'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 12px)',
                              border: '1px solid #10b981',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#10b981';
                              e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = '#10b981';
                            }}
                          >
                            Read More →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default News;

