import React, { useEffect, useState, type CSSProperties } from 'react';
import api from '../services/api';

const EmailPreferences: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/email/subscription-status');
      setIsSubscribed(response.data.subscribed);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération du statut:', err);
      setError('Impossible de charger les préférences email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResubscribe = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccessMessage(null);

      await api.post('/email/resubscribe');
      setIsSubscribed(true);
      setSuccessMessage('Vous êtes maintenant réabonné aux emails !');
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const cardStyle: CSSProperties = {
    background: 'rgba(30, 30, 50, 0.8)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.3em',
    color: '#ff416c',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const statusBoxStyle: CSSProperties = {
    padding: '15px',
    borderRadius: '12px',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const buttonStyle: CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold',
    cursor: isUpdating ? 'not-allowed' : 'pointer',
    opacity: isUpdating ? 0.6 : 1,
    transition: 'all 0.3s ease',
  };

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>
          Chargement des préférences email...
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>
        <span>📧</span> Préférences Email
      </h2>

      <div style={rowStyle}>
        <div>
          <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
            Notifications par email
          </p>
          <p style={{ color: '#aaa', fontSize: '0.9em' }}>
            Recevez des emails pour les nouvelles candidatures, évènements et mises à jour.
          </p>
        </div>
      </div>

      {/* Statut actuel */}
      <div
        style={{
          ...statusBoxStyle,
          background: isSubscribed
            ? 'rgba(40, 167, 69, 0.2)'
            : 'rgba(255, 193, 7, 0.2)',
          border: isSubscribed
            ? '1px solid rgba(40, 167, 69, 0.5)'
            : '1px solid rgba(255, 193, 7, 0.5)',
        }}
      >
        <span style={{ fontSize: '1.5em' }}>
          {isSubscribed ? '✅' : '⚠️'}
        </span>
        <div>
          <p
            style={{
              color: isSubscribed ? '#28a745' : '#ffc107',
              fontWeight: 'bold',
              marginBottom: '5px',
            }}
          >
            {isSubscribed ? 'Vous êtes abonné aux emails' : 'Vous êtes désabonné des emails'}
          </p>
          <p style={{ color: '#aaa', fontSize: '0.85em' }}>
            {isSubscribed
              ? 'Vous recevez toutes les notifications par email.'
              : 'Vous ne recevez plus aucune notification par email.'}
          </p>
        </div>
      </div>

      {/* Bouton de réabonnement si désabonné */}
      {!isSubscribed && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={handleResubscribe}
            disabled={isUpdating}
            style={{
              ...buttonStyle,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
            }}
          >
            {isUpdating ? 'Réabonnement en cours...' : '🔔 Me réabonner aux emails'}
          </button>
        </div>
      )}

      {/* Message si abonné */}
      {isSubscribed && (
        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <p style={{ color: '#888', fontSize: '0.85em', textAlign: 'center' }}>
            💡 Pour vous désabonner, utilisez le lien "Se désabonner" présent dans vos emails.
          </p>
        </div>
      )}

      {/* Messages d'erreur ou de succès */}
      {error && (
        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            background: 'rgba(220, 53, 69, 0.2)',
            border: '1px solid rgba(220, 53, 69, 0.5)',
            borderRadius: '8px',
          }}
        >
          <p style={{ color: '#dc3545', fontSize: '0.9em' }}>❌ {error}</p>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            background: 'rgba(40, 167, 69, 0.2)',
            border: '1px solid rgba(40, 167, 69, 0.5)',
            borderRadius: '8px',
          }}
        >
          <p style={{ color: '#28a745', fontSize: '0.9em' }}>✅ {successMessage}</p>
        </div>
      )}
    </div>
  );
};

export default EmailPreferences;
