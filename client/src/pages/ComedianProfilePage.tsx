import { type CSSProperties, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import type { IUserData } from '../types/user';
import EditComedianProfileForm from '../components/EditComedianProfileForm';
import api from '../services/api';

function ComedianProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { user: authUser, token, refreshUser } = useAuth();
  const [user, setUser] = useState<IUserData | null>(authUser);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const isViewingOtherProfile = !!id && id !== authUser?._id;

  useEffect(() => {
    if (id && id !== authUser?._id) {
      // Charger le profil d'un autre humoriste
      setLoading(true);
      const loadProfile = async () => {
        try {
          if (!token) {
            alert('Vous devez être connecté pour voir ce profil');
            return;
          }
          const config = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          const response = await api.get<IUserData>(`/profile/${id}`, config);
          setUser(response.data);
        } catch (err: any) {
          console.error('Erreur lors de la récupération du profil:', err.response?.data || err.message);
          alert('Erreur lors du chargement du profil de l\'humoriste');
        } finally {
          setLoading(false);
        }
      };
      loadProfile();
    } else {
      // Afficher le profil de l'utilisateur connecté
      setUser(authUser);
    }
  }, [id, authUser, token]);

  const handleSaveSuccess = () => {
    refreshUser();
    setIsEditing(false);
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

  const subtitleStyle: CSSProperties = {
    fontSize: '1.1em',
    color: '#aaa',
    marginBottom: '20px',
  };

  const sectionContainerStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '340px 1fr',
    gap: '20px',
    alignItems: 'flex-start',
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '18px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: '1.3em',
    color: '#ff4b2b',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
  };

  const infoRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: '8px',
    flexWrap: 'wrap',
  };

  const infoLabelStyle: CSSProperties = {
    fontWeight: 'bold',
    color: '#ccc',
    fontSize: '0.95em',
  };

  const infoValueStyle: CSSProperties = {
    color: '#fff',
    fontSize: '0.95em',
    textAlign: 'right',
    maxWidth: '60%',
  };

  const profileCardStyle: CSSProperties = {
    ...cardStyle,
    textAlign: 'center',
  };

  const avatarStyle: CSSProperties = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#ff416c',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '3em',
    fontWeight: 'bold',
    margin: '0 auto 15px auto',
  };

  const statsValueStyle: CSSProperties = {
    fontSize: '1.2em',
    color: '#ff416c',
    fontWeight: 'bold',
  };

  const editButtonStyle: CSSProperties = {
    padding: '8px 15px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '0.9em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    marginLeft: '10px',
  };

  return (
    <div style={mainContainerStyle}>
      <Navbar />

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>{isViewingOtherProfile ? 'Profil Humoriste' : 'Mon Profil Humoriste'}</h1>
          <p style={subtitleStyle}>
            {isViewingOtherProfile 
              ? `Profil de ${user ? `${user.firstName} ${user.lastName}` : 'l\'humoriste'}`
              : 'Gère tes informations et préférences en tant qu\'humoriste'}
          </p>
        </div>
        {!isViewingOtherProfile && (
          <button style={editButtonStyle} onClick={() => setIsEditing(true)}>Modifier</button>
        )}
      </div>

      {isEditing && user ? (
        <EditComedianProfileForm
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          currentUser={user}
          onSaveSuccess={handleSaveSuccess}
        />
      ) : (
        <div style={sectionContainerStyle}>
          {/* Profil principal (avatar et rôle) */}
          <div style={profileCardStyle}>
            <div style={{
              ...avatarStyle,
              backgroundImage: user?.avatarUrl ? `url(${user.avatarUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: user?.avatarUrl ? 'transparent' : '#ff416c',
            }}>
              {!user?.avatarUrl && (user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'DA')}
            </div>
            <h3 style={{ color: '#ffffff', marginBottom: '5px' }}>{user ? `${user.firstName} ${user.lastName}` : 'Nom Humoriste'}</h3>
            <p style={{ color: '#ff4b2b', fontSize: '1.1em', fontWeight: 'bold' }}>{user?.role || 'Humoriste'}</p>

            {/* Stats rapides */}
            <h4 style={{ color: '#ff4b2b', marginTop: '30px', marginBottom: '15px' }}>Stats rapides</h4>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Candidatures acceptées</span>
              <span style={statsValueStyle}>{user?.stats?.applicationsAccepted || 0}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Net Promoter Score</span>
              <span style={statsValueStyle}>{user?.stats?.netPromoterScore || 0}</span>
            </div>
          </div>

          {/* Informations personnelles */}
          <div style={{ ...cardStyle, minHeight: '100%' }}>
            <h2 style={cardTitleStyle}>
              <i className="fas fa-user-circle" style={{ marginRight: '10px' }}></i> Informations personnelles
            </h2>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Prénom</span>
              <span style={infoValueStyle}>{user?.firstName || 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Nom</span>
              <span style={infoValueStyle}>{user?.lastName || 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Email</span>
              <span style={infoValueStyle}>{user?.email || 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Ville</span>
              <span style={infoValueStyle}>{user?.city || 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Téléphone</span>
              <span style={infoValueStyle}>{user?.phone || 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Genre</span>
              <span style={infoValueStyle}>{user?.gender === 'femme' ? 'Femme' : user?.gender === 'homme' ? 'Homme' : 'Non défini'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Adresse</span>
              <span style={infoValueStyle}>{user?.address || 'Non définie'}</span>
            </div>
            {!isViewingOtherProfile && (
              <button style={{ ...editButtonStyle, marginTop: '20px' }} onClick={() => setIsEditing(true)}>Modifier</button>
            )}
          </div>

          {/* Profil Humoriste */}
          <div style={{ ...cardStyle, gridColumn: window.innerWidth < 768 ? 'span 1' : 'span 2' }}>
            <h2 style={cardTitleStyle}>Profil Humoriste</h2>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Bio:</span>
              <span style={infoValueStyle}>{user?.profile?.bio || 'Non spécifié'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Niveau d'expérience:</span>
              <span style={infoValueStyle}>
                {(() => {
                  const scenes = user?.profile?.numberOfScenes || 0;
                  if (scenes === 0) return 'Non spécifié';
                  if (scenes < 50) return `Débutant (${scenes} scène${scenes > 1 ? 's' : ''})`;
                  if (scenes < 200) return `Expérimenté (${scenes} scène${scenes > 1 ? 's' : ''})`;
                  return `Pro (${scenes} scène${scenes > 1 ? 's' : ''})`;
                })()}
              </span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Spécialité:</span>
              <span style={infoValueStyle}>{user?.profile?.speciality || 'Non spécifié'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Style de comédie:</span>
              <span style={infoValueStyle}>
                {user?.profile?.comedyStyle && user.profile.comedyStyle.length > 0
                  ? user.profile.comedyStyle.map(style => {
                      const labels: Record<string, string> = {
                        'stand-up': 'Stand up (solo en interaction avec le public)',
                        'improvisation': 'Improvisation (création spontanée à partir d\'un contexte)',
                        'plateau': 'Plateau (plusieurs artistes se succèdent lors d\'une soirée)',
                        'sketch': 'Sketch (une scène courte pré écrite)'
                      };
                      return labels[style] || style;
                    }).join(', ')
                  : 'Non spécifié'}
              </span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Langues:</span>
              <span style={infoValueStyle}>
                {user?.profile?.performanceLanguages && user.profile.performanceLanguages.length > 0
                  ? user.profile.performanceLanguages.map(lang => {
                      const labels: Record<string, string> = {
                        'francais': 'Français',
                        'arabe': 'Arabe',
                        'anglais': 'Anglais',
                        'italien': 'Italien',
                        'espagnol': 'Espagnol'
                      };
                      return labels[lang] || lang;
                    }).join(', ')
                  : 'Non spécifié'}
              </span>
            </div>
            {(user?.profile?.socialLinks?.youtube || user?.profile?.socialLinks?.instagram || user?.profile?.socialLinks?.facebook) && (
              <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h3 style={{ ...cardTitleStyle, fontSize: '1.1em', marginBottom: '10px' }}>Réseaux sociaux</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {user?.profile?.socialLinks?.youtube && (
                    <a 
                      href={user.profile.socialLinks.youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#ff416c', 
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>📺</span> YouTube
                    </a>
                  )}
                  {user?.profile?.socialLinks?.instagram && (
                    <a 
                      href={user.profile.socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#ff416c', 
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>📷</span> Instagram
                    </a>
                  )}
                  {user?.profile?.socialLinks?.facebook && (
                    <a 
                      href={user.profile.socialLinks.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#ff416c', 
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>👤</span> Facebook
                    </a>
                  )}
                </div>
              </div>
            )}
            {!isViewingOtherProfile && (
              <button style={{ ...editButtonStyle, marginTop: '20px' }} onClick={() => setIsEditing(true)}>MODIFIER</button>
            )}
          </div>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
          Chargement du profil...
        </div>
      )}
    </div>
  );
}

export default ComedianProfilePage; 