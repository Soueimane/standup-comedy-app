import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Event, Application } from '@/types/events';
import { useAuth } from './AuthContext';

interface EventsContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  createEvent: (eventData: Omit<Event, 'id' | 'createdAt' | 'organizerId'>) => Promise<Event>;
  updateEvent: (eventId: string, eventData: Partial<Event>) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventById: (eventId: string) => Event | undefined;
  getEventsByOrganizer: (organizerId: string) => Event[];
  getEventsByCity: (city: string) => Event[];
  applyToEvent: (eventId: string, humoristId: string) => Promise<Application>;
  getApplicationsByEvent: (eventId: string) => Application[];
  updateApplicationStatus: (eventId: string, applicationId: string, status: 'pending' | 'accepted' | 'rejected') => Promise<Application>;
}

const EventsContext = createContext<EventsContextType | null>(null);

interface EventsProviderProps {
  children: ReactNode;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>(() => {
    const savedEvents = localStorage.getItem('standup_events');
    return savedEvents ? JSON.parse(savedEvents) : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Sauvegarder les événements dans le localStorage
  useEffect(() => {
    localStorage.setItem('standup_events', JSON.stringify(events));
  }, [events]);

  const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'organizerId'>): Promise<Event> => {
    try {
      if (!user || user.userType !== 'organisateur') {
        throw new Error('Seuls les organisateurs peuvent créer des événements');
      }

      const newEvent: Event = {
        ...eventData,
        id: 'event_' + Date.now(),
        organizerId: user.id,
        createdAt: new Date().toISOString(),
        applications: []
      };

      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'événement');
      throw err;
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<Event> => {
    try {
      if (!user || user.userType !== 'organisateur') {
        throw new Error('Seuls les organisateurs peuvent modifier des événements');
      }

      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error('Événement non trouvé');
      }

      if (events[eventIndex].organizerId !== user.id) {
        throw new Error('Vous n\'êtes pas autorisé à modifier cet événement');
      }

      const updatedEvent = {
        ...events[eventIndex],
        ...eventData,
        updatedAt: new Date().toISOString()
      };

      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      return updatedEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification de l\'événement');
      throw err;
    }
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    try {
      if (!user || user.userType !== 'organisateur') {
        throw new Error('Seuls les organisateurs peuvent supprimer des événements');
      }

      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }

      if (event.organizerId !== user.id) {
        throw new Error('Vous n\'êtes pas autorisé à supprimer cet événement');
      }

      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'événement');
      throw err;
    }
  };

  const getEventById = (eventId: string): Event | undefined => {
    return events.find(e => e.id === eventId);
  };

  const getEventsByOrganizer = (organizerId: string): Event[] => {
    return events.filter(e => e.organizerId === organizerId);
  };

  const getEventsByCity = (city: string): Event[] => {
    return events.filter(e => e.city.toLowerCase() === city.toLowerCase());
  };

  const applyToEvent = async (eventId: string, humoristId: string): Promise<Application> => {
    try {
      if (!user || user.userType !== 'humoriste') {
        throw new Error('Seuls les humoristes peuvent postuler à des événements');
      }

      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }

      // Vérifier si l'humoriste a déjà postulé
      if (event.applications.some(a => a.humoristId === humoristId)) {
        throw new Error('Vous avez déjà postulé à cet événement');
      }

      const newApplication: Application = {
        id: 'app_' + Date.now(),
        eventId,
        humoristId,
        humoristName: user.firstName + ' ' + user.lastName,
        stageName: user.userType === 'humoriste' ? (user.profile as any).stageName : undefined,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };

      const updatedEvent = {
        ...event,
        applications: [...event.applications, newApplication]
      };

      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      return newApplication;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la postulation');
      throw err;
    }
  };

  const getApplicationsByEvent = (eventId: string): Application[] => {
    const event = events.find(e => e.id === eventId);
    return event ? event.applications : [];
  };

  const updateApplicationStatus = async (
    eventId: string,
    applicationId: string,
    status: 'pending' | 'accepted' | 'rejected'
  ): Promise<Application> => {
    try {
      if (!user || user.userType !== 'organisateur') {
        throw new Error('Seuls les organisateurs peuvent modifier le statut des candidatures');
      }

      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }

      if (event.organizerId !== user.id) {
        throw new Error('Vous n\'êtes pas autorisé à modifier les candidatures de cet événement');
      }

      const updatedApplications = event.applications.map(app =>
        app.id === applicationId
          ? { ...app, status, updatedAt: new Date().toISOString() }
          : app
      );

      const updatedEvent = {
        ...event,
        applications: updatedApplications
      };

      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      return updatedApplications.find(app => app.id === applicationId)!;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut');
      throw err;
    }
  };

  const value: EventsContextType = {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventsByOrganizer,
    getEventsByCity,
    applyToEvent,
    getApplicationsByEvent,
    updateApplicationStatus
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = (): EventsContextType => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within EventsProvider');
  }
  return context;
}; 