import React from 'react'

function Card({ 
  children, 
  className = '', 
  style = {},
  hover = true,
  padding = 'default',
  ...props 
}) {
  const getPaddingStyle = () => {
    switch (padding) {
      case 'none': return '0';
      case 'small': return '1rem';
      case 'large': return '2rem';
      default: return '1.5rem';
    }
  };

  const cardStyles = {
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-light)',
    padding: getPaddingStyle(),
    marginBottom: '1rem',
    border: '1px solid #e9ecef',
    transition: hover ? 'var(--transition)' : 'none',
    ...style
  };

  const handleMouseEnter = (e) => {
    if (hover) {
      e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }
  };

  const handleMouseLeave = (e) => {
    if (hover) {
      e.currentTarget.style.boxShadow = 'var(--shadow-light)';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  };

  return (
    <div
      className={`card ${className}`}
      style={cardStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header Component
Card.Header = ({ children, className = '', style = {}, ...props }) => (
  <div
    className={`card-header ${className}`}
    style={{
      borderBottom: '1px solid #e9ecef',
      paddingBottom: '1rem',
      marginBottom: '1rem',
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

// Card Body Component
Card.Body = ({ children, className = '', style = {}, ...props }) => (
  <div
    className={`card-body ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);

// Card Footer Component
Card.Footer = ({ children, className = '', style = {}, ...props }) => (
  <div
    className={`card-footer ${className}`}
    style={{
      borderTop: '1px solid #e9ecef',
      paddingTop: '1rem',
      marginTop: '1rem',
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

export default Card
