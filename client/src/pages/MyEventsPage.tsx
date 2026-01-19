import { type CSSProperties, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import CreateEventForm from '../components/CreateEventForm';
import EditEventForm from '../components/EditEventForm';
import ApplyToEventForm from '../components/ApplyToEventForm';
import ComedianDetailsModal from '../components/ComedianDetailsModal';
import AbsenceModal from '../components/AbsenceModal';
import EventCalendar from '../components/EventCalendar';
import ScorePieChart from '../components/ScorePieChart';
import { matchesMobilityZones, normalizeString } from '../utils/geographicMatching';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { IEvent } from '../types/event';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IApplication } from './ApplicationsPage'; // Import IApplication
import { markAbsence, cancelAbsence, getEventAbsences, addEventFavorite, removeEventFavorite, getEventFavorites, getRecommendations, getSmartRecommendations } from '../services/api';

const ITEMS_PER_PAGE = 5;
type ComedianTab = 'opportunities' | 'accepted' | 'favorites' | 'recommendations';

// Types pour les recommandations intelligentes
type SmartRecommendationMatchType = 'same_event_name' | 'same_organizer' | 'both';
interface SmartRecommendation {
  event: IEvent;
  matchType: SmartRecommendationMatchType;
  matchedEventTitle?: string;
  matchedOrganizerName?: string;
}
interface SmartRecommendationsResponse {
  recommendations: SmartRecommendation[];
  total: number;
  page: number;
  limit: number;
}
type OrganizerTab = 'upcoming' | 'full' | 'archived' | 'cancelled' | 'calendar';
type SuperAdminTab = 'full' | 'upcoming' | 'archived' | 'cancelled';

function MyEventsPage() {
  const { token, user, refreshUser, isLoading: authIsLoading } = useAuth();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const isComedianView = user?.role === 'COMEDIAN';
  const isOrganizerView = user?.role === 'ORGANIZER';
  const isSuperAdminView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOrganizerView) {
      setOrganizerTab('upcoming');
    }
  }, [isOrganizerView]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      setSuperAdminTab('full');
    }
  }, [user?.role]);

  // Calculer isQueryEnabled avant son utilisation
  const isQueryEnabled = !authIsLoading && !!token && !!user?._id;

  // Charger les favoris depuis l'API
  const { data: eventFavoritesData, refetch: refetchEventFavorites } = useQuery<{ favorites: IEvent[] }, Error>({
    queryKey: ['eventFavorites', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id || user?.role !== 'COMEDIAN') {
        throw new Error("Informations d'authentification manquantes.");
      }
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await getEventFavorites();
      return response;
    },
    enabled: isComedianView && isQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Extraire les IDs des évènements favoris
  useEffect(() => {
    if (eventFavoritesData?.favorites) {
      const favoriteIds = eventFavoritesData.favorites.map(event => event._id);
      setFavoriteEventIds(favoriteIds);
    } else if (!isComedianView) {
      setFavoriteEventIds([]);
    }
  }, [eventFavoritesData, isComedianView]);

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
  const [comedianTab, setComedianTab] = useState<ComedianTab>('opportunities');
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>('upcoming');
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('full');
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [eventToCancel, setEventToCancel] = useState<IEvent | null>(null);
  const [notifyingEventId, setNotifyingEventId] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [eventToWithdraw, setEventToWithdraw] = useState<IEvent | null>(null);
  const [eventToDuplicate, setEventToDuplicate] = useState<IEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationSearch, setLocationSearch] = useState(''); // Recherche par lieu pour les humoristes
  const [experienceFilter, setExperienceFilter] = useState<'all' | '0-50' | '50-200' | '200+'>('all'); // Filtre par niveau d'expérience
  // États pour les filtres organisateur
  const [organizerEventZoneSearch, setOrganizerEventZoneSearch] = useState(''); // Recherche par zone d'événement pour les organisateurs
  const [organizerEventExperienceFilter, setOrganizerEventExperienceFilter] = useState<'all' | '0-50' | '50-200' | '200+'>('all'); // Filtre par niveau d'expérience pour les organisateurs
  // État pour la recherche d'humoriste par zone d'événement dans le modal
  const [participantZoneSearch, setParticipantZoneSearch] = useState('');
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [focusParticipantsSection, setFocusParticipantsSection] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Définir l'onglet initial pour les comédiens en fonction du paramètre URL 'tab'
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (isComedianView && tabParam) {
      const validComedianTabs: ComedianTab[] = ['opportunities', 'accepted', 'favorites', 'recommendations'];
      if (validComedianTabs.includes(tabParam as ComedianTab)) {
        setComedianTab(tabParam as ComedianTab);
      } else {
        setComedianTab('opportunities');
      }
    }
  }, [isComedianView, location.search]);

  // Définir l'onglet initial pour les organisateurs en fonction du paramètre URL 'tab'
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (isOrganizerView && tabParam) {
      const validOrganizerTabs: OrganizerTab[] = ['upcoming', 'full', 'archived', 'cancelled'];
      if (validOrganizerTabs.includes(tabParam as OrganizerTab)) {
        setOrganizerTab(tabParam as OrganizerTab);
      } else {
        setOrganizerTab('upcoming');
      }
    } else if (!isOrganizerView) {
      setOrganizerTab('upcoming');
    }
  }, [isOrganizerView, location.search]);

  // Définir l'onglet initial pour les super-admins en fonction du paramètre URL 'tab'
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (user?.role === 'SUPER_ADMIN' && tabParam) {
      const validSuperAdminTabs: SuperAdminTab[] = ['full', 'upcoming', 'archived', 'cancelled'];
      if (validSuperAdminTabs.includes(tabParam as SuperAdminTab)) {
        setSuperAdminTab(tabParam as SuperAdminTab);
      } else {
        setSuperAdminTab('full');
      }
    } else if (user?.role !== 'SUPER_ADMIN') {
      setSuperAdminTab('full');
    }
  }, [user?.role, location.search]);

