import { type CSSProperties } from 'react';
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalendar';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { IEvent } from '../types/event';
import { useAuth } from '../hooks/useAuth';

const CalendarPage = () => {
  const { token, user } = useAuth();

  const isQueryEnabled = !!token && !!user?._id;

  const { data: fetchedEvents = [], isLoading, isError } = useQuery<IEvent[], Error>({
    queryKey: ['events', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id) throw new Error('Authentification manquante');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const apiUrl = user?.role === 'ORGANIZER' ? `/events?organizerId=${user._id}` : `/events`;
      const res = await api.get(apiUrl, config);

      // Forcer un tableau sécurisé
      let list: IEvent[] = [];
      const data = res.data;
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.events)) list = data.events;
      else if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          list = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          console.error("Impossible de parser la réponse :", data);
        }
      }
      return list;
    },
    enabled: isQueryEnabled,
  });

  // Séparer les événements et éviter doublons pour les annulés
  const now = new Date();

  const upcomingEvents = fetchedEvents
    .filter(e => new Date(e.date) >= now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const archivedEvents = fetchedEvents
    .filter(e => new Date(e.date) < now && e.status?.toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const cancelledEvents = fetchedEvents
    .filter(e => e.status?.toLowerCase() === 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const allEvents = [...upcomingEvents, ...archivedEvents, ...cancelledEvents];

  const handleEventClick = (event: IEvent) => {
    console.log('Événement cliqué :', event);
    // Ici tu peux ouvrir un modal global ou faire une redirection
  };

  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#ffffff',
    padding: '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={mainContainerStyle}>
      <Navbar />

      {isLoading && (
        <p style={{ textAlign:'center', marginTop:'50px', color:'#ff416c' }}>
          Chargement des événements…
        </p>
      )}
      {isError && (
        <p style={{ textAlign:'center', marginTop:'50px', color:'#dc3545' }}>
          Erreur lors du chargement des événements.
        </p>
      )}

      {!isLoading && !isError && (
        <EventCalendar
          events={allEvents}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
};

export default CalendarPage;
