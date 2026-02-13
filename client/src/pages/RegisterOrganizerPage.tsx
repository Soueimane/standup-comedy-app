import { useState, useEffect, type CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { Link } from 'react-router-dom';
import { getErrorMessage, ErrorMessages } from '../services/systemMessages';

function RegisterOrganizerPage() {
  const { registerMutation } = useAuth();
  const { showError } = useAlert();

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    isValid: false,
  });

  useEffect(() => {
    validatePassword(formData.password);
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(formData.email.trim())) newErrors.email = "Format d'email invalide";
    }
    if (formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
      const frenchPhoneRegex = /^(0[1-9])[0-9]{8}$/;
      const belgianPhoneRegex = /^(0[1-9][0-9]{7,8})$/;
      if (!frenchPhoneRegex.test(cleanPhone) && !belgianPhoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Numéro invalide (format français ou belge)';
      }
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (!passwordValidation.isValid) {
      newErrors.password = 'Le mot de passe ne respecte pas les critères de sécurité';
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Le nom doit contenir au moins 2 caractères';
    }
    if (!acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les CGU et la politique de confidentialité';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await registerMutation.mutateAsync({
        email: formData.email.trim(),
        phone: formData.phone.trim() || '',
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        city: formData.city.trim() || '',
        role: 'ORGANIZER' as const,
        consent: {
          termsAccepted: acceptTerms,
          privacyAccepted: acceptTerms,
          isAdult: true,
        },
      });
    } catch (error: unknown) {
      showError(getErrorMessage(error, ErrorMessages.SIGNUP_FAILED));
    }
  };

  const validatePassword = (password: string) => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const number = /[0-9]/.test(password);
    setPasswordValidation({
      length,
      uppercase,
      number,
      isValid: length && uppercase && number,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'password') validatePassword(value);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  };
  const containerStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 40,
    borderRadius: 15,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    maxWidth: 500,
    width: '90%',
  };
  const inputStyle: CSSProperties = {
    width: 'calc(100% - 20px)',
    padding: '12px 10px',
    margin: '10px 0',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2c2c4d',
    color: '#fff',
    fontSize: '1em',
    outline: 'none',
  };
  const errorStyle: CSSProperties = {
    color: '#ef4444',
    fontSize: '0.85em',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'left',
  };
  const buttonStyle: CSSProperties = {
    width: '100%',
    padding: 15,
    margin: '20px 0',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    opacity: registerMutation.isPending ? 0.7 : 1,
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h2>Inscription Organisateur</h2>
        <p>Créez votre compte pour gérer vos plateaux et événements</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <input
              type="text"
              name="firstName"
              placeholder="Prénom *"
              value={formData.firstName}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.firstName ? '#ef4444' : '#444' }}
            />
            {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
          </div>
          <div>
            <input
              type="text"
              name="lastName"
              placeholder="Nom *"
              value={formData.lastName}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.lastName ? '#ef4444' : '#444' }}
            />
            {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}
          </div>
          <div>
            <input
              type="email"
              name="email"
              placeholder="E-mail *"
              value={formData.email}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : '#444' }}
            />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}
          </div>
          <div>
            <input
              type="tel"
              name="phone"
              placeholder="Téléphone (optionnel)"
              value={formData.phone}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.phone ? '#ef4444' : '#444' }}
            />
            {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
          </div>
          <div>
            <input
              type="text"
              name="city"
              placeholder="Ville (optionnel)"
              value={formData.city}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Mot de passe *"
              value={formData.password}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.password ? '#ef4444' : '#444' }}
            />
            {errors.password && <div style={errorStyle}>{errors.password}</div>}
          </div>
          <div style={{ marginBottom: 15, padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, fontSize: '0.85em' }}>
            <div style={{ marginBottom: 8, color: '#ff4b2b', fontWeight: 'bold' }}>Critères de sécurité :</div>
            <div style={{ color: passwordValidation.length ? '#28a745' : '#dc3545', marginBottom: 3 }}>{passwordValidation.length ? '✓' : '✗'} Au moins 8 caractères</div>
            <div style={{ color: passwordValidation.uppercase ? '#28a745' : '#dc3545', marginBottom: 3 }}>{passwordValidation.uppercase ? '✓' : '✗'} Au moins 1 majuscule</div>
            <div style={{ color: passwordValidation.number ? '#28a745' : '#dc3545' }}>{passwordValidation.number ? '✓' : '✗'} Au moins 1 chiffre</div>
          </div>
          <div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmer le mot de passe *"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.confirmPassword ? '#ef4444' : '#444' }}
            />
            {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
          </div>
          <div style={{ textAlign: 'left', marginBottom: 15 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>
                J'accepte les <Link to="/cgu" target="_blank" rel="noopener noreferrer" style={{ color: '#ff4b2b' }}>CGU</Link> et la <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" style={{ color: '#ff4b2b' }}>politique de confidentialité</Link> *
              </span>
            </label>
            {errors.acceptTerms && <div style={errorStyle}>{errors.acceptTerms}</div>}
          </div>
          <button type="submit" disabled={registerMutation.isPending} style={buttonStyle}>
            {registerMutation.isPending ? 'Inscription en cours…' : 'Créer mon compte organisateur'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.9em' }}>
          Déjà un compte ? <Link to="/organisateur" style={{ color: '#ff4b2b', fontWeight: 'bold' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterOrganizerPage;
