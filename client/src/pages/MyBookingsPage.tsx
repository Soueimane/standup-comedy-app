import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { myBookings, cancelBooking, createVenueCheckoutSession, confirmVenuePayment } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import BookingStatusBadge from '../components/BookingStatusBadge';
import Navbar from '../components/Navbar';
import VenuesTabs from '../components/VenuesTabs';
import type { IVenueBooking } from '../types/venue';

const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // useRef guard prevents double-fire in React Strict Mode
  const paymentHandledRef = useRef(false);

  // Gestion du retour Stripe
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId && !paymentHandledRef.current) {
      paymentHandledRef.current = true;
      // Clear URL params immediately to prevent re-triggering
      setSearchParams({}, { replace: true });

      confirmVenuePayment(sessionId)
        .then(() => {
          showSuccess(SuccessMessages.BOOKING_PAYMENT_SUCCESS);
          queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
        })
        .catch((err: unknown) => {
          queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
          // Differentiate "already confirmed" (200/409) from real errors
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 200 || status === 409) {
            // Webhook already handled it — no error shown
          } else {
            showError('Le paiement a été reçu mais la confirmation a échoué. Veuillez réessayer.');
          }
        });
    } else if (payment === 'cancelled') {
      showError('Paiement annulé.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const { data, isLoading, error } = useQuery<IVenueBooking[]>({
    queryKey: ['my-bookings'],
    queryFn: myBookings,
  });

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Annuler cette demande de réservation ?')) return;
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      showSuccess(SuccessMessages.BOOKING_CANCELLED);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_CANCEL_FAILED));
    } finally {
      setCancellingId(null);
    }
  };

  const handlePay = async (bookingId: string) => {
    setPayingId(bookingId);
    try {
      const data = await createVenueCheckoutSession(bookingId);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        showError('Impossible de lancer le paiement. Veuillez réessayer.');
        setPayingId(null);
      }
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_PAYMENT_FAILED));
      setPayingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', paddingBottom: 60 }}>
      <style>{`
        @media (max-width: 640px) {
          .my-bookings-header h1 { font-size: 1.8em !important; }
          .booking-card-header { flex-direction: column; align-items: flex-start !important; }
          .booking-card-actions { flex-direction: column; }
          .booking-card-actions button { width: 100%; }
        }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div className="my-bookings-header" style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5em', fontWeight: 800, color: '#ff416c' }}>
            Salles
          </h1>
          <p style={{ margin: 0, fontSize: '1.1em', color: '#aaa' }}>
            Gérez vos réservations et explorez les salles disponibles.
          </p>
        </div>

        <VenuesTabs />

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: '4px solid rgba(255,65,108,0.2)',
                borderTop: '4px solid #ff416c',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#888' }}>Chargement...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#ef4444' }}>Impossible de charger vos réservations.</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 20 }}>📅</div>
            <h3 style={{ color: '#fff', fontSize: 22, marginBottom: 10 }}>Aucune réservation</h3>
            <p style={{ color: '#888', fontSize: 15, marginBottom: 28 }}>
              Vous n'avez encore fait aucune demande de réservation.
            </p>
            <button
              onClick={() => navigate('/venues')}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Explorer les salles
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.map((booking) => (
              <div
                key={booking._id}
                style={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 24,
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  className="booking-card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <button
                      onClick={() => navigate(`/venues/${booking.venue?._id}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        {booking.venue?.name || 'Salle supprimée'}
                      </h3>
                    </button>
                    <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                      📍 {booking.venue?.city} · {booking.venue?.address}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>

                {/* Détails de la réservation */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 16,
                    marginBottom: 16,
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Date
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: '#ccc', fontWeight: 600 }}>
                      {new Date(booking.requestedDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Horaires
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: '#ccc', fontWeight: 600 }}>
                      {booking.startTime} – {booking.endTime}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Demande envoyée
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: '#ccc' }}>
                      {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {booking.message && (
                  <p
                    style={{
                      margin: '0 0 14px 0',
                      fontSize: 13,
                      color: '#bbb',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '10px 14px',
                      borderRadius: 8,
                      borderLeft: '3px solid rgba(255,65,108,0.4)',
                      fontStyle: 'italic',
                    }}
                  >
                    Votre message : "{booking.message}"
                  </p>
                )}

                {booking.ownerResponse && (
                  <p
                    style={{
                      margin: '0 0 14px 0',
                      fontSize: 13,
                      color: '#10b981',
                      background: 'rgba(16,185,129,0.06)',
                      padding: '10px 14px',
                      borderRadius: 8,
                      borderLeft: '3px solid rgba(16,185,129,0.4)',
                    }}
                  >
                    Réponse du propriétaire : "{booking.ownerResponse}"
                  </p>
                )}

                <div className="booking-card-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(`/venues/${booking.venue?._id}`)}
                    style={{
                      padding: '8px 18px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#ccc',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Voir la salle
                  </button>
                  {booking.status === 'ACCEPTED' && (booking.venue as any)?.pricePerEvent > 0 && (
                    <button
                      onClick={() => handlePay(booking._id)}
                      disabled={payingId === booking._id}
                      style={{
                        padding: '8px 18px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: payingId === booking._id ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        opacity: payingId === booking._id ? 0.6 : 1,
                      }}
                    >
                      {payingId === booking._id
                        ? 'Redirection...'
                        : `Payer ${((booking.venue as any)?.pricePerEvent ?? 0).toLocaleString('fr-FR')} €`}
                    </button>
                  )}
                  {(booking.status === 'PENDING' || booking.status === 'ACCEPTED') && (
                    <button
                      onClick={() => handleCancel(booking._id)}
                      disabled={cancellingId === booking._id}
                      style={{
                        padding: '8px 18px',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8,
                        cursor: cancellingId === booking._id ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        opacity: cancellingId === booking._id ? 0.6 : 1,
                      }}
                    >
                      {cancellingId === booking._id ? 'Annulation...' : 'Annuler la demande'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;
