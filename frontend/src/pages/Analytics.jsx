import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyInformationSidebar from '../components/CompanyInformationSidebar';
import { useNavigation } from '../context/NavigationContext';
import './Analytics.css';

const Analytics = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { isNavItemActive, selectedSidebarItem } = useNavigation();
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const allTabs = [
    'Dashboard', 'Background', 'L Forms', 'Metrics', 
    'Analytics', 'Annual Data', 'Documents', 'Peers', 'News',
    'Define Template', 'Save Template',
    'Screener Inputs', 'Screener Output Sheets',
    'Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'
  ];

  // Filter to show only active tabs
  const tabs = allTabs.filter(tab => isNavItemActive(tab));

  // Handle tab clicks
  const handleTabClick = (tab) => {
    // Only allow clicks on active items
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
    } else if (tab === 'Dashboard') {
      // Check if Economy is selected in sidebar
      if (selectedSidebarItem === 1007) { // Economy
        navigate('/economy-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else if (tab === 'Analytics') {
        // Stay on current page
        return;
      } else if (tab === 'Annual Data') {
        navigate('/annual-data');
      } else if (tab === 'Documents') {
        navigate('/documents');
    } else if (tab === 'Peers') {
      navigate('/peers');
    } else if (tab === 'News') {
      navigate('/news');
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
    } else if (tab === 'Domestic') {
      navigate('/economy-domestic');
    } else if (tab === 'International') {
      navigate('/economy-international');
    } else {
      // For other tabs, you can add navigation logic later
      console.log(`Clicked ${tab} tab`);
    }
  };

  // Handle prompt submission
  const handlePromptSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Call your backend API for LLM analysis
      const response = await fetch('/api/analytics/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get analysis');
      }
      
      const data = await response.json();
      setAnalysis(data.analysis || data.response);
      setPrompt('');
    } catch (error) {
      console.error('Error generating analysis:', error);
      // Fallback to mock response for demo
      const mockResponse = await simulateLLMAnalysis(prompt);
      setAnalysis(mockResponse);
      setPrompt('');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate LLM analysis (replace with actual API call)
  const simulateLLMAnalysis = async (userPrompt) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock responses based on prompt content
    const lowerPrompt = userPrompt.toLowerCase();
    
    if (lowerPrompt.includes('performance') || lowerPrompt.includes('growth')) {
      return `Based on the current data analysis, the company shows strong performance indicators:

• Revenue Growth: 15.2% YoY increase, indicating healthy business expansion
• Market Share: 8.5% with 0.3% growth from previous period
• Customer Satisfaction: 4.2/5 rating, showing positive customer experience
• Risk Score: 3.2 (improved from 3.5), indicating better risk management

Key Recommendations:
1. Continue current growth strategies
2. Focus on customer retention programs
3. Monitor market competition closely
4. Maintain risk management protocols

The overall performance trend is positive and sustainable.`;
    } else if (lowerPrompt.includes('risk') || lowerPrompt.includes('assessment')) {
      return `Risk Assessment Analysis:

Current Risk Profile:
• Financial Risk: LOW - Strong revenue growth and stable cash flow
• Market Risk: MEDIUM - Competitive landscape requires monitoring
• Operational Risk: LOW - Efficient processes and good customer satisfaction
• Regulatory Risk: LOW - Compliance maintained across all operations

Risk Mitigation Strategies:
1. Diversify revenue streams to reduce market dependency
2. Implement advanced monitoring systems for early risk detection
3. Regular compliance audits and training programs
4. Maintain adequate insurance coverage

Overall Risk Score: 3.2/10 (Low Risk)`;
    } else if (lowerPrompt.includes('market') || lowerPrompt.includes('competition')) {
      return `Market Analysis:

Market Position:
• Current market share: 8.5%
• Growth rate: 0.3% quarterly increase
• Competitive ranking: Top 5 in sector

Competitive Landscape:
• Direct competitors showing 2-3% growth
• Market expansion opportunities in emerging segments
• Technology adoption giving competitive advantage

Strategic Recommendations:
1. Invest in digital transformation initiatives
2. Expand into underserved market segments
3. Strengthen brand positioning and marketing
4. Consider strategic partnerships for market penetration

Market outlook remains positive with growth potential.`;
    } else {
      return `Analysis for: "${userPrompt}"

Based on the available data and current market conditions, here are the key insights:

• The company demonstrates strong financial health with consistent growth patterns
• Customer satisfaction metrics are above industry average
• Risk management protocols are effective and well-implemented
• Market positioning is competitive with room for strategic expansion

Recommendations:
1. Continue monitoring key performance indicators
2. Invest in data-driven decision making processes
3. Maintain focus on customer-centric approaches
4. Explore opportunities for operational efficiency improvements

This analysis is based on current data trends and market conditions. For more specific insights, please provide more detailed questions about particular areas of interest.`;
    }
  };

  // Handle key press for prompt submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  };

  return (
    <div className="analytics-page" style={{
      padding: 'clamp(10px, 3vw, 20px)',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Analytics Header */}
      <div style={{ 
        
        marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        padding: '0 clamp(10px, 3vw, 20px)'
      }}>
        
        <div style={{ 
          marginBottom: 'clamp(15px, 3vw, 20px)'
        }}>
          {/* Analytics Title */}
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
                  console.log('Analytics hamburger clicked!');
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
                Analytics
              </h1>
            </div>
            <p style={{
              margin: '0',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              lineHeight: '1.4'
            }}>
              Advanced analytics and insights for data-driven decision making
            </p>
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

        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'flex',
        gap: window.innerWidth <= 768 ? 'clamp(10px, 2vw, 15px)' : 'clamp(15px, 3vw, 20px)',
        alignItems: window.innerWidth <= 768 ? 'stretch' : 'flex-start',
        marginTop: 'clamp(5px, 1vw, 10px)',
        padding: '0 clamp(10px, 3vw, 20px)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Left Sidebar - Company Information */}
        <div style={{
          flex: window.innerWidth <= 768 ? 'none' : '0 0 clamp(200px, 25vw, 220px)',
          minWidth: window.innerWidth <= 768 ? 'auto' : '200px',
          maxWidth: window.innerWidth <= 768 ? '100%' : '220px',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          <CompanyInformationSidebar />
        </div>

        {/* Right Content Area */}
        <div style={{
          flex: '1',
          minWidth: 0,
          paddingLeft: window.innerWidth <= 768 ? '0' : 'clamp(10px, 2vw, 15px)',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          {/* LLM Analysis Section */}
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
              marginBottom: 'clamp(16px, 3vw, 20px)',
              paddingBottom: 'clamp(8px, 1vw, 12px)',
              borderBottom: '2px solid #3b82f6'
            }}>
              <h3 style={{
                fontSize: 'clamp(20px, 4vw, 24px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                AI Business Intelligence
              </h3>
            </div>
            
            {/* Prompt Input */}
            <div style={{
              marginBottom: 'clamp(20px, 3vw, 25px)'
            }}>
              <label style={{
                display: 'block',
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                fontWeight: '600',
                color: '#374151',
                marginBottom: 'clamp(8px, 1.5vw, 12px)'
              }}>
                Ask your business question
              </label>
              <div style={{
                display: 'flex',
                gap: 'clamp(12px, 2vw, 16px)',
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                justifyContent: 'center',
                maxWidth: '800px',
                margin: '0 auto',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
              }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask any question about your business data, performance metrics, market analysis, risk assessment, or any other business insights..."
                  style={{
                    flex: '1',
                    padding: 'clamp(12px, 2vw, 16px)',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 'clamp(80px, 8vw, 100px)',
                    maxHeight: '200px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'text',
                    lineHeight: '1.5'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim() || isLoading}
                  style={{
                    padding: 'clamp(10px, 1.8vw, 12px) clamp(16px, 2.5vw, 20px)',
                    backgroundColor: (!prompt.trim() || isLoading) ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: 'clamp(13px, 2.2vw, 14px)',
                    fontWeight: '600',
                    cursor: (!prompt.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: 'clamp(42px, 5vw, 48px)',
                    alignSelf: window.innerWidth <= 768 ? 'stretch' : 'center',
                    minWidth: window.innerWidth <= 768 ? 'auto' : 'clamp(90px, 12vw, 110px)',
                    width: window.innerWidth <= 768 ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#2563eb';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#3b82f6';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Analyzing...
                    </>
                  ) : (
                    'Analyze'
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: 'clamp(20px, 3vw, 25px)',
                marginTop: 'clamp(20px, 3vw, 25px)'
              }}>
                <h4 style={{
                  fontSize: 'clamp(16px, 3vw, 18px)',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: 'clamp(12px, 2vw, 16px)',
                  paddingBottom: 'clamp(8px, 1vw, 10px)',
                  borderBottom: '2px solid #3b82f6'
                }}>
                  Analysis Result
                </h4>
                
                <div style={{
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  lineHeight: '1.6',
                  color: '#374151',
                  whiteSpace: 'pre-line',
                  textAlign: 'left'
                }}>
                  {analysis}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
