import React from 'react'

function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick, 
  type = 'button',
  className = '',
  icon = null,
  loading = false,
  ...props 
}) {
  const getButtonClasses = () => {
    const baseClass = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const stateClass = (disabled || loading) ? 'btn--disabled' : '';
    
    return `${baseClass} ${variantClass} ${sizeClass} ${stateClass} ${className}`.trim();
  };

  return (
    <button
      type={type}
      className={getButtonClasses()}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      {icon && !loading && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  );
}

export default Button