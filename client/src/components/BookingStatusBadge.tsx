import React from 'react';
import type { VenueBookingStatus } from '../types/venue';

interface BookingStatusBadgeProps {
  status: VenueBookingStatus;
}

const STATUS_CONFIG: Record<VenueBookingStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ACCEPTED: { label: 'Acceptée — paiement requis', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  REFUSED: { label: 'Refusée', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  CONFIRMED: { label: 'Confirmée', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  CANCELLED_BY_OWNER: { label: 'Annulée par le propriétaire', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  CANCELLED_BY_REQUESTER: { label: 'Annulée par vous', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}40`,
        letterSpacing: '0.02em',
      }}
    >
      {config.label}
    </span>
  );
};

export default BookingStatusBadge;
