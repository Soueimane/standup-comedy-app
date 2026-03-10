import { useEffect } from 'react';

/**
 * OAuth Callback Page
 * This page is loaded in the popup after Keycloak authentication
 * It extracts tokens from URL and sends them to the parent window
 */
const OAuthCallback = () => {
  useEffect(() => {
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);

      // Check for errors
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth-callback',
              error,
              error_description: errorDescription,
            },
            window.location.origin
          );
        }
        return;
      }

      // Get tokens from URL
      const token = urlParams.get('token');
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const idToken = urlParams.get('id_token');

      if (token && window.opener) {
        // Send tokens to parent window
        window.opener.postMessage(
          {
            type: 'oauth-callback',
            token,
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: idToken,
          },
          window.location.origin
        );
      } else if (!window.opener) {
        // If opened directly (not in popup), redirect to login
        window.location.href = '/login';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Authentification en cours...</p>
        <p className="text-sm text-gray-400 mt-2">Cette fenetre va se fermer automatiquement</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