useEffect(() => {
  if (user?.role === 'SUPER_ADMIN') {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
  } else {
    setSearchTerm('');
  }
}, [user?.role, location.search]);

  // Refs pour le scroll automatique
  const cancelledSectionRef = useRef<HTMLDivElement>(null);
  const archivedSectionRef = useRef<HTMLDivElement>(null);
  const participantsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModalOpen && focusParticipantsSection && participantsSectionRef.current) {
      const timeout = setTimeout(() => {
        participantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setFocusParticipantsSection(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isModalOpen, focusParticipantsSection]);

  console.log("MyEventsPage: Initial token", token);
  console.log("MyEventsPage: Initial user", user);
  console.log("MyEventsPage: Auth is loading?", authIsLoading);
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
      // Pour les humoristes, récupérer TOUS les évènements
      // Pour les organisateurs, récupérer seulement leurs évènements
      const apiUrl = user?.role === 'ORGANIZER'
        ? `/events?organizerId=${user._id}`
        : `/events`; // Pas de filtre organizerId pour les humoristes
      
      console.log(`🔗 Requête API: ${apiUrl} (Role: ${user?.role})`);
      try {
        const res = await api.get<IEvent[]>(apiUrl, config);
        const list = Array.isArray(res.data) ? res.data : (Array.isArray((res.data as any)?.events) ? (res.data as any).events : []);
        console.log("MyEventsPage: Données d'évènements reçues par useQuery:", list);
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
        console.error("❌ Erreur lors de la récupération des évènements:", error);
        console.error("❌ Détails de l'erreur:", error.response?.data || error.message);
        throw error;
      }
    },
    enabled: isQueryEnabled, // Utiliser isQueryEnabled au lieu de true
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // New useQuery for comedian's applications
  const { data: comedianApplications, isLoading: comedianApplicationsLoading, isError: comedianApplicationsError, error: comedianApplicationsErrorMessage } = useQuery<IApplication[], Error>({
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

  // Charger les scores de recommandation pour les humoristes
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery<{
    recommendations: Array<{
      event: IEvent;
      score: number;
      breakdown?: { geographic: number; experienceLevel: number; experienceYears: number };
      matchReasons?: string[];
    }>
  }, Error>({
    queryKey: ['recommendations', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id || user?.role !== 'COMEDIAN') {
        throw new Error("Informations d'authentification manquantes.");
      }
      const response = await getRecommendations({ limit: 200 }); // Charger suffisamment d'événements
      return response;
    },
    enabled: isComedianView && isQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Charger les recommandations intelligentes (basées sur l'historique)
  const { data: smartRecommendationsData, isLoading: smartRecommendationsLoading } = useQuery<SmartRecommendationsResponse, Error>({
    queryKey: ['smartRecommendations', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id || user?.role !== 'COMEDIAN') {
        throw new Error("Informations d'authentification manquantes.");
      }
      const response = await getSmartRecommendations({ limit: 100 });
      return response;
    },
    enabled: isComedianView && isQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Créer un Map pour accéder aux informations de match par eventId
  const smartRecommendationMap = useMemo(() => {
    const map = new Map<string, SmartRecommendation>();
    if (smartRecommendationsData?.recommendations) {
      smartRecommendationsData.recommendations.forEach(rec => {
        if (rec.event?._id) {
          map.set(String(rec.event._id), rec);
        }
      });
    }
    return map;
  }, [smartRecommendationsData]);

  // Événements des recommandations intelligentes
  const smartRecommendationEvents = useMemo(() => {
    if (!smartRecommendationsData?.recommendations) return [];
    return smartRecommendationsData.recommendations.map(rec => rec.event);
  }, [smartRecommendationsData]);

  // Créer un Map des scores et détails par eventId pour un accès rapide
  const eventRecommendationMap = useMemo(() => {
    const map = new Map<string, {
      score: number;
      breakdown?: { geographic: number; experienceLevel: number; experienceYears: number };
      matchReasons?: string[];
    }>();
    if (recommendationsData?.recommendations) {
      recommendationsData.recommendations.forEach(rec => {
        if (rec.event?._id) {
          map.set(String(rec.event._id), {
            score: rec.score,
            breakdown: rec.breakdown,
            matchReasons: rec.matchReasons
          });
        }
      });
    }
    return map;
  }, [recommendationsData]);

  // Événements de l'API recommendations avec leurs scores (pour l'onglet Opportunités)
  const recommendationEventsWithScores = useMemo(() => {
    if (!recommendationsData?.recommendations) return [];
    return recommendationsData.recommendations.map(rec => ({
      ...rec.event,
      _recommendationScore: rec.score
    }));
  }, [recommendationsData]);

  // Scroll automatique vers les sections selon les paramètres URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const statusFilters = queryParams.getAll('status');
    
    // Délai pour s'assurer que les éléments sont rendus
    const scrollTimeout = setTimeout(() => {
      if (statusFilters.includes('cancelled') && cancelledSectionRef.current) {
        console.log('🎯 Scroll automatique vers la section "Évènements annulés"');
        cancelledSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else if (statusFilters.includes('completed') && archivedSectionRef.current) {
        console.log('🎯 Scroll automatique vers la section "Évènements archivés"');
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

  const favoriteIdsSet = useMemo(() => new Set(favoriteEventIds), [favoriteEventIds]);

  const toggleFavoriteEvent = async (eventId: string) => {
    if (!isComedianView || !token) return;
    
    const isCurrentlyFavorite = favoriteIdsSet.has(eventId);
    
    // Optimistic update
    setFavoriteEventIds(prev => {
      const updated = new Set(prev);
      if (isCurrentlyFavorite) {
        updated.delete(eventId);
      } else {
        updated.add(eventId);
      }
      return Array.from(updated);
    });

    try {
      if (isCurrentlyFavorite) {
        await removeEventFavorite(eventId);
      } else {
        await addEventFavorite(eventId);
      }
      // Rafraîchir les favoris depuis l'API pour s'assurer de la cohérence
      await refetchEventFavorites();
    } catch (error: any) {
      console.error('❌ [MyEventsPage] Erreur lors de la modification des favoris:', error);
      // Revert optimistic update en cas d'erreur
      setFavoriteEventIds(prev => {
        const updated = new Set(prev);
        if (isCurrentlyFavorite) {
          updated.add(eventId);
        } else {
          updated.delete(eventId);
        }
        return Array.from(updated);
      });
      alert(error.response?.data?.message || 'Erreur lors de la modification des favoris');
    }
  };

  const comedianApplicationsMap = useMemo(() => {
    const map = new Map<string, IApplication>();
    if (comedianApplications) {
      comedianApplications.forEach(app => {
        if (app.event?._id) {
          map.set(app.event._id, app);
        }
      });
    }
    return map;
  }, [comedianApplications]);

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

  const formatEventLocation = (event: IEvent): string => {
    const location = event.location;
    if (location && typeof location === 'object') {
      const venue = location.venue || '';
      const address = location.address || '';
      const city = location.city || '';
      return [venue, address, city].filter(Boolean).join(', ') || 'Lieu non spécifié';
    }
    return 'Lieu non spécifié';
  };

  const formatEventTimeRange = (event: IEvent): string => {
    const { startTime, endTime } = event;
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return startTime;
    if (endTime) return endTime;
    return 'Horaires non précisés';
  };

  const getParticipantsRatio = (event: IEvent): string => {
    const current = event.participants?.length || 0;
    const max = event.requirements?.maxPerformers || 0;
    return `${current}/${max}`;
  };

  const isEventComplete = (event: IEvent): boolean => {
    const current = event.participants?.length || 0;
    const max = event.requirements?.maxPerformers || 0;
    if (!max) return false;
    return current >= max;
  };

  // Extraire la liste unique des organisateurs pour le dropdown
  const availableOrganizers = useMemo(() => {
    if (!fetchedEvents || user?.role !== 'SUPER_ADMIN') return [];
    
    const organizersMap = new Map();
    fetchedEvents.forEach((event: IEvent) => {
      if (!event.organizer) return; // Ignorer les évènements sans organisateur
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
      const keywordFilter = queryParams.get('search');

      console.log('🔄 RECALCUL DES FILTRES:', {
        totalEvents: eventsToFilter.length,
        organizerFilter,
        keywordFilter,
        userRole: user?.role
      });

      let filteredEvents = eventsToFilter;

      if (statusFilters.length > 0) {
        filteredEvents = filteredEvents.filter((event: IEvent) => event.status && statusFilters.includes(event.status));
      }

      // Sécurité supplémentaire côté client : un organisateur ne peut voir que ses propres évènements
      if (user?.role === 'ORGANIZER' && user?._id) {
        filteredEvents = filteredEvents.filter((event: IEvent) => {
          const organizerId = getOrganizerIdFromEvent(event.organizer);
          const matches = organizerId === user._id;
          if (!matches) {
            console.warn('🚫 Évènement ignoré car il n’appartient pas à cet organisateur:', {
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
        console.log(`📊 Évènements avant filtrage organisateur: ${filteredEvents.length}`);
        filteredEvents = filteredEvents.filter((event: IEvent) => {
          const eventOrganizerName = getOrganizerName(event.organizer);
          const matches = eventOrganizerName === organizerFilter;
          console.log(`   - Évènement "${event.title}" (organisateur: "${eventOrganizerName}") → ${matches ? 'INCLUS' : 'EXCLU'}`);
          return matches;
        });
        console.log(`📊 Évènements après filtrage organisateur: ${filteredEvents.length}`);
      }

      // Barre de recherche mots-clés (pour super admin)
      if (user?.role === 'SUPER_ADMIN' && keywordFilter) {
        const normalized = keywordFilter.toLowerCase();
        filteredEvents = filteredEvents.filter((event: IEvent) => {
          const locationData = event.location || { city: '', address: '', venue: '' };
          const organizerName = getOrganizerName(event.organizer);
          const fieldsToSearch = [
            event.title,
            event.description,
            organizerName,
            locationData.city,
            locationData.address,
            locationData.venue,
          ];
          return fieldsToSearch.some((field) => field?.toLowerCase().includes(normalized));
        });
      }

      const now = new Date();
      // Comparaison uniquement par date (ignorer l'heure)
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log(`🔍 DEBUG CLASSIFICATION - Aujourd'hui: ${todayMidnight.toLocaleDateString('fr-FR')}`);
      console.log(`📊 Total évènements récupérés: ${filteredEvents.length}`);
      
      filteredEvents.forEach((event: IEvent) => {
        // D'abord, isoler les évènements annulés pour qu'ils n'apparaissent pas ailleurs
        const isCancelled = (event.status === 'CANCELLED' || event.status === 'cancelled');
        if (isCancelled) {
          cancelled.push(event);
          return;
        }
        // Utilise la nouvelle logique avec endTime
        const eventIsPast = isEventPast(event.date, event.endTime);
        const eventDate = new Date(event.date);
        
        // Debug logging détaillé pour tracer TOUS les évènements
        console.log(`\n🎭 Évènement "${event.title}":`, {
          dateOriginale: event.date,
          dateParsee: eventDate.toLocaleDateString('fr-FR'),
          aujourdhuiMidnight: todayMidnight.toLocaleDateString('fr-FR'),
          status: event.status,
          estPasse: eventIsPast,
          estFutur: !eventIsPast
        });
        
        // **LOGIQUE UNIVERSELLE** : TOUS les évènements passés sont archivés
        if (eventIsPast) {
          archived.push(event);
          console.log(`✅ → ARCHIVÉ: ${event.title} (date passée: ${eventDate.toLocaleDateString('fr-FR')})`);
        } else {
          upcoming.push(event);
          console.log(`📅 → À VENIR: ${event.title} (date future/aujourd'hui: ${eventDate.toLocaleDateString('fr-FR')})`);
        }
      });
      
      console.log(`\n📈 RÉSULTAT CLASSIFICATION:`);
      console.log(`   • Évènements à venir: ${upcoming.length}`);
      console.log(`   • Évènements archivés: ${archived.length}`);
      console.log(`   • Évènements annulés: ${cancelled.length}`);

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

  const totalCancelledPages = Math.max(1, Math.ceil(cancelledEvents.length / ITEMS_PER_PAGE));
  const paginatedCancelledEvents = cancelledEvents.slice(
    (cancelledPage - 1) * ITEMS_PER_PAGE,
    cancelledPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCancelledPage(1);
  }, [cancelledEvents]);

  useEffect(() => {
    if (cancelledPage > totalCancelledPages) {
      setCancelledPage(totalCancelledPages);
    }
  }, [cancelledPage, totalCancelledPages]);

  // Filtrer les évènements archivés côté HUMORISTE: afficher uniquement ceux auxquels il a postulé
  const archivedEventsToShow = useMemo(() => {
    if (user?.role === 'COMEDIAN') {
      return archivedEvents.filter(e => appliedEventIds.has(e._id));
    }
    return archivedEvents;
  }, [archivedEvents, appliedEventIds, user?.role]);

  const totalArchivedPages = Math.max(1, Math.ceil(archivedEventsToShow.length / ITEMS_PER_PAGE));
  const paginatedArchivedEvents = archivedEventsToShow.slice(
    (archivedPage - 1) * ITEMS_PER_PAGE,
    archivedPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setArchivedPage(1);
  }, [archivedEventsToShow]);

  useEffect(() => {
    if (archivedPage > totalArchivedPages) {
      setArchivedPage(totalArchivedPages);
    }
  }, [archivedPage, totalArchivedPages]);

  // Fonction de filtrage pour les évènements à venir
  // Évènements ACCEPTÉS (à venir) pour l'humoriste
  const acceptedUpcomingEvents = useMemo(() => {
    if (user?.role === 'COMEDIAN' && comedianApplications) {
      let filtered = upcomingEvents.filter((event) => {
        const app = comedianApplications.find(a => a.event && a.event._id === event._id);
        return app && app.status === 'ACCEPTED';
      });
      
      // Filtre 1 : par lieu (recherche dans city, address, venue)
      if (locationSearch.trim()) {
        const searchLower = locationSearch.toLowerCase().trim();
        filtered = filtered.filter(event => {
          const location = event.location;
          if (!location || typeof location !== 'object') return false;
          const city = (location.city || '').toLowerCase();
          const address = (location.address || '').toLowerCase();
          const venue = (location.venue || '').toLowerCase();
          return city.includes(searchLower) || address.includes(searchLower) || venue.includes(searchLower);
        });
      }
      
      // Filtre 2 : par niveau d'expérience requis de l'événement
      // Ce filtre est appliqué sur les résultats déjà filtrés par lieu
      if (experienceFilter !== 'all') {
        filtered = filtered.filter(event => {
          const eventRequiredLevel = event.requirements?.requiredExperienceLevel || 'all';
          // Si l'événement accepte tous les niveaux, on l'affiche
          if (eventRequiredLevel === 'all') {
            return true;
          }
          // Sinon, on vérifie si le niveau requis correspond au filtre sélectionné
          return eventRequiredLevel === experienceFilter;
        });
      }
      
      // Retourne les événements acceptés qui satisfont les deux filtres (si les deux sont actifs)
      return filtered;
    }
    return [] as IEvent[];
  }, [user?.role, comedianApplications, upcomingEvents, locationSearch, experienceFilter]);

  // Base des évènements à venir POUR POSTULER (exclut les acceptés pour l'humoriste)
  const upcomingEventsForApply = useMemo(() => {
    if (user?.role === 'COMEDIAN') {
      const acceptedIds = new Set(acceptedUpcomingEvents.map(e => e._id));
      return upcomingEvents.filter(e => !acceptedIds.has(e._id));
    }
    return upcomingEvents;
  }, [user?.role, acceptedUpcomingEvents, upcomingEvents]);

  const pendingApplicationEvents = useMemo(() => {
    if (user?.role === 'COMEDIAN' && comedianApplications) {
      return comedianApplications
        .filter(app => {
          const isPending = app.status === 'PENDING';
          const hasEvent = !!app.event;
          const eventStatus = app.event?.status?.toLowerCase();
          const isPublished = eventStatus === 'published';
          return isPending && hasEvent && isPublished;
        })
        .map(app => app.event as unknown as IEvent);
    }
    return [] as IEvent[];
  }, [comedianApplications, user?.role]);

  const rejectedApplicationEvents = useMemo(() => {
    if (user?.role === 'COMEDIAN' && comedianApplications) {
      return comedianApplications
        .filter(app => app.status === 'REJECTED' && app.event)
        .map(app => app.event as unknown as IEvent);
    }
    return [] as IEvent[];
  }, [comedianApplications, user?.role]);

  const comedianVisibleEvents = useMemo(() => {
    if (!isComedianView) return [] as IEvent[];
    const map = new Map<string, IEvent>();
    [...upcomingEventsForApply, ...acceptedUpcomingEvents, ...pendingApplicationEvents, ...rejectedApplicationEvents].forEach(event => {
      if (event?._id) {
        map.set(event._id, event);
      }
    });
    return Array.from(map.values());
  }, [isComedianView, upcomingEventsForApply, acceptedUpcomingEvents, pendingApplicationEvents, rejectedApplicationEvents]);

  const favoriteEvents = useMemo(() => {
    if (!isComedianView || favoriteEventIds.length === 0) return [] as IEvent[];
    const favoriteSet = favoriteIdsSet;
    let filtered = comedianVisibleEvents.filter(event => favoriteSet.has(event._id));
    
    // Filtre 1 : par lieu (recherche dans city, address, venue)
    if (locationSearch.trim()) {
      const searchLower = locationSearch.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const location = event.location;
        if (!location || typeof location !== 'object') return false;
        const city = (location.city || '').toLowerCase();
        const address = (location.address || '').toLowerCase();
        const venue = (location.venue || '').toLowerCase();
        return city.includes(searchLower) || address.includes(searchLower) || venue.includes(searchLower);
      });
    }
    
    // Filtre 2 : par niveau d'expérience requis de l'événement
    // Ce filtre est appliqué sur les résultats déjà filtrés par lieu
    if (experienceFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventRequiredLevel = event.requirements?.requiredExperienceLevel || 'all';
        // Si l'événement accepte tous les niveaux, on l'affiche
        if (eventRequiredLevel === 'all') {
          return true;
        }
        // Sinon, on vérifie si le niveau requis correspond au filtre sélectionné
        return eventRequiredLevel === experienceFilter;
      });
    }
    
    // Retourne les événements favoris qui satisfont les deux filtres (si les deux sont actifs)
    return filtered;
  }, [isComedianView, favoriteEventIds, favoriteIdsSet, comedianVisibleEvents, locationSearch, experienceFilter]);

  // Fonction de filtrage pour les humoristes (par lieu ET niveau d'expérience)
  // Utilise les événements de l'API principale avec les scores de l'API recommendations
  const getFilteredUpcomingEvents = useCallback(() => {
    // Utiliser les événements de l'API principale et y attacher les scores
    let base = upcomingEventsForApply.map(event => ({
      ...event,
      _recommendationScore: eventRecommendationMap.get(String(event._id))?.score ?? 0
    })) as (IEvent & { _recommendationScore: number })[];

    // Filtre 1 : par lieu (recherche dans city, address, venue)
    if (locationSearch.trim()) {
      const searchLower = locationSearch.toLowerCase().trim();
      base = base.filter(event => {
        const location = event.location;
        if (!location || typeof location !== 'object') return false;
        const city = (location.city || '').toLowerCase();
        const address = (location.address || '').toLowerCase();
        const venue = (location.venue || '').toLowerCase();
        return city.includes(searchLower) || address.includes(searchLower) || venue.includes(searchLower);
      });
    }

    // Filtre 2 : par niveau d'expérience requis de l'événement
    if (experienceFilter !== 'all') {
      base = base.filter(event => {
        const eventRequiredLevel = event.requirements?.requiredExperienceLevel || 'all';
        if (eventRequiredLevel === 'all') {
          return true;
        }
        return eventRequiredLevel === experienceFilter;
      });
    }

    // Filtre par complétion
    if (completionFilter === 'complete') {
      base = base.filter(event => (event.participants?.length || 0) >= (event.requirements?.maxPerformers || 0));
    }
    if (completionFilter === 'incomplete') {
      base = base.filter(event => (event.participants?.length || 0) < (event.requirements?.maxPerformers || 0));
    }

    // Trier par score de recommandation (décroissant)
    return base.sort((a, b) => b._recommendationScore - a._recommendationScore);
  }, [completionFilter, upcomingEventsForApply, locationSearch, experienceFilter, eventRecommendationMap]);

  const filteredUpcomingEvents = useMemo(
    () => getFilteredUpcomingEvents(),
    [getFilteredUpcomingEvents]
  );

  const completedUpcomingEvents = useMemo(() => {
    return upcomingEvents.filter(event => isEventComplete(event));
  }, [upcomingEvents]);

  const incompleteUpcomingEvents = useMemo(() => {
    return upcomingEvents.filter(event => !isEventComplete(event));
  }, [upcomingEvents]);

  // Fonction de filtrage pour les organisateurs (par zone d'événement ET niveau d'expérience)
  // Les deux filtres sont appliqués ensemble : un événement doit satisfaire les deux conditions
  const getFilteredOrganizerEvents = (events: IEvent[]): IEvent[] => {
    let filtered = [...events];
    
    // Filtre 1 : par zone d'événement (recherche dans city, address, venue)
    if (organizerEventZoneSearch.trim()) {
      const searchLower = organizerEventZoneSearch.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const location = event.location;
        if (!location || typeof location !== 'object') return false;
        const city = (location.city || '').toLowerCase();
        const address = (location.address || '').toLowerCase();
        const venue = (location.venue || '').toLowerCase();
        return city.includes(searchLower) || address.includes(searchLower) || venue.includes(searchLower);
      });
    }
    
    // Filtre 2 : par niveau d'expérience requis de l'événement
    // Ce filtre est appliqué sur les résultats déjà filtrés par zone
    if (organizerEventExperienceFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventRequiredLevel = event.requirements?.requiredExperienceLevel || 'all';
        // Si l'événement accepte tous les niveaux, on l'affiche
        if (eventRequiredLevel === 'all') {
          return true;
        }
        // Sinon, on vérifie si le niveau requis correspond au filtre
        return eventRequiredLevel === organizerEventExperienceFilter;
      });
    }
    
    // Retourne les événements qui satisfont les deux filtres (si les deux sont actifs)
    return filtered;
  };

  // Appliquer les filtres aux événements organisateur
  const filteredOrganizerUpcomingEvents = useMemo(() => {
    if (!isOrganizerView) return upcomingEvents;
    let base = upcomingEvents;
    // Appliquer le filtre par complétion si nécessaire
    if (completionFilter === 'complete') {
      base = base.filter(event => isEventComplete(event));
    } else if (completionFilter === 'incomplete') {
      base = base.filter(event => !isEventComplete(event));
    }
    return getFilteredOrganizerEvents(base);
  }, [isOrganizerView, upcomingEvents, completionFilter, organizerEventZoneSearch, organizerEventExperienceFilter]);

  const filteredOrganizerCompletedEvents = useMemo(() => {
    if (!isOrganizerView) return completedUpcomingEvents;
    return getFilteredOrganizerEvents(completedUpcomingEvents);
  }, [isOrganizerView, completedUpcomingEvents, organizerEventZoneSearch, organizerEventExperienceFilter]);

  const filteredOrganizerArchivedEvents = useMemo(() => {
    if (!isOrganizerView) return archivedEventsToShow;
    return getFilteredOrganizerEvents(archivedEventsToShow);
  }, [isOrganizerView, archivedEventsToShow, organizerEventZoneSearch, organizerEventExperienceFilter]);

  const filteredOrganizerCancelledEvents = useMemo(() => {
    if (!isOrganizerView) return cancelledEvents;
    return getFilteredOrganizerEvents(cancelledEvents);
  }, [isOrganizerView, cancelledEvents, organizerEventZoneSearch, organizerEventExperienceFilter]);

  const eventsToDisplay = useMemo(() => {
    if (isComedianView) {
      switch (comedianTab) {
        case 'accepted':
          return acceptedUpcomingEvents;
        case 'favorites':
          return favoriteEvents;
        case 'recommendations':
          return smartRecommendationEvents;
        default:
          return filteredUpcomingEvents;
      }
    }

    if (isOrganizerView) {
      switch (organizerTab) {
        case 'upcoming':
          return filteredOrganizerUpcomingEvents;
        case 'full':
          return filteredOrganizerCompletedEvents;
        case 'archived':
          return filteredOrganizerArchivedEvents;
        case 'cancelled':
          return filteredOrganizerCancelledEvents;
        case 'calendar':
          return upcomingEvents; // Le calendrier n'a pas besoin de filtres
        default:
          return filteredOrganizerUpcomingEvents;
      }
    }

    if (isSuperAdminView) {
      switch (superAdminTab) {
        case 'upcoming':
          return incompleteUpcomingEvents;
        case 'full':
          return completedUpcomingEvents;
        case 'archived':
          return archivedEventsToShow;
        case 'cancelled':
          return cancelledEvents;
        default:
          return incompleteUpcomingEvents;
      }
    }

    return filteredUpcomingEvents;
  }, [
    isComedianView,
    isOrganizerView,
    isSuperAdminView,
    superAdminTab,
    organizerTab,
    comedianTab,
    filteredUpcomingEvents,
    filteredOrganizerUpcomingEvents,
    filteredOrganizerCompletedEvents,
    filteredOrganizerArchivedEvents,
    filteredOrganizerCancelledEvents,
    acceptedUpcomingEvents,
    favoriteEvents,
    smartRecommendationEvents,
    incompleteUpcomingEvents,
    completedUpcomingEvents,
    archivedEventsToShow,
    cancelledEvents,
    upcomingEvents,
  ]);

  const comedianTabCounts: Record<ComedianTab, number> = useMemo(() => ({
    opportunities: filteredUpcomingEvents.length,
    accepted: acceptedUpcomingEvents.length,
    favorites: favoriteEvents.length,
    recommendations: smartRecommendationEvents.length,
  }), [filteredUpcomingEvents, acceptedUpcomingEvents, favoriteEvents, smartRecommendationEvents]);

  const organizerTabCounts: Record<OrganizerTab, number> = useMemo(() => ({
    upcoming: filteredUpcomingEvents.length,
    full: completedUpcomingEvents.length,
    archived: archivedEventsToShow.length,
    cancelled: cancelledEvents.length,
    calendar: upcomingEvents.length + archivedEventsToShow.length + cancelledEvents.length,
  }), [filteredUpcomingEvents, completedUpcomingEvents, archivedEventsToShow, cancelledEvents, upcomingEvents]);

  const superAdminTabCounts: Record<SuperAdminTab, number> = useMemo(() => ({
    full: completedUpcomingEvents.length,
    upcoming: incompleteUpcomingEvents.length,
    archived: archivedEventsToShow.length,
    cancelled: cancelledEvents.length,
  }), [completedUpcomingEvents, incompleteUpcomingEvents, archivedEventsToShow, cancelledEvents]);

  const comedianTabTitles: Record<ComedianTab, string> = {
    opportunities: 'Opportunités à venir',
    accepted: 'Évènements acceptés',
    favorites: 'Mes favoris',
    recommendations: 'Recommandations',
  };

  const organizerTabTitles: Record<OrganizerTab, string> = {
    upcoming: 'Évènements à venir',
    full: 'Évènements complets',
    archived: 'Évènements archivés',
    cancelled: 'Évènements annulés',
    calendar: 'Calendrier',
  };

  const superAdminTabTitles: Record<SuperAdminTab, string> = {
    full: 'Évènements complets',
    upcoming: 'Évènements à venir (non complets)',
    archived: 'Évènements archivés',
    cancelled: 'Évènements annulés',
  };

  const comedianEmptyStates: Record<ComedianTab, string> = {
    opportunities: 'Aucune opportunité disponible pour le moment.',
    accepted: 'Aucun évènement accepté à venir.',
    favorites: 'Aucun évènement en favori.',
    recommendations: 'Aucune recommandation basée sur votre historique. Postulez à des évènements pour recevoir des recommandations personnalisées !',
  };

  const isOpportunitiesTab = comedianTab === 'opportunities';
  const isFavoritesTab = comedianTab === 'favorites';
  const isRecommendationsTab = comedianTab === 'recommendations';

  const listIsLoading = isComedianView
    ? (isRecommendationsTab ? smartRecommendationsLoading : (isFavoritesTab ? eventsLoading : (isOpportunitiesTab ? eventsLoading : comedianApplicationsLoading)))
    : eventsLoading;

  const listHasError = isComedianView
    ? (isFavoritesTab ? eventsError : (isOpportunitiesTab ? eventsError : comedianApplicationsError))
    : eventsError;

  const listErrorMessage = isComedianView
    ? (isFavoritesTab ? eventsErrorMessage?.message : (isOpportunitiesTab ? eventsErrorMessage?.message : comedianApplicationsErrorMessage?.message))
    : eventsErrorMessage?.message;

  const showOrganizerUpcomingSection = !isComedianView && (
    (isOrganizerView && organizerTab === 'upcoming') ||
    (isSuperAdminView && superAdminTab === 'upcoming')
  );
  const showCompletedSection = !isComedianView && (
    (isOrganizerView && organizerTab === 'full') ||
    (isSuperAdminView && superAdminTab === 'full')
  );
  const showArchivedSection = !isComedianView && (
    (isOrganizerView && organizerTab === 'archived') ||
    (isSuperAdminView && superAdminTab === 'archived')
  );
  const showCancelledSection = !isComedianView && (
    (isOrganizerView && organizerTab === 'cancelled') ||
    (isSuperAdminView && superAdminTab === 'cancelled')
  );
  const showCalendarSection = isOrganizerView && organizerTab === 'calendar';

  const renderOrganizerActions = (event: IEvent, context: 'upcoming' | 'full' | 'archived') => {
    if (user?.role !== 'ORGANIZER') {
      return null;
    }

    if (context === 'archived') {
      return (
        <div style={cardActionStackStyle}>
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleCardClick(event, true);
            }}
            style={{ ...actionButtonStyleSmall, backgroundColor: '#8a2be2', ...organizerMobileButtonAdjustments }}
          >
            Gérer absences
          </button>
        </div>
      );
    }

    return (
      <div style={cardActionStackStyle}>
        <button
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleEditClick(event); }}
          style={{ ...editButtonStyle, ...organizerMobileButtonAdjustments }}
        >
          Modifier
        </button>
        <button
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDuplicateClick(event); }}
          style={{ ...actionButtonStyleSmall, backgroundColor: '#9c27b0', ...organizerMobileButtonAdjustments }}
        >
          Dupliquer
        </button>
        <button
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleNotifyHumorists(event); }}
          style={{ ...actionButtonStyleSmall, backgroundColor: '#17a2b8', ...organizerMobileButtonAdjustments }}
          disabled={notifyingEventId === event._id}
        >
          {notifyingEventId === event._id ? 'Envoi...' : '📧 Notifier les humoristes'}
        </button>
        <button
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openCancelModal(event); }}
          style={{ ...actionButtonStyleSmall, backgroundColor: '#6c757d', ...organizerMobileButtonAdjustments }}
        >
          Annuler
        </button>
      </div>
    );
  };

  const totalUpcomingPages = Math.max(1, Math.ceil(eventsToDisplay.length / ITEMS_PER_PAGE));
  const paginatedUpcomingEvents = eventsToDisplay.slice(
    (upcomingPage - 1) * ITEMS_PER_PAGE,
    upcomingPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setUpcomingPage(1);
  }, [eventsToDisplay]);

  useEffect(() => {
    if (upcomingPage > totalUpcomingPages) {
      setUpcomingPage(totalUpcomingPages);
    }
  }, [upcomingPage, totalUpcomingPages]);

  const totalCompletedPages = Math.max(1, Math.ceil(completedUpcomingEvents.length / ITEMS_PER_PAGE));
  const paginatedCompletedEvents = completedUpcomingEvents.slice(
    (completedPage - 1) * ITEMS_PER_PAGE,
    completedPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCompletedPage(1);
  }, [completedUpcomingEvents]);

  useEffect(() => {
    if (completedPage > totalCompletedPages) {
      setCompletedPage(totalCompletedPages);
    }
  }, [completedPage, totalCompletedPages]);

  const handleCardClick = (event: IEvent, shouldFocusParticipants = false) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setParticipantZoneSearch(''); // Réinitialiser la recherche lors de l'ouverture d'un nouvel événement
    setFocusParticipantsSection(shouldFocusParticipants);
    // Charger les absences si l'utilisateur est organisateur
    if (user?.role === 'ORGANIZER') {
      loadEventAbsences(event._id);
    }
  };

  const handleEditClick = (event: IEvent) => {
    console.log('🔍 [MyEventsPage] handleEditClick - Vérification évènement', {
      eventId: event._id,
      eventTitle: event.title,
      eventOrganizer: event.organizer,
      organizerId: typeof event.organizer === 'object' ? event.organizer._id : event.organizer,
      userId: user?._id,
      isOwner: typeof event.organizer === 'object' 
        ? event.organizer._id === user?._id 
        : event.organizer === user?._id,
    });
    
    if (!event._id) {
      console.error('❌ [MyEventsPage] Évènement sans ID - impossible de modifier', { event });
      alert('Erreur: Impossible de modifier cet évènement. ID manquant.');
      return;
    }
    
    setEventToEdit(event);
    setShowEditEventForm(true);
  };

  const handleApplyClick = (event: IEvent) => {
    setSelectedEvent(event);
    setShowApplyEventForm(true);
  };

  const openWithdrawModal = (event: IEvent) => {
    setEventToWithdraw(event);
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setEventToWithdraw(null);
  };

  const confirmWithdrawApplication = async () => {
    if (!token || !user?._id || !eventToWithdraw) return;
    try {
      const app = comedianApplications?.find(a => a.event && a.event._id === eventToWithdraw._id);
      if (!app) return;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await api.delete(`/applications/${app._id}`, config);
      // alert('Vous avez été désinscrit de cet évènement.');
      refetch();
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['comedianApplications'] });
      closeWithdrawModal();
    } catch (error: any) {
      console.error('Erreur lors de la désinscription:', error);
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setFocusParticipantsSection(false);
    setParticipantZoneSearch(''); // Réinitialiser la recherche lors de la fermeture du modal
  };

  const handleComedianClick = (comedian: any) => {
    // Recherche l'objet complet dans la liste des participants de l'évènement sélectionné
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
    setEventToDuplicate(null);
    refetch();
    refreshUser();
  };

  const handleApplicationSubmitted = () => {
    setShowApplyEventForm(false);
    refetch(); // Refetch events to update counts/status if needed
    refreshUser();
    queryClient.invalidateQueries({ queryKey: ['comedianApplications'] }); // Force refresh des candidatures humoriste
  };

  const applyKeywordSearch = () => {
    const params = new URLSearchParams(location.search);
    const trimmed = searchTerm.trim();
    if (trimmed) {
      params.set('search', trimmed);
    } else {
      params.delete('search');
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  

  const openCancelModal = async (event: IEvent) => {
    try {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(event.date);
      const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const diffDays = Math.ceil((eventMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 10) {
        const proceed = window.confirm('Confirmer la suppression de cet évènement (plus de 10 jours avant) ?');
        if (!proceed) return;
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        } as const;
        await api.delete(`/events/${event._id}`, config);
        alert('Évènement supprimé avec succès.');
        refetch();
        refreshUser();
        return;
      }

      setEventToCancel(event);
      setCancelReason('');
      setShowCancelModal(true);
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'évènement:', error.response?.data || error.message);
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
        alert('Veuillez fournir une raison d\'annulation (évènement dans moins de 10 jours).');
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
        alert('Évènement annulé et déplacé vers "Évènements annulés".');
        refetch();
        refreshUser();
      } else {
        alert('Évènement non déplacé vers "Évènements annulés" (plus de 10 jours avant).');
      }
    } catch (err: any) {
      console.error("Erreur lors de l'annulation de l'évènement:", err.response?.data || err.message);
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    } finally {
      setShowCancelModal(false);
      setEventToCancel(null);
      setCancelReason('');
    }
  };

  const handleDuplicateClick = (event: IEvent) => {
    setEventToDuplicate(event);
    setShowCreateEventForm(true);
  };

  const handleNotifyHumorists = async (event: IEvent) => {
    if (!token) {
      alert('Vous devez être connecté pour envoyer des notifications.');
      return;
    }

    if (!confirm(`Voulez-vous envoyer une notification par email à tous les humoristes pour l'évènement "${event.title}" ?`)) {
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
    // Charger les absences de cet évènement
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

      // Fermer les deux modals (absence + event)
      closeAbsenceModal();
      closeModal();
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

      // Fermer les deux modals (absence + event)
      closeAbsenceModal();
      closeModal();
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

  const comedianTabs: ComedianTab[] = ['opportunities', 'accepted', 'favorites', 'recommendations'];
  const organizerTabs: OrganizerTab[] = ['upcoming', 'full', 'archived', 'cancelled', 'calendar'];
  const superAdminTabs: SuperAdminTab[] = ['full', 'upcoming', 'archived', 'cancelled'];

  const comedianTabsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  };

  const comedianTabButtonStyle = (isActive: boolean): CSSProperties => ({
    flex: isMobile ? '1 1 45%' : '0 0 auto',
    minWidth: '140px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: isActive ? 'rgba(255, 75, 43, 0.25)' : 'rgba(0, 0, 0, 0.35)',
    color: isActive ? '#ffffff' : '#ddd',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isActive ? '0 4px 12px rgba(255, 75, 43, 0.25)' : 'none',
  });

  const comedianTabTitleStyle: CSSProperties = {
    fontSize: '0.95em',
    fontWeight: 600,
  };

  const comedianTabCountStyle: CSSProperties = {
    fontSize: '0.85em',
    color: '#ffb3c1',
  };

  const organizerTabsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
    justifyContent: isMobile ? 'center' : 'flex-start',
  };

  const organizerTabButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: '10px 18px',
    borderRadius: '999px',
    border: isActive ? '1px solid #ff4b2b' : '1px solid rgba(255, 255, 255, 0.25)',
    backgroundColor: isActive ? 'rgba(255, 75, 43, 0.25)' : 'rgba(0, 0, 0, 0.25)',
    color: isActive ? '#ffffff' : '#ddd',
    fontWeight: isActive ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  const organizerTabCountStyle: CSSProperties = {
    fontSize: '0.85em',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: '2px 8px',
    borderRadius: '999px',
  };

  const eventCardStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '15px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '16px' : '24px',
    alignItems: isMobile ? 'flex-start' : 'stretch',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  const cardContentStyle: CSSProperties = {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const cardHeaderRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: isMobile ? '8px' : '16px',
  };

  const cardDateBadgeStyle: CSSProperties = {
    padding: '6px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: '0.85em',
    fontWeight: 600,
    color: '#ffffff',
  };

  const cardHeaderActionsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  };

  const favoriteStarButtonStyle = (isFavorite: boolean): CSSProperties => ({
    border: 'none',
    background: 'transparent',
    color: isFavorite ? '#ffd700' : '#888888',
    fontSize: '1.4em',
    cursor: 'pointer',
    transition: 'color 0.2s ease, transform 0.2s ease',
    padding: 0,
    lineHeight: 1,
  });

  const cardMetaGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    gap: '12px 18px',
  };

  const cardMetaItemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const cardMetaLabelStyle: CSSProperties = {
    fontSize: '0.72em',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const cardMetaValueStyle: CSSProperties = {
    fontSize: '0.95em',
    color: '#ffffff',
    fontWeight: 600,
  };

  const cardStatusBlockStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMobile ? 'flex-start' : 'flex-end',
    justifyContent: 'space-between',
    gap: '10px',
    minWidth: isMobile ? 'auto' : '240px',
  };

  const cardActionStackStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: isMobile ? 'flex-start' : 'flex-end',
  };

  const statusBadgeStyle: CSSProperties = {
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    fontSize: '0.85em',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  };

  const renderStatusChip = (label: string, color: string, backgroundColor: string) => (
    <span style={{ ...statusBadgeStyle, color, backgroundColor }}>{label}</span>
  );

  const eventTitleStyle: CSSProperties = {
    fontSize: isMobile ? '1.2em' : '1.45em',
    color: '#ffffff',
    margin: 0,
  };

  const eventDetailStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#bbb',
    marginBottom: '3px',
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

  const paginationControlsStyle: CSSProperties = {
    marginTop: '18px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  };

  const paginationButtonStyle: CSSProperties = {
    ...actionButtonStyleSmall,
    backgroundColor: '#2d2d44',
    padding: '8px 14px',
    minWidth: '90px',
  };

  const paginationInfoStyle: CSSProperties = {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: '0.95em',
  };

  const organizerMobileButtonAdjustments: CSSProperties = isMobile
    ? {
        padding: '6px 10px',
        fontSize: '0.85em',
        minWidth: 'auto',
      }
    : {};

  const translateEventStatus = (status: IEvent['status']) => {
    switch (status) {
      case 'DRAFT':
      case 'draft':
        return 'Brouillon';
      case 'PUBLISHED':
      case 'published':
        return 'Publié';
      case 'CANCELLED':
      case 'cancelled':
        return 'Annulé';
      case 'COMPLETED':
      case 'completed':
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
            {authIsLoading ? 'Chargement de votre profil...' : 'Chargement des évènements...'}
          </p>
        </div>
      ) : eventsError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
          <p style={{ color: '#dc3545', fontSize: '1.2em', marginBottom: '20px' }}>
            Erreur lors du chargement des évènements
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
              <h1 style={titleStyle}>Les évènements</h1>
              <p style={{ fontSize: '1.1em', color: '#aaa' }}>
                {user?.role === 'ORGANIZER' 
                  ? 'Gérez et visualisez vos évènements. Créez de nouveaux évènements pour trouver les meilleurs humoristes.'
                  : user?.role === 'SUPER_ADMIN'
                  ? 'Supervisez tous les évènements de la plateforme. Utilisez les filtres pour affiner votre recherche.'
                  : 'Découvrez les évènements à venir et postulez pour votre prochaine performance.'}
              </p>
            </div>
            {user?.role === 'ORGANIZER' && (
              isMobile ? (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setShowCreateEventForm(true)} style={buttonStyle}>
                    Créer un évènement
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCreateEventForm(true)} style={buttonStyle}>
                  Créer un évènement
                </button>
              )
            )}
          </div>

          {/* Filtres pour super admin */}
          {user?.role === 'SUPER_ADMIN' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '0 20px' }}>
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                padding: '20px',
                borderRadius: '8px',
                margin: '0 auto',
                border: '1px solid #444',
                width: '100%'
              }}>
              <h3 style={{ color: '#ff4b2b', marginBottom: '15px', fontSize: '1.2em' }}>Filtres de recherche</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 320px))',
                gap: '15px',
                  justifyContent: isMobile ? 'stretch' : 'center'
              }}>
                <div style={{ maxWidth: isMobile ? '100%' : 320 }}>
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
                <div style={{ maxWidth: isMobile ? '100%' : 320 }}>
                  <label style={{ display: 'block', color: '#ffffff', marginBottom: '5px', fontWeight: 'bold' }}>
                    Recherche par mots-clés:
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyKeywordSearch();
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '10px',
                      alignItems: isMobile ? 'stretch' : 'center'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Titre, organisateur, ville..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      style={{
                        flex: isMobile ? undefined : 1,
                        width: isMobile ? '100%' : undefined,
                        padding: '10px',
                        borderRadius: '5px',
                        border: '1px solid #555',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#ff4b2b',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto'
                      }}
                    >
                      Rechercher
                    </button>
                  </form>
                </div>
              </div>
              <div style={{
                marginTop: '15px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '10px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.delete('organizer');
                    params.delete('search');
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '8px 15px',
                    borderRadius: '5px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: isMobile ? '100%' : 220
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
            </div>
          )}
        </>
      )}

      {isComedianView ? (
        <div style={sectionStyle}>
          <div style={comedianTabsContainerStyle}>
            {comedianTabs.map((tabId) => (
              <button
                key={tabId}
                style={comedianTabButtonStyle(comedianTab === tabId)}
                onClick={() => setComedianTab(tabId)}
              >
                <span style={comedianTabTitleStyle}>{comedianTabTitles[tabId]}</span>
                <span style={comedianTabCountStyle}>{comedianTabCounts[tabId]} évènement(s)</span>
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '10px' : '16px',
              marginBottom: '18px'
            }}
          >
            <h2 style={sectionTitleStyle}>{comedianTabTitles[comedianTab]}</h2>
            {isOpportunitiesTab && (
              <select
                value={completionFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompletionFilter(e.target.value as 'all' | 'complete' | 'incomplete')}
                style={{
                  marginLeft: isMobile ? 0 : 'auto',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  background: '#222',
                  color: '#fff',
                  minWidth: 160,
                  width: isMobile ? '100%' : undefined
                }}
              >
                <option value="all">Tous</option>
                <option value="complete">Complet</option>
                <option value="incomplete">Non complet</option>
              </select>
            )}
          </div>
          
          {/* Barre de recherche par lieu et filtre par niveau d'expérience pour les humoristes */}
          <div
            style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              border: '1px solid #444'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '15px',
                alignItems: isMobile ? 'stretch' : 'flex-end'
              }}
            >
              {/* Recherche par lieu */}
              <div style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined }}>
                <label
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Recherche par lieu
                </label>
                <input
                  type="text"
                  placeholder="Ville, adresse, lieu..."
                  value={locationSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              {/* Filtre par niveau d'expérience */}
              <div style={{ width: isMobile ? '100%' : '200px' }}>
                <label
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Niveau d'expérience
                </label>
                <select
                  value={experienceFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExperienceFilter(e.target.value as 'all' | '0-50' | '50-200' | '200+')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">Tous les niveaux</option>
                  <option value="0-50">Débutant (0-50 scènes)</option>
                  <option value="50-200">Expérimenté (50-200 scènes)</option>
                  <option value="200+">Pro (200+ scènes)</option>
                </select>
              </div>
              
              {/* Bouton réinitialiser */}
              {(locationSearch.trim() || experienceFilter !== 'all') && (
                <button
                  onClick={() => {
                    setLocationSearch('');
                    setExperienceFilter('all');
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    height: 'fit-content'
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Liste des événements */}
          {listIsLoading && <p style={emptyStateStyle}>Chargement des évènements...</p>}
          {listHasError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {listErrorMessage}</p>}
          {eventsToDisplay.length === 0 && !listIsLoading && !listHasError && (
            <p style={emptyStateStyle}>{comedianEmptyStates[comedianTab]}</p>
          )}
          {paginatedUpcomingEvents.map((event) => {
            const isCompleteEvent = isEventComplete(event);
            const participantsRatio = getParticipantsRatio(event);
            const statusLabel = translateEventStatus(event.status);
            // Récupérer les données de recommandation (score, breakdown, matchReasons)
            const recommendationData = eventRecommendationMap.get(String(event._id));
            const matchScore = recommendationData?.score ?? 0;
            const breakdown = recommendationData?.breakdown;
            const matchReasons = recommendationData?.matchReasons;

            let comedianApplicationChip: React.ReactNode = null;
            let relatedApplication: IApplication | undefined;
            if (comedianApplicationsMap.size > 0) {
              relatedApplication = comedianApplicationsMap.get(event._id);
              if (relatedApplication) {
                let color = '#ffc107';
                let bg = 'rgba(255, 193, 7, 0.18)';
                let label = 'Candidature: En attente';
                if (relatedApplication.status === 'ACCEPTED') {
                  color = '#28a745';
                  bg = 'rgba(40, 167, 69, 0.18)';
                  label = 'Candidature: Acceptée';
                } else if (relatedApplication.status === 'REJECTED') {
                  color = '#dc3545';
                  bg = 'rgba(220, 53, 69, 0.2)';
                  label = 'Candidature: Refusée';
                } else if (relatedApplication.status === 'WITHDRAWN') {
                  color = '#888';
                  bg = 'rgba(136, 136, 136, 0.15)';
                  label = 'Candidature: Retirée';
                }
                comedianApplicationChip = renderStatusChip(label, color, bg);
              }
            }

            const isWithdrawn = relatedApplication?.status === 'WITHDRAWN';

            return (
              <div
                key={event._id}
                style={{
                  ...eventCardStyle,
                  opacity: isWithdrawn ? 0.6 : 1,
                  cursor: isWithdrawn ? 'not-allowed' : 'pointer',
                  pointerEvents: isWithdrawn ? 'none' : 'auto',
                }}
                onClick={() => !isWithdrawn && handleCardClick(event)}
              >
                <div style={cardContentStyle}>
                  <div style={cardHeaderRowStyle}>
                    <div>
                      <h3 style={eventTitleStyle}>{event.title}</h3>
                    </div>
                    <div style={cardHeaderActionsStyle}>
                      <span style={cardDateBadgeStyle}>{new Date(event.date).toLocaleDateString()}</span>
                      {isOpportunitiesTab && !relatedApplication && (
                        <ScorePieChart
                          score={matchScore}
                          size={72}
                          isLoading={recommendationsLoading}
                          breakdown={breakdown}
                          matchReasons={matchReasons}
                        />
                      )}
                      <button
                        type="button"
                        aria-label={favoriteIdsSet.has(event._id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        style={favoriteStarButtonStyle(favoriteIdsSet.has(event._id))}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          toggleFavoriteEvent(event._id);
                        }}
                      >
                        {favoriteIdsSet.has(event._id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                  <div style={cardMetaGridStyle}>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Lieu</span>
                      <span style={cardMetaValueStyle}>{formatEventLocation(event)}</span>
                    </div>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Horaires</span>
                      <span style={cardMetaValueStyle}>{formatEventTimeRange(event)}</span>
                    </div>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Statut</span>
                      <span style={cardMetaValueStyle}>{statusLabel}</span>
                    </div>
                  </div>
                </div>
                <div style={cardStatusBlockStyle}>
                  {renderStatusChip(`Statut: ${statusLabel}`, '#ff8ba0', 'rgba(255, 65, 108, 0.12)')}
                  {renderStatusChip(
                    isCompleteEvent ? `Complet • ${participantsRatio}` : `Non complet • ${participantsRatio}`,
                    isCompleteEvent ? '#28a745' : '#ffc107',
                    isCompleteEvent ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 193, 7, 0.15)'
                  )}
                  {comedianApplicationChip}
                  {/* Badge pour les recommandations intelligentes */}
                  {isRecommendationsTab && smartRecommendationMap.has(String(event._id)) && (() => {
                    const smartRec = smartRecommendationMap.get(String(event._id));
                    if (smartRec?.matchType === 'both') {
                      return renderStatusChip(
                        `Même orga et événement`,
                        '#c084fc',
                        'rgba(192, 132, 252, 0.25)'
                      );
                    }
                    if (smartRec?.matchType === 'same_event_name') {
                      return renderStatusChip(
                        `Même événement: ${smartRec.matchedEventTitle || event.title}`,
                        '#a78bfa',
                        'rgba(139, 92, 246, 0.2)'
                      );
                    }
                    if (smartRec?.matchType === 'same_organizer') {
                      return renderStatusChip(
                        `Même organisateur: ${smartRec.matchedOrganizerName || 'Organisateur'}`,
                        '#60a5fa',
                        'rgba(96, 165, 250, 0.2)'
                      );
                    }
                    return null;
                  })()}
                  <div style={cardActionStackStyle}>
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
                          ? 'Évènement complet'
                          : 'Postuler'}
                      </button>
                    ) : isWithdrawn ? (
                      null
                    ) : (
                      <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          openWithdrawModal(event);
                        }}
                        style={deleteButtonStyle}
                      >
                        Me désinscrire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredUpcomingEvents.length > ITEMS_PER_PAGE && (
            <div style={paginationControlsStyle}>
              <button
                style={paginationButtonStyle}
                disabled={upcomingPage === 1}
                onClick={() => setUpcomingPage(prev => Math.max(1, prev - 1))}
              >
                Précédent
              </button>
              <span style={paginationInfoStyle}>
                Page {Math.min(upcomingPage, totalUpcomingPages)} / {Math.max(totalUpcomingPages, 1)}
              </span>
              <button
                style={paginationButtonStyle}
                disabled={upcomingPage >= totalUpcomingPages}
                onClick={() => setUpcomingPage(prev => Math.min(totalUpcomingPages, prev + 1))}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {isOrganizerView && (
            <>
              <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '0 20px' }}>
                <div style={organizerTabsContainerStyle}>
                  {organizerTabs.map(tabId => (
                    <button
                      key={tabId}
                      style={organizerTabButtonStyle(organizerTab === tabId)}
                      onClick={() => setOrganizerTab(tabId)}
                    >
                      <span>{organizerTabTitles[tabId]}</span>
                      <span style={organizerTabCountStyle}>{organizerTabCounts[tabId]}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Barre de recherche par zone d'événement et filtre par niveau d'expérience (organisateur) */}
              <div
                style={{
                  maxWidth: '1200px',
                  margin: '0 auto 20px auto',
                  padding: '0 20px'
                }}
              >
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid #444'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '15px',
                      alignItems: isMobile ? 'stretch' : 'flex-end'
                    }}
                  >
                    {/* Recherche par zone d'événement */}
                    <div style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined }}>
                      <label
                        style={{
                          display: 'block',
                          color: '#ffffff',
                          marginBottom: '8px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        Recherche par zone d'événement
                      </label>
                      <input
                        type="text"
                        placeholder="Ville, département, région de l'événement..."
                        value={organizerEventZoneSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizerEventZoneSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #555',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#ffffff',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    {/* Filtre par niveau d'expérience */}
                    <div style={{ width: isMobile ? '100%' : '200px' }}>
                      <label
                        style={{
                          display: 'block',
                          color: '#ffffff',
                          marginBottom: '8px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        Niveau d'expérience
                      </label>
                      <select
                        value={organizerEventExperienceFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOrganizerEventExperienceFilter(e.target.value as 'all' | '0-50' | '50-200' | '200+')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #555',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#ffffff',
                          fontSize: '14px'
                        }}
                      >
                        <option value="all">Tous les niveaux</option>
                        <option value="0-50">Débutant (0-50 scènes)</option>
                        <option value="50-200">Expérimenté (50-200 scènes)</option>
                        <option value="200+">Pro (200+ scènes)</option>
                      </select>
                    </div>
                    
                    {/* Bouton réinitialiser */}
                    {(organizerEventZoneSearch.trim() || organizerEventExperienceFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setOrganizerEventZoneSearch('');
                          setOrganizerEventExperienceFilter('all');
                        }}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '6px',
                          border: '1px solid #555',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          height: 'fit-content'
                        }}
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          {isSuperAdminView && (
            <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '0 20px' }}>
              <div style={organizerTabsContainerStyle}>
                {superAdminTabs.map(tabId => (
                  <button
                    key={tabId}
                    style={organizerTabButtonStyle(superAdminTab === tabId)}
                    onClick={() => setSuperAdminTab(tabId)}
                  >
                    <span>{superAdminTabTitles[tabId]}</span>
                    <span style={organizerTabCountStyle}>{superAdminTabCounts[tabId]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {showOrganizerUpcomingSection && (
            <div style={sectionStyle}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? '10px' : '16px',
                  marginBottom: '18px'
                }}
              >
                <h2 style={sectionTitleStyle}>Évènements à venir</h2>
                {isOrganizerView && (
                  <select
                    value={completionFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompletionFilter(e.target.value as 'all' | 'complete' | 'incomplete')}
                    style={{
                      marginLeft: isMobile ? 0 : 'auto',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      minWidth: 160,
                      width: isMobile ? '100%' : undefined
                    }}
                  >
                    <option value="all">Tous</option>
                    <option value="complete">Complet</option>
                    <option value="incomplete">Non complet</option>
                  </select>
                )}
              </div>
              {listIsLoading && <p style={emptyStateStyle}>Chargement des évènements...</p>}
              {listHasError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {listErrorMessage}</p>}
              {eventsToDisplay.length === 0 && !listIsLoading && !listHasError && (
                <p style={emptyStateStyle}>
                  {isOrganizerView ? 'Aucun évènement à venir pour ce filtre.' : 'Aucun évènement à venir (non complet).'}
                </p>
              )}
              {paginatedUpcomingEvents.map((event) => {
                const isCompleteEvent = isEventComplete(event);
                const participantsRatio = getParticipantsRatio(event);
                const statusLabel = translateEventStatus(event.status);

                return (
                  <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
                    <div style={cardContentStyle}>
                      <div style={cardHeaderRowStyle}>
                        <div>
                          <h3 style={eventTitleStyle}>{event.title}</h3>
                        </div>
                        <div style={cardHeaderActionsStyle}>
                          <span style={cardDateBadgeStyle}>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={cardMetaGridStyle}>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Lieu</span>
                          <span style={cardMetaValueStyle}>{formatEventLocation(event)}</span>
                        </div>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Horaires</span>
                          <span style={cardMetaValueStyle}>{formatEventTimeRange(event)}</span>
                        </div>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Statut</span>
                          <span style={cardMetaValueStyle}>{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div style={cardStatusBlockStyle}>
                      {renderStatusChip(`Statut: ${statusLabel}`, '#ff8ba0', 'rgba(255, 65, 108, 0.12)')}
                      {renderStatusChip(
                        isCompleteEvent ? `Complet • ${participantsRatio}` : `Non complet • ${participantsRatio}`,
                        isCompleteEvent ? '#28a745' : '#ffc107',
                        isCompleteEvent ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 193, 7, 0.15)'
                      )}
                      {renderOrganizerActions(event, 'upcoming')}
                    </div>
                  </div>
                );
              })}
              {filteredUpcomingEvents.length > ITEMS_PER_PAGE && (
                <div style={paginationControlsStyle}>
                  <button
                    style={paginationButtonStyle}
                    disabled={upcomingPage === 1}
                    onClick={() => setUpcomingPage(prev => Math.max(1, prev - 1))}
                  >
                    Précédent
                  </button>
                  <span style={paginationInfoStyle}>
                    Page {Math.min(upcomingPage, totalUpcomingPages)} / {Math.max(totalUpcomingPages, 1)}
                  </span>
                  <button
                    style={paginationButtonStyle}
                    disabled={upcomingPage >= totalUpcomingPages}
                    onClick={() => setUpcomingPage(prev => Math.min(totalUpcomingPages, prev + 1))}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}

          {showCompletedSection && (
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                <h2 style={sectionTitleStyle}>Évènements complets</h2>
              </div>
              {eventsLoading && <p style={emptyStateStyle}>Chargement des évènements...</p>}
              {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
              {!eventsLoading && !eventsError && completedUpcomingEvents.length === 0 && (
                <p style={emptyStateStyle}>Aucun évènement complet à venir.</p>
              )}
              {paginatedCompletedEvents.map((event) => {
                const participantsRatio = getParticipantsRatio(event);
                const statusLabel = translateEventStatus(event.status);

                return (
                  <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
                    <div style={cardContentStyle}>
                      <div style={cardHeaderRowStyle}>
                        <div>
                          <h3 style={eventTitleStyle}>{event.title}</h3>
                        </div>
                        <div style={cardHeaderActionsStyle}>
                          <span style={cardDateBadgeStyle}>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={cardMetaGridStyle}>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Lieu</span>
                          <span style={cardMetaValueStyle}>{formatEventLocation(event)}</span>
                        </div>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Horaires</span>
                          <span style={cardMetaValueStyle}>{formatEventTimeRange(event)}</span>
                        </div>
                        <div style={cardMetaItemStyle}>
                          <span style={cardMetaLabelStyle}>Statut</span>
                          <span style={cardMetaValueStyle}>{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div style={cardStatusBlockStyle}>
                      {renderStatusChip(`Statut: ${statusLabel}`, '#ff8ba0', 'rgba(255, 65, 108, 0.12)')}
                      {renderStatusChip(`Complet • ${participantsRatio}`, '#28a745', 'rgba(40, 167, 69, 0.15)')}
                      {renderOrganizerActions(event, 'full')}
                    </div>
                  </div>
                );
              })}
              {completedUpcomingEvents.length > ITEMS_PER_PAGE && (
                <div style={paginationControlsStyle}>
                  <button
                    style={paginationButtonStyle}
                    disabled={completedPage === 1}
                    onClick={() => setCompletedPage(prev => Math.max(1, prev - 1))}
                  >
                    Précédent
                  </button>
                  <span style={paginationInfoStyle}>
                    Page {Math.min(completedPage, totalCompletedPages)} / {Math.max(totalCompletedPages, 1)}
                  </span>
                  <button
                    style={paginationButtonStyle}
                    disabled={completedPage >= totalCompletedPages}
                    onClick={() => setCompletedPage(prev => Math.min(totalCompletedPages, prev + 1))}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showArchivedSection && (
        <div ref={archivedSectionRef} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Évènements archivés</h2>
          {eventsLoading && <p style={emptyStateStyle}>Chargement des évènements...</p>}
          {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
          {!eventsLoading && !eventsError && archivedEventsToShow.length === 0 && (
            <p style={emptyStateStyle}>Aucun évènement archivé.</p>
          )}
          {paginatedArchivedEvents.map((event) => {
            const participantsRatio = getParticipantsRatio(event);
            const statusLabel = translateEventStatus(event.status);
            const isFutureButArchived = new Date(event.date) >= new Date();

            return (
              <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
                <div style={cardContentStyle}>
                  <div style={cardHeaderRowStyle}>
                    <div>
                      <h3 style={eventTitleStyle}>{event.title}</h3>
                    </div>
                    <span style={cardDateBadgeStyle}>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div style={cardMetaGridStyle}>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Lieu</span>
                      <span style={cardMetaValueStyle}>{formatEventLocation(event)}</span>
                    </div>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Horaires</span>
                      <span style={cardMetaValueStyle}>{formatEventTimeRange(event)}</span>
                    </div>
                  </div>
                </div>
                <div style={cardStatusBlockStyle}>
                  {renderStatusChip(`Statut: ${statusLabel}`, '#4dd0e1', 'rgba(77, 208, 225, 0.18)')}
                  {renderStatusChip(`Participants: ${participantsRatio}`, '#9b8bff', 'rgba(155, 139, 255, 0.18)')}
                  {isFutureButArchived && renderStatusChip('Évènement futur classé en archive', '#ffc107', 'rgba(255, 193, 7, 0.18)')}
                  {renderOrganizerActions(event, 'archived')}
                </div>
              </div>
            );
          })}
          {archivedEventsToShow.length > ITEMS_PER_PAGE && (
            <div style={paginationControlsStyle}>
              <button
                style={paginationButtonStyle}
                disabled={archivedPage === 1}
                onClick={() => setArchivedPage(prev => Math.max(1, prev - 1))}
              >
                Précédent
              </button>
              <span style={paginationInfoStyle}>
                Page {Math.min(archivedPage, totalArchivedPages)} / {Math.max(totalArchivedPages, 1)}
              </span>
              <button
                style={paginationButtonStyle}
                disabled={archivedPage >= totalArchivedPages}
                onClick={() => setArchivedPage(prev => Math.min(totalArchivedPages, prev + 1))}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Détails de l'évènement">
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
            {selectedEvent.status?.toLowerCase() === 'cancelled' && selectedEvent.cancellationReason && (
              <p style={modalDetailStyle}>
                <span style={modalLabelStyle}>Raison de l'annulation:</span> 
                <span style={modalValueStyle}>{selectedEvent.cancellationReason}</span>
              </p>
            )}
            
            <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>Exigences:</h3>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Expérience Minimale:</span> <span style={modalValueStyle}>{selectedEvent.requirements?.minExperience ?? 'Non spécifié'} ans</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Niveau d'expérience:</span> <span style={modalValueStyle}>
              {(() => {
                const level = selectedEvent.requirements?.requiredExperienceLevel;
                if (!level || level === 'all') return 'Tous les niveaux';
                if (level === '0-50') return 'Débutant (0-50 scènes)';
                if (level === '50-200') return 'Expérimenté (50-200 scènes)';
                if (level === '200+') return 'Pro (200+ scènes)';
                return 'Non spécifié';
              })()}
            </span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Nombre Max. Performers:</span> <span style={modalValueStyle}>{selectedEvent.requirements?.maxPerformers ?? 'Non spécifié'}</span></p>
            <p style={modalDetailStyle}><span style={modalLabelStyle}>Durée Proposée:</span> <span style={modalValueStyle}>{selectedEvent.requirements?.duration ?? 'Non spécifié'} min</span></p>

            {user?.role === 'ORGANIZER' || user?.role === 'SUPER_ADMIN' ? (
              <div ref={participantsSectionRef}>
                <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>
                  Participants ({selectedEvent.participants?.length || 0}/{selectedEvent.requirements?.maxPerformers ?? 0})
                </h3>
                
                {/* Barre de recherche d'humoriste par zone d'événement */}
                {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <label
                      style={{
                        display: 'block',
                        color: '#ffffff',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      Recherche d'humoriste par zone d'événement
                    </label>
                    <input
                      type="text"
                      placeholder="Ville, département, région de l'événement..."
                      value={participantZoneSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParticipantZoneSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #555',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                    {participantZoneSearch.trim() && (
                      <button
                        onClick={() => setParticipantZoneSearch('')}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #555',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                )}
                
                {selectedEvent.participants && selectedEvent.participants.length > 0 ? (
                  <div>
                    {(() => {
                      // Filtrer les participants par zone d'événement
                      let filteredParticipants = selectedEvent.participants;
                      
                      if (participantZoneSearch.trim()) {
                        const searchTerm = participantZoneSearch.trim();
                        const searchNormalized = normalizeString(searchTerm);
                        const eventCity = selectedEvent.location?.city || '';
                        
                        // Déterminer le type de recherche (ville, département ou région)
                        let searchType: 'ville' | 'departement' | 'region' = 'ville';
                        
                        // Si c'est un numéro à 2 chiffres (ou 2A, 2B), c'est probablement un département
                        if (/^\d{1,2}[AB]?$/.test(searchTerm.toUpperCase())) {
                          searchType = 'departement';
                        } else {
                          // Vérifier si c'est une région connue
                          const knownRegions = [
                            'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
                            'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
                            'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
                            'Pays de la Loire', "Provence-Alpes-Côte d'Azur"
                          ];
                          const isRegion = knownRegions.some(region => 
                            normalizeString(region) === searchNormalized
                          );
                          if (isRegion) {
                            searchType = 'region';
                          }
                        }
                        
                        const searchZone = { type: searchType, value: searchTerm };
                        
                        filteredParticipants = selectedEvent.participants.filter((participant: any) => {
                          const mobilityZones = participant.profile?.mobilityZone;
                          
                          // Si l'humoriste n'a pas de zones de mobilité, on ne l'affiche pas
                          if (!mobilityZones || mobilityZones.length === 0) {
                            return false;
                          }
                          
                          // Vérifier si la recherche correspond à une zone de mobilité de l'humoriste
                          const matches = matchesMobilityZones(searchZone, mobilityZones);
                          
                          if (matches) {
                            return true;
                          }
                          
                          // Vérifier aussi si la recherche correspond directement à une zone de mobilité
                          // (match partiel dans le nom)
                          const directMatch = mobilityZones.some((zone: any) => {
                            const zoneNormalized = normalizeString(zone.value);
                            return zoneNormalized.includes(searchNormalized) || searchNormalized.includes(zoneNormalized);
                          });
                          
                          return directMatch;
                        });
                      }
                      
                      return filteredParticipants.map((participant: any, index: number) => {
                        const isAbsent = isParticipantAbsent(participant._id);
                        const absence = eventAbsences.find(absence => absence.comedian._id === participant._id);
                        
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
                                {participant.firstName} {participant.lastName}
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
                      });
                    })()}
                  </div>
                ) : (
                  <p style={modalValueStyle}>Aucun participant pour l'instant.</p>
                )}
              </div>
            ) : (
              <h3 style={{ ...modalLabelStyle, fontSize: '1.2em', marginTop: '20px', color: '#28a745' }}>
                Participants confirmés ({selectedEvent.participants?.length || 0}/{selectedEvent.requirements?.maxPerformers ?? 0})
              </h3>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={showEditEventForm} onClose={() => setShowEditEventForm(false)} title="Modifier l'évènement">
        {eventToEdit && (
          <EditEventForm
            eventToEdit={eventToEdit}
            onClose={() => setShowEditEventForm(false)}
            onEventUpdated={handleEventUpdated}
          />
        )}
      </Modal>

      <Modal isOpen={showCreateEventForm && user?.role === 'ORGANIZER'} onClose={() => { setShowCreateEventForm(false); setEventToDuplicate(null); }} title={eventToDuplicate ? "Dupliquer l'évènement" : "Créer un évènement"}>
        {showCreateEventForm && user?.role === 'ORGANIZER' && (
          <CreateEventForm 
            onClose={() => { setShowCreateEventForm(false); setEventToDuplicate(null); }} 
            onEventCreated={handleEventCreated}
            initialData={eventToDuplicate ? {
              title: eventToDuplicate.title,
              description: eventToDuplicate.description,
              city: eventToDuplicate.location?.city || '',
              postalCode: (eventToDuplicate.location as any)?.postalCode || '',
              address: eventToDuplicate.location?.address || '',
              country: eventToDuplicate.location?.country || '',
              date: eventToDuplicate.date,
              venue: eventToDuplicate.location?.venue || '',
              startTime: eventToDuplicate.startTime || '',
              endTime: eventToDuplicate.endTime || '',
              minExperience: eventToDuplicate.requirements?.minExperience,
              maxComedians: eventToDuplicate.requirements?.maxPerformers,
            } : undefined}
          />
        )}
      </Modal>

      {/* Section Évènements annulés */}
      {showCancelledSection && (
        <div ref={cancelledSectionRef} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Évènements annulés</h2>
          {eventsLoading && <p style={emptyStateStyle}>Chargement des évènements...</p>}
          {eventsError && <p style={{ ...emptyStateStyle, color: '#dc3545' }}>Erreur: {eventsErrorMessage?.message}</p>}
          {!eventsLoading && !eventsError && cancelledEvents.length === 0 && (
            <p style={emptyStateStyle}>Aucun évènement annulé.</p>
          )}
          {paginatedCancelledEvents.map((event) => {
            const statusLabel = translateEventStatus(event.status);
            const reason = event.cancellationReason;

            return (
              <div key={event._id} style={eventCardStyle} onClick={() => handleCardClick(event)}>
                <div style={cardContentStyle}>
                  <div style={cardHeaderRowStyle}>
                    <div>
                      <h3 style={eventTitleStyle}>{event.title}</h3>
                    </div>
                    <span style={cardDateBadgeStyle}>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div style={cardMetaGridStyle}>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Lieu</span>
                      <span style={cardMetaValueStyle}>{formatEventLocation(event)}</span>
                    </div>
                    <div style={cardMetaItemStyle}>
                      <span style={cardMetaLabelStyle}>Horaires</span>
                      <span style={cardMetaValueStyle}>{formatEventTimeRange(event)}</span>
                    </div>
                  </div>
                  {reason && (
                    <p style={{ ...eventDetailStyle, marginTop: 8, color: '#ffb199' }}>
                      <span style={{ fontWeight: 'bold', color: '#ff4b2b' }}>Raison:</span> {reason}
                    </p>
                  )}
                </div>
                <div style={cardStatusBlockStyle}>
                  {renderStatusChip(`Statut: ${statusLabel}`, '#dc3545', 'rgba(220, 53, 69, 0.18)')}
                </div>
              </div>
            );
          })}
          {cancelledEvents.length > ITEMS_PER_PAGE && (
            <div style={paginationControlsStyle}>
              <button
                style={paginationButtonStyle}
                disabled={cancelledPage === 1}
                onClick={() => setCancelledPage(prev => Math.max(1, prev - 1))}
              >
                Précédent
              </button>
              <span style={paginationInfoStyle}>
                Page {Math.min(cancelledPage, totalCancelledPages)} / {Math.max(totalCancelledPages, 1)}
              </span>
              <button
                style={paginationButtonStyle}
                disabled={cancelledPage >= totalCancelledPages}
                onClick={() => setCancelledPage(prev => Math.min(totalCancelledPages, prev + 1))}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section Calendrier */}
      {showCalendarSection && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Calendrier des évènements</h2>
          <EventCalendar
            events={[...upcomingEvents, ...archivedEventsToShow, ...cancelledEvents]}
            onEventClick={handleCardClick}
          />
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

      {/* Modal d'annulation d'évènement avec raison */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Annuler l'évènement">
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
                ? "Veuillez indiquer la raison de l'annulation (obligatoire car l'évènement est dans moins de 10 jours)."
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

      {/* Modal de confirmation de retrait */}
      {showWithdrawModal && eventToWithdraw && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', padding: 30, borderRadius: 10,
            minWidth: 320, maxWidth: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ color: '#dc3545', marginBottom: 20, fontSize: '1.5em' }}>
              Retirer votre candidature
            </h2>
            <p style={{ color: '#333', fontSize: '1.05em', lineHeight: '1.6', marginBottom: 15 }}>
              Êtes-vous sûr de vouloir retirer votre candidature pour l'évènement <strong>"{eventToWithdraw.title}"</strong> ?
            </p>
            <p style={{ color: '#666', fontSize: '0.95em', marginBottom: 25 }}>
              Cette action est définitive.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={closeWithdrawModal} style={{
                padding: '10px 20px',
                borderRadius: '5px',
                border: 'none',
                background: '#6c757d',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1em'
              }}>
                Annuler
              </button>
              <button onClick={confirmWithdrawApplication} style={{
                padding: '10px 20px',
                borderRadius: '5px',
                border: 'none',
                background: '#dc3545',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1em'
              }}>
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyEventsPage; 