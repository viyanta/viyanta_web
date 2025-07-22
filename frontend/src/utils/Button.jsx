import React from 'react'

function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick, 
  type = 'button',
  className = '',
  style = {},
  icon = null,
  loading = false,
  ...props 
}) {
  const getButtonStyles = () => {
    const baseStyles = {
      padding: size === 'small' ? '0.5rem 1rem' : size === 'large' ? '1rem 2rem' : '0.75rem 1.5rem',
      fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem',
      border: 'none',
      borderRadius: 'var(--border-radius)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'var(--transition)',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: disabled || loading ? 0.6 : 1,
      textDecoration: 'none',
      ...style
    };

    const variants = {
      primary: {
        backgroundColor: 'var(--sub-color)',
        color: 'white',
      },
      secondary: {
        backgroundColor: 'var(--button-color)',
        color: 'var(--text-color-dark)',
      },
      success: {
        backgroundColor: 'var(--success-color)',
        color: 'white',
      },
      warning: {
        backgroundColor: 'var(--warning-color)',
        color: 'var(--text-color-dark)',
      },
      error: {
        backgroundColor: 'var(--error-color)',
        color: 'white',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--sub-color)',
        border: '1px solid var(--sub-color)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--sub-color)',
      }
    };

    return {
      ...baseStyles,
      ...variants[variant]
    };
  };

  const handleMouseEnter = (e) => {
    if (disabled || loading) return;
    
    const hoverStyles = {
      primary: { backgroundColor: 'var(--button-hover-color)' },
      secondary: { backgroundColor: '#c8d5e8' },
      success: { backgroundColor: '#218838' },
      warning: { backgroundColor: '#e0a800' },
      error: { backgroundColor: '#c82333' },
      outline: { backgroundColor: 'var(--sub-color)', color: 'white' },
      ghost: { backgroundColor: 'rgba(63, 114, 175, 0.1)' }
    };

    Object.assign(e.target.style, hoverStyles[variant]);
  };

  const handleMouseLeave = (e) => {
    if (disabled || loading) return;
    
    const originalStyles = getButtonStyles();
    Object.assign(e.target.style, originalStyles);
  };

  return (
    <button
      type={type}
      className={className}
      style={getButtonStyles()}
      onClick={disabled || loading ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{ 
          width: '1rem', 
          height: '1rem', 
          border: '2px solid transparent',
          borderTop: '2px solid currentColor',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite' 
        }} />
      )}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </button>
  );
}

export default Button