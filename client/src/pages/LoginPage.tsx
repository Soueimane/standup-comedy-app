import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage() {
  const { loginMutation } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const loginErrorTimeoutRef = useRef<number | null>(null);
  const loginErrorRef = useRef<string>(''); // Ref pour persister l'erreur
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    isValid: false
  });

  // Initialiser la validation au chargement
  useEffect(() => {
    validatePassword(loginData.password);
  }, []);

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (loginErrorTimeoutRef.current) {
        clearTimeout(loginErrorTimeoutRef.current);
      }
    };
  }, []);

  // Debug: surveiller les changements de loginError
  useEffect(() => {
    if (loginError) {
      console.log('✅ Message d\'erreur défini:', loginError);
      loginErrorRef.current = loginError; // Synchroniser le ref
    } else {
      console.log('⚠️ Message d\'erreur effacé');
      // Si l'erreur est effacée mais qu'on a une erreur dans le ref, la restaurer
      if (loginErrorRef.current) {
        console.log('🔄 Restauration de l\'erreur depuis le ref:', loginErrorRef.current);
        setTimeout(() => {
          setLoginError(loginErrorRef.current);
        }, 0);
      }
    }
  }, [loginError]);

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
    // Ne PAS effacer loginError ici - on le fera seulement si la connexion réussit
    
    // Vérifier la validation du mot de passe
    if (!passwordValidation.isValid) {
      setPasswordError('Vous ne respectez pas les 8 caractères minimum !');
      return;
    }
    
    try {
      await loginMutation.mutateAsync(loginData);
      // La redirection est gérée dans AuthContext.onSuccess
      // Si on arrive ici, la connexion a réussi, on peut effacer l'erreur
      setLoginError('');
      loginErrorRef.current = '';
    } catch (error: any) {
      console.error('Erreur de connexion capturée:', error);
      // L'erreur peut être dans error.response.data.message ou error.message
      const errorMessage = error?.response?.data?.message || error?.message || 'Une erreur est survenue lors de la connexion';
      console.log('Message d\'erreur extrait:', errorMessage);
      
      // Afficher un message d'erreur spécifique
      const finalErrorMessage = errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credentials')
        ? 'Email ou mot de passe invalide'
        : errorMessage;
      
      console.log('🔴 Définition du message d\'erreur:', finalErrorMessage);
      
      // Stocker dans le ref ET dans l'état
      loginErrorRef.current = finalErrorMessage;
      setLoginError(finalErrorMessage);
      console.log('✅ Message d\'erreur défini immédiatement:', finalErrorMessage);
    }
  };

  const handleChangeLogin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Ne PAS effacer l'erreur automatiquement - laisser l'utilisateur voir l'erreur
    // L'erreur sera effacée seulement quand l'utilisateur soumet à nouveau le formulaire
    
    // Validation en temps réel du mot de passe
    if (name === 'password') {
      validatePassword(value);
    }
    
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e', // Couleur de fond sombre
    backgroundImage: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', // Dégradé subtil
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  };

  const containerStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fond semi-transparent pour la carte
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    maxWidth: '400px',
    width: '90%',
  };

  const inputStyle: CSSProperties = {
    width: 'calc(100% - 20px)',
    padding: '12px 10px',
    margin: '10px 0',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#2c2c4d',
    color: '#ffffff',
    fontSize: '1em',
    outline: 'none',
  };

  const buttonStyle: CSSProperties = {
    width: '100%',
    padding: '15px',
    margin: '20px 0',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)', // Dégradé rose-rouge
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
        <div style={iconStyle}>🎤</div>
        <h2>Bon retour ! 👋</h2>
        <p>Connecte-toi pour accéder à ton tableau de bord</p>

        <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={loginData.email}
            onChange={handleChangeLogin}
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

export default LoginPage; 