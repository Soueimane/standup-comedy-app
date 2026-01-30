import React, { type CSSProperties } from 'react';
import ToastAlert from './ToastAlert';
import CustomAlert from './CustomAlert';

interface Alert {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  mode: 'toast' | 'modal';
  autoDismiss: boolean;
}

interface AlertContainerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

function AlertContainer({ alerts, onDismiss }: AlertContainerProps) {
  const toasts = alerts.filter(a => a.mode === 'toast');
  const modals = alerts.filter(a => a.mode === 'modal');

  // Afficher seulement le premier modal (comportement bloquant)
  const activeModal = modals[0];

  const toastContainerStyle: CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'auto',
  };

  return (
    <>
      {/* CSS Keyframes pour les animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Container des toasts */}
      {toasts.length > 0 && (
        <div style={toastContainerStyle}>
          {toasts.map(toast => (
            <ToastAlert
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={onDismiss}
              autoDismiss={toast.autoDismiss}
            />
          ))}
        </div>
      )}

      {/* Modal Alert (utilise le CustomAlert existant) */}
      {activeModal && (
        <CustomAlert
          message={activeModal.message}
          type={activeModal.type}
          onClose={() => onDismiss(activeModal.id)}
        />
      )}
    </>
  );
}

export default AlertContainer;
