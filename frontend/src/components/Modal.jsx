import React from 'react';

function Modal({ open, onClose, children, title }) {
  if (!open) return null;

  // Lock background scroll while modal is mounted
  React.useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBodyOverflow || '';
      html.style.overflow = prevHtmlOverflow || '';
    };
  }, []);

  const handleClose = () => {
    // Safety: restore scrolling instantly
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.35)',
      zIndex: 10000, // ensure it sits above sticky navbar/sidebar
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      paddingTop: '5rem' // Account for fixed navbar
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow)',
        width: 'min(1000px, 95vw)',
        maxHeight: 'calc(90vh - 4rem)', // Account for top padding
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sticky header inside modal */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          borderTopLeftRadius: 'var(--border-radius)',
          borderTopRightRadius: 'var(--border-radius)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--main-color)', 
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            {title}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid #e9ecef',
              borderRadius: 8,
              width: 36,
              height: 36,
              lineHeight: '34px',
              textAlign: 'center',
              cursor: 'pointer',
              color: 'var(--main-color)',
              fontSize: '1.2rem',
              fontWeight: '600',
              transition: 'var(--transition)'
            }}
            aria-label="Close"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.05)';
            }}
          >
            ×
          </button>
        </div>
        {/* Scrollable content */}
        <div style={{
          padding: '1rem',
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 4rem - 56px)' // Account for top padding and header
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
