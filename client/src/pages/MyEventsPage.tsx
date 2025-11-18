import { type CSSProperties, useState, useMemo, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import CreateEventForm from '../components/CreateEventForm';
import EditEventForm from '../components/EditEventForm';
import ApplyToEventForm from '../components/ApplyToEventForm';
import ComedianDetailsModal from '../components/ComedianDetailsModal';
import AbsenceModal from '../components/AbsenceModal';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { IEvent } from '../types/event';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IApplication } from './ApplicationsPage'; // Import IApplication
import { markAbsence, cancelAbsence, getEventAbsences } from '../services/api';

function MyEventsPage() {
  const { token, user, refreshUser, isLoading: authIsLoading } = useAuth();
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [showApplyEventForm, setShowApplyEventForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null);
  const [isComedianModalOpen, setIsComedianModalOpen] = useState(false);
  const [selectedComedian, setSelectedComedian] = useState<any>(null);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedAbsenceParticipant, setSelectedAbsenceParticipant] = useState<any>(null);
  const [eventAbsences, setEventAbsences] = useState<any[]>([]);
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [eventToCancel, setEventToCancel] = useState<IEvent | null>(null);
  const [notifyingEventId, setNotifyingEventId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Refs pour le scroll automatique
  const cancelledSectionRef = useRef<HTMLDivElement>(null);
  const archivedSectionRef = useRef<HTMLDivElement>(null);

  console.log("MyEventsPage: Initial token", token);
  console.log("MyEventsPage: Initial user", user);
  console.log("MyEventsPage: Auth is loading?", authIsLoading);

  const isQueryEnabled = !authIsLoading && !!token && !!user?._id;
  console.log("MyEventsPage: useQuery enabled status", isQueryEnabled, { authIsLoading, token, userId: user?._id, userRole: user?.role });
  
  // Debug supplémentaire pour diagnostiquer le problème
  console.log("🔧 DEBUG ACTIVATION QUERY:", {
    authIsLoading,
    hasToken: !!token,
    hasUserId: !!user?._id,
    userRole: user?.role,
    finalEnabled: isQueryEnabled
  });

  const { data: fetchedEvents, isLoading: eventsLoading, isError: eventsError, error: eventsErrorMessage, refetch } = useQuery<IEvent[], Error>({
    queryKey: ['events', user?._id, user?.role, token, location.search],
    queryFn: async () => {
      console.log("🚀 MyEventsPage: useQuery queryFn called. Token:", !!token, "User ID:", user?._id, "Role:", user?.role);
      if (!token || !user?._id) {
        console.log("❌ Authentification manquante, arrêt de la requête");
        throw new Error("Informations d'authentification manquantes.");
      }
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      // Pour les humoristes, récupérer TOUS les événements
      // Pour les organisateurs, récupérer seulement leurs événements
      const apiUrl = user?.role === 'ORGANIZER'
        ? `/events?organizerId=${user._id}`
        : `/events`; // Pas de filtre organizerId pour les humoristes
      
      console.log(`🔗 Requête API: ${apiUrl} (Role: ${user?.role})`);
      try {
        const res = await api.get<IEvent[]>(apiUrl, config);
        const list = Array.isArray(res.data) ? res.data : (Array.isArray((res.data as any)?.events) ? (res.data as any).events : []);
        console.log("MyEventsPage: Données d'événements reçues par useQuery:", list);
        console.log("MyEventsPage: User role:", user?.role);
        console.log("📅 DÉTAIL DES DATES RÉCUPÉRÉES:", list.map((e: IEvent) => ({
          title: e.title,
          status: e.status,
          dateOriginale: e.date,
          dateParsee: new Date(e.date).toLocaleDateString('fr-FR'),
          estPasse: new Date(e.date) < new Date()
        })));
        return list as IEvent[];
      } catch (error: any) {
        console.error("❌ Erreur lors de la récupération des événements:", error);
        console.error("❌ Détails de l'erreur:", error.response?.data || error.message);
        throw error;
      }
    },
    enabled: isQueryEnabled, // Utiliser isQueryEnabled au lieu de true
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // New useQuery for comedian's applications
  const { data: comedianApplications } = useQuery<IApplication[], Error>({
    queryKey: ['comedianApplications', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id) {
        throw new Error("Informations d'authentification manquantes pour les candidatures.");
      }
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await api.get<IApplication[]>(`/applications?comedianId=${user._id}`, config);
      const list = Array.isArray(res.data) ? res.data : (Array.isArray((res.data as any)?.applications) ? (res.data as any).applications : []);
      return list as IApplication[];
    },
    enabled: user?.role === 'COMEDIAN' && isQueryEnabled, // Only enable for comedians
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Scroll automatique vers les sections selon les paramètres URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const statusFilters = queryParams.getAll('status');
    
    // Délai pour s'assurer que les éléments sont rendus
    const scrollTimeout = setTimeout(() => {
      if (statusFilters.includes('cancelled') && cancelledSectionRef.current) {
        console.log('🎯 Scroll automatique vers la section "Événements annulés"');
        cancelledSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else if (statusFilters.includes('completed') && archivedSectionRef.current) {
        console.log('🎯 Scroll automatique vers la section "Événements archivés"');
        archivedSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 500); // Délai de 500ms pour s'assurer que les données sont chargées

    return () => clearTimeout(scrollTimeout);
  }, [location.search, fetchedEvents]); // Dépend de la recherche et des données

  // Memoize the set of applied event IDs
  const appliedEventIds = useMemo(() => {
    if (user?.role === 'COMEDIAN' && comedianApplications) {
      return new Set(comedianApplications.filter(app => app.event).map(app => app.event._id));
    }
    return new Set<string>();
  }, [comedianApplications, user?.role]);

  // Fonction utilitaire pour comparer les dates (ignorer l'heure)
  const isEventPast = (eventDateString: string, endTime?: string): boolean => {
    // Si endTime n'est pas fourni, on considère la fin de la journée
    const eventDate = new Date(eventDateString);
    let eventEndDateTime: Date;
    if (endTime) {
      // On suppose que endTime est au format "HH:mm" (ex: "23:30")
      const [hours, minutes] = endTime.split(":").map(Number);
      eventEndDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), hours, minutes);
    } else {
      // Fin de la journée si pas d'heure de fin
      eventEndDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);
    }
    const now = new Date();
    return now > eventEndDateTime;
  };

  // Fonction utilitaire pour obtenir le nom de l'organisateur de manière sécurisée
  const getOrganizerName = (organizer: any): string => {
    if (!organizer) return 'Organisateur inconnu';
    if (typeof organizer === 'string') return organizer;
    return `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || 'Organisateur inconnu';
  };

  const getOrganizerIdFromEvent = (organizer: any): string | undefined => {
    if (!organizer) return undefined;
    if (typeof organizer === 'string') return organizer;
    return organizer._id || organizer.id;
  };

  // Extraire la liste unique des organisateurs pour le dropdown
  const availableOrganizers = useMemo(() => {
    if (!fetchedEvents || user?.role !== 'SUPER_ADMIN') return [];
    
    const organizersMap = new Map();
    fetchedEvents.forEach((event: IEvent) => {
      if (!event.organizer) return; // Ignorer les événements sans organisateur
      const organizer = typeof event.organizer === 'object' ? event.organizer : null;
      if (!organizer) return;
      
      const fullName = `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim();
      if (!fullName) return;
      
      if (!organizersMap.has(fullName)) {
        organizersMap.set(fullName, {
          fullName,
          firstName: organizer.firstName || '',
          lastName: organizer.lastName || '',
          id: organizer._id || organizer
        });
      }
    });
    
    return Array.from(organizersMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [fetchedEvents, user?.role]);

  const { upcomingEvents, archivedEvents, cancelledEvents } = useMemo(() => {
    const upcoming: IEvent[] = [];
    const archived: IEvent[] = [];
    const cancelled: IEvent[] = [];

    if (fetchedEvents) {
      const eventsToFilter = fetchedEvents as IEvent[];
      const queryParams = new URLSearchParams(location.search);
      const statusFilters = queryParams.getAll('status');
      const dateFilter = queryParams.get('date');
      const organizerFilter = queryParams.get('organizer');
      const locationFilter = queryParams.get('location');

      console.log('🔄 RECALCUL DES FILTRES:', {
        totalEvents: eventsToFilter.length,
        organizerFilter,
        locationFilter,
        userRole: user?.role
      });

      let filteredEvents = eventsToFilter;

      if (statusFilters.length > 0) {
        filteredEvents = filteredEvents.filter((event: IEvent) => statusFilters.includes(event.status));
      }

      // Sécurité supplémentaire côté client : un organisateur ne peut voir que ses propres événements
      if (user?.role === 'ORGANIZER' && user?._id) {
        filteredEvents = filteredEvents.filter((event: IEvent) => {
          const organizerId = getOrganizerIdFromEvent(event.organizer);
          const matches = organizerId === user._id;
          if (!matches) {
            console.warn('🚫 Événement ignoré car il n’appartient pas à cet organisateur:', {
              eventTitle: event.title,
              eventOrganizer: organizerId,
              currentUser: user._id,
            });
          }
          return matches;
        });
      }

      // Filtre par organisateur (pour super admin)
      if (user?.role === 'SUPER_ADMIN' && organizerFilter) {
        console.log(`🔍 Filtrage par organisateur: "${organizerFilter}"`);
        console.log(`📊 Événements avant filtrage organisateur: ${filteredEvents.length}`);
        filteredEvents = filteredEvents.filter((event: IEvent) => {
          const eventOrganizerName = getOrganizerName(event.organizer);
          const matches = eventOrganizerName === organizerFilter;
          console.log(`   - Événement "${event.title}" (organisateur: "${eventOrganizerName}") → ${matches ? 'INCLUS' : 'EXCLU'}`);
          return matches;
        });
        console.log(`📊 Événements après filtrage organisateur: ${filteredEvents.length}`);
      }

      // Filtre par lieu (pour super admin)
      if (user?.role === 'SUPER_ADMIN' && locationFilter) {
        filteredEvents = filteredEvents.filter((event: IEvent) => 
          event.location.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
          event.location.address.toLowerCase().includes(locationFilter.toLowerCase()) ||
          (event.location.venue && event.location.venue.toLowerCase().includes(locationFilter.toLowerCase()))
        );
      }

      const now = new Date();
      // Comparaison uniquement par date (ignorer l'heure)
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log(`🔍 DEBUG CLASSIFICATION - Aujourd'hui: ${todayMidnight.toLocaleDateString('fr-FR')}`);
      console.log(`📊 Total événements récupérés: ${filteredEvents.length}`);
      
      filteredEvents.forEach((event: IEvent) => {
        // D'abord, isoler les événements annulés pour qu'ils n'apparaissent pas ailleurs
        const isCancelled = (event.status === 'CANCELLED' || event.status === 'cancelled');
        if (isCancelled) {
          cancelled.push(event);
          return;
        }
        // Utilise la nouvelle logique avec endTime
        const eventIsPast = isEventPast(event.date, event.endTime);
        const eventDate = new Date(event.date);
        
        // Debug logging détaillé pour tracer TOUS les événements
        console.log(`\n🎭 Événement "${event.title}":`, {
          dateOriginale: event.date,
          dateParsee: eventDate.toLocaleDateString('fr-FR'),
          aujourdhuiMidnight: todayMidnight.toLocaleDateString('fr-FR'),
          status: event.status,
          estPasse: eventIsPast,
          estFutur: !eventIsPast
        });
        
        // **LOGIQUE UNIVERSELLE** : TOUS les événements passés sont archivés
        if (eventIsPast) {
          archived.push(event);
          console.log(`✅ → ARCHIVÉ: ${event.title} (date passée: ${eventDate.toLocaleDateString('fr-FR')})`);
        } else {
          upcoming.push(event);
          console.log(`📅 → À VENIR: ${event.title} (date future/aujourd'hui: ${eventDate.toLocaleDateString('fr-FR')})`);
        }
      });
      
      console.log(`\n📈 RÉSULTAT CLASSIFICATION:`);
      console.log(`   • Événements à venir: ${upcoming.length}`);
      console.log(`   • Événements archivés: ${archived.length}`);
      console.log(`   • Événements annulés: ${cancelled.length}`);

      if (dateFilter === 'upcoming') {
          archived.length = 0;
      } else if (dateFilter === 'past') {
          upcoming.length = 0;
      }

      upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      archived.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      cancelled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return { upcomingEvents: upcoming, archivedEvents: archived, cancelledEvents: cancelled };
  }, [fetchedEvents, location.search]);

  // Filtrer les événements archivés côté HUMORISTE: afficher uniquement ceux auxquels il a postulé
  const archivedEventsToShow = useMemo(() => {
    if (user?.role === 'COMEDIAN') {
      return archivedEvents.filter(e => appliedEventIds.has(e._id));
    }
    return archivedEvents;
  }, [archivedEvents, appliedEventIds, user?.role]);

  // Fonction de filtrage pour les événements à venir
  // Événements ACCEPTÉS (à venir) pour l'humoriste
  const acceptedUpcomingEvents = useMemo(() => {
    if (user?.role === 'COMEDIAN' && comedianApplications) {
      return upcomingEvents.filter((event) => {
        const app = comedianApplications.find(a => a.event && a.event._id === event._id);
        return app && app.status === 'ACCEPTED';
      });
    }
    return [] as IEvent[];
  }, [user?.role, comedianApplications, upcomingEvents]);

  // Base des événements à venir POUR POSTULER (exclut les acceptés pour l'humoriste)
  const upcomingEventsForApply = useMemo(() => {
    if (user?.role === 'COMEDIAN') {
      const acceptedIds = new Set(acceptedUpcomingEvents.map(e => e._id));
      return upcomingEvents.filter(e => !acceptedIds.has(e._id));
    }
    return upcomingEvents;
  }, [user?.role, acceptedUpcomingEvents, upcomingEvents]);

  const getFilteredUpcomingEvents = () => {
    const base = upcomingEventsForApply;
    if (completionFilter === 'all') return base;
    if (completionFilter === 'complete') {
      return base.filter(event => (event.participants?.length || 0) >= (event.requirements?.maxPerformers || 0));
    }
    if (completionFilter === 'incomplete') {
      return base.filter(event => (event.participants?.length || 0) < (event.requirements?.maxPerformers || 0));
    }
    return base;
  };

  const handleCardClick = (event: IEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    // Charger les absences si l'utilisateur est organisateur
    if (user?.role === 'ORGANIZER') {
      loadEventAbsences(event._id);
    }
  };

  const handleEditClick = (event: IEvent) => {
    setEventToEdit(event);
    setShowEditEventForm(true);
  };

  const handleApplyClick = (event: IEvent) => {
    setSelectedEvent(event);
    setShowApplyEventForm(true);
  };

  // Désinscription de l'humoriste (suppression de candidature)
  const handleWithdrawApplication = async (event: IEvent) => {
    if (!token || !user?._id) return;
    try {
      const app = comedianApplications?.find(a => a.event && a.event._id === event._id);
      if (!app) return;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await api.delete(`/applications/${app._id}`, config);
      alert('Vous avez été désinscrit de cet événement.');
      // Rafraîchir les données
      refetch();
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['comedianApplications'] });
    } catch (error: any) {
      console.error('Erreur lors de la désinscription:', error);
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleComedianClick = (comedian: any) => {
    // Recherche l'objet complet dans la liste des participants de l'événement sélectionné
    const fullComedian = selectedEvent?.participants?.find((p: any) => p._id === comedian._id) || comedian;
    setSelectedComedian(fullComedian);
    setIsComedianModalOpen(true);
  };

  const closeComedianModal = () => {
    setIsComedianModalOpen(false);
    setSelectedComedian(null);
  };

  const handleEventUpdated = () => {
    setShowEditEventForm(false);
    setEventToEdit(null);
    refetch();
    refreshUser();
  };

  const handleEventCreated = () => {
    setShowCreateEventForm(false);
    refetch();
    refreshUser();
  };

  const handleApplicationSubmitted = () => {
    setShowApplyEventForm(false);
    refetch(); // Refetch events to update counts/status if needed
    refreshUser();
    queryClient.invalidateQueries({ queryKey: ['comedianApplications'] }); // Force refresh des candidatures humoriste
  };

  

  const openCancelModal = async (event: IEvent) => {
    try {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(event.date);
      const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const diffDays = Math.ceil((eventMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 10) {
        const proceed = window.confirm('Confirmer la suppression de cet événement (plus de 10 jours avant) ?');
        if (!proceed) return;
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        } as const;
        await api.delete(`/events/${event._id}`, config);
        alert('Événement supprimé avec succès.');
        refetch();
        refreshUser();
        return;
      }

      setEventToCancel(event);
      setCancelReason('');
      setShowCancelModal(true);
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'événement:', error.response?.data || error.message);
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const confirmCancelEvent = async () => {
    if (!eventToCancel) return;
    try {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(eventToCancel.date);
      const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const diffMs = eventMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Raison obligatoire si < 10 jours
      if (diffDays < 10 && !cancelReason.trim()) {
        alert('Veuillez fournir une raison d\'annulation (événement dans moins de 10 jours).');
        return;
      }

      if (diffDays < 10) {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        // Envoi du statut annulé; la raison est transmise si supportée par l'API
        await api.put(`/events/${eventToCancel._id}`, { status: 'cancelled', cancellationReason: cancelReason }, config);
        alert('Événement annulé et déplacé vers "Événements annulés".');
        refetch();
        refreshUser();
      } else {
        alert('Événement non déplacé vers "Événements annulés" (plus de 10 jours avant).');
      }
    } catch (err: any) {
      console.error("Erreur lors de l'annulation de l'événement:", err.response?.data || err.message);
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    } finally {
      setShowCancelModal(false);
      setEventToCancel(null);
      setCancelReason('');
    }
  };

  const handleNotifyHumorists = async (event: IEvent) => {
    if (!token) {
      alert('Vous devez être connecté pour envoyer des notifications.');
      return;
    }

    if (!confirm(`Voulez-vous envoyer une notification par email à tous les humoristes pour l'événement "${event.title}" ?`)) {
      return;
    }

    setNotifyingEventId(event._id);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await api.post(`/events/${event._id}/notify`, {}, config);
      alert('Les notifications ont été envoyées avec succès aux humoristes !');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi des notifications:', error);
      alert('Erreur: ' + (error.response?.data?.message || error.message || 'Impossible d\'envoyer les notifications'));
    } finally {
      setNotifyingEventId(null);
    }
  };

  // Handlers pour les absences
  const handleAbsenceClick = (participant: any, event: IEvent) => {
    setSelectedAbsenceParticipant({ 
      ...participant, 
      eventId: event._id,
      eventTitle: event.title 
    });
    // Charger les absences de cet événement
    loadEventAbsences(event._id);
    setIsAbsenceModalOpen(true);
  };

  const loadEventAbsences = async (eventId: string) => {
    try {
      const absences = await getEventAbsences(eventId);
      setEventAbsences(absences);
    } catch (error) {
      console.error('Erreur lors du chargement des absences:', error);
      setEventAbsences([]);
    }
  };

  const handleMarkAbsent = async (reason: string) => {
    if (!selectedAbsenceParticipant) return;
    
    try {
      await markAbsence(
        selectedAbsenceParticipant.eventId, 
        selectedAbsenceParticipant._id, 
        reason
      );

      // Mise à jour locale du compteur d'absences
      setSelectedEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p._id === selectedAbsenceParticipant._id
              ? {
                  ...p,
                  stats: {
                    ...p.stats,
                    absences: (p.stats?.absences || 0) + 1
                  }
                }
              : p
          )
        };
      });

      // Recharger les absences pour l'affichage du détail
      await loadEventAbsences(selectedAbsenceParticipant.eventId);

      alert('Participant marqué comme absent avec succès !');
    } catch (error: any) {
      console.error('Erreur lors du marquage d\'absence:', error);
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelAbsence = async () => {
    if (!selectedAbsenceParticipant) return;
    
    try {
      await cancelAbsence(
        selectedAbsenceParticipant.eventId, 
        selectedAbsenceParticipant._id
      );

      // Mise à jour locale du compteur d'absences
      setSelectedEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p._id === selectedAbsenceParticipant._id
              ? {
                  ...p,
                  stats: {
                    ...p.stats,
                    absences: Math.max((p.stats?.absences || 1) - 1, 0)
                  }
                }
              : p
          )
        };
      });

      // Recharger les absences pour l'affichage du détail
      await loadEventAbsences(selectedAbsenceParticipant.eventId);

      alert('Absence annulée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation d\'absence:', error);
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeAbsenceModal = () => {
    setIsAbsenceModalOpen(false);
    setSelectedAbsenceParticipant(null);
    setEventAbsences([]);
  };

  const isParticipantAbsent = (participantId: string): boolean => {
    return eventAbsences.some(absence => absence.comedian._id === participantId);
  };

  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#ffffff',
    padding: '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
  };

  const pageHeaderStyle: CSSProperties = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '2.5em',
    color: '#ff416c',
  };

  const buttonStyle: CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  };

  const sectionStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '1.8em',
    color: '#ff4b2b',
    marginBottom: '15px',
  };

  const emptyStateStyle: CSSProperties = {
    color: '#aaa',
    fontSize: '1.1em',
  };

  const eventCardStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    border: '1px solid #444',
    marginBottom: '15px',
    cursor: 'pointer',
  };

  const eventTitleStyle: CSSProperties = {
    fontSize: '1.5em',
    color: '#ffffff',
    marginBottom: '5px',
  };

  const eventDetailStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#bbb',
    marginBottom: '3px',
  };

  const eventStatusStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#ff416c',
    fontWeight: 'bold',
  };

  const completionStatusStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#28a745',
    fontWeight: 'bold',
    marginTop: '5px',
  };

  const incompleteStatusStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#ffc107',
    fontWeight: 'bold',
    marginTop: '5px',
  };

  const modalDetailStyle: CSSProperties = {
    marginBottom: '10px',
  };

  const modalLabelStyle: CSSProperties = {
    fontWeight: 'bold',
    color: '#ff4b2b',
    marginRight: '5px',
  };

  const modalValueStyle: CSSProperties = {
    color: '#ffffff',
  };

  // const modalParticipantListStyle: CSSProperties = {
  //   listStyleType: 'none',
  //   padding: 0,
  //   margin: '5px 0 0 0',
  // };

  // const modalParticipantItemStyle: CSSProperties = {
  //   color: '#ffffff',
  //   marginBottom: '3px',
  // };

  const actionButtonContainerStyle: CSSProperties = {
    marginTop: '15px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  };

  const actionButtonStyleSmall: CSSProperties = {
    padding: '8px 15px',
    borderRadius: '5px',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  };

  const deleteButtonStyle: CSSProperties = {
    ...actionButtonStyleSmall,
    backgroundColor: '#dc3545',
  };

  const editButtonStyle: CSSProperties = {
    ...actionButtonStyleSmall,
    backgroundColor: '#ffc107',
  };

  const applyButtonStyle: CSSProperties = {
    ...actionButtonStyleSmall,
    background: 'linear-gradient(to right, #28a745, #218838)',
  };

  const disabledApplyButtonStyle: CSSProperties = {
    ...actionButtonStyleSmall,
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
  };

  const translateEventStatus = (status: IEvent['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'PUBLISHED':
        return 'Publié';
      case 'CANCELLED':
        return 'Annulé';
      case 'COMPLETED':
        return 'Terminé';
      default:
        return status;
    }
  };

  // Ajout du style du spinner
  const spinnerStyle: React.CSSProperties = {
    border: '8px solid #f3f3f3',
    borderTop: '8px solid #ff416c',
    borderRadius: '50%',
    width: '70px',
    height: '70px',
    animation: 'spin 1s linear infinite',
    margin: 'auto',
  };

  // Ajout de l'animation CSS dans le composant
  const spinnerKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }`;

  return (
    <div style={mainContainerStyle}>
      <style>{spinnerKeyframes}</style>
      <Navbar />
      {authIsLoading || eventsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={spinnerStyle}></div>
          <p style={{ color: '#aaa', marginTop: 20, fontSize: '1.2em' }}>
            {authIsLoading ? 'Chargement de votre profil...' : 'Chargement des événements...'}
          </p>
        </div>
      ) : eventsError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
          <p style={{ color: '#dc3545', fontSize: '1.2em', marginBottom: '20px' }}>
            Erreur lors du chargement des événements
          </p>
          <p style={{ color: '#aaa', fontSize: '1em', marginBottom: '20px', textAlign: 'center' }}>
            {eventsErrorMessage?.message || 'Une erreur inattendue s\'est produite'}
          </p>
          <button
            onClick={() => refetch()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
              color: '#fff',
              fontSize: '1em',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div style={{
              ...pageHeaderStyle,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'center' : 'center',
              gap: isMobile ? 12 : 0
            }}>
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <h1 style={titleStyle}>Les événements</h1>
              <p style={{ fontSize: '1.1em', color: '#aaa' }}>
                {user?.role === 'ORGANIZER' 
                  ? 'Gérez et visualisez vos événements. Créez de nouveaux événements pour trouver les meilleurs humoristes.'
                  : user?.role === 'SUPER_ADMIN'
                  ? 'Supervisez tous les événements de la plateforme. Utilisez les filtres pour affiner votre recherche.'
                  : 'Découvrez les événements à venir et postulez pour votre prochaine performance.'}
              </p>
            </div>
            {user?.role === 'ORGANIZER' && (
              isMobile ? (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setShowCreateEventForm(true)} style={buttonStyle}>
                    Créer un événement
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCreateEventForm(true)} style={buttonStyle}>
                  Créer un événement
                </button>
              )
            )}
          </div>

          {/* Filtres pour super admin */}
          {user?.role === 'SUPER_ADMIN' && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0',
              border: '1px solid #444'
            }}>
              <h3 style={{ color: '#ff4b2b', marginBottom: '15px', fontSize: '1.2em' }}>Filtres de recherche</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div>
                <label style={{ display: 'block', color: '#ffffff', marginBottom: '5px', fontWeight: 'bold' }}>
                  Filtrer par organisateur:
                </label>
                <select
                  value={new URLSearchParams(location.search).get('organizer') || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const params = new URLSearchParams(location.search);
                    if (e.target.value) {
                      params.set('organizer', e.target.value);
                    } else {
                      params.delete('organizer');
                    }
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <option value="" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                    Tous les organisateurs
                  </option>
                  {availableOrganizers.map((organizer) => (
                    <option 
                      key={organizer.id} 
                      value={organizer.fullName}
                      style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}
                    >
                      {organizer.fullName}
                    </option>
                  ))}
                </select>
              </div>
                <div>
                  <label style={{ display: 'block', color: '#ffffff', marginBottom: '5px', fontWeight: 'bold' }}>
                    Filtrer par lieu:
                  </label>
                  <input
                    type="text"
                    placeholder="Ville, adresse ou salle..."
                    value={new URLSearchParams(location.search).get('location') || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const params = new URLSearchParams(location.search);
                    if (e.target.value) {
                      params.set('location', e.target.value);
                    } else {
                      params.delete('location');
                    }
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                  }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button
                                  onClick={() => {
                  const params = new URLSearchParams(location.search);
                  params.delete('organizer');
                  params.delete('location');
                  navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                }}
                  style={{
                    padding: '8px 15px',
                    borderRadius: '5px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Section Événements acceptés (humoriste) */}
      {user?.role === 'COMEDIAN' && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Événements acceptés</h2>
          {acceptedUpcomingEvents.length === 0 && (
            <p style={emptyStateStyle}>Aucun événement accepté à venir.</p>
          )}
          {acceptedUpcomingEvents.map((event) => (
            <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
              <h3 style={eventTitleStyle}>{event.title}</h3>
              <p style={eventDetailStyle}>Date: {new Date(event.date).toLocaleDateString()}</p>
              <p style={eventDetailStyle}>Lieu: {(() => {
                const location = event.location;
                if (typeof location === 'object' && location !== null) {
                  const address = location.address || '';
                  const city = location.city || '';
                  return `${address}${address && city ? ', ' : ''}${city}`.trim() || 'Lieu non spécifié';
                }
                return 'Lieu non spécifié';
              })()}</p>
              <p style={eventDetailStyle}>Organisateur: {getOrganizerName(event.organizer)}</p>
              <p style={{ ...eventStatusStyle, color: '#28a745' }}>Statut: Accepté</p>
              <div style={actionButtonContainerStyle}>
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleWithdrawApplication(event); }}
                  style={deleteButtonStyle}
                >
                  Me désinscrire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <h2 style={sectionTitleStyle}>Événements à venir {user?.role === 'COMEDIAN' ? '(pour postuler)' : ''}</h2>
          <select
            value={completionFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompletionFilter(e.target.value as 'all' | 'complete' | 'incomplete')}
            style={{ marginLeft: 'auto', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff', minWidth: 160 }}
          >
            <option value="all">Tous</option>
            <option value="complete">Complet</option>
            <option value="incomplete">Non complet</option>
          </select>
        </div>
        {eventsLoading && <p style={emptyStateStyle}>Chargement des événements...</p>}
        {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
        {getFilteredUpcomingEvents().length === 0 && !eventsLoading && !eventsError && (
          <p style={emptyStateStyle}>Aucun événement à venir pour ce filtre.</p>
        )}
        {getFilteredUpcomingEvents().map((event) => (
          <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
            <h3 style={eventTitleStyle}>{event.title}</h3>
            <p style={eventDetailStyle}>Date: {new Date(event.date).toLocaleDateString()}</p>
            <p style={eventDetailStyle}>Lieu: {(() => {
              const location = event.location;
              if (typeof location === 'object' && location !== null) {
                const address = location.address || '';
                const city = location.city || '';
                return `${address}${address && city ? ', ' : ''}${city}`.trim() || 'Lieu non spécifié';
              }
              return 'Lieu non spécifié';
            })()}</p>
            <p style={eventDetailStyle}>Organisateur: {getOrganizerName(event.organizer)}</p>
            <p style={eventStatusStyle}>Statut: {translateEventStatus(event.status)} <span style={{fontSize: '0.8em', color: '#aaa'}}>({event.status})</span></p>
            {(event.participants?.length || 0) < event.requirements.maxPerformers ? (
              <p style={incompleteStatusStyle}>Non complet ({event.participants?.length || 0}/{event.requirements.maxPerformers})</p>
            ) : (
              <p style={completionStatusStyle}>Complet ({event.participants?.length || 0}/{event.requirements.maxPerformers})</p>
            )}
            {user?.role === 'COMEDIAN' && (
              <div style={actionButtonContainerStyle}>
                {!appliedEventIds.has(event._id) ? (
                  <button 
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleApplyClick(event); }}
                    style={
                      (event.participants?.length || 0) >= event.requirements.maxPerformers
                        ? disabledApplyButtonStyle 
                        : applyButtonStyle
                    }
                    disabled={(event.participants?.length || 0) >= event.requirements.maxPerformers}
                  >
                    {(event.participants?.length || 0) >= event.requirements.maxPerformers
                      ? 'Événement complet'
                      : 'Postuler'}
                  </button>
                ) : (
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleWithdrawApplication(event); }}
                    style={deleteButtonStyle}
                  >
                    Me désinscrire
                  </button>
                )}
                {comedianApplications &&
                  (() => {
                    const app = comedianApplications.find(app => app.event && app.event._id === event._id);
                    if (app) {
                      let color = '#ffc107';
                      let label = 'En cours';
                      if (app.status === 'ACCEPTED') { color = '#28a745'; label = 'Acceptée'; }
                      if (app.status === 'REJECTED') { color = '#dc3545'; label = 'Refusée'; }
                      return (
                        <span style={{ marginLeft: 12, fontWeight: 'bold', color }}>{label}</span>
                      );
                    }
                    return null;
                  })()
                }
              </div>
            )}
            {user?.role === 'ORGANIZER' && upcomingEvents.includes(event) && (
              <div style={actionButtonContainerStyle}>
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleEditClick(event); }}
                  style={editButtonStyle}
                >
                  Modifier
                </button>
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleNotifyHumorists(event); }}
                  style={{ ...actionButtonStyleSmall, backgroundColor: '#17a2b8' }}
                  disabled={notifyingEventId === event._id}
                >
                  {notifyingEventId === event._id ? 'Envoi...' : '📧 Notifier les humoristes'}
                </button>
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openCancelModal(event); }}
                  style={{ ...actionButtonStyleSmall, backgroundColor: '#6c757d' }}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {user?.role !== 'COMEDIAN' && (
        <div ref={archivedSectionRef} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Événements archivés</h2>
          {eventsLoading && <p style={emptyStateStyle}>Chargement des événements...</p>}
          {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
          {!eventsLoading && !eventsError && archivedEventsToShow.length === 0 && (
            <p style={emptyStateStyle}>Aucun événement archivé.</p>
          )}
          {archivedEventsToShow.map((event) => (
            <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
            <h3 style={eventTitleStyle}>{event.title}</h3>
            <p style={eventDetailStyle}>Date: {new Date(event.date).toLocaleDateString()}</p>
            <p style={eventDetailStyle}>Lieu: {(() => {
              const location = event.location;
              if (typeof location === 'object' && location !== null) {
                const address = location.address || '';
                const city = location.city || '';
                return `${address}${address && city ? ', ' : ''}${city}`.trim() || 'Lieu non spécifié';
              }
              return 'Lieu non spécifié';
            })()}</p>
            <p style={eventDetailStyle}>Organisateur: {getOrganizerName(event.organizer)}</p>
            <p style={eventStatusStyle}>Statut: {translateEventStatus(event.status)} <span style={{fontSize: '0.8em', color: '#aaa'}}>({event.status})</span></p>
            {new Date(event.date) >= new Date() && (
              <p style={{...eventDetailStyle, color: '#ffc107', fontWeight: 'bold'}}>⚠️ Événement futur (classé en archive)</p>
            )}
            {(event.participants?.length || 0) < event.requirements.maxPerformers ? (
              <p style={incompleteStatusStyle}>Non complet ({event.participants?.length || 0}/{event.requirements.maxPerformers})</p>
            ) : (
              <p style={completionStatusStyle}>Complet ({event.participants?.length || 0}/{event.requirements.maxPerformers})</p>
            )}
            {user?.role === 'COMEDIAN' && (
              <div style={actionButtonContainerStyle}>
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleApplyClick(event); }}
                  style={{
                    ...applyButtonStyle,
                    ...(appliedEventIds.has(event._id) || 
                        new Date(event.date) < new Date() || 
                        (event.participants?.length || 0) >= event.requirements.maxPerformers 
                        ? disabledApplyButtonStyle : {})
                  }}
                  disabled={
                    appliedEventIds.has(event._id) || 
                    new Date(event.date) < new Date() ||
                    (event.participants?.length || 0) >= event.requirements.maxPerformers
                  }
                >
                  {appliedEventIds.has(event._id)
                    ? 'Déjà postulé'
                    : new Date(event.date) < new Date()
                      ? 'Candidature fermée'
                      : (event.participants?.length || 0) >= event.requirements.maxPerformers
                      ? 'Événement complet'
                      : 'Postuler'}
                </button>
                {comedianApplications &&
                  (() => {
                    const app = comedianApplications.find(app => app.event && app.event._id === event._id);
                    if (app) {
                      let color = '#ffc107';
                      let label = 'En cours';
                      if (app.status === 'ACCEPTED') { color = '#28a745'; label = 'Acceptée'; }
                      if (app.status === 'REJECTED') { color = '#dc3545'; label = 'Refusée'; }
                      return (
                        <span style={{ marginLeft: 12, fontWeight: 'bold', color }}>{label}</span>
                      );
                    }
                    return null;
                  })()
                }
                {new Date(event.date) < new Date() && (
                  <span style={{ marginLeft: 12, color: '#aaa', fontStyle: 'italic' }}>
                    Impossible de postuler à un événement passé.
                  </span>
                )}
              </div>
            )}
            {user?.role === 'ORGANIZER' && upcomingEvents.includes(event) && (
              <div style={actionButtonContainerStyle}>
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleEditClick(event); }}
                  style={editButtonStyle}
                >
                  Modifier
                </button>
                
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Détails de l'événement">
        {selectedEvent && (
          <div>
            <h2 style={{ fontSize: '1.8em', color: '#ff4b2b', marginBottom: '15px' }}>{selectedEvent.title}</h2>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Description:</span> <span style={modalValueStyle}>{selectedEvent.description}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Date:</span> <span style={modalValueStyle}>{new Date(selectedEvent.date).toLocaleDateString()}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Heure:</span> <span style={modalValueStyle}>{selectedEvent.startTime || ''}{selectedEvent.startTime && selectedEvent.endTime ? ' - ' : ''}{selectedEvent.endTime || ''}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Lieu:</span> <span style={modalValueStyle}>
              {(() => {
                const location = selectedEvent.location;
                if (typeof location === 'object' && location !== null) {
                  const venue = location.venue || '';
                  const address = location.address || '';
                  const city = location.city || '';
                  return `${venue}${venue && address ? ', ' : ''}${address}${(venue || address) && city ? ', ' : ''}${city}`.trim();
                }
                return 'Lieu non spécifié';
              })()}
            </span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Organisateur:</span> <span style={modalValueStyle}>{getOrganizerName(selectedEvent.organizer)}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Email:</span> <span style={modalValueStyle}>{selectedEvent.organizer?.email || 'Non disponible'}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Statut:</span> <span style={modalValueStyle}>{translateEventStatus(selectedEvent.status)}</span></p>
            {selectedEvent.status.toLowerCase() === 'cancelled' && selectedEvent.cancellationReason && (
              <p style={modalDetailStyle}>
                <span style={modalLabelStyle}>Raison de l'annulation:</span> 
                <span style={modalValueStyle}>{selectedEvent.cancellationReason}</span>
              </p>
            )}
            
            <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>Exigences:</h3>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Expérience Minimale:</span> <span style={modalValueStyle}>{selectedEvent.requirements.minExperience} ans</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Nombre Max. Performers:</span> <span style={modalValueStyle}>{selectedEvent.requirements.maxPerformers}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Durée Proposée:</span> <span style={modalValueStyle}>{selectedEvent.requirements.duration} min</span></p>

            {user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN' ? (
              <>
                <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>
                  Participants ({selectedEvent.participants?.length || 0}/{selectedEvent.requirements.maxPerformers})
                </h3>
                {selectedEvent.participants && selectedEvent.participants.length > 0 ? (
                  <div>
                    {selectedEvent.participants.map((participant, index) => {
                      const isAbsent = isParticipantAbsent((participant as any)._id);
                      const absence = eventAbsences.find(absence => absence.comedian._id === (participant as any)._id);
                      
                      return (
                        <div key={index} style={{
                          marginBottom: '12px',
                          padding: '10px',
                          backgroundColor: isAbsent ? 'rgba(220, 53, 69, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: isAbsent ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAbsent && absence?.reason ? '8px' : '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                              {isAbsent && (
                                <span style={{ 
                                  color: '#dc3545', 
                                  marginRight: '8px', 
                                  fontSize: '16px',
                                  fontWeight: 'bold' 
                                }}>
                                  🚫
                                </span>
                              )}
                              <span 
                                style={{
                                  color: '#ff4b2b',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 'bold'
                                }}
                                onClick={() => handleComedianClick(participant)}
                              >
                                {(participant as any).firstName} {(participant as any).lastName}
                              </span>
                              {isAbsent && (
                                <span style={{ 
                                  marginLeft: '10px',
                                  color: '#dc3545',
                                  fontSize: '12px',
                                  fontStyle: 'italic'
                                }}>
                                  (Absent)
                                </span>
                              )}
                            </div>
                            
                            {user?.role === 'ORGANIZER' && (
                              <button
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: isAbsent ? '#28a745' : '#dc3545',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  marginLeft: '10px'
                                }}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  handleAbsenceClick(participant, selectedEvent);
                                }}
                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.currentTarget.style.opacity = '0.8';
                                }}
                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                              >
                                {isAbsent ? '✅ Marquer présent' : '🚫 Marquer absent'}
                              </button>
                            )}
                          </div>
                          
                          {/* Message d'absence */}
                          {isAbsent && absence?.reason && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderLeft: '3px solid #dc3545'
                            }}>
                              <div style={{ fontSize: '0.8em', color: '#ffc107', marginBottom: '2px', fontWeight: 'bold' }}>
                                💬 Raison de l'absence:
                              </div>
                              <div style={{ fontSize: '0.8em', color: '#ffffff', fontStyle: 'italic' }}>
                                "{absence.reason}"
                              </div>
                              <div style={{ fontSize: '0.7em', color: '#aaa', marginTop: '4px' }}>
                                Marqué le {new Date(absence.markedAt).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={modalValueStyle}>Aucun participant pour l'instant.</p>
                )}
              </>
            ) : (
              <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>
                Participants attendus ({selectedEvent.requirements.maxPerformers})
              </h3>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={showEditEventForm} onClose={() => setShowEditEventForm(false)} title="Modifier l'événement">
        {eventToEdit && (
          <EditEventForm
            eventToEdit={eventToEdit}
            onClose={() => setShowEditEventForm(false)}
            onEventUpdated={handleEventUpdated}
          />
        )}
      </Modal>

      <Modal isOpen={showCreateEventForm && user?.role === 'ORGANIZER'} onClose={() => setShowCreateEventForm(false)} title="Créer un événement">
        {showCreateEventForm && user?.role === 'ORGANIZER' && (
          <CreateEventForm 
            onClose={() => setShowCreateEventForm(false)} 
            onEventCreated={handleEventCreated} 
          />
        )}
      </Modal>

      {/* Section Événements annulés (organisateur et super admin) */}
      {user?.role !== 'COMEDIAN' && (
        <div ref={cancelledSectionRef} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Événements annulés</h2>
          {eventsLoading && <p style={emptyStateStyle}>Chargement des événements...</p>}
          {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
          {!eventsLoading && !eventsError && cancelledEvents.length === 0 && (
            <p style={emptyStateStyle}>Aucun événement annulé.</p>
          )}
          {cancelledEvents.map((event) => (
            <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
              <h3 style={eventTitleStyle}>{event.title}</h3>
              <p style={eventDetailStyle}>Date: {new Date(event.date).toLocaleDateString()}</p>
              <p style={eventDetailStyle}>Lieu: {(() => {
                const location = event.location;
                if (typeof location === 'object' && location !== null) {
                  const address = location.address || '';
                  const city = location.city || '';
                  return `${address}${address && city ? ', ' : ''}${city}`.trim() || 'Lieu non spécifié';
                }
                return 'Lieu non spécifié';
              })()}</p>
              <p style={eventDetailStyle}>Organisateur: {getOrganizerName(event.organizer)}</p>
              <p style={{ ...eventStatusStyle, color: '#dc3545' }}>Statut: Annulé</p>
              {event.cancellationReason && (
                <p style={{ ...eventDetailStyle, marginTop: 6 }}>
                  <span style={{ fontWeight: 'bold', color: '#ff4b2b' }}>Raison:</span> {event.cancellationReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showApplyEventForm && user?.role === 'COMEDIAN' && selectedEvent && (
        <ApplyToEventForm
          event={selectedEvent}
          onClose={() => setShowApplyEventForm(false)}
          onApplicationSubmitted={handleApplicationSubmitted}
        />
      )}

      <ComedianDetailsModal
        isOpen={isComedianModalOpen}
        onClose={closeComedianModal}
        comedian={selectedComedian}
      />

      <AbsenceModal
        isOpen={isAbsenceModalOpen}
        onClose={closeAbsenceModal}
        comedianName={selectedAbsenceParticipant ? 
          `${selectedAbsenceParticipant.firstName} ${selectedAbsenceParticipant.lastName}` : 
          ''
        }
        eventTitle={selectedAbsenceParticipant?.eventTitle || ''}
        isAlreadyAbsent={selectedAbsenceParticipant ? 
          isParticipantAbsent(selectedAbsenceParticipant._id) : 
          false
        }
        existingReason={selectedAbsenceParticipant ? 
          eventAbsences.find(absence => absence.comedian._id === selectedAbsenceParticipant._id)?.reason : 
          undefined
        }
        onMarkAbsent={handleMarkAbsent}
        onCancelAbsence={handleCancelAbsence}
      />

      {/* Modal d'annulation d'événement avec raison */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Annuler l'événement">
        <div>
          <p style={{ marginBottom: 12, color: '#ddd' }}>
            {(() => {
              if (!eventToCancel) return "";
              const now = new Date();
              const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const eventDate = new Date(eventToCancel.date);
              const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
              const diffDays = Math.ceil((eventMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays < 10
                ? "Veuillez indiquer la raison de l'annulation (obligatoire car l'événement est dans moins de 10 jours)."
                : "Vous pouvez indiquer une raison (facultatif).";
            })()}
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Raison de l'annulation"
            style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 6, border: '1px solid #555', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
          />
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowCancelModal(false)} style={{ ...actionButtonStyleSmall, backgroundColor: '#6c757d' }}>
              Fermer
            </button>
            <button onClick={confirmCancelEvent} style={{ ...actionButtonStyleSmall, background: 'linear-gradient(to right, #ff416c, #ff4b2b)' }}>
              Confirmer l'annulation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MyEventsPage; 