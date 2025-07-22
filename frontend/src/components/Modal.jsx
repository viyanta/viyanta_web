import React from 'react';

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.35)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow)',
        minWidth: 400,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--main-color)'
          }}
          aria-label="Close"
        >
          &times;
        </button>
        {title && <h2 style={{ marginBottom: '1.5rem', color: 'var(--main-color)' }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default Modal;
