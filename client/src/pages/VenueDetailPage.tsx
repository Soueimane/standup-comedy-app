import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVenue, deleteVenue, listBlockedDates } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../hooks/useAuth';
import VenueBookingForm from '../components/VenueBookingForm';
import VenueBookingsManagement from '../components/VenueBookingsManagement';
import BlockedDatesManager from '../components/BlockedDatesManager';
import EditVenueForm from '../components/EditVenueForm';
import VenueMap from '../components/VenueMap';
import Navbar from '../components/Navbar';
import type { IVenue, IVenueBlockedDate } from '../types/venue';

type OwnerTab = 'info' | 'bookings' | 'blocked' | 'settings';

const VENUE_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar',
  theatre: 'Théâtre',
  salle_des_fetes: 'Salle des fêtes',
  autre: 'Autre',
};

const VenueDetailPage: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OwnerTab>('info');
  const [activePhoto, setActivePhoto] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: venue, isLoading, error } = useQuery<IVenue>({
    queryKey: ['venue', venueId],
    queryFn: () => getVenue(venueId!),
    enabled: !!venueId,
  });

  const { data: blockedDatesData } = useQuery<IVenueBlockedDate[]>({
    queryKey: ['venue-blocked-dates', venueId],
    queryFn: () => listBlockedDates(venueId!),
    enabled: !!venueId,
  });

  const blockedDates: Date[] = (blockedDatesData ?? []).map(
    (d) => new Date(d.date)
  );

  const isOwner = venue && user && (venue.owner?._id === user._id || venue.owner?.id === user._id || (venue.owner as any) === user._id);

  const photos = venue?.photos ?? [];

  const prevPhoto = useCallback(() => {
    setActivePhoto((p) => (p - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const nextPhoto = useCallback(() => {
    setActivePhoto((p) => (p + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, prevPhoto, nextPhoto]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement cette salle ? Cette action est irréversible.')) return;
    try {
      await deleteVenue(venueId!);
      showSuccess(SuccessMessages.VENUE_DELETED);
      navigate('/dashboard/my-venues');
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.VENUE_DELETE_FAILED));
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
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
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: 16 }}>Salle introuvable.</p>
          <button
            onClick={() => navigate('/venues')}
            style={{
              marginTop: 16,
              padding: '10px 24px',
              background: 'rgba(255,65,108,0.15)',
              color: '#ff416c',
              border: '1px solid rgba(255,65,108,0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retour aux salles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', paddingBottom: 60 }}>
      <style>{`
        @media (max-width: 768px) {
          .venue-detail-grid { grid-template-columns: 1fr !important; }
          .venue-detail-sticky { position: static !important; }
          .venue-stats { flex-wrap: wrap; gap: 16px !important; }
          .venue-breadcrumb-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        }
      `}</style>
      <Navbar />

      {/* Breadcrumb + tabs */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
        <div className="venue-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, overflow: 'hidden' }}>
          <button
            onClick={() => navigate('/venues')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 14,
              flexShrink: 0,
              outline: 'none',
            }}
          >
            ← Salles
          </button>
          <span className="venue-breadcrumb-path" style={{ color: '#555', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {venue.city} / {venue.name}
          </span>
        </div>
      </div>

      {/* Onglets propriétaire */}
      {isOwner && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '0 24px',
              display: 'flex',
              gap: 0,
              minWidth: 'max-content',
            }}
          >
            {(
              [
                { key: 'info', label: 'Informations' },
                { key: 'bookings', label: 'Réservations' },
                { key: 'blocked', label: 'Dates bloquées' },
                { key: 'settings', label: 'Paramètres' },
              ] as { key: OwnerTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #ff416c' : '2px solid transparent',
                  color: activeTab === tab.key ? '#ff416c' : '#888',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Tab: Réservations (owner) */}
        {isOwner && activeTab === 'bookings' && (
          <VenueBookingsManagement venueId={venue._id} />
        )}

        {/* Tab: Dates bloquées (owner) */}
        {isOwner && activeTab === 'blocked' && (
          <BlockedDatesManager venueId={venue._id} />
        )}

        {/* Tab: Paramètres (owner) */}
        {isOwner && activeTab === 'settings' && (
          <div>
            <EditVenueForm
              venue={venue}
              onUpdated={(updated) => {
                queryClient.setQueryData(['venue', venueId], updated);
                setActiveTab('info');
              }}
            />
            <div
              style={{
                marginTop: 40,
                padding: 24,
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 16,
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: 16 }}>Zone dangereuse</h3>
              <p style={{ margin: '0 0 16px 0', color: '#888', fontSize: 13 }}>
                La suppression de cette salle est irréversible et annulera toutes les réservations associées.
              </p>
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 24px',
                  background: 'rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Supprimer cette salle
              </button>
            </div>
          </div>
        )}

        {/* Tab: Info (owner) ou vue visiteur */}
        {(!isOwner || activeTab === 'info') && (
          <div
            className="venue-detail-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: isOwner ? '1fr' : '1fr 380px',
              gap: 40,
              alignItems: 'start',
            }}
          >
            {/* Colonne gauche : détails */}
            <div>
              {/* Carrousel photos */}
              {photos.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  {/* Image principale */}
                  <div
                    ref={carouselRef}
                    style={{
                      position: 'relative',
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: '#1a1a2e',
                      aspectRatio: '16/9',
                      marginBottom: 10,
                      userSelect: 'none',
                    }}
                    onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      if (touchStartX.current === null) return;
                      const delta = e.changedTouches[0].clientX - touchStartX.current;
                      if (Math.abs(delta) > 40) delta < 0 ? nextPhoto() : prevPhoto();
                      touchStartX.current = null;
                    }}
                  >
                    <img
                      src={photos[activePhoto]}
                      alt={`${venue.name} — photo ${activePhoto + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.25s' }}
                    />

                    {photos.length > 1 && (
                      <>
                        {/* Flèche gauche */}
                        <button
                          onClick={prevPhoto}
                          style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.55)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: 18,
                            lineHeight: 1,
                            backdropFilter: 'blur(4px)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,65,108,0.7)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
                        >
                          ‹
                        </button>

                        {/* Flèche droite */}
                        <button
                          onClick={nextPhoto}
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.55)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: 18,
                            lineHeight: 1,
                            backdropFilter: 'blur(4px)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,65,108,0.7)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
                        >
                          ›
                        </button>

                        {/* Compteur */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 20,
                            padding: '4px 12px',
                            fontSize: 12,
                            color: '#ccc',
                            fontWeight: 600,
                          }}
                        >
                          {activePhoto + 1} / {photos.length}
                        </div>

                        {/* Points indicateurs */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: 6,
                          }}
                        >
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActivePhoto(i)}
                              style={{
                                width: i === activePhoto ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: i === activePhoto ? '#ff416c' : 'rgba(255,255,255,0.4)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.2s',
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Miniatures */}
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {photos.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setActivePhoto(i)}
                          style={{
                            width: 64,
                            height: 44,
                            padding: 0,
                            border: i === activePhoto ? '2px solid #ff416c' : '2px solid transparent',
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'none',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <img
                            src={url}
                            alt={`miniature ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pas de photos */}
              {photos.length === 0 && (
                <div
                  style={{
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 32,
                    fontSize: 64,
                  }}
                >
                  🏛️
                </div>
              )}

              {/* Titre et badge */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h1 style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#fff' }}>
                    {venue.name}
                  </h1>
                  <span
                    style={{
                      padding: '4px 14px',
                      background: 'rgba(255,65,108,0.15)',
                      border: '1px solid rgba(255,65,108,0.3)',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#ff416c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {VENUE_TYPE_LABELS[venue.venueType] || venue.venueType}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 15, color: '#aaa' }}>
                  📍 {venue.address}, {venue.postalCode} {venue.city}, {venue.country}
                </p>
              </div>

              {/* Stats rapides */}
              <div
                className="venue-stats"
                style={{
                  display: 'flex',
                  gap: 24,
                  marginBottom: 24,
                  padding: '16px 20px',
                  background: '#1a1a2e',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ff416c' }}>
                    {venue.capacity}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                    Places
                  </p>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ff416c' }}>
                    {venue.pricePerEvent.toLocaleString('fr-FR')} €
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                    Par soirée
                  </p>
                </div>
                {venue.equipment?.length > 0 && (
                  <>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ff416c' }}>
                        {venue.equipment.length}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                        Équipements
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  Description
                </h3>
                <p style={{ margin: 0, fontSize: 15, color: '#ccc', lineHeight: 1.7 }}>
                  {venue.description}
                </p>
              </div>

              {/* Équipements */}
              {venue.equipment?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    Équipements
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {venue.equipment.map((item) => (
                      <span
                        key={item}
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(255,65,108,0.1)',
                          border: '1px solid rgba(255,65,108,0.25)',
                          borderRadius: 20,
                          fontSize: 13,
                          color: '#ff8fa3',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Carte de localisation */}
              {venue.latitude && venue.longitude && (
                <VenueMap
                  lat={venue.latitude}
                  lng={venue.longitude}
                  name={venue.name}
                />
              )}
            </div>

            {/* Colonne droite : réserver (visiteur) */}
            {!isOwner && (
              <div className="venue-detail-sticky" style={{ position: 'sticky', top: 24 }}>
                <VenueBookingForm
                  venueId={venue._id}
                  venueName={venue.name}
                  blockedDates={blockedDates}
                  onBookingCreated={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDetailPage;
