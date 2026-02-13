import { useState, useMemo, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { IEvent } from '../types/event';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import {
  addEventFavorite,
  removeEventFavorite,
  checkIsEventFavorite,
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

const RADII = [5, 10, 20, 50] as const;

export default function SpectatorHomePage() {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [searchLieuInput, setSearchLieuInput] = useState('');
  const [searchLieu, setSearchLieu] = useState('');
  const [searchVenueType, setSearchVenueType] = useState('');
  const [searchRadius, setSearchRadius] = useState<number>(20);
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [unregisterConfirm, setUnregisterConfirm] = useState<{ isOpen: boolean; eventId: string | null }>({ isOpen: false, eventId: null });

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me', user?._id],
    queryFn: async () => {
      const res = await api.get('/profile/me');
      return res.data;
    },
    enabled: !!token && !!user?._id && user?.role === 'SPECTATOR',
  });

  const radiusKm = profile?.spectatorPreferences?.radiusKm ?? 20;
  const [selectedRadius, setSelectedRadius] = useState<number>(radiusKm);
  useEffect(() => {
    if (profile?.spectatorPreferences?.radiusKm != null) {
      setSelectedRadius(profile.spectatorPreferences.radiusKm);
    }
  }, [profile?.spectatorPreferences?.radiusKm]);
  const effectiveRadius = selectedRadius || radiusKm;

  const hasSearchFilter = !!searchLieu.trim() || (!!searchVenueType && searchVenueType !== '');

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (searchLieu.trim()) {
      p.city = searchLieu.trim();
      p.cityRadius = String(searchRadius);
    }
    if (searchVenueType && searchVenueType !== 'tous') p.venueType = searchVenueType;
    return p;
  }, [searchLieu, searchVenueType, searchRadius]);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', 'spectator', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams).toString();
      const url = params ? `/events?${params}` : '/events';
      const res = await api.get(url);
      return parseEventsResponse(res.data);
    },
    enabled: !!token && hasSearchFilter,
  });

  // Fetch events the spectator is registered to (includes cancelled ones)
  const { data: myRegistrationsList = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ['events', 'spectator', 'myRegistrations'],
    queryFn: async () => {
      const res = await api.get('/events?myRegistrations=true');
      return parseEventsResponse(res.data);
    },
    enabled: !!token,
  });

  // Set of event IDs the user is registered to — reliable source of truth
  const registeredEventIds = useMemo(() => {
    return new Set(myRegistrationsList.map((e) => e._id));
  }, [myRegistrationsList]);

  const { data: aroundMeEvents = [], isLoading: loadingAroundMe } = useQuery({
    queryKey: ['events', 'spectator', 'nearMe', user?.city, effectiveRadius],
    queryFn: async () => {
      if (!user?.city?.trim()) return [];
      const params = new URLSearchParams({ nearMe: 'true', radiusKm: String(effectiveRadius) });
      const res = await api.get(`/events?${params.toString()}`);
      return parseEventsResponse(res.data);
    },
    enabled: !!token && !!user?.city?.trim(),
  });

  const updateRadiusMutation = useMutation({
    mutationFn: async (km: number) => {
      if (!user?._id) throw new Error('Non connecté');
      await api.put(`/profile/${user._id}`, {
        spectatorPreferences: { radiusKm: km, dailyRecapEmail: profile?.spectatorPreferences?.dailyRecapEmail ?? true },
      });
    },
    onSuccess: (_, km) => {
      setSelectedRadius(km);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'spectator', 'nearMe'] });
      showSuccess('Rayon mis à jour');
    },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });

  const invalidateEvents = () => {
    queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['event-favorites'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['event-favorites-check'], exact: false });
  };

  const addFavoriteMutation = useMutation({
    mutationFn: addEventFavorite,
    onSuccess: () => { invalidateEvents(); showSuccess('Ajouté aux favoris'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });
  const removeFavoriteMutation = useMutation({
    mutationFn: removeEventFavorite,
    onSuccess: () => { invalidateEvents(); showSuccess('Retiré des favoris'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });
  const registerMutation = useMutation({
    mutationFn: registerSpectatorToEvent,
    onSuccess: () => { invalidateEvents(); showSuccess('Inscription enregistrée'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });
  const unregisterMutation = useMutation({
    mutationFn: unregisterSpectatorFromEvent,
    onSuccess: () => { invalidateEvents(); showSuccess('Désinscription enregistrée'); },
    onError: (e: any) => showError(e?.response?.data?.message || 'Erreur'),
  });

  const now = new Date();
  const allEvents = eventsData || [];
  const upcomingEvents = allEvents
    .filter((e) => new Date(e.date) >= now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const aroundMeUpcoming = aroundMeEvents
    .filter((e) => new Date(e.date) >= now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isUserRegistered = (event: IEvent) => {
    return registeredEventIds.has(event._id);
  };

  const isUserWithdrawn = (event: IEvent) => {
    const ids = event.withdrawnSpectators;
    if (!ids?.length || !user?._id) return false;
    return ids.some((id) => (typeof id === 'string' ? id : (id as { _id?: string })?._id) === user._id);
  };

  const openUnregisterConfirm = (eventId: string) => {
    setUnregisterConfirm({ isOpen: true, eventId });
  };

  const handleConfirmUnregister = () => {
    if (unregisterConfirm.eventId) {
      unregisterMutation.mutate(unregisterConfirm.eventId);
      setUnregisterConfirm({ isOpen: false, eventId: null });
    }
  };

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
          <h1 style={{ marginBottom: 24, fontSize: '1.75rem' }}>Recherche d'évènements</h1>

          {/* Barre de recherche + filtre événements */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 24,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Lieu (ville)"
              value={searchLieuInput}
              onChange={(e) => setSearchLieuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSearchLieu(searchLieuInput); }}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                minWidth: 180,
              }}
            />
            <button
              type="button"
              onClick={() => setSearchLieu(searchLieuInput)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #FF5A7E, #FF7A92)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              Rechercher
            </button>
            <select
              value={searchVenueType}
              onChange={(e) => setSearchVenueType(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                minWidth: 180,
                cursor: 'pointer',
              }}
            >
              <option value="" disabled hidden>Sélectionner un type de lieu</option>
              <option value="tous">Tous les types de lieu</option>
              <option value="theatre">Théâtre</option>
              <option value="salle_polyvalente">Salle polyvalente</option>
              <option value="cafe">Café</option>
              <option value="restaurant">Restaurant</option>
              <option value="autre">Autre</option>
            </select>
            <select
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              {RADII.map((km) => (
                <option key={km} value={km}>
                  Rayon : {km} km
                </option>
              ))}
            </select>
            {hasSearchFilter && (
              <button
                type="button"
                onClick={() => { setSearchLieuInput(''); setSearchLieu(''); setSearchVenueType(''); setSearchRadius(20); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {!hasSearchFilter ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 24 }}>
              Recherchez un lieu (ville) ou sélectionnez un type de lieu pour afficher les événements.
            </p>
          ) : (
            <>
              <h2 style={{ marginBottom: 16, fontSize: '1.25rem' }}>Événements à venir</h2>
              {isLoading ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>
              ) : upcomingEvents.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Aucun événement trouvé.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                    marginBottom: 40,
                  }}
                >
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      isRegistered={isUserRegistered(event)}
                      isWithdrawn={isUserWithdrawn(event)}
                      onEventClick={() => setSelectedEvent(event)}
                      onRegister={() => registerMutation.mutate(event._id)}
                      onUnregister={() => openUnregisterConfirm(event._id)}
                      onToggleFavorite={(isFav: boolean) =>
                        isFav ? removeFavoriteMutation.mutate(event._id) : addFavoriteMutation.mutate(event._id)
                      }
                      isRegistering={registerMutation.isPending || unregisterMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {user?.city?.trim() && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                  Suggestions autour de chez vous ({user.city})
                </h2>
                <select
                  value={effectiveRadius}
                  onChange={(e) => updateRadiusMutation.mutate(Number(e.target.value))}
                  disabled={updateRadiusMutation.isPending}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    cursor: updateRadiusMutation.isPending ? 'wait' : 'pointer',
                  }}
                >
                  {RADII.map((km) => (
                    <option key={km} value={km}>
                      {km} km
                    </option>
                  ))}
                </select>
              </div>
              {loadingAroundMe ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>
              ) : aroundMeUpcoming.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Aucun événement à venir dans ce rayon.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {aroundMeUpcoming.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      isRegistered={isUserRegistered(event)}
                      isWithdrawn={isUserWithdrawn(event)}
                      onEventClick={() => setSelectedEvent(event)}
                      onRegister={() => registerMutation.mutate(event._id)}
                      onUnregister={() => openUnregisterConfirm(event._id)}
                      onToggleFavorite={(isFav: boolean) =>
                        isFav ? removeFavoriteMutation.mutate(event._id) : addFavoriteMutation.mutate(event._id)
                      }
                      isRegistering={registerMutation.isPending || unregisterMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </>
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
        onCancel={() => setUnregisterConfirm({ isOpen: false, eventId: null })}
      />
    </>
  );
}

function EventCard({
  event,
  isRegistered,
  isWithdrawn = false,
  onEventClick,
  onRegister,
  onUnregister,
  onToggleFavorite,
  isRegistering,
}: {
  event: IEvent;
  isRegistered: boolean;
  isWithdrawn?: boolean;
  onEventClick?: () => void;
  onRegister: () => void;
  onUnregister: () => void;
  onToggleFavorite: (currentlyFavorite: boolean) => void;
  isRegistering: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: favData } = useQuery({
    queryKey: ['event-favorites-check', event._id],
    queryFn: () => checkIsEventFavorite(event._id),
  });
  const isFavorite = favData?.isFavorite ?? false;
  const dateStr = new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const location = event.location;
  const city = location?.city || '';
  const maxSpectators = event.maxSpectators;
  const registeredCount = Array.isArray(event.spectatorRegistrations) ? event.spectatorRegistrations.length : 0;
  const placesRemaining = maxSpectators != null ? Math.max(0, maxSpectators - registeredCount) : null;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '1rem',
            flex: 1,
            color: '#1a1a2e',
            cursor: onEventClick ? 'pointer' : 'default',
            textDecoration: onEventClick ? 'underline' : 'none',
          }}
          onClick={onEventClick}
          title={onEventClick ? 'Voir les détails' : undefined}
        >
          {event.title}
        </h3>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(isFavorite); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: 4,
          }}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      <div
        role={onEventClick ? 'button' : undefined}
        tabIndex={onEventClick ? 0 : undefined}
        onClick={onEventClick}
        onKeyDown={onEventClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEventClick(); } : undefined}
        style={{
          cursor: onEventClick ? 'pointer' : 'default',
          flex: 1,
        }}
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
      {isRegistered ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnregister(); }}
          disabled={isRegistering}
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ff5a7e',
            background: 'transparent',
            color: '#ff5a7e',
            cursor: isRegistering ? 'wait' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Se désinscrire
        </button>
      ) : isWithdrawn ? (
        <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#888' }}>
          Vous vous êtes désinscrit de cet événement. La réinscription n'est pas possible.
        </p>
      ) : (placesRemaining === null || placesRemaining > 0) ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRegister(); }}
          disabled={isRegistering}
          style={{
            marginTop: 8,
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
      ) : null}
    </div>
  );
}
