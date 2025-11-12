import React, { type CSSProperties } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalStyle: CSSProperties = {
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    padding: '25px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '600px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const closeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#ffffff',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        {children}
      </div>
    </div>
  );
}

export default Modal; 