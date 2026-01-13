import { type CSSProperties, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationDropdown from './NotificationDropdown';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navLinkBaseStyle: CSSProperties = {
    margin: '0 15px',
    textDecoration: 'none',
    color: '#ffffff',
    fontWeight: 'bold',
  };

  const activeLinkStyle: CSSProperties = {
    borderBottom: '2px solid #ff416c',
    paddingBottom: '2px',
  };

  const rightLinkStyle: CSSProperties = {
    margin: '0 10px',
    textDecoration: 'none',
    color: '#ff416c',
    fontWeight: 'bold',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  };

  const userNameStyle: CSSProperties = {
    marginRight: '10px',
    color: '#ffffff',
    fontWeight: 'bold',
  };

  const getRoleStyles = () => {
    switch (user?.role) {
      case 'ORGANIZER':
        return { badgeIcon: '🎯', badgeText: 'Organisateur' };
      case 'COMEDIAN':
        return { badgeIcon: '🎭', badgeText: 'Humoriste' };
      case 'SUPER_ADMIN':
        return { badgeIcon: '👑', badgeText: 'Super Admin' };
      default:
        return { badgeIcon: '👤', badgeText: 'Invité' };
    }
  };

  const roleStyles = getRoleStyles();

  const getNavigationItems = () => {
    const items = [
      { to: '/dashboard', label: 'Accueil', icon: '🏠', show: true },
      {
        to: '/events',
        label: user?.role === 'ORGANIZER' ? 'Mes Évènements' : 'Évènements',
        icon: '📅',
        show: true,
      },
      {
        to: '/calendar',
        label: 'Calendrier',
        icon: '🗓️',
        show: true,
      },
    ];

    if (user?.role !== 'SUPER_ADMIN') {
      items.push({
        to: '/applications',
        label: 'Candidatures',
        icon: '📝',
        show: true,
      });
    }

    if (user?.role === 'SUPER_ADMIN') {
      items.push({
        to: '/directory',
        label: 'Répertoire',
        icon: '👥',
        show: true,
      });
    }

    if (user?.role === 'ORGANIZER') {
      items.push({
        to: '/profile/organizer',
        label: 'Profil',
        icon: '👤',
        show: true,
      });
    }

    if (user?.role === 'COMEDIAN') {
      items.push({
        to: '/profile/comedian',
        label: 'Profil',
        icon: '👤',
        show: true,
      });
    }

    return items.filter(i => i.show);
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* DESKTOP NAV */}
        <div id="desktop-nav" style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#ff4b2b' }}>Connect Comedy Club</h2>

          <div style={{ marginLeft: 30 }}>
            <Link to="/dashboard" style={{ ...navLinkBaseStyle, ...(location.pathname === '/dashboard' ? activeLinkStyle : {}) }}>Accueil</Link>

            <Link to="/events" style={{ ...navLinkBaseStyle, ...(location.pathname === '/events' ? activeLinkStyle : {}) }}>
              {user?.role === 'ORGANIZER' ? 'Mes Évènements' : 'Évènements'}
            </Link>

            <Link to="/calendar" style={{ ...navLinkBaseStyle, ...(location.pathname === '/calendar' ? activeLinkStyle : {}) }}>
              Calendrier
            </Link>

            {user?.role !== 'SUPER_ADMIN' && (
              <Link to="/applications" style={{ ...navLinkBaseStyle, ...(location.pathname === '/applications' ? activeLinkStyle : {}) }}>
                Candidatures
              </Link>
            )}

            {user?.role === 'SUPER_ADMIN' && (
              <Link to="/directory" style={{ ...navLinkBaseStyle, ...(location.pathname === '/directory' ? activeLinkStyle : {}) }}>
                Répertoire
              </Link>
            )}
          </div>
        </div>

        {/* USER DESKTOP */}
        <div id="desktop-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(user?.role === 'ORGANIZER' || user?.role === 'COMEDIAN') && <NotificationDropdown />}
          <span style={userNameStyle}>{user?.firstName} {user?.lastName}</span>
          <button onClick={logout} style={rightLinkStyle}>Déconnexion</button>
        </div>

<<<<<<< HEAD
        {/* MOBILE HEADER */}
        <div id="mobile-nav" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>☰</button>
          <h2 style={{ marginLeft: 15, color: '#ff4b2b' }}>Connect Comedy Club</h2>
=======
        {/* Info utilisateur Desktop - Masqué sur mobile */}
        <div id="desktop-user" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {/* Ligne du rôle et nom */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: roleStyles.badgeBg,
              color: roleStyles.badgeColor,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <span style={{ fontSize: '1rem' }}>{roleStyles.badgeIcon}</span>
              <span>{roleStyles.badgeText}</span>
              <span style={{ color: '#aaa', margin: '0 4px' }}>|</span>
              <span style={{ color: '#ffffff' }}>{`${user.firstName} ${user.lastName}`}</span>
            </div>
          )}
          {/* Ligne avec cloche et déconnexion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Badge de notifications pour les organisateurs et humoristes */}
            {(user?.role === 'ORGANIZER' || user?.role === 'COMEDIAN') && <NotificationDropdown />}
            {!user && <span style={userNameStyle}>Invité</span>}
            <button onClick={logout} style={rightLinkStyle}>Déconnexion</button>
          </div>
>>>>>>> 94b59062d6def06291c2a9d86b34b440163f538c
        </div>
      </nav>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ width: 280, height: '100%', background: '#fff' }}>
            {navigationItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  padding: 16,
                  gap: 12,
                  textDecoration: 'none',
                  color: location.pathname === item.to ? '#ff416c' : '#333',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <button
              onClick={logout}
              style={{ margin: 20, width: '90%', padding: 16 }}
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          #mobile-nav { display: none !important; }
        }
        @media (max-width: 767px) {
          #desktop-nav, #desktop-user { display: none !important; }
        }
      `}</style>
    </>
  );
}

export default Navbar;
