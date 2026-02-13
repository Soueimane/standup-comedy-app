import { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { IEvent } from '../types/event';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import {
  getEventFavorites,
  removeEventFavorite,
  registerSpectatorToEvent,
  unregisterSpectatorFromEvent,
} from '../services/api';
import EventDetailModal from '../components/EventDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';

function parseEventsResponse(data: any): IEvent[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.events)) return data.events;
  return [];
}

type EventsFilterTab = 'inscrits' | 'archives' | 'annules' | 'favoris';

export default function SpectatorEventsPage() {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [eventFilter, setEventFilter] = useState<EventsFilterTab>('inscrits');
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [unregisterConfirm, setUnregisterConfirm] = useState<{ isOpen: boolean; event: IEvent | null }>({ isOpen: false, event: null });

  const { data: myRegistrationsList = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ['events', 'spectator', 'myRegistrations'],
    queryFn: async () => {
      const res = await api.get('/events?myRegistrations=true');
      return parseEventsResponse(res.data);
    },
    enabled: !!token,
  });

  const { data: favoritesResponse, isLoading: loadingFavorites } = useQuery({
    queryKey: ['event-favorites'],
    queryFn: getEventFavorites,
    enabled: !!token,
  });
  const favoritesList: IEvent[] = Array.isArray(favoritesResponse?.favorites) ? favoritesResponse.favorites : [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['event-favorites'], exact: false });
  };

  const removeFavoriteMutation = useMutation({
    mutationFn: removeEventFavorite,
    onSuccess: () => { invalidate(); showSuccess('Retiré des favoris'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });
  const unregisterMutation = useMutation({
    mutationFn: unregisterSpectatorFromEvent,
    onSuccess: () => { invalidate(); showSuccess('Désinscription enregistrée'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });
  const registerMutation = useMutation({
    mutationFn: registerSpectatorToEvent,
    onSuccess: () => { invalidate(); showSuccess('Inscription enregistrée'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });

  // Build a Set of event IDs the user is registered to (from myRegistrationsList)
  // This is reliable regardless of whether spectatorRegistrations is populated on the event
  const registeredEventIds = useMemo(() => {
    return new Set(myRegistrationsList.map((e) => e._id));
  }, [myRegistrationsList]);

  const isUserRegistered = (event: IEvent) => {
    return registeredEventIds.has(event._id);
  };

  const isUserWithdrawn = (event: IEvent) => {
    const ids = event.withdrawnSpectators;
    if (!ids?.length || !user?._id) return false;
    return ids.some((id) => (typeof id === 'string' ? id : (id as { _id?: string })?._id) === user._id);
  };

  const openUnregisterConfirm = (event: IEvent) => {
    setUnregisterConfirm({ isOpen: true, event });
  };

  const handleConfirmUnregister = () => {
    if (unregisterConfirm.event) {
      unregisterMutation.mutate(unregisterConfirm.event._id);
      setUnregisterConfirm({ isOpen: false, event: null });
    }
  };

  const now = new Date();
  const registeredUpcoming = myRegistrationsList
    .filter((e) => new Date(e.date) >= now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const registeredArchived = myRegistrationsList
    .filter((e) => (new Date(e.date) < now) && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const registeredCancelled = myRegistrationsList
    .filter((e) => e.status?.toLowerCase() === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const favoritesUpcoming = favoritesList
    .filter((e) => new Date(e.date) >= now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const favoritesArchived = favoritesList
    .filter((e) => new Date(e.date) < now || e.status?.toLowerCase() === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loadingRegistrations || loadingFavorites;

  const filterTabs: { id: EventsFilterTab; label: string }[] = [
    { id: 'inscrits', label: 'Inscrits (à venir)' },
    { id: 'archives', label: 'Archivés (auxquels vous étiez inscrit)' },
    { id: 'annules', label: 'Événements annulés' },
    { id: 'favoris', label: 'Favoris' },
  ];

  return (
    <>
      <Navbar />
      <div
        style={{
          minHeight: 'calc(100vh - 60px)',
          background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
          color: '#fff',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ marginBottom: 24, fontSize: '1.75rem' }}>Évènements</h1>

          {/* Onglets filtre */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 32,
              alignItems: 'center',
            }}
          >
            {filterTabs.map((tab) => {
              const isActive = eventFilter === tab.id;
              const isCancelledTab = tab.id === 'annules';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventFilter(tab.id)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: isActive
                      ? isCancelledTab ? '2px solid #dc3545' : '2px solid #FF5A7E'
                      : '1px solid rgba(255,255,255,0.3)',
                    background: isActive
                      ? isCancelledTab ? 'rgba(220, 53, 69, 0.25)' : 'rgba(255,90,126,0.25)'
                      : 'rgba(0,0,0,0.3)',
                    color: isActive && isCancelledTab ? '#f8d7da' : '#fff',
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.9rem',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>
          ) : eventFilter === 'inscrits' ? (
            <Section
              title="Événements auxquels je suis inscrit"
              events={registeredUpcoming}
              emptyMessage="Aucune inscription à venir."
              onEventClick={setSelectedEvent}
              onUnregister={(e) => openUnregisterConfirm(e)}
              onRemoveFavorite={(e) => removeFavoriteMutation.mutate(e._id)}
              isUnregistering={unregisterMutation.isPending}
              showUnregister
              isRegistered={() => true}
            />
          ) : eventFilter === 'archives' ? (
            <Section
              title="Archivés (auxquels vous étiez inscrit)"
              events={registeredArchived}
              emptyMessage="Aucun événement archivé."
              onEventClick={setSelectedEvent}
              onRemoveFavorite={(e) => removeFavoriteMutation.mutate(e._id)}
              isUnregistering={false}
              showUnregister={false}
              isRegistered={() => true}
            />
          ) : eventFilter === 'annules' ? (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ marginBottom: 16, fontSize: '1.25rem' }}>Événements annulés</h2>
              {registeredCancelled.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Aucun événement annulé.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {registeredCancelled.map((event) => (
                    <div
                      key={event._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEvent(event)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedEvent(event); }}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(220, 53, 69, 0.4)',
                        borderRadius: 12,
                        padding: 16,
                        cursor: 'pointer',
                      }}
                      title="Voir les détails"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', flex: 1, color: '#1a1a2e', textDecoration: 'underline' }}>{event.title}</h3>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(220, 53, 69, 0.15)',
                            color: '#b71c1c',
                            fontWeight: 600,
                          }}
                        >
                          Annulé
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>
                        {new Date(event.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {event.location?.city && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#666' }}>
                          📍 {event.location.city}
                        </p>
                      )}
                      {event.cancellationReason && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#b71c1c' }}>
                          <strong>Raison :</strong> {event.cancellationReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <Section
              title="Favoris"
              events={[...favoritesUpcoming, ...favoritesArchived]}
              emptyMessage="Aucun favori."
              onEventClick={setSelectedEvent}
              onRegister={(e) => registerMutation.mutate(e._id)}
              onUnregister={(e) => openUnregisterConfirm(e)}
              onRemoveFavorite={(e) => removeFavoriteMutation.mutate(e._id)}
              isUnregistering={unregisterMutation.isPending}
              isRegistering={registerMutation.isPending}
              showUnregister
              showRemoveFavorite
              isRegistered={isUserRegistered}
              isWithdrawn={isUserWithdrawn}
            />
          )}
        </div>
      </div>
      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        user={user}
      />
      <ConfirmDialog
        isOpen={unregisterConfirm.isOpen}
        title="Se désinscrire"
        message="Êtes-vous sûr de vouloir vous désinscrire ? Vous ne pourrez pas vous réinscrire à cet événement."
        confirmText="Confirmer"
        cancelText="Annuler"
        isDangerous
        onConfirm={handleConfirmUnregister}
        onCancel={() => setUnregisterConfirm({ isOpen: false, event: null })}
      />
    </>
  );
}

function Section({
  title,
  events,
  emptyMessage,
  onEventClick,
  onRegister,
  onUnregister,
  onRemoveFavorite,
  isUnregistering,
  isRegistering = false,
  showUnregister,
  showRemoveFavorite = false,
  isRegistered,
  isWithdrawn,
}: {
  title: string;
  events: IEvent[];
  emptyMessage: string;
  onEventClick?: (e: IEvent) => void;
  onRegister?: (e: IEvent) => void;
  onUnregister?: (e: IEvent) => void;
  onRemoveFavorite: (e: IEvent) => void;
  isUnregistering: boolean;
  isRegistering?: boolean;
  showUnregister: boolean;
  showRemoveFavorite?: boolean;
  isRegistered?: (e: IEvent) => boolean;
  isWithdrawn?: (e: IEvent) => boolean;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ marginBottom: 16, fontSize: '1.25rem' }}>{title}</h2>
      {events.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>{emptyMessage}</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onEventClick={onEventClick ? () => onEventClick(event) : undefined}
              onRegister={onRegister ? () => onRegister(event) : undefined}
              onUnregister={showUnregister && onUnregister ? () => onUnregister(event) : undefined}
              onRemoveFavorite={showRemoveFavorite ? () => onRemoveFavorite(event) : undefined}
              isRegistered={isRegistered ? isRegistered(event) : false}
              isWithdrawn={isWithdrawn ? isWithdrawn(event) : false}
              isUnregistering={isUnregistering}
              isRegistering={isRegistering}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({
  event,
  onEventClick,
  onRegister,
  onUnregister,
  onRemoveFavorite,
  isRegistered,
  isWithdrawn = false,
  isUnregistering,
  isRegistering = false,
}: {
  event: IEvent;
  onEventClick?: () => void;
  onRegister?: () => void;
  onUnregister?: () => void;
  onRemoveFavorite?: () => void;
  isRegistered: boolean;
  isWithdrawn?: boolean;
  isUnregistering: boolean;
  isRegistering?: boolean;
}) {
  const dateStr = new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const city = event.location?.city || '';
  const isPast = new Date(event.date) < new Date();
  const isCancelled = event.status?.toLowerCase() === 'cancelled';
  const maxSpectators = event.maxSpectators;
  const registeredCount = Array.isArray(event.spectatorRegistrations) ? event.spectatorRegistrations.length : 0;
  const placesRemaining = maxSpectators != null ? Math.max(0, maxSpectators - registeredCount) : null;
  const canRegister = onRegister && !isRegistered && !isWithdrawn && !isPast && !isCancelled && (placesRemaining === null || placesRemaining > 0);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '1rem',
          color: '#1a1a2e',
          cursor: onEventClick ? 'pointer' : 'default',
          textDecoration: onEventClick ? 'underline' : 'none',
        }}
        onClick={onEventClick}
        title={onEventClick ? 'Voir les détails' : undefined}
      >
        {event.title}
      </h3>
      <div
        role={onEventClick ? 'button' : undefined}
        tabIndex={onEventClick ? 0 : undefined}
        onClick={onEventClick}
        onKeyDown={onEventClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEventClick(); } : undefined}
        style={{ cursor: onEventClick ? 'pointer' : 'default' }}
      >
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>{dateStr}</p>
        {city && <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>📍 {city}</p>}
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: 1.4 }}>
          {event.description?.slice(0, 100)}
          {event.description && event.description.length > 100 ? '…' : ''}
        </p>
        {placesRemaining !== null && (
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#555', fontWeight: 500 }}>
            {placesRemaining === 0 ? 'Complet' : `${placesRemaining} place${placesRemaining > 1 ? 's' : ''} restante${placesRemaining > 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      {isPast && (
        <span style={{ fontSize: '0.75rem', color: '#888' }}>Passé</span>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {isWithdrawn && !isRegistered && (
          <span style={{ fontSize: '0.85rem', color: '#888' }}>
            Vous vous êtes désinscrit de cet événement. La réinscription n'est pas possible.
          </span>
        )}
        {canRegister && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRegister?.(); }}
            disabled={isRegistering}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #28a745',
              background: 'rgba(40, 167, 69, 0.2)',
              color: '#5dd879',
              cursor: isRegistering ? 'wait' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Je participe
          </button>
        )}
        {onUnregister && isRegistered && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnregister(); }}
            disabled={isUnregistering}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ff5a7e',
              background: 'transparent',
              color: '#ff5a7e',
              cursor: isUnregistering ? 'wait' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Se désinscrire
          </button>
        )}
        {onRemoveFavorite && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemoveFavorite(); }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.2)',
              background: 'rgba(0,0,0,0.06)',
              color: '#444',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Retirer des favoris
          </button>
        )}
      </div>
    </div>
  );
}
