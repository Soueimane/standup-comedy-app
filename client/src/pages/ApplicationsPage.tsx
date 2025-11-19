import { type CSSProperties, useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import ApplicationDetailsModal from '../components/ApplicationDetailsModal';

export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profile?: { bio?: string; experience?: number; speciality?: string; }; // Ajoutez d'autres champs si nécessaires
}

export interface IEventPopulated {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: { address: string; city: string; };
  organizer: IUser; // Change to IUser
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  requirements: { minExperience: number; maxPerformers: number; duration: number; };
  createdAt?: string;
  updatedAt?: string;
  modifiedByOrganizer?: boolean;
}

export interface IApplication {
  _id: string;
  event: IEventPopulated;
  comedian: IUser; // Renamed from applicant to comedian for consistency with backend
  performanceDetails?: { duration: number; description: string; videoLink?: string; }; // Make optional
  message?: string; // Add optional message field
  organizerMessage?: string; // Message de l'organisateur lors de l'acceptation/refus
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

function ApplicationsPage() {
  const { token, user, refreshUser } = useAuth();
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedApplication, setSelectedApplication] = useState<IApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusToSet, setStatusToSet] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [statusAppId, setStatusAppId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const [comedianFilter, setComedianFilter] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [organizerEvents, setOrganizerEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [sortKey, setSortKey] = useState<'dateAsc' | 'dateDesc' | 'statusAsc' | 'statusDesc'>('dateDesc');
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getStatusFromUrlOrTab = () => {
    const queryParams = new URLSearchParams(location.search);
    const statusParam = queryParams.get('status');
    if (statusParam && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(statusParam)) {
      return statusParam as 'PENDING' | 'ACCEPTED' | 'REJECTED';
    }
    return 'all';
  };

  useEffect(() => {
    setSelectedTab(getStatusFromUrlOrTab());
  }, [location.search]);

  // Affichage message après action email (?update=kept|withdrawn)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const update = params.get('update');
    if (update === 'kept') {
      alert("Confirmation prise en compte: l'humoriste reste inscrit.");
    } else if (update === 'withdrawn') {
      alert("Désinscription confirmée: la candidature a été retirée.");
    }
  }, [location.search]);

  const fetchApplications = async () => {
    if (!token) {
      setError("Vous devez être connecté pour voir les candidatures.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const query = selectedEventId !== 'all' ? `?eventId=${encodeURIComponent(selectedEventId)}` : '';
      const res = await api.get<IApplication[]>(`/applications${query}`, config);
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray((res.data as any)?.applications) ? (res.data as any).applications : []);
      setApplications(list);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des candidatures:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Échec de la récupération des candidatures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [token, selectedTab, selectedEventId]);

  // Charger les événements de l'organisateur pour le sélecteur
  useEffect(() => {
    const loadOrganizerEvents = async () => {
      if (!token || user?.role !== 'ORGANIZER') return;
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get<any[]>('/events', config);
        const list = Array.isArray(res.data) ? res.data : [];
        const options = list.map((ev: any) => ({ id: ev._id, title: ev.title }));
        setOrganizerEvents(options);
      } catch (err) {
        console.error('Erreur chargement événements pour filtre:', err);
      }
    };
    loadOrganizerEvents();
  }, [token, user?.role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, selectedEventId, comedianFilter, sortKey, applications.length]);
  const organizerFilteredApplications = user?.role === 'ORGANIZER'
    ? getFilteredApplications().filter(app => app.event)
    : [];

  const totalOrganizerPages = Math.max(1, Math.ceil(organizerFilteredApplications.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalOrganizerPages) {
      setCurrentPage(totalOrganizerPages);
    }
  }, [totalOrganizerPages, currentPage]);

  const paginatedOrganizerApplications = organizerFilteredApplications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openStatusModal = (appId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setStatusAppId(appId);
    setStatusToSet(status);
    setStatusMessage('');
    setShowStatusModal(true);
    setTimeout(() => messageInputRef.current?.focus(), 100);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setStatusToSet(null);
    setStatusAppId(null);
    setStatusMessage('');
  };

  const handleConfirmStatus = async () => {
    if (!token || !statusAppId || !statusToSet) return;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await api.put(`/applications/${statusAppId}/status`, { status: statusToSet, organizerMessage: statusMessage }, config);
      alert(`Candidature ${statusToSet === 'ACCEPTED' ? 'acceptée' : 'refusée'} avec succès !`);
      fetchApplications();
      refreshUser();
      closeStatusModal();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err.response?.data || err.message);
      alert(`Échec de la mise à jour du statut: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleTabChange = (status: 'all' | 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
    setSelectedTab(status);
    if (status === 'all') {
      navigate('/applications');
    } else {
      navigate(`/applications?status=${status}`);
    }
  };

  // Récupérer la liste unique des humoristes
  const uniqueComedians = Array.from(new Set(applications.map(app => app.comedian ? `${app.comedian._id}::${app.comedian.firstName} ${app.comedian.lastName}` : '')))
    .filter(Boolean)
    .map(str => {
      const [id, name] = str.split('::');
      return { id, name };
    });

  // Fonction de filtrage combinée
  function getFilteredApplications(): IApplication[] {
    let filtered = applications;
    if (selectedTab !== 'all') {
      filtered = filtered.filter(app => app.status === selectedTab);
    }
    // Filtre par humoriste: seulement utile côté ORGANIZER
    if (user?.role === 'ORGANIZER' && comedianFilter !== 'all') {
      filtered = filtered.filter(app => app.comedian && app.comedian._id === comedianFilter);
    }
    // Tri
    const sortByStatusOrder = (a: IApplication['status'], b: IApplication['status']) => {
      const order = ['PENDING', 'ACCEPTED', 'REJECTED'];
      return order.indexOf(a) - order.indexOf(b);
    };
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'dateAsc') {
        // Vérifier que les événements et leurs dates existent
        if (!a.event || !a.event.date || !b.event || !b.event.date) return 0;
        return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
      }
      if (sortKey === 'dateDesc') {
        // Vérifier que les événements et leurs dates existent
        if (!a.event || !a.event.date || !b.event || !b.event.date) return 0;
        return new Date(b.event.date).getTime() - new Date(a.event.date).getTime();
      }
      if (sortKey === 'statusAsc') {
        return sortByStatusOrder(a.status, b.status);
      }
      if (sortKey === 'statusDesc') {
        return sortByStatusOrder(b.status, a.status);
      }
      return 0;
    });
    return sorted;
  }

  const allApplicationsCount = applications.length;
  const pendingApplicationsCount = applications.filter(app => app.status === 'PENDING').length;
  const acceptedApplicationsCount = applications.filter(app => app.status === 'ACCEPTED').length;
  const rejectedApplicationsCount = applications.filter(app => app.status === 'REJECTED').length;

  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#ffffff',
    padding: isMobile ? '16px 12px' : '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
  };

  const pageHeaderStyle: CSSProperties = {
    padding: isMobile ? '10px 0 20px' : '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? '12px' : 0,
    marginBottom: '30px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '2.5em',
    color: '#ff416c',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '1.1em',
    color: '#aaa',
    marginBottom: '20px',
  };

  const contentContainerStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: isMobile ? '16px' : '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const applicationsListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '12px' : '16px',
    marginTop: '20px',
  };

  const applicationCardStyle: CSSProperties = {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: isMobile ? '14px' : '20px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    flexWrap: isMobile ? 'nowrap' : 'wrap',
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: '1.4em',
    color: '#ff4b2b',
    marginBottom: '10px',
  };

  const cardDetailStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#ccc',
    marginBottom: '5px',
  };

  const comedianInfoStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '12px' : '16px',
    flex: '1',
    minWidth: 0,
    width: isMobile ? '100%' : 'auto',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
  };

  const comedianDetailsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    flex: isMobile ? '1 1 auto' : undefined,
  };

  const comedianInitialBubbleStyle: CSSProperties = {
    width: isMobile ? '48px' : '56px',
    height: isMobile ? '48px' : '56px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.2em',
    textTransform: 'uppercase',
    flexShrink: 0,
  };

  const comedianNameTextStyle: CSSProperties = {
    fontSize: '1.1em',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  };

  const comedianRoleTextStyle: CSSProperties = {
    fontSize: '0.85em',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  };

  const viewProfileInlineButtonStyle: CSSProperties = {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.2)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    justifyContent: 'center',
    width: isMobile ? '100%' : 'auto',
  };

  const eventInfoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1',
    minWidth: 0,
    width: isMobile ? '100%' : 'auto',
  };

  const eventTitleStyle: CSSProperties = {
    fontSize: '1.2em',
    color: '#ff4b2b',
    margin: 0,
    fontWeight: 700,
  };

  const eventDateStyle: CSSProperties = {
    fontSize: '0.9em',
    color: '#aaa',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: 0,
  };

  const cardRightSectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMobile ? 'stretch' : 'flex-end',
    gap: '12px',
    flexShrink: 0,
    width: isMobile ? '100%' : 'auto',
  };

  const actionsContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '10px',
    flexWrap: 'wrap',
    width: isMobile ? '100%' : 'auto',
    justifyContent: isMobile ? 'space-between' : 'flex-end',
  };

  const statusBadgeStyle = (status: IApplication['status']): CSSProperties => {
    let backgroundColor = '';
    let color = '#ffffff';
    switch (status) {
      case 'PENDING':
        backgroundColor = '#ffc107'; // yellow
        color = '#333';
        break;
      case 'ACCEPTED':
        backgroundColor = 'transparent'; // pas de fond vert
        color = '#28a745'; // texte vert
        break;
      case 'REJECTED':
        backgroundColor = '#dc3545'; // red
        break;
      default:
        backgroundColor = '#6c757d'; // gray
    }
    return {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '6px',
      backgroundColor: status === 'ACCEPTED' ? 'transparent' : backgroundColor, // Force transparent pour ACCEPTED
      color: status === 'ACCEPTED' ? '#28a745' : color, // Force vert pour ACCEPTED
      fontWeight: 'bold',
      fontSize: '0.9em',
      border: status === 'ACCEPTED' ? 'none' : undefined, // Pas de bordure pour ACCEPTED
      width: isMobile ? '100%' : 'auto',
      textAlign: isMobile ? 'center' : 'left',
    };
  };

  const translateStatus = (status: IApplication['status']): string => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'ACCEPTED':
        return 'Acceptée';
      case 'REJECTED':
        return 'Refusée';
      default:
        return status; // Fallback for other statuses not directly related to application (e.g., event status)
    }
  };

  const actionButtonStyle: CSSProperties = {
    padding: '8px 15px',
    borderRadius: '5px',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    marginTop: '10px',
    marginRight: '10px',
  };

  const acceptButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    backgroundColor: '#28a745', // Green
    marginTop: 0,
    marginRight: 0,
    flex: isMobile ? 1 : undefined,
  };

  const rejectButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    backgroundColor: '#dc3545', // Red
    marginTop: 0,
    marginRight: 0,
    flex: isMobile ? 1 : undefined,
  };

  const handleViewComedianProfile = (e: React.MouseEvent<HTMLButtonElement>, comedianId: string) => {
    e.stopPropagation();
    // Naviguer vers la page de profil de l'humoriste
    navigate(`/profile/comedian/${comedianId}`);
  };

  const tabButtonStyle: CSSProperties = {
    padding: '10px 15px',
    borderRadius: '20px',
    border: 'none',
    background: '#331f41',
    color: '#ffffff',
    fontSize: '1em',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
    minWidth: '120px',
    textAlign: 'center',
  };

  const activeTabButtonStyle: CSSProperties = {
    ...tabButtonStyle,
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
  };

  const paginationContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '20px',
    flexWrap: 'wrap',
  };

  const paginationButtonStyle: CSSProperties = {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: '#331f41',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: '100px',
    opacity: 1,
    transition: 'opacity 0.2s, transform 0.2s',
  };

  const paginationInfoStyle: CSSProperties = {
    color: '#ddd',
    fontWeight: 600,
  };

  // Détermine si l'événement a été modifié par l'organisateur
  const wasEventUpdatedAfterApplication = (app: IApplication): boolean => {
    // Utiliser le champ modifiedByOrganizer qui est défini uniquement lors de vraies modifications
    return Boolean(app?.event?.modifiedByOrganizer);
  };

  return (
    <div style={mainContainerStyle}>
      <Navbar />
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>{user?.role === 'ORGANIZER' ? 'Gérer les Candidatures' : 'Mes Candidatures'}</h1>
          <p style={subtitleStyle}>
            {user?.role === 'ORGANIZER' 
              ? 'Visualisez et gérez toutes les candidatures pour vos événements.'
              : 'Visualisez le statut de vos candidatures.'}
          </p>
        </div>
      </div>

      <div style={contentContainerStyle}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          {/* Onglets de statut */}
          <button 
            style={selectedTab === 'all' ? activeTabButtonStyle : tabButtonStyle}
            onClick={() => handleTabChange('all')}
          >
            Toutes ({allApplicationsCount})
          </button>
          <button 
            style={selectedTab === 'PENDING' ? activeTabButtonStyle : tabButtonStyle}
            onClick={() => handleTabChange('PENDING')}
          >
            En attente ({pendingApplicationsCount})
          </button>
          <button 
            style={selectedTab === 'ACCEPTED' ? activeTabButtonStyle : tabButtonStyle}
            onClick={() => handleTabChange('ACCEPTED')}
          >
            Acceptées ({acceptedApplicationsCount})
          </button>
          <button 
            style={selectedTab === 'REJECTED' ? activeTabButtonStyle : tabButtonStyle}
            onClick={() => handleTabChange('REJECTED')}
          >
            Refusées ({rejectedApplicationsCount})
          </button>
          {/* Menu déroulant de filtrage par humoriste (ORGANIZER uniquement) */}
          {user?.role === 'ORGANIZER' && (
            <select
              value={comedianFilter}
              onChange={e => setComedianFilter(e.target.value)}
              style={{ marginLeft: 'auto', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff', minWidth: 180 }}
            >
              <option value="all">Tous les humoristes</option>
              {uniqueComedians.map(comedian => (
                <option key={comedian.id} value={comedian.id}>{comedian.name}</option>
              ))}
            </select>
          )}

          {/* Filtre par événement (organisateur uniquement) */}
          {user?.role === 'ORGANIZER' && (
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff', minWidth: 220 }}
            >
              <option value="all">Tous les événements</option>
              {organizerEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          )}

          {/* Tri */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as any)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff', minWidth: 220 }}
          >
            <option value="dateDesc">Trier: Date (plus récent)</option>
            <option value="dateAsc">Trier: Date (plus ancien)</option>
            <option value="statusAsc">Trier: Statut (PENDING→ACCEPTED→REJECTED)</option>
            <option value="statusDesc">Trier: Statut (REJECTED→ACCEPTED→PENDING)</option>
          </select>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#ccc' }}>Chargement des candidatures...</p>}
        {error && <p style={{ textAlign: 'center', color: '#dc3545' }}>Erreur: {error}</p>}
        {!loading && !error && getFilteredApplications().length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '1.2em', color: '#ccc' }}>
            Aucune candidature trouvée pour ce filtre.
          </p>
        )}

        {!loading && !error && getFilteredApplications().length > 0 && (
          <>
            {user?.role === 'COMEDIAN' ? (
              <>
                {/* Séparation à venir / archivées côté humoriste */}
                {(() => {
                  const today = new Date();
                  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const list = getFilteredApplications().filter(app => app.event);
                  const upcoming = list.filter(app => app.event?.date && new Date(app.event.date) >= todayMidnight);
                  const archived = list.filter(app => app.event?.date && new Date(app.event.date) < todayMidnight);
                  const Section = ({ title, items }: { title: string; items: IApplication[] }) => (
                    <div style={{ marginBottom: 30 }}>
                      <h2 style={{ color: '#ff416c', margin: '10px 0' }}>{title}</h2>
                      {items.length === 0 ? (
                        <p style={{ color: '#ccc' }}>Aucune candidature.</p>
                      ) : (
                        <div style={applicationsListStyle}>
                          {items.map(app => (
                            <div 
                              key={app._id} 
                              style={applicationCardStyle}
                              onClick={() => { setSelectedApplication(app); setIsModalOpen(true); }}
                            >
                              <div>
                                <h3 style={cardTitleStyle}>{app.event.title}</h3>
                                {wasEventUpdatedAfterApplication(app) && app.event?.date && (new Date(app.event.date) >= todayMidnight) && (
                                  <div style={{ display: 'inline-block', marginBottom: 8, padding: '4px 8px', borderRadius: 6, background: '#fff3cd', color: '#664d03', fontSize: 12, fontWeight: 600 }}>
                                    Modification apportée par l'organisateur à cet événement
                                  </div>
                                )}
                                <p style={cardDetailStyle}>Organisateur: {app.event.organizer.firstName} {app.event.organizer.lastName}</p>
                                <p style={cardDetailStyle}>Date de l'événement: {app.event?.date ? new Date(app.event.date).toLocaleDateString() : 'Date non disponible'}</p>
                                {app.performanceDetails && (
                                  <>
                                    <p style={cardDetailStyle}>Durée proposée: {app.performanceDetails.duration} min</p>
                                    <p style={cardDetailStyle}>Description: {app.performanceDetails.description}</p>
                                    {app.performanceDetails.videoLink && <p style={cardDetailStyle}>Lien vidéo: <a href={app.performanceDetails.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#ff4b2b' }}>Voir la vidéo</a></p>}
                                  </>
                                )}
                                {app.message && <p style={cardDetailStyle}>Message: {app.message}</p>}
                                <span style={statusBadgeStyle(app.status)}>Statut: {translateStatus(app.status)}</span>
                                {user?.role === 'COMEDIAN' && wasEventUpdatedAfterApplication(app) && app.event?.date && (new Date(app.event.date) >= todayMidnight) && (
                                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                    <button
                                      onClick={async (e: React.MouseEvent<HTMLButtonElement>) => { 
                                        e.stopPropagation(); 
                                        console.log('🎪 DEBUT clic bouton confirmation');
                                        console.log('🎪 Application complète:', app);
                                        console.log('🎪 Application._id:', app._id);
                                        console.log('🎪 Event:', app.event);
                                        console.log('🎪 User role:', user?.role);
                                        console.log('🎪 User ID:', user?._id);
                                        
                                        try {
                                          // Vérifier d'abord si l'application existe
                                          console.log('🔍 Vérification existence application...');
                                          const checkResponse = await api.get(`/applications/${app._id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                          });
                                          console.log('✅ Application existe:', checkResponse.data);
                                          
                                          // Puis confirmer la participation
                                          console.log('🎪 Appel PATCH /confirm...');
                                          const response = await api.patch(`/applications/${app._id}/confirm`, {}, {
                                            headers: { Authorization: `Bearer ${token}` }
                                          });
                                          console.log('🎪 Réponse API:', response.data);
                                          
                                          if (response.status === 200) {
                                            alert('Confirmation enregistrée ! Les boutons vont disparaître.');
                                            fetchApplications(); // Recharger pour cacher les boutons
                                          }
                                        } catch (error) {
                                          console.error('🎪 Erreur complète:', error);
                                          alert('Erreur lors de la confirmation. Vérifiez la console.');
                                        }
                                      }}
                                      style={{ ...actionButtonStyle, backgroundColor: '#ff9800' }}
                                    >
                                      Je reste inscrit
                                    </button>
                                    <button
                                      onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation();
                                        if (!token) return;
                                        if (!confirm('Confirmer la désinscription ?')) return;
                                        try {
                                          const config = { headers: { Authorization: `Bearer ${token}` } };
                                          await api.delete(`/applications/${app._id}`, config);
                                          alert('Candidature retirée.');
                                          fetchApplications();
                                          refreshUser();
                                        } catch (err: any) {
                                          alert('Échec de la désinscription.');
                                        }
                                      }}
                                      style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}
                                    >
                                      Me désinscrire
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  return (
                    <>
                      <Section title="Candidatures à venir" items={upcoming} />
                      <Section title="Candidatures archivées" items={archived} />
                    </>
                  );
                })()}
              </>
            ) : (
              // Affichage organisateur - Liste horizontale
              <>
                <div style={applicationsListStyle}>
                  {paginatedOrganizerApplications.map((app) => (
                  <div 
                    key={app._id} 
                    style={applicationCardStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.5)';
                    }}
                    onClick={() => {
                      setSelectedApplication(app);
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Section gauche - Avatar et info humoriste */}
                    {user?.role === 'ORGANIZER' && (
                      <div style={comedianInfoStyle}>
                        <div style={comedianInitialBubbleStyle}>
                          {`${app.comedian?.firstName?.[0] ?? ''}${app.comedian?.lastName?.[0] ?? ''}`.trim() || '🎤'}
                        </div>
                        <div style={comedianDetailsStyle}>
                          <p style={comedianNameTextStyle}>{app.comedian.firstName} {app.comedian.lastName}</p>
                          <p style={comedianRoleTextStyle}>Humoriste</p>
                        </div>
                        <button 
                          style={viewProfileInlineButtonStyle}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleViewComedianProfile(e, app.comedian._id);
                          }}
                        >
                          👤 Voir le profil
                        </button>
                      </div>
                    )}

                    {/* Section centre - Info événement */}
                    <div style={eventInfoStyle}>
                      <h3 style={eventTitleStyle}>{app.event.title}</h3>
                      <p style={eventDateStyle}>
                        📅 {app.event?.date ? new Date(app.event.date).toLocaleDateString() : 'Date non disponible'}
                      </p>
                    </div>

                    {/* Section droite - Statut et actions */}
                    <div style={cardRightSectionStyle}>
                      <span style={statusBadgeStyle(app.status)}>Statut: {translateStatus(app.status)}</span>
                      {app.status === 'PENDING' && (
                        <div style={actionsContainerStyle}>
                          <button 
                            style={acceptButtonStyle} 
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                              e.stopPropagation(); 
                              openStatusModal(app._id, 'ACCEPTED'); 
                            }}
                          >
                            ✓ Accepter
                          </button>
                          <button 
                            style={rejectButtonStyle} 
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                              e.stopPropagation(); 
                              openStatusModal(app._id, 'REJECTED'); 
                            }}
                          >
                            ✕ Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
                {organizerFilteredApplications.length > ITEMS_PER_PAGE && (
                  <div style={paginationContainerStyle}>
                    <button
                      style={{
                        ...paginationButtonStyle,
                        opacity: currentPage === 1 ? 0.5 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                      disabled={currentPage === 1}
                    >
                      ◀ Précédent
                    </button>
                    <span style={paginationInfoStyle}>
                      Page {currentPage} / {totalOrganizerPages}
                    </span>
                    <button
                      style={{
                        ...paginationButtonStyle,
                        opacity: currentPage === totalOrganizerPages ? 0.5 : 1,
                        cursor: currentPage === totalOrganizerPages ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => currentPage < totalOrganizerPages && setCurrentPage(prev => prev + 1)}
                      disabled={currentPage === totalOrganizerPages}
                    >
                      Suivant ▶
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {selectedApplication && (
        <ApplicationDetailsModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          application={selectedApplication}
        />
      )}
      {showStatusModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 10, minWidth: 320, maxWidth: 400 }}>
            <h2 style={{ color: '#ff416c', marginBottom: 15 }}>
              {statusToSet === 'ACCEPTED' ? 'Accepter la candidature' : 'Refuser la candidature'}
            </h2>
            <label style={{ color: '#333', fontWeight: 500 }}>Message (optionnel) :</label>
            <textarea
              ref={messageInputRef as any}
              value={statusMessage}
              onChange={e => setStatusMessage(e.target.value)}
              rows={4}
              style={{ width: '100%', margin: '10px 0 20px 0', borderRadius: 6, border: '1px solid #ccc', padding: 8 }}
              placeholder={statusToSet === 'ACCEPTED' ? 'Message pour l\'humoriste (optionnel)' : 'Motif du refus (optionnel)'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeStatusModal} style={{ ...actionButtonStyle, background: '#aaa', color: '#fff' }}>Annuler</button>
              <button onClick={handleConfirmStatus} style={{ ...actionButtonStyle, background: statusToSet === 'ACCEPTED' ? '#28a745' : '#dc3545' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationsPage; 