import { type CSSProperties, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // Importer useNavigate
import api from '../services/api';

interface EventStats {
  totalEvents: number;
  upcomingIncompleteEvents: number;
  completedEvents: number;
  cancelledEvents?: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  organizerCount?: number;
  comedianCount?: number;
}

const Dashboard = () => {
  const { user } = useAuth(); // Get user from useAuth for createdEvents
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [passwordResetCount, setPasswordResetCount] = useState<number>(0);
  const navigate = useNavigate(); // Initialiser useNavigate
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';

  // Fonction pour récupérer les statistiques
  const fetchEventStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Vous devez être connecté pour voir les statistiques d'événements.");
      }

      const response = await api.get('/events/stats');
      const data = response.data;
      console.log('📊 Statistiques reçues du serveur:', data);
      console.log('👤 Rôle utilisateur:', (user as any)?.role);
      setEventStats(data);
    } catch (err: any) {
      console.error("Erreur fetch event stats:", err);
      setError(err.message || "Erreur lors du chargement des statistiques.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour traiter les événements terminés (Super Admin uniquement)
  const handleProcessCompletedEvents = async () => {
    if (!user || (user as any)?.role !== 'SUPER_ADMIN') {
      alert('Accès refusé. Seuls les super-admins peuvent effectuer cette action.');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await api.post('/events/process-completed-events', {});

      const result = response.data;
      alert(`✅ Traitement terminé !\n${result.participationsAdded} participations ajoutées sur ${result.eventsProcessed} événements traités.`);
      
      // Recharger les statistiques après traitement
      await fetchEventStats();
    } catch (error: any) {
      console.error('Erreur lors du traitement:', error);
      alert(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction pour récupérer le nombre de demandes de réinitialisation
  const fetchPasswordResetRequests = async () => {
    if (!isSuperAdmin) return;
    try {
      const response = await api.get('/auth/admin/password-reset-requests');
      setPasswordResetCount(response.data.count || 0);
    } catch (err) {
      console.error('Erreur lors de la récupération des demandes:', err);
    }
  };

  useEffect(() => {
    if (user) { // Fetch only if user is available
      fetchEventStats();
      if (isSuperAdmin) {
        fetchPasswordResetRequests();
        // Rafraîchir toutes les 30 secondes
        const interval = setInterval(fetchPasswordResetRequests, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [user, isSuperAdmin]); // Re-run effect if user changes

  // Styles de base pour le conteneur principal
  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#ffffff',
    padding: '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', // Dégradé du login
  };

  // Styles pour l'en-tête du tableau de bord
  const dashboardHeaderStyle: CSSProperties = {
    fontSize: '3rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '40px',
    background: 'linear-gradient(135deg, #ff4b2b, #ff416c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 4px 8px rgba(255, 75, 43, 0.3)',
  };

  // Styles pour la grille des cartes
  const cardsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  // Style de base pour toutes les cartes
  const cardStyle: CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: '1.1rem',
    color: '#B0B0B0',
    marginBottom: '10px',
    fontWeight: '500',
  };

  const cardValueStyle: CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '5px',
  };

  const cardIconStyle: CSSProperties = {
    fontSize: '3rem',
    opacity: 0.7,
  };

  const superAdminCardLayoutStyle: CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  };

  const superAdminCardTitleStyle: CSSProperties = {
    fontSize: '1.3rem',
    color: '#ffffff',
    marginBottom: '6px',
    fontWeight: 600,
    letterSpacing: '0.5px'
  };

  const superAdminCardValueStyle: CSSProperties = {
    fontSize: '3.2rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '4px'
  };

  const superAdminCardIconStyle: CSSProperties = {
    fontSize: '3.5rem',
    opacity: 0.85
  };

  // Styles de cartes avec lueur/clignotement (vert/orange/rouge)
  const glowingCardGreenStyle: CSSProperties = {
    border: '1px solid rgba(34, 197, 94, 0.6)',
    boxShadow: '0 0 0 rgba(34, 197, 94, 0)',
    animation: 'glowGreen 1.8s ease-in-out infinite',
  };

  const glowingCardOrangeStyle: CSSProperties = {
    border: '1px solid rgba(245, 158, 11, 0.6)',
    boxShadow: '0 0 0 rgba(245, 158, 11, 0)',
    animation: 'glowOrange 1.8s ease-in-out infinite',
  };

  const glowingCardRedStyle: CSSProperties = {
    border: '1px solid rgba(239, 68, 68, 0.6)',
    boxShadow: '0 0 0 rgba(239, 68, 68, 0)',
    animation: 'glowRed 1.8s ease-in-out infinite',
  };

  const openExternalEvents = () => {
    window.location.href = 'standup-comedy-app.netlify.app/events';
  };

  const renderCard = (
    title: string,
    value: number,
    icon: string,
    options?: { style?: CSSProperties; onClick?: () => void; variant?: 'superAdmin' | 'default' }
  ) => {
    const isSuperAdminVariant = options?.variant === 'superAdmin';
    return (
      <div
        style={{
          ...cardStyle,
          ...(isSuperAdminVariant ? superAdminCardLayoutStyle : {}),
          ...(options?.style ?? {}),
          cursor: options?.onClick ? 'pointer' : 'default'
        }}
        onClick={options?.onClick}
      >
        <div>
          <p style={isSuperAdminVariant ? superAdminCardTitleStyle : cardTitleStyle}>{title}</p>
          <p style={isSuperAdminVariant ? superAdminCardValueStyle : cardValueStyle}>{value}</p>
        </div>
        <span style={isSuperAdminVariant ? superAdminCardIconStyle : cardIconStyle}>{icon}</span>
      </div>
    );
  };

  if (!user || loading) {
    return (
      <div style={mainContainerStyle}>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)' // Adjust based on navbar height
        }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={mainContainerStyle}>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)',
          color: '#dc3545'
        }}>
          <p>Erreur lors du chargement des statistiques: {error}</p>
        </div>
      </div>
    );
  }

  // Calcul des statistiques des humoristes postulants
  const totalHumoristApplicants = (eventStats?.acceptedApplications || 0) + (eventStats?.rejectedApplications || 0);
  const acceptedPercentage = totalHumoristApplicants > 0 ? (((eventStats?.acceptedApplications || 0) / totalHumoristApplicants) * 100).toFixed(1) : 0;
  const rejectedPercentage = totalHumoristApplicants > 0 ? (((eventStats?.rejectedApplications || 0) / totalHumoristApplicants) * 100).toFixed(1) : 0;

  // Déterminer le titre selon le rôle de l'utilisateur
  const dashboardTitle = (user as any)?.role === 'SUPER_ADMIN' 
    ? 'Tableau de bord Super Administrateur' 
    : 'Tableau de bord de l\'organisateur';

  return (
    <>
      <div style={mainContainerStyle}>
      <Navbar />
      <div style={{ marginTop: '80px' }}>
        <h1 style={dashboardHeaderStyle}>{dashboardTitle}</h1>
        
        <div style={cardsGridStyle}>
          {isSuperAdmin ? (
            <>
              {renderCard('Événements complets', eventStats?.completedEvents || 0, '✅', {
                style: glowingCardGreenStyle,
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard('Prochains événements (non complets)', eventStats?.upcomingIncompleteEvents || 0, '✨', {
                style: glowingCardRedStyle,
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard('Événements annulés', eventStats?.cancelledEvents || 0, '🛑', {
                style: glowingCardOrangeStyle,
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard('Événements créés', eventStats?.totalEvents || 0, '🎪', {
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard("Nombre d'organisateurs", eventStats?.organizerCount || 0, '🏢', {
                variant: 'superAdmin'
              })}
              {renderCard("Nombre d'humoristes", eventStats?.comedianCount || 0, '🎤', {
                variant: 'superAdmin'
              })}
              {renderCard('Réinitialisations en attente', passwordResetCount, '🔐', {
                style: passwordResetCount > 0 ? glowingCardOrangeStyle : {},
                variant: 'superAdmin',
                onClick: () => navigate('/admin/password-resets')
              })}
            </>
          ) : (
            <>
              {renderCard('Événements complets', eventStats?.completedEvents || 0, '✅', {
                style: glowingCardGreenStyle,
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard('Candidatures en attente', eventStats?.pendingApplications || 0, '⏳', {
                style: glowingCardOrangeStyle,
                variant: 'superAdmin',
                onClick: () => navigate('/applications')
              })}
              {renderCard('Prochains événements (non complets)', eventStats?.upcomingIncompleteEvents || 0, '✨', {
                style: glowingCardRedStyle,
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              <div 
                style={{ 
                  ...cardStyle,
                  ...superAdminCardLayoutStyle,
                  cursor: 'pointer'
                }} 
                onClick={() => navigate('/applications')}
              >
                <div>
                  <p style={superAdminCardTitleStyle}>Humoristes postulants</p>
                  <p style={superAdminCardValueStyle}>{totalHumoristApplicants}</p>
                  <div style={{ fontSize: '1rem', color: '#B0B0B0', marginTop: '10px', textAlign: 'center' }}>
                    <div>✅ Acceptées: {eventStats?.acceptedApplications || 0} ({acceptedPercentage}%)</div>
                    <div>❌ Refusées: {eventStats?.rejectedApplications || 0} ({rejectedPercentage}%)</div>
                  </div>
                </div>
                <span style={superAdminCardIconStyle}>👥</span>
              </div>
              {renderCard('Événements créés', eventStats?.totalEvents || 0, '🎪', {
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
              {renderCard('Événements annulés', eventStats?.cancelledEvents || 0, '🛑', {
                variant: 'superAdmin',
                onClick: openExternalEvents
              })}
            </>
          )}
        </div>

        {/* Carte de traitement automatique pour Super Admin uniquement */}
        {(user as any)?.role === 'SUPER_ADMIN' && (
            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(219, 39, 119, 0.2))',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              textAlign: 'center',
              cursor: 'pointer'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px'
              }}>
                <span style={{
                  fontSize: '3rem',
                  opacity: 0.8,
                  animation: isProcessing ? 'spin 1s linear infinite' : 'none'
                }}>
                  🔄
                </span>
                <div>
                  <p style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '10px'
                  }}>
                    Traitement automatique
                  </p>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#B0B0B0',
                    marginBottom: '20px',
                    lineHeight: 1.4
                  }}>
                    Mettre à jour les participations pour les événements terminés
                  </p>
                </div>
                <button
                  onClick={handleProcessCompletedEvents}
                  disabled={isProcessing}
                  style={{
                    padding: '12px 24px',
                    background: isProcessing 
                      ? 'linear-gradient(135deg, #6b7280, #9ca3af)' 
                      : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{
                    fontSize: '1rem',
                    animation: isProcessing ? 'spin 1s linear infinite' : 'none'
                  }}>
                    🔄
                  </span>
                  {isProcessing ? 'Traitement...' : 'Traiter les événements'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes glowGreen {
            0%, 100% { box-shadow: 0 0 0 rgba(34, 197, 94, 0); }
            50% { box-shadow: 0 0 24px 6px rgba(34, 197, 94, 0.5); }
          }
          @keyframes glowOrange {
            0%, 100% { box-shadow: 0 0 0 rgba(245, 158, 11, 0); }
            50% { box-shadow: 0 0 24px 6px rgba(245, 158, 11, 0.5); }
          }
          @keyframes glowRed {
            0%, 100% { box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
            50% { box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.5); }
          }
        `}
      </style>
    </>
  );
};

export default Dashboard; 