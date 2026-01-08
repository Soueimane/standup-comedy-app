import { useState, useEffect, type CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

function LoginOrganisateur() {
  const { loginMutation, loginWithKeycloak, isOAuthEnabled, isOAuthLoading } = useAuth();

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [oauthError, setOAuthError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    isValid: false
  });

  // Initialiser la validation au chargement
  useEffect(() => {
    validatePassword(loginData.password);
  }, []);

  const validatePassword = (password: string) => {
    const length = password.length >= 8;
    const isValid = length;

    setPasswordValidation({
      length,
      isValid
    });
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setLoginError('');

    // Vérifier la validation du mot de passe
    if (!passwordValidation.isValid) {
      setPasswordError('Vous ne respectez pas les 8 caractères minimum !');
      return;
    }

    loginMutation.mutate(loginData, {
      onError: (error) => {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        const errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Une erreur est survenue lors de la connexion';

        setLoginError(errorMessage);

        // Vider seulement le mot de passe, garder l'email
        setLoginData(prev => ({
          ...prev,
          password: ''
        }));
      }
    });
  };

  const handleChangeLogin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validation en temps réel du mot de passe
    if (name === 'password') {
      validatePassword(value);
    }

    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeycloakLogin = async (provider?: string) => {
    setOAuthError('');
    setLoginError('');
    try {
      await loginWithKeycloak(provider);
    } catch (error: any) {
      setOAuthError(error.message || 'Erreur lors de la connexion');
    }
  };

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    backgroundImage: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  };

  const containerStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    maxWidth: '400px',
    width: '90%',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 10px',
    margin: '10px 0',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#2c2c4d',
    color: '#ffffff',
    fontSize: '1em',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const buttonStyle: CSSProperties = {
    width: '100%',
    padding: '15px',
    margin: '20px 0',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const linkStyle: CSSProperties = {
    color: '#ff416c',
    textDecoration: 'none',
    fontWeight: 'bold',
    marginTop: '10px',
  };

  const iconStyle: CSSProperties = {
    fontSize: '3em',
    marginBottom: '20px',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>🎭</div>
        <h2 className="text-2xl font-bold mb-2">Bon retour, organisateur !</h2>
        <p className="text-gray-400 mb-8 text-sm">
          Connecte-toi pour gérer tes évènements et découvrir de nouveaux talents.
        </p>
        <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={loginData.email}
            onChange={handleChangeLogin}
            autoComplete="email"
            style={{
              ...inputStyle,
              borderColor: loginError ? '#dc3545' : '#444'
            }}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={loginData.password}
            onChange={handleChangeLogin}
            autoComplete="current-password"
            style={{
              ...inputStyle,
              borderColor: loginError ? '#dc3545' : '#444'
            }}
            required
          />

          {/* Message d'erreur de connexion */}
          {loginError && (
            <div style={{
              color: '#dc3545',
              marginBottom: '10px',
              fontSize: '0.9em',
              textAlign: 'left',
              padding: '10px',
              backgroundColor: 'rgba(220, 53, 69, 0.15)',
              borderRadius: '5px',
              border: '1px solid rgba(220, 53, 69, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          {/* Message d'erreur du mot de passe */}
          {passwordError && (
            <div style={{
              color: '#dc3545',
              marginBottom: '10px',
              fontSize: '0.9em',
              textAlign: 'left',
              padding: '8px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              borderRadius: '5px',
              border: '1px solid rgba(220, 53, 69, 0.3)'
            }}>
              {passwordError}
            </div>
          )}

          {/* Indicateur de validation du mot de passe */}
          {loginData.password && (
            <div style={{
              marginBottom: '15px',
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '5px',
              fontSize: '0.8em',
              textAlign: 'left'
            }}>
              <div style={{
                color: passwordValidation.length ? '#28a745' : '#dc3545',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {passwordValidation.length ? '✓' : '✗'} Au moins 8 caractères
              </div>
            </div>
          )}
          <button type="submit" style={buttonStyle} disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Connexion en cours...' : <>Se connecter <span style={{ marginLeft: '10px' }}>🚀</span></>}
          </button>
        </form>

        {/* OAuth Error */}
        {oauthError && (
          <div style={{
            color: '#dc3545',
            marginTop: '10px',
            marginBottom: '10px',
            fontSize: '0.9em',
            textAlign: 'left',
            padding: '10px',
            backgroundColor: 'rgba(220, 53, 69, 0.15)',
            borderRadius: '5px',
            border: '1px solid rgba(220, 53, 69, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{oauthError}</span>
          </div>
        )}

        {/* Social Login Buttons (via Keycloak Identity Providers) */}
        {isOAuthEnabled && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '25px 0 20px',
              gap: '15px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #555)' }} />
              <span style={{ color: '#aaa', fontSize: '0.85em', whiteSpace: 'nowrap' }}>ou continuer avec</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #555)' }} />
            </div>

            {/* Boutons principaux - Google & Facebook */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => handleKeycloakLogin('google')}
                disabled={isOAuthLoading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#3c4043',
                  fontSize: '0.95em',
                  fontWeight: '600',
                  cursor: isOAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isOAuthLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
                onMouseEnter={(e) => {
                  if (!isOAuthLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </button>

              <button
                type="button"
                onClick={() => handleKeycloakLogin('facebook')}
                disabled={isOAuthLoading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1877f2 0%, #0c5dc7 100%)',
                  color: '#ffffff',
                  fontSize: '0.95em',
                  fontWeight: '600',
                  cursor: isOAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isOAuthLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (!isOAuthLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 119, 242, 0.3)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continuer avec Facebook
              </button>
            </div>

            {/* Boutons secondaires - GitHub, Microsoft, Apple */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleKeycloakLogin('github')}
                disabled={isOAuthLoading}
                title="GitHub"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  border: '1px solid #3d3d5c',
                  backgroundColor: '#24292e',
                  color: '#ffffff',
                  cursor: isOAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isOAuthLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!isOAuthLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.backgroundColor = '#2f363d';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.backgroundColor = '#24292e';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleKeycloakLogin('microsoft')}
                disabled={isOAuthLoading}
                title="Microsoft"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  border: '1px solid #3d3d5c',
                  backgroundColor: '#2f2f2f',
                  color: '#ffffff',
                  cursor: isOAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isOAuthLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!isOAuthLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.backgroundColor = '#404040';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.backgroundColor = '#2f2f2f';
                }}
              >
                <svg width="22" height="22" viewBox="0 0 23 23">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleKeycloakLogin('apple')}
                disabled={isOAuthLoading}
                title="Apple"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  border: '1px solid #3d3d5c',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  cursor: isOAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isOAuthLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!isOAuthLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.backgroundColor = '#000000';
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </button>
            </div>
          </>
        )}

        <p style={{ marginTop: '15px', marginBottom: '10px' }}>
          <Link
            to="/forgot-password"
            style={{ ...linkStyle, fontSize: '0.9em', display: 'block' }}
          >
            Mot de passe oublié ?
          </Link>
        </p>

        <p>Pas encore de compte ? <Link to="/register" style={linkStyle}>Inscris-toi</Link></p>
      </div>
    </div>
  );
}

export default LoginOrganisateur;
