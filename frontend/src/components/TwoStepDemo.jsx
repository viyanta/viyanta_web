import React, { useState } from 'react';

const TwoStepDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { number: 1, title: "Select Company", description: "Choose the insurance company" },
    { number: 2, title: "Upload PDF", description: "Upload the PDF file to be processed" },
    { number: 3, title: "Select PDF File", description: "Choose from uploaded PDFs" },
    { number: 4, title: "Select Form", description: "Choose the specific form to extract" },
    { number: 5, title: "Extracting Form Data", description: "🐍 Python extraction using Camelot and templates", phase: "python" },
    { number: 6, title: "Gemini Correction", description: "🤖 AI-powered verification and data enhancement", phase: "gemini" },
    { number: 7, title: "Extraction Results", description: "View the final extracted and corrected data" }
  ];

  const simulateExtraction = async () => {
    setIsProcessing(true);
    
    // Simulate Step 5: Python extraction
    setCurrentStep(5);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate Step 6: Gemini correction
    setCurrentStep(6);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show final results
    setCurrentStep(7);
    setIsProcessing(false);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsProcessing(false);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '2rem auto',
      padding: '2rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ textAlign: 'center', color: '#1e40af', marginBottom: '2rem' }}>
        🔄 Two-Step Extraction Process Demo
      </h2>

      {/* Steps Overview */}
      <div style={{ marginBottom: '2rem' }}>
        {steps.map((step, index) => (
          <div
            key={step.number}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '8px',
              backgroundColor: currentStep >= step.number ? 
                (step.phase === 'python' ? '#e3f2fd' : 
                 step.phase === 'gemini' ? '#e8f5e8' : '#f0f9ff') : '#ffffff',
              border: currentStep >= step.number ? 
                (step.phase === 'python' ? '1px solid #2196f3' : 
                 step.phase === 'gemini' ? '1px solid #4caf50' : '1px solid #3b82f6') : '1px solid #e5e7eb',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentStep >= step.number ? 
                (step.phase === 'python' ? '#2196f3' : 
                 step.phase === 'gemini' ? '#4caf50' : '#3b82f6') : '#e5e7eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.9rem',
              marginRight: '1rem'
            }}>
              {currentStep > step.number ? '✅' : step.number}
            </div>
            <div>
              <h4 style={{ 
                margin: 0, 
                color: currentStep >= step.number ? '#1e40af' : '#6b7280',
                fontSize: '1rem'
              }}>
                {step.number}️⃣ {step.title}
              </h4>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                color: currentStep >= step.number ? '#374151' : '#9ca3af',
                fontSize: '0.9rem'
              }}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center' }}>
        {currentStep === 0 && (
          <button
            onClick={simulateExtraction}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              marginRight: '1rem'
            }}
          >
            🚀 Start Demo
          </button>
        )}

        {isProcessing && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff8e1',
            borderRadius: '8px',
            border: '1px solid #ffd54f',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            <p style={{ margin: 0, color: '#f57f17' }}>
              {currentStep === 5 ? '🐍 Python extraction in progress...' : 
               currentStep === 6 ? '🤖 Gemini AI correction in progress...' : 
               'Processing...'}
            </p>
          </div>
        )}

        {currentStep === 7 && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#e8f5e8',
            borderRadius: '8px',
            border: '1px solid #4caf50',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ margin: 0, color: '#2e7d32', fontWeight: '500' }}>
              Two-Step Extraction Completed Successfully!
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#388e3c' }}>
              Step 5: Python extraction → Step 6: Gemini AI correction
            </p>
          </div>
        )}

        {currentStep > 0 && (
          <button
            onClick={resetDemo}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            🔄 Reset Demo
          </button>
        )}
      </div>

      {/* Explanation */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        border: '1px solid #cbd5e1'
      }}>
        <h4 style={{ color: '#1e40af', margin: '0 0 0.5rem 0' }}>
          How the Two-Step Process Works:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
          <li><strong>Step 5:</strong> Python script uses Camelot library and templates to extract raw table data from PDF</li>
          <li><strong>Step 6:</strong> Gemini AI analyzes the extracted data, compares it with the original PDF, and applies corrections</li>
          <li><strong>Result:</strong> High-quality, verified data that combines the speed of Python extraction with the accuracy of AI correction</li>
        </ul>
      </div>
    </div>
  );
};

export default TwoStepDemo;
