import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../utils/Button.jsx'

function Subscription({ onMenuClick }) {
  const [selectedType, setSelectedType] = useState(null); // null, 'digit', or 'assure'
  const navigate = useNavigate();

  const digitSubTypes = [
    { name: 'Digit Plus', id: 'digit-plus' },
    { name: 'Digit Life', id: 'digit-life' },
    { name: 'Digit Nonlife', id: 'digit-nonlife' }
  ];

  const assureSubTypes = [
    { name: 'Assure Plus', id: 'assure-plus' },
    { name: 'Assure Life', id: 'assure-life' },
    { name: 'Assure Nonlife', id: 'assure-nonlife' }
  ];

  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };

  const handleSubTypeSelect = (subType) => {
    // Handle subscription selection here
    // You can add navigation or API call here
    alert(`You selected: ${subType.name}`);
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button
            onClick={onMenuClick}
            style={{
              background: 'rgba(63, 114, 175, 0.1)',
              border: '1px solid rgba(63, 114, 175, 0.3)',
              color: 'var(--main-color)',
              borderRadius: '8px',
              padding: '0.625rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.125rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '40px',
              minHeight: '40px'
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
          <div>
            <h1 style={{ 
              margin: 0,
              fontSize: 'clamp(20px, 4vw, 32px)',
              lineHeight: '1.2',
              fontWeight: '600',
              color: 'var(--main-color)'
            }}>
              {selectedType 
                ? `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Subscriptions` 
                : 'Subscription Plans'
              }
            </h1>
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              fontSize: '1rem', 
              color: '#888'
            }}>
              {selectedType 
                ? `Choose your ${selectedType} subscription plan.`
                : 'Select a subscription type to view available plans.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ marginBottom: '2rem' }}>
        <Button 
          variant="outline" 
          size="small" 
          icon="←"
          onClick={handleBack}
        >
          {selectedType ? 'Back to Types' : 'Back to Profile'}
        </Button>
      </div>

      {/* Main Content */}
      {!selectedType ? (
        // Show main types: Digit and Assure
        <div className="grid grid-2" style={{ gap: '2.5rem' }}>
          <div 
            className="card" 
            style={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0,
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#fff',
              boxShadow: 'var(--shadow-medium)'
            }}
            onClick={() => handleTypeSelect('digit')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = 'var(--main-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, rgba(54, 101, 155, 0.7) 0%, rgba(63, 114, 175, 0.8) 100%)',
              padding: '2.5rem',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                lineHeight: '1'
              }}>
                🔢
              </div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.75rem',
                fontWeight: '600',
                color: 'white'
              }}>
                Digit
              </h2>
            </div>
            <div style={{ padding: '2.5rem' }}>
              <div style={{ 
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ 
                  color: '#666', 
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  lineHeight: '1.6'
                }}>
                  Digital subscription plans designed for modern insurance needs
                </p>
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: '1.5rem 0',
                  textAlign: 'left'
                }}>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Advanced digital features
                  </li>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Modern interface
                  </li>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Multiple plan options
                  </li>
                </ul>
              </div>
              <Button variant="primary" size="medium" style={{ width: '100%' }}>
                View Plans →
              </Button>
            </div>
          </div>

          <div 
            className="card" 
            style={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0,
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#fff',
              boxShadow: 'var(--shadow-medium)'
            }}
            onClick={() => handleTypeSelect('assure')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = 'var(--main-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, rgba(54, 101, 155, 0.7) 0%, rgba(63, 114, 175, 0.8) 100%)',
              padding: '2.5rem',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                lineHeight: '1'
              }}>
                🛡️
              </div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.75rem',
                fontWeight: '600',
                color: 'white'
              }}>
                Assure
              </h2>
            </div>
            <div style={{ padding: '2.5rem' }}>
              <div style={{ 
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ 
                  color: '#666', 
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  lineHeight: '1.6'
                }}>
                  Comprehensive assurance subscription plans for complete coverage
                </p>
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: '1.5rem 0',
                  textAlign: 'left'
                }}>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Full coverage options
                  </li>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Premium support
                  </li>
                  <li style={{ 
                    padding: '0.5rem 0', 
                    color: '#666',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--success-color)' }}>✓</span>
                    Multiple plan options
                  </li>
                </ul>
              </div>
              <Button variant="primary" size="medium" style={{ width: '100%' }}>
                View Plans →
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Show sub-types based on selected type
        <div className="grid grid-3" style={{ gap: '2rem' }}>
          {(selectedType === 'digit' ? digitSubTypes : assureSubTypes).map((subType) => (
            <div 
              key={subType.id}
              className="card" 
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxShadow: 'var(--shadow-medium)'
              }}
              onClick={() => handleSubTypeSelect(subType)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.borderColor = 'var(--main-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, rgba(54, 101, 155, 0.15) 0%, rgba(63, 114, 175, 0.1) 100%)',
                padding: '1.75rem',
                textAlign: 'center',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '0.75rem',
                  lineHeight: '1'
                }}>
                  {selectedType === 'digit' ? '🔢' : '🛡️'}
                </div>
                <h3 style={{ 
                  margin: 0, 
                  color: 'var(--main-color)',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  {subType.name}
                </h3>
              </div>
              <div style={{ 
                padding: '1.75rem', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ 
                    color: '#666', 
                    marginBottom: '1.25rem', 
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    textAlign: 'center'
                  }}>
                    {selectedType === 'digit' 
                      ? 'Premium digital subscription plan with advanced features'
                      : 'Comprehensive assurance subscription plan with full coverage'
                    }
                  </p>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    textAlign: 'left'
                  }}>
                    <li style={{ 
                      padding: '0.4rem 0', 
                      color: '#666',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ color: 'var(--success-color)' }}>✓</span>
                      Full access
                    </li>
                    <li style={{ 
                      padding: '0.4rem 0', 
                      color: '#666',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ color: 'var(--success-color)' }}>✓</span>
                      Premium features
                    </li>
                    <li style={{ 
                      padding: '0.4rem 0', 
                      color: '#666',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ color: 'var(--success-color)' }}>✓</span>
                      24/7 Support
                    </li>
                  </ul>
                </div>
                <Button 
                  variant="primary" 
                  size="small" 
                  style={{ 
                    width: '100%',
                    marginTop: '1.5rem'
                  }}
                >
                  Select Plan
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Subscription

