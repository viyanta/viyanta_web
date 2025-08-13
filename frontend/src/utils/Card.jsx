import React from 'react'

function Card({ 
  children, 
  className = '', 
  hover = true,
  padding = 'default',
  ...props 
}) {
  const getCardClasses = () => {
    const baseClass = 'card';
    const paddingClass = `card--padding-${padding}`;
    const hoverClass = hover ? 'card--hover' : '';
    
    return `${baseClass} ${paddingClass} ${hoverClass} ${className}`.trim();
  };

  return (
    <div
      className={getCardClasses()}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header Component
Card.Header = ({ children, className = '', ...props }) => (
  <div
    className={`card__header ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card Body Component
Card.Body = ({ children, className = '', ...props }) => (
  <div
    className={`card__body ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card Footer Component
Card.Footer = ({ children, className = '', ...props }) => (
  <div
    className={`card__footer ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card
