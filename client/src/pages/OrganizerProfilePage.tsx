import { type CSSProperties, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import type { IUserData } from '../types/user';
import EditOrganizerProfileForm from '../components/EditOrganizerProfileForm';
import EmailPreferences from '../components/EmailPreferences';
import DeleteAccountSection from '../components/DeleteAccountSection';
import ExportDataSection from '../components/ExportDataSection';

const ACCENT = '#e85d75';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #e85d75, #c13057)';
const CARD_BG = '#1a1d27';
const BORDER = '#2a2d3a';
const SEPARATOR = '#22253a';
const LABEL_COLOR = '#777';
const VALUE_COLOR = '#e0e0e0';

function OrganizerProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [user, setUser] = useState<IUserData | null>(authUser);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'profil'>('info');

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  const handleSaveSuccess = () => {
    refreshUser();
    setIsEditing(false);
  };

  const mainContainerStyle: CSSProperties = {
    minHeight: '100vh',
    color: '#fff',
    padding: '20px',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
  };

  const wrapperStyle: CSSProperties = {
    width: '100%',
    maxWidth: 700,
    margin: '0 auto',
    fontFamily: "'Inter', sans-serif",
  };

  const headerCardStyle: CSSProperties = {
    background: CARD_BG,
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    border: `1px solid ${BORDER}`,
    flexWrap: 'wrap',
    gap: 16,
  };

  const avatarStyle: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: ACCENT_GRADIENT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 22,
    color: 'white',
    flexShrink: 0,
    backgroundImage: user?.avatarUrl ? `url(${user.avatarUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const badgeStyle: CSSProperties = {
    background: 'rgba(232,93,117,0.15)',
    color: ACCENT,
    border: '1px solid rgba(232,93,117,0.4)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
  };

  const statBoxStyle: CSSProperties = {
    background: 'rgba(232,93,117,0.1)',
    border: '1px solid rgba(232,93,117,0.25)',
    borderRadius: 12,
    padding: '12px 20px',
    textAlign: 'center',
    minWidth: 90,
  };

  const tabsContainerStyle: CSSProperties = {
    background: CARD_BG,
    borderRadius: 50,
    padding: 4,
    display: 'flex',
    marginBottom: 16,
    border: `1px solid ${BORDER}`,
  };

  const tabButtonStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '10px 16px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.2s',
    background: active ? ACCENT_GRADIENT : 'transparent',
    color: active ? '#fff' : '#777',
  });

  const contentCardStyle: CSSProperties = {
    background: CARD_BG,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${BORDER}`,
    marginBottom: 16,
  };

  const sectionBarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  };

  const sectionTitleStyle: CSSProperties = {
    color: ACCENT,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.1em',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    gap: 12,
  };

  const labelValueGroupStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 0,
  };

  const labelStyle: CSSProperties = {
    color: LABEL_COLOR,
    fontSize: 13,
    fontWeight: 500,
    minWidth: 140,
    flexShrink: 0,
  };

  const valueStyle: CSSProperties = {
    color: VALUE_COLOR,
    fontSize: 14,
    fontWeight: 500,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const modifierButtonStyle: CSSProperties = {
    background: 'transparent',
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '12px 20px',
    color: '#666',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const infoFields = [
    { key: 'firstName', label: 'Prénom', value: user?.firstName || 'Non défini' },
    { key: 'lastName', label: 'Nom', value: user?.lastName || 'Non défini' },
    { key: 'email', label: 'Email', value: user?.email || 'Non défini', isEmail: true },
    { key: 'companyName', label: "Nom de l'entreprise", value: user?.organizerProfile?.companyName || 'Non défini' },
    { key: 'city', label: 'Ville', value: user?.organizerProfile?.location?.city || 'Non défini' },
    { key: 'phone', label: 'Téléphone', value: user?.organizerProfile?.phone || 'Non défini' },
  ];

  const profilFields = [
    { label: "Nom de l'entreprise", value: user?.organizerProfile?.companyName || 'Non défini' },
    { label: 'Description', value: user?.organizerProfile?.description || 'Non spécifié' },
    { label: 'Site web', value: user?.organizerProfile?.website || 'Non spécifié' },
    { label: 'Types de lieux', value: user?.organizerProfile?.venueTypes?.join(', ') || 'Non spécifié' },
    {
      label: 'Budget moyen',
      value:
        user?.organizerProfile?.averageBudget?.min !== undefined && user?.organizerProfile?.averageBudget?.max !== undefined
          ? `${user.organizerProfile.averageBudget.min} - ${user.organizerProfile.averageBudget.max}€`
          : 'Non spécifié',
    },
    {
      label: 'Fréquence des évènements',
      value:
        user?.organizerProfile?.eventFrequency === 'weekly'
          ? 'Hebdomadaire'
          : user?.organizerProfile?.eventFrequency === 'monthly'
            ? 'Mensuel'
            : user?.organizerProfile?.eventFrequency === 'occasional'
              ? 'Occasionnel'
              : 'Non spécifié',
    },
  ];

  return (
    <div style={mainContainerStyle}>
      <Navbar />
      <div style={wrapperStyle}>
        {/* Header Card */}
        <div style={headerCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <div style={avatarStyle}>
              {!user?.avatarUrl && (user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'DA')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 6 }}>
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>ORGANISATEUR</span>
                <span style={{ color: '#888', fontSize: 14 }}>
                  {user?.organizerProfile?.companyName || '—'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={statBoxStyle}>
              <div style={{ color: ACCENT, fontSize: 26, fontWeight: 700 }}>
                {user?.stats?.totalEvents ?? 0}
              </div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Évènements créés</div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={modifierButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = ACCENT;
                e.currentTarget.style.color = ACCENT;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.color = '#666';
              }}
            >
              Modifier
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabsContainerStyle}>
          {[
            { id: 'info' as const, label: 'Informations personnelles' },
            { id: 'profil' as const, label: 'Profil Organisateur' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={tabButtonStyle(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isEditing && user ? (
          <EditOrganizerProfileForm
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            currentUser={user}
            onSaveSuccess={handleSaveSuccess}
          />
        ) : (
          <>
            {/* Tab: Informations personnelles */}
            {activeTab === 'info' && (
              <div style={contentCardStyle}>
                <div style={sectionBarStyle}>
                  <div style={{ width: 28, height: 2, background: ACCENT, borderRadius: 2 }} />
                  <span style={sectionTitleStyle}>INFORMATIONS PERSONNELLES</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {infoFields.map((field, i) => (
                    <div key={field.key}>
                      <div style={rowStyle}>
                        <div style={labelValueGroupStyle}>
                          <span style={labelStyle}>{field.label}</span>
                          <span
                            style={{
                              ...valueStyle,
                              color: field.isEmail ? ACCENT : VALUE_COLOR,
                            }}
                          >
                            {field.value}
                          </span>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            style={modifierButtonStyle}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = ACCENT;
                              e.currentTarget.style.color = ACCENT;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = BORDER;
                              e.currentTarget.style.color = '#666';
                            }}
                          >
                            Modifier
                          </button>
                        </div>
                      </div>
                      {i < infoFields.length - 1 && (
                        <div style={{ height: 1, background: SEPARATOR }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Profil Organisateur */}
            {activeTab === 'profil' && (
              <div style={contentCardStyle}>
                <div style={sectionBarStyle}>
                  <div style={{ width: 28, height: 2, background: ACCENT, borderRadius: 2 }} />
                  <span style={sectionTitleStyle}>PROFIL ORGANISATEUR</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {profilFields.map((field, i) => (
                    <div key={field.label}>
                      <div style={rowStyle}>
                        <div style={labelValueGroupStyle}>
                          <span style={labelStyle}>{field.label}</span>
                          <span style={valueStyle}>{field.value}</span>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            style={modifierButtonStyle}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = ACCENT;
                              e.currentTarget.style.color = ACCENT;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = BORDER;
                              e.currentTarget.style.color = '#666';
                            }}
                          >
                            Modifier
                          </button>
                        </div>
                      </div>
                      {i < profilFields.length - 1 && (
                        <div style={{ height: 1, background: SEPARATOR }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paramètres et confidentialité */}
            <div
              style={{
                marginTop: 32,
                paddingTop: 32,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <div style={sectionBarStyle}>
                <div style={{ width: 28, height: 2, background: ACCENT, borderRadius: 2 }} />
                <span style={sectionTitleStyle}>PARAMÈTRES ET CONFIDENTIALITÉ</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <EmailPreferences />
                <ExportDataSection />
                <DeleteAccountSection />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrganizerProfilePage;
