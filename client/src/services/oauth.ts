import api from './api';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

interface OAuthTokens {
  token: string;
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

interface OAuthStatus {
  enabled: boolean;
  provider: string;
}

/**
 * Check if OAuth/Keycloak is enabled on the server
 */
export const checkOAuthStatus = async (): Promise<OAuthStatus> => {
  try {
    const response = await api.get('/auth/oauth/status');
    return response.data;
  } catch (error) {
    return { enabled: false, provider: '' };
  }
};

/**
 * Open OAuth popup and return tokens
 * Optionally accepts a provider name that will be forwarded to the backend
 * and then to Keycloak as kc_idp_hint (google, facebook, github, etc.)
 */
export const loginWithKeycloak = (provider?: string): Promise<OAuthTokens> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get authorization URL from backend
      const response = await api.get('/auth/oauth/authorize', {
        params: provider ? { provider } : undefined,
      });
      const { authorizationUrl, state } = response.data;

      // Calculate popup position (centered)
      const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
      const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;

      // Open popup
      const popup = window.open(
        authorizationUrl,
        'keycloak-login',
        `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      // Listen for messages from popup
      const messageHandler = (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'oauth-callback') {
          window.removeEventListener('message', messageHandler);
          clearInterval(checkPopupClosed);

          if (event.data.error) {
            reject(new Error(event.data.error_description || event.data.error));
          } else if (event.data.token) {
            resolve({
              token: event.data.token,
              access_token: event.data.access_token,
              refresh_token: event.data.refresh_token,
              id_token: event.data.id_token,
            });
          } else {
            reject(new Error('No token received'));
          }

          popup.close();
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Login cancelled'));
        }
      }, 500);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Refresh the access token using refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> => {
  const response = await api.post('/auth/oauth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
};

/**
 * Get logout URL from server
 */
export const getLogoutUrl = async (idToken?: string): Promise<string> => {
  const response = await api.post('/auth/oauth/logout', {
    id_token: idToken,
  });
  return response.data.logoutUrl;
};

/**
 * Logout from Keycloak (opens logout URL in new tab or redirects)
 */
export const logoutFromKeycloak = async (idToken?: string, redirect = false): Promise<void> => {
  try {
    const logoutUrl = await getLogoutUrl(idToken);

    if (redirect) {
      window.location.href = logoutUrl;
    } else {
      // Open in new tab and close immediately (silent logout)
      const logoutWindow = window.open(logoutUrl, '_blank');
      setTimeout(() => {
        logoutWindow?.close();
      }, 1000);
    }
  } catch (error) {
    console.error('Keycloak logout error:', error);
  }
};

/**
 * Store OAuth tokens in localStorage
 */
export const storeOAuthTokens = (tokens: OAuthTokens): void => {
  localStorage.setItem('token', tokens.token);

  if (tokens.access_token) {
    localStorage.setItem('keycloak_access_token', tokens.access_token);
  }

  if (tokens.refresh_token) {
    localStorage.setItem('keycloak_refresh_token', tokens.refresh_token);
  }

  if (tokens.id_token) {
    localStorage.setItem('keycloak_id_token', tokens.id_token);
  }
};

/**
 * Clear OAuth tokens from localStorage
 */
export const clearOAuthTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('keycloak_access_token');
  localStorage.removeItem('keycloak_refresh_token');
  localStorage.removeItem('keycloak_id_token');
  localStorage.removeItem('user');
};

/**
 * Get stored OAuth tokens
 */
export const getStoredOAuthTokens = (): Partial<OAuthTokens> => {
  return {
    token: localStorage.getItem('token') || undefined,
    access_token: localStorage.getItem('keycloak_access_token') || undefined,
    refresh_token: localStorage.getItem('keycloak_refresh_token') || undefined,
    id_token: localStorage.getItem('keycloak_id_token') || undefined,
  };
};

/**
 * Translate OAuth error messages to French
 */
export const translateOAuthError = (error: string): string => {
  const errorMessages: Record<string, string> = {
    // Backend errors
    'account_not_found': 'Aucun compte trouvé avec cet email. Veuillez d\'abord créer un compte.',
    'account_mismatch': 'Ce compte est déjà lié à un autre identifiant. Contactez le support.',
    'invalid_state': 'Session expirée. Veuillez réessayer.',
    'userinfo_failed': 'Impossible de récupérer vos informations. Veuillez réessayer.',
    'token_exchange_failed': 'Erreur d\'authentification. Veuillez réessayer.',
    'too_many_requests': 'Trop de tentatives. Veuillez réessayer dans une minute.',
    // Frontend errors
    'Login cancelled': 'Connexion annulée.',
    'Popup blocked': 'Popup bloquée. Veuillez autoriser les popups pour ce site.',
    'No token received': 'Aucun token reçu. Veuillez réessayer.',
  };

  // Check for exact match
  if (errorMessages[error]) {
    return errorMessages[error];
  }

  // Check for partial match
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }

  // Default message
  return error || 'Une erreur est survenue lors de la connexion.';
};
