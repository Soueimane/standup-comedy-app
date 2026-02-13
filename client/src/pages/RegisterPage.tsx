import { useState, useEffect, type CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { Link } from 'react-router-dom';
import { getErrorMessage, ErrorMessages } from '../services/systemMessages';

function RegisterPage() {
  const { registerMutation } = useAuth();
  const { showError } = useAlert();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'COMEDIAN' as const,
    profile: {
      bio: '',
      experience: '',
    },
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    isValid: false
  });

  // Initialiser la validation au chargement
  useEffect(() => {
    validatePassword(formData.password);
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Validation de l'email
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else {
      // Validation stricte de l'email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Format d\'email invalide (ex: nom@domaine.com)';
      } else {
        // Vérification supplémentaire pour les emails évidents invalides
        const invalidPatterns = [
          /^[^@]*$/, // Pas de @
          /@$/, // @ à la fin
          /^@/, // @ au début
          /\.$/, // Point à la fin
          /^\./, // Point au début
          /\.{2,}/, // Points multiples
          /@{2,}/, // @ multiples
          /[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@-]/, // Caractères non autorisés
        ];
        
        if (invalidPatterns.some(pattern => pattern.test(formData.email.trim()))) {
          newErrors.email = 'Format d\'email invalide (ex: nom@domaine.com)';
        }
      }
    }
    
    // Validation du téléphone français et belge (mobiles + fixes) - optionnel
    if (formData.phone.trim()) {
      // Nettoyer le numéro (supprimer espaces, tirets, parenthèses, +)
      const cleanPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
      
      // Validation pour numéros français
      // Mobiles: 06, 07
      // Fixes: 01, 02, 03, 04, 05, 08, 09 (selon région)
      const frenchPhoneRegex = /^(0[1-9])[0-9]{8}$/;
      
      // Validation pour numéros belges
      // Mobiles: 04
      // Fixes: 02, 03, 04, 09, 010, 011, 012, 013, 014, 015, 016, 019, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 067, 068, 069, 071, 080, 081, 082, 083, 084, 085, 086, 087, 089
      const belgianPhoneRegex = /^(0[1-9][0-9]{7,8})$/;
      
      if (!frenchPhoneRegex.test(cleanPhone) && !belgianPhoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Numéro de téléphone invalide (format français: 0XXXXXXXXX, format belge: 0XXXXXXXX ou 0XXXXXXXXX)';
      }
    }
    
    // Validation du mot de passe
    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (!passwordValidation.isValid) {
      newErrors.password = 'Le mot de passe ne respecte pas les critères de sécurité';
    }
    
    // Validation de la confirmation du mot de passe
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    // Validation du prénom
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets';
    }
    
    // Validation du nom
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Le nom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets';
    }
    
    // Validation de la biographie
    if (!formData.profile.bio.trim()) {
      newErrors.bio = 'La biographie est requise';
    } else if (formData.profile.bio.trim().length < 10) {
      newErrors.bio = 'La biographie doit contenir au moins 10 caractères';
    } else if (formData.profile.bio.trim().length > 500) {
      newErrors.bio = 'La biographie ne peut pas dépasser 500 caractères';
    }
    
    // Validation de l'expérience
    if (!formData.profile.experience) {
      newErrors.experience = 'L\'expérience est requise';
    } else {
      const experience = parseInt(formData.profile.experience);
      if (isNaN(experience) || experience < 0) {
        newErrors.experience = 'L\'expérience doit être un nombre positif';
      } else if (experience > 50) {
        newErrors.experience = 'L\'expérience ne peut pas dépasser 50 ans';
      }
    }

    // Validation du consentement CGU/RGPD
    if (!acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les CGU et la politique de confidentialité';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Préparer les données pour l'API (sans confirmPassword uniquement)
      const { confirmPassword, ...registerData } = formData;
      
      // Convertir experience en nombre pour correspondre au schéma backend
      const dataToSend = {
        ...registerData,
        profile: {
          ...registerData.profile,
          experience: parseInt(registerData.profile.experience) || 0
        },
        // Envoyer le consentement RGPD
        consent: {
          termsAccepted: acceptTerms,
          privacyAccepted: acceptTerms,
          isAdult: true, // Confirmé par l'acceptation des CGU (âge minimum 18 ans)
        }
      };

      // Envoyer les données avec profile et consentement au backend
      await registerMutation.mutateAsync(dataToSend);
      // La redirection est gérée dans AuthContext
    } catch (error: any) {
      showError(getErrorMessage(error, ErrorMessages.SIGNUP_FAILED));
    }
  };

  const validatePassword = (password: string) => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const number = /[0-9]/.test(password);
    const isValid = length && uppercase && number;
    
    setPasswordValidation({
      length,
      uppercase,
      number,
      isValid
    });
  };

  const handleChangeRegister = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Validation en temps réel du mot de passe
    if (name === 'password') {
      validatePassword(value);
    }
    
    if (name === 'bio' || name === 'experience') {
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
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
    maxWidth: '500px',
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
    background: 'linear-gradient(to right, #28a745, #218838)',
    color: 'white',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    opacity: registerMutation.isPending ? 0.7 : 1,
  };

  const linkStyle: CSSProperties = {
    color: '#28a745',
    textDecoration: 'none',
    fontWeight: 'bold',
    marginTop: '10px',
  };

  const errorStyle: CSSProperties = {
    color: '#ef4444',
    fontSize: '0.85em',
    marginTop: '4px',
    marginBottom: '8px',
    textAlign: 'left',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h2>Inscris-toi !</h2>
        <p>Crée ton compte pour rejoindre la communauté</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Email */}
          <div>
          <input
            type="email"
            name="email"
              placeholder="Email *"
            value={formData.email}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.email ? '#ef4444' : '#444'
              }}
            />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}
          </div>

          {/* Téléphone */}
          <div>
          <input
            type="tel"
            name="phone"
              placeholder="Numéro de téléphone (optionnel)"
            value={formData.phone}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.phone ? '#ef4444' : '#444'
              }}
            />
            {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
          </div>

          {/* Mot de passe */}
          <div>
          <input
            type="password"
            name="password"
              placeholder="Mot de passe *"
            value={formData.password}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.password ? '#ef4444' : '#444'
              }}
            />
            {errors.password && <div style={errorStyle}>{errors.password}</div>}
          </div>
          
          {/* Critères de validation du mot de passe */}
          <div style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            borderRadius: '5px',
            fontSize: '0.85em'
          }}>
            <div style={{ marginBottom: '8px', color: '#ff4b2b', fontWeight: 'bold' }}>
              Critères de sécurité :
            </div>
            <div style={{ 
              color: passwordValidation.length ? '#28a745' : '#dc3545',
              marginBottom: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {passwordValidation.length ? '✓' : '✗'} Au moins 8 caractères
            </div>
            <div style={{ 
              color: passwordValidation.uppercase ? '#28a745' : '#dc3545',
              marginBottom: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {passwordValidation.uppercase ? '✓' : '✗'} Au moins 1 majuscule
            </div>
            <div style={{ 
              color: passwordValidation.number ? '#28a745' : '#dc3545',
              marginBottom: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {passwordValidation.number ? '✓' : '✗'} Au moins 1 chiffre
            </div>
          </div>

          {/* Confirmation du mot de passe */}
          <div>
          <input
            type="password"
            name="confirmPassword"
              placeholder="Confirme ton mot de passe *"
            value={formData.confirmPassword}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.confirmPassword ? '#ef4444' : '#444'
              }}
          />
            {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
          </div>

          {/* Prénom */}
          <div>
          <input
            type="text"
            name="firstName"
              placeholder="Prénom *"
            value={formData.firstName}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.firstName ? '#ef4444' : '#444'
              }}
            />
            {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
          </div>

          {/* Nom */}
          <div>
          <input
            type="text"
            name="lastName"
              placeholder="Nom *"
            value={formData.lastName}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.lastName ? '#ef4444' : '#444'
              }}
            />
            {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}
          </div>

          {/* Biographie */}
          <div>
          <textarea
            name="bio"
              placeholder="Biographie * (10-500 caractères)"
            value={formData.profile.bio}
            onChange={handleChangeRegister}
              style={{ 
                ...inputStyle, 
                minHeight: '80px',
                borderColor: errors.bio ? '#ef4444' : '#444'
              }}
            />
            {errors.bio && <div style={errorStyle}>{errors.bio}</div>}
          </div>

          {/* Expérience */}
          <div>
          <input
            type="number"
            name="experience"
              placeholder="Expérience (années) *"
            value={formData.profile.experience}
            onChange={handleChangeRegister}
              style={{
                ...inputStyle,
                borderColor: errors.experience ? '#ef4444' : '#444'
              }}
              min="0"
              max="50"
            />
            {errors.experience && <div style={errorStyle}>{errors.experience}</div>}
          </div>

          {/* Consentement CGU/RGPD */}
          <div style={{ marginTop: '15px', marginBottom: '10px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.9em',
              textAlign: 'left',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{
                  marginTop: '4px',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                J'accepte les <Link to="/cgu" style={linkStyle}>CGU</Link> et la{' '}
                <Link to="/politique-confidentialite" style={linkStyle}>politique de confidentialité</Link> *
              </span>
            </label>
            {errors.acceptTerms && <div style={errorStyle}>{errors.acceptTerms}</div>}
          </div>

          <button type="submit" style={buttonStyle} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Création du compte..." : "S'inscrire"}
          </button>
        </form>

        <p>Déjà un compte ? <Link to="/login" style={linkStyle}>Connecte-toi</Link></p>
      </div>
    </div>
  );
}

export default RegisterPage; 