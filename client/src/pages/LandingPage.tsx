import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#ffffff',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    textAlign: 'center',
    padding: '20px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '3.5em',
    fontWeight: 'bold',
    color: '#ff416c',
    marginBottom: '20px',
    textShadow: '0 0 15px rgba(255, 65, 108, 0.5)',
    animation: 'breathing 5s ease-in-out infinite',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '1.5em',
    color: '#aaa',
    marginBottom: '40px',
    maxWidth: '600px',
  };

  const buttonStyle: CSSProperties = {
    padding: '15px 30px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  };

  const logoStyle: CSSProperties = {
    marginBottom: '30px',
    animation: 'logoFloat 6s ease-in-out infinite',
  };

  return (
    <div style={pageStyle}>
      <style>
        {`
          @keyframes breathing {
            0%, 100% {
              transform: scale(1);
              text-shadow: 0 0 15px rgba(255, 65, 108, 0.5);
            }
            50% {
              transform: scale(1.1);
              text-shadow: 0 0 25px rgba(255, 65, 108, 0.8);
            }
          }
          @keyframes logoFloat {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            33% {
              transform: translateY(-10px) rotate(2deg);
            }
            66% {
              transform: translateY(5px) rotate(-1deg);
            }
          }
        `}
      </style>
      
      {/* Logo */}
      <div style={logoStyle}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Fond avec dégradé et bordure brillante */}
          <circle cx="60" cy="60" r="58" fill="url(#bgGradient)" stroke="url(#borderGradient)" strokeWidth="4"/>
          
          {/* Microphone principal */}
          <g transform="translate(30, 15)">
            {/* Corps du microphone avec dégradé */}
            <ellipse cx="30" cy="38" rx="22" ry="30" fill="url(#micGradient)"/>
            
            {/* Grille du microphone avec effet brillant */}
            <rect x="14" y="22" width="32" height="5" rx="2.5" fill="#2a1458" opacity="0.8"/>
            <rect x="14" y="32" width="32" height="5" rx="2.5" fill="#2a1458" opacity="0.8"/>
            <rect x="14" y="42" width="32" height="5" rx="2.5" fill="#2a1458" opacity="0.8"/>
            <rect x="14" y="52" width="32" height="5" rx="2.5" fill="#2a1458" opacity="0.8"/>
            
            {/* Reflet brillant sur le microphone */}
            <ellipse cx="24" cy="30" rx="8" ry="12" fill="url(#highlight)" opacity="0.4"/>
            
            {/* Support du microphone avec effet 3D */}
            <path d="M 8 68 Q 8 76 16 76 L 44 76 Q 52 76 52 68" stroke="url(#supportGradient)" strokeWidth="5" fill="none"/>
            <line x1="30" y1="76" x2="30" y2="90" stroke="url(#supportGradient)" strokeWidth="5"/>
            <line x1="16" y1="90" x2="44" y2="90" stroke="url(#supportGradient)" strokeWidth="5" strokeLinecap="round"/>
          </g>
          
          {/* Définitions des dégradés */}
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a148c"/>
              <stop offset="50%" stopColor="#2a1458"/>
              <stop offset="100%" stopColor="#1a0b2e"/>
            </linearGradient>
            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4081"/>
              <stop offset="50%" stopColor="#ff6b9d"/>
              <stop offset="100%" stopColor="#ff416c"/>
            </linearGradient>
            <linearGradient id="micGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b9d"/>
              <stop offset="50%" stopColor="#ff4081"/>
              <stop offset="100%" stopColor="#ff416c"/>
            </linearGradient>
            <linearGradient id="supportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4081"/>
              <stop offset="100%" stopColor="#ff416c"/>
            </linearGradient>
            <radialGradient id="highlight" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
            </radialGradient>
          </defs>
        </svg>
      </div>
      
      <h1 style={titleStyle}>Stand-up Comedy Connect</h1>
      <p style={subtitleStyle}>La plateforme qui connecte les humoristes et les organisateurs d'événements.</p>
      <button onClick={handleLoginClick} style={buttonStyle}>
        Se connecter
      </button>
    </div>
  );
}

export default LandingPage; 