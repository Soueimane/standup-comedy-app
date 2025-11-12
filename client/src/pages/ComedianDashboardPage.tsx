import { type CSSProperties, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ComedianDashboardPage() {
  const { user, token, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  // Afficher un message simple selon ?update=kept|withdrawn
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const update = params.get('update');
    if (update === 'kept') {
      alert("Confirmation prise en compte: vous restez inscrit à l'événement.");
    } else if (update === 'withdrawn') {
      alert("Désinscription confirmée: votre candidature a été retirée.");
    }
  }, [location.search]);

  // Récupère les candidatures de l'humoriste
  const { data: applications } = useQuery({
    queryKey: ['comedianApplications', user?._id, token],
    queryFn: async () => {
      if (!token || !user?._id) return [];
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get('/applications?comedianId=' + user._id, config);
      const list = Array.isArray(res.data) ? res.data : (Array.isArray((res.data as any)?.applications) ? (res.data as any).applications : []);
      return list;
    },
    enabled: !!token && !!user?._id,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
  });

  // Calcule le nombre de candidatures acceptées dynamiquement
  const acceptedCount = applications ? applications.filter((app: any) => app.status === 'ACCEPTED').length : 0;
  const sentCount = applications ? applications.length : 0;

  // Calcule le nombre d'événements acceptés à venir (date >= aujourd'hui 00:00)
  const todayMidnight = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const upcomingCount = applications ? applications.filter((app: any) => {
    if (app.status !== 'ACCEPTED' || !app.event?.date) return false;
    const eventDate = new Date(app.event.date);
    return eventDate >= todayMidnight;
  }).length : 0;

  // Données pour le camembert
  const refusedCount = applications ? applications.filter((app: any) => app.status === 'REJECTED').length : 0;
  const pendingCount = applications ? applications.filter((app: any) => app.status === 'PENDING').length : 0;
  const pieData = [
    { name: 'Acceptées', value: acceptedCount, color: '#28a745' },
    { name: 'Refusées', value: refusedCount, color: '#dc3545' },
    { name: 'En cours', value: pendingCount, color: '#ffc107' },
  ];

  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#ffffff',
    padding: '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
  };

  const dashboardHeaderStyle: CSSProperties = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: CSSProperties = {
    fontSize: '2.5em',
    marginBottom: '20px',
    color: '#ff416c',
  };

  const tabNavigationStyle: CSSProperties = {
    display: 'flex',
    marginBottom: '30px',
    borderBottom: '1px solid #444',
  };

  const tabButtonStyle: CSSProperties = {
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: '1.1em',
    fontWeight: 'bold',
  };

  const activeTabButtonStyle: CSSProperties = {
    ...tabButtonStyle,
    color: '#ff416c',
    borderBottom: '2px solid #ff416c',
  };

  const cardsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '20px',
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '150px',
  };

  const blinkingCardStyle: CSSProperties = {
    ...cardStyle,
    animation: 'greenBlink 2s infinite',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: '1.2em',
    color: '#ffffff',
    marginBottom: '10px',
  };

  const cardValueStyle: CSSProperties = {
    fontSize: '2.5em',
    fontWeight: 'bold',
    color: '#ff4b2b',
  };

  if (!user) {
    return (
      <div style={mainContainerStyle}>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)'
        }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div style={mainContainerStyle}>
      <style>
        {`
          @keyframes greenBlink {
            0%, 50% { 
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(40, 167, 69, 0.6);
              border: 2px solid rgba(40, 167, 69, 0.3);
            }
            25%, 75% { 
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(40, 167, 69, 0.9);
              border: 2px solid rgba(40, 167, 69, 0.7);
            }
          }
        `}
      </style>
      <Navbar />
      <div style={dashboardHeaderStyle}>
        <h1 style={titleStyle}>Tableau de bord de l'Humoriste</h1>

        <div style={tabNavigationStyle}>
          <button style={activeTabButtonStyle}>Vue d'ensemble</button>
          {/* Ajoutez d'autres onglets si nécessaire */}
        </div>

        <div style={cardsGridStyle}>
          {/* Carte: Événements à venir (SWAPPED) - Avec effet clignotant vert */}
          <div 
            style={blinkingCardStyle}
            onClick={() => {
              const isOnNetlify = window.location.hostname.includes('netlify.app');
              if (isOnNetlify) {
                navigate('/events'); // navigation SPA, plus rapide
              } else {
                window.location.href = 'https://standup-comedy-app.netlify.app/events';
              }
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div>
              <p style={cardTitleStyle}>Événements à venir</p>
              <p style={cardValueStyle}>{upcomingCount}</p>
            </div>
            <span style={{ fontSize: '2em', color: '#ff4b2b', alignSelf: 'flex-end' }}>✨</span>
          </div>

          {/* Carte: Candidatures Acceptées */}
          <div style={cardStyle}>
            <div>
              <p style={cardTitleStyle}>Candidatures Acceptées</p>
              <p style={cardValueStyle}>{acceptedCount}</p>
            </div>
            <span style={{ fontSize: '2em', color: '#28a745', alignSelf: 'flex-end' }}>✅</span>
          </div>

          {/* Carte: Mes Candidatures (SWAPPED) */}
          <div style={cardStyle}>
            <div>
              <p style={cardTitleStyle}>Mes Candidatures</p>
              <p style={cardValueStyle}>{sentCount}</p>
            </div>
            <span style={{ fontSize: '2em', color: '#ff416c', alignSelf: 'flex-end' }}>📝</span>
          </div>
        </div>
        {/* Ajout du camembert */}
        <div style={{ maxWidth: 400, margin: '40px auto 0 auto', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 24 }}>
          <h2 style={{ color: '#ff416c', textAlign: 'center', marginBottom: 16 }}>Répartition des Candidatures</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ComedianDashboardPage; 