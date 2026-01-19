import { type CSSProperties, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalendar';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { IEvent } from '../types/event';
import { useAuth } from '../hooks/useAuth';

const CalendarPage = () => {
  const { token, user } = useAuth();
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // --- Responsive detection hook ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkScreenSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        if (width < 768) setScreenSize('mobile');
        else if (width < 1024) setScreenSize('tablet');
        else setScreenSize('desktop');
      }, 150);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // --- Responsive helper function ---
  const getResponsiveValue = <T,>(mobile: T, tablet: T, desktop: T): T => {
    if (screenSize === 'mobile') return mobile;
    if (screenSize === 'tablet') return tablet;
    return desktop;
  };

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
    padding: getResponsiveValue('16px', '24px', '32px'),
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    display: 'flex',
    flexDirection: 'column',
    gap: getResponsiveValue('16px', '24px', '32px'),
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
