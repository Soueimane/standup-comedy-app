import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listVenueBookings, updateBookingStatus, cancelBookingByOwner } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import BookingStatusBadge from './BookingStatusBadge';
import type { IVenueBooking } from '../types/venue';

interface VenueBookingsManagementProps {
  venueId: string;
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'ACCEPTED', label: 'Acceptées' },
  { key: 'REFUSED', label: 'Refusées' },
] as const;

const VenueBookingsManagement: React.FC<VenueBookingsManagementProps> = ({ venueId }) => {
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [ownerResponse, setOwnerResponse] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IVenueBooking[]>({
    queryKey: ['venue-bookings', venueId],
    queryFn: () => listVenueBookings(venueId),
  });

  const handleAccept = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await updateBookingStatus(bookingId, 'ACCEPTED', ownerResponse || undefined);
      showSuccess(SuccessMessages.BOOKING_ACCEPTED);
      queryClient.invalidateQueries({ queryKey: ['venue-bookings', venueId] });
      setRespondingId(null);
      setOwnerResponse('');
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_UPDATE_FAILED));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await updateBookingStatus(bookingId, 'REFUSED', ownerResponse || undefined);
      showSuccess(SuccessMessages.BOOKING_REFUSED);
      queryClient.invalidateQueries({ queryKey: ['venue-bookings', venueId] });
      setRespondingId(null);
      setOwnerResponse('');
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_UPDATE_FAILED));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelByOwner = async (bookingId: string) => {
    if (!window.confirm('Annuler cette réservation acceptée ?')) return;
    setActionLoading(bookingId);
    try {
      await cancelBookingByOwner(bookingId);
      showSuccess(SuccessMessages.BOOKING_CANCELLED);
      queryClient.invalidateQueries({ queryKey: ['venue-bookings', venueId] });
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_CANCEL_FAILED));
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
        Chargement des réservations...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
        Impossible de charger les réservations.
      </div>
    );
  }

  const bookings = data || [];
  const filtered = statusFilter === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  if (bookings.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#888',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
        <p style={{ margin: 0, fontSize: 15 }}>Aucune demande de réservation pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @media (max-width: 480px) {
          .booking-mgmt-header { flex-direction: column; align-items: flex-start !important; }
          .booking-respond-actions { flex-direction: column; }
          .booking-respond-actions button { width: 100%; }
        }
      `}</style>
      {/* Filtre par statut */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map(({ key, label }) => {
          const count = key === 'ALL'
            ? bookings.length
            : bookings.filter((b) => b.status === key).length;
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: isActive
                  ? 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'
                  : 'rgba(255,255,255,0.07)',
                color: isActive ? '#fff' : '#888',
                outline: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filtered.map((booking) => (
        <div
          key={booking._id}
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div
            className="booking-mgmt-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <p style={{ margin: '0 0 2px 0', fontWeight: 700, color: '#fff', fontSize: 15 }}>
                {booking.requester?.firstName} {booking.requester?.lastName}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                {new Date(booking.requestedDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                · {booking.startTime} – {booking.endTime}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {booking.message && (
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: 13,
                color: '#ccc',
                background: 'rgba(255,255,255,0.04)',
                padding: '10px 14px',
                borderRadius: 8,
                borderLeft: '3px solid rgba(255,65,108,0.5)',
              }}
            >
              "{booking.message}"
            </p>
          )}

          {booking.ownerResponse && (
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#10b981' }}>
              Votre réponse : {booking.ownerResponse}
            </p>
          )}

          {/* Actions pour PENDING */}
          {booking.status === 'PENDING' && (
            <div>
              {respondingId === booking._id ? (
                <div>
                  <textarea
                    value={ownerResponse}
                    onChange={(e) => setOwnerResponse(e.target.value)}
                    placeholder="Message optionnel pour le demandeur..."
                    rows={2}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                      marginBottom: 10,
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                  <div className="booking-respond-actions" style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleAccept(booking._id)}
                      disabled={actionLoading === booking._id}
                      style={{
                        padding: '8px 18px',
                        background: 'rgba(16,185,129,0.2)',
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.4)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      ✓ Accepter
                    </button>
                    <button
                      onClick={() => handleRefuse(booking._id)}
                      disabled={actionLoading === booking._id}
                      style={{
                        padding: '8px 18px',
                        background: 'rgba(239,68,68,0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      ✕ Refuser
                    </button>
                    <button
                      onClick={() => { setRespondingId(null); setOwnerResponse(''); }}
                      style={{
                        padding: '8px 18px',
                        background: 'transparent',
                        color: '#888',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setRespondingId(booking._id); setOwnerResponse(''); }}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Répondre
                </button>
              )}
            </div>
          )}

          {/* Annuler si ACCEPTED */}
          {booking.status === 'ACCEPTED' && (
            <button
              onClick={() => handleCancelByOwner(booking._id)}
              disabled={actionLoading === booking._id}
              style={{
                padding: '8px 18px',
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Annuler cette réservation
            </button>
          )}
        </div>
      ))}
      </div>
    </div>
  );
};

export default VenueBookingsManagement;
