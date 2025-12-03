import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../utils/Button.jsx';

function UserAgreement({ onAccept, onReject }) {
  const [selectedOption, setSelectedOption] = useState('accept');
  const navigate = useNavigate();

  const handleAccept = () => {
    if (selectedOption === 'accept') {
      onAccept();
    } else {
      handleReject();
    }
  };

  const handleReject = async () => {
    onReject(); // This will call the logout function
    // The logout will automatically redirect to login page via AuthContext
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px 24px',
          borderBottom: '1px solid #dee2e6',
          borderRadius: '8px 8px 0 0'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#212529',
            textAlign: 'center'
          }}>
            User License Agreement
          </h3>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '24px',
          overflowY: 'auto',
          maxHeight: 'calc(80vh - 120px)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ 
              color: 'var(--main-color)', 
              marginBottom: '16px',
              fontSize: '20px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Viyanta Insights
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                color: '#212529', 
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px'
              }}>
                1. Introduction
              </h3>
              <p style={{ 
                color: '#495057', 
                lineHeight: '1.6',
                marginBottom: 0,
                fontSize: '14px'
              }}>
                Welcome to Viyanta Insights! Please read the following terms and conditions carefully. 
                By clicking "I Accept", you agree to be bound by these terms. If you do not agree to these terms, 
                please click "I Do Not Accept" and refrain from using the product.
              </p>
            </div>
          </div>

          {/* Subscription Plans Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              color: 'var(--main-color)', 
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              2. Subscription Plans
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ 
                color: '#212529', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                2.1 Trial Subscription
              </h4>
              <ul style={{ 
                color: '#495057', 
                fontSize: '14px',
                lineHeight: '1.5',
                paddingLeft: '20px',
                margin: 0
              }}>
                <li style={{ marginBottom: '4px' }}><strong>Duration:</strong> Valid for 6 working days from the date of registration.</li>
                <li style={{ marginBottom: '4px' }}><strong>Access:</strong> Full access to all product features during the trial.</li>
                <li><strong>Transition to Paid Subscription:</strong> Required after the trial period to continue use.</li>
              </ul>
            </div>

            <div style={{ marginBottom: '0' }}>
              <h4 style={{ 
                color: '#212529', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                2.2 Paid Subscription
              </h4>
              <ul style={{ 
                color: '#495057', 
                fontSize: '14px',
                lineHeight: '1.5',
                paddingLeft: '20px',
                margin: 0
              }}>
                <li style={{ marginBottom: '4px' }}><strong>Duration:</strong> Valid for one year from the date of subscription.</li>
                <li style={{ marginBottom: '4px' }}><strong>Renewal:</strong> Must be renewed annually to maintain access.</li>
                <li><strong>Fees:</strong> Non-refundable and subject to change, with users notified of changes in advance.</li>
              </ul>
            </div>
          </div>

          {/* Data Usage Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              color: 'var(--main-color)', 
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              3. Data Usage
            </h3>
            
            <div>
              <h4 style={{ 
                color: '#212529', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                3.1 Data Collection
              </h4>
              <p style={{ 
                color: '#495057', 
                fontSize: '14px',
                lineHeight: '1.5',
                margin: 0
              }}>
                Data is collected to provide, improve, and personalize services. This data may include 
                user-generated content, usage data, and other information provided by the user.
              </p>
            </div>
          </div>

          {/* Radio Buttons */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              color: '#212529',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              Agreement Selection
            </h4>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px',
              cursor: 'pointer',
              padding: '8px 0'
            }} onClick={() => setSelectedOption('accept')}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #ccc',
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedOption === 'accept' ? 'var(--main-color)' : 'transparent'
              }}>
                {selectedOption === 'accept' && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'white'
                  }}></div>
                )}
              </div>
              <span style={{ 
                color: '#212529', 
                fontSize: '14px',
                fontWeight: selectedOption === 'accept' ? '600' : '400'
              }}>
                I Accept
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              padding: '8px 0'
            }} onClick={() => setSelectedOption('reject')}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #ccc',
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedOption === 'reject' ? 'var(--main-color)' : 'transparent'
              }}>
                {selectedOption === 'reject' && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'white'
                  }}></div>
                )}
              </div>
              <span style={{ 
                color: '#212529', 
                fontSize: '14px',
                fontWeight: selectedOption === 'reject' ? '600' : '400'
              }}>
                I Do Not Accept
              </span>
            </div>
          </div>


          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid #dee2e6'
          }}>
            <Button 
              variant="secondary" 
              onClick={handleReject}
              style={{ 
                minWidth: '140px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              I Do Not Accept
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAccept}
              style={{ 
                minWidth: '140px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              I Accept
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserAgreement;
