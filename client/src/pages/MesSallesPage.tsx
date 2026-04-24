import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listVenues, myBookings } from '../services/api';
import VenueCard from '../components/VenueCard';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { IVenueBooking } from '../types/venue';

const MesSallesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'salles' | 'reservations'>('salles');

  const { data: venuesResponse, isLoading: loadingVenues } = useQuery({
    queryKey: ['venues', 'mine'],
    queryFn: () => listVenues({ owner: 'me' }),
    retry: 1,
    retryDelay: 1000,
  });

  const { data: bookingsResponse, isLoading: loadingBookings } = useQuery<IVenueBooking[]>({
    queryKey: ['venue-owner-bookings'],
    queryFn: myBookings,
    retry: 1,
    retryDelay: 1000,
  });

  const myVenues = venuesResponse?.venues || [];
  const bookings = bookingsResponse || [];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', paddingBottom: 60, padding: '20px' }}>
      <style>{`
        @media (max-width: 640px) {
          .mes-salles-header h1 { font-size: 1.8em !important; }
          .tab-btn { padding: 10px 16px !important; font-size: 14px !important; }
          .venue-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div className="mes-salles-header" style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5em', fontWeight: 800, color: '#ff416c' }}>
            Mes Salles
          </h1>
          <p style={{ margin: 0, fontSize: '1.1em', color: '#aaa' }}>
            Gérez vos salles et les demandes de réservation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setActiveTab('salles')}
            className="tab-btn"
            style={{
              padding: '12px 24px',
              background: activeTab === 'salles' ? 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' : 'transparent',
              color: activeTab === 'salles' ? '#fff' : '#888',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Mes Salles ({myVenues.length})
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className="tab-btn"
            style={{
              padding: '12px 24px',
              background: activeTab === 'reservations' ? 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' : 'transparent',
              color: activeTab === 'reservations' ? '#fff' : '#888',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Réservations ({bookings.length})
          </button>
        </div>

        {activeTab === 'salles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <button
                onClick={() => navigate('/venues/new')}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,65,108,0.3)',
                }}
              >
                + Créer une salle
              </button>
            </div>

            {loadingVenues ? (
              <LoadingSpinner message="Chargement de vos salles..." />
            ) : myVenues.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '64px 24px',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 20,
              }}>
                <div style={{ fontSize: 60, marginBottom: 20 }}>🏛️</div>
                <h3 style={{ color: '#fff', fontSize: 22, marginBottom: 10 }}>Aucune salle pour le moment</h3>
                <p style={{ color: '#888', fontSize: 15, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
                  Créez votre première salle pour commencer à recevoir des demandes de réservation.
                </p>
                <button
                  onClick={() => navigate('/venues/new')}
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
                  Créer ma première salle
                </button>
              </div>
            ) : (
              <>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
                  {myVenues.length} salle{myVenues.length > 1 ? 's' : ''}
                </p>
                <div className="venue-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 24,
                }}>
                  {myVenues.map((venue) => (
                    <VenueCard key={venue._id} venue={venue} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div>
            {loadingBookings ? (
              <LoadingSpinner message="Chargement de vos réservations..." />
            ) : bookings.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '64px 24px',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 20,
              }}>
                <div style={{ fontSize: 60, marginBottom: 20 }}>📅</div>
                <h3 style={{ color: '#fff', fontSize: 22, marginBottom: 10 }}>Aucune réservation</h3>
                <p style={{ color: '#888', fontSize: 15, marginBottom: 28 }}>
                  Vous n'avez pas encore de demande de réservation pour vos salles.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {bookings.map((booking) => (
                  <div
                    key={booking._id}
                    style={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 16,
                      padding: 24,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                          {booking.venue?.name || 'Salle'}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                          📍 {booking.venue?.city} · {booking.venue?.address}
                        </p>
                      </div>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: booking.status === 'PENDING' ? 'rgba(245,158,11,0.15)' :
                          booking.status === 'ACCEPTED' ? 'rgba(16,185,129,0.15)' :
                          booking.status === 'REFUSED' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                        color: booking.status === 'PENDING' ? '#f59e0b' :
                          booking.status === 'ACCEPTED' ? '#10b981' :
                          booking.status === 'REFUSED' ? '#ef4444' : '#9ca3af',
                      }}>
                        {booking.status === 'PENDING' ? 'En attente' :
                         booking.status === 'ACCEPTED' ? 'Acceptée' :
                         booking.status === 'REFUSED' ? 'Refusée' :
                         booking.status === 'EXPIRED' ? 'Expirée' :
                         booking.status === 'CONFIRMED' ? 'Confirmée' : booking.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Date</p>
                        <p style={{ margin: 0, fontSize: 14, color: '#ccc', fontWeight: 600 }}>
                          {new Date(booking.requestedDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Horaire</p>
                        <p style={{ margin: 0, fontSize: 14, color: '#ccc', fontWeight: 600 }}>
                          {booking.startTime} – {booking.endTime}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Demandeur</p>
                        <p style={{ margin: 0, fontSize: 14, color: '#ccc' }}>
                          {booking.requester?.firstName} {booking.requester?.lastName}
                        </p>
                      </div>
                    </div>

                    {booking.message && (
                      <p style={{ margin: '12px 0 0', fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>
                        Message: "{booking.message}"
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button
                        onClick={() => navigate(`/venues/${booking.venue?._id}?tab=bookings&status=${booking.status}`)}
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
                        Voir la réservation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MesSallesPage;