import * as client from 'openid-client';
import { config } from './env';

let keycloakConfig: client.Configuration | null = null;
let discoveryPromise: Promise<client.Configuration> | null = null;

/**
 * Get the Keycloak issuer URL
 */
export const getKeycloakIssuer = (): string => {
  return `${config.keycloak.url}/realms/${config.keycloak.realm}`;
};

/**
 * Get the OIDC discovery URL
 */
export const getDiscoveryUrl = (): string => {
  return `${getKeycloakIssuer()}/.well-known/openid-configuration`;
};

/**
 * Initialize and cache the Keycloak configuration
 * Uses openid-client discovery to fetch server metadata
 */
export const getKeycloakConfig = async (): Promise<client.Configuration> => {
  if (keycloakConfig) {
    return keycloakConfig;
  }

  if (discoveryPromise) {
    return discoveryPromise;
  }

  discoveryPromise = (async () => {
    try {
      const issuer = getKeycloakIssuer();

      // Utiliser allowInsecureRequests seulement en développement
      const discoveryOptions = config.nodeEnv === 'development'
        ? { execute: [client.allowInsecureRequests] }
        : undefined;

      keycloakConfig = await client.discovery(
        new URL(issuer),
        config.keycloak.clientId,
        config.keycloak.clientSecret,
        undefined,
        discoveryOptions
      );

      console.log('✅ Keycloak configuration loaded successfully');
      return keycloakConfig;
    } catch (error) {
      console.error('❌ Failed to load Keycloak configuration:', error);
      discoveryPromise = null;
      throw error;
    }
  })();

  return discoveryPromise;
};

/**
 * Generate PKCE code verifier and challenge
 */
export const generatePKCE = async (): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> => {
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  return { codeVerifier, codeChallenge };
};

/**
 * Generate random state for CSRF protection
 */
export const generateState = (): string => {
  return client.randomState();
};

/**
 * Build the authorization URL with PKCE
 * Optionally accepts a Keycloak IdP hint to directly select a social provider
 */
export const buildAuthorizationUrl = async (
  redirectUri: string,
  state: string,
  codeChallenge: string,
  scope: string = 'openid profile email',
  idpHint?: string
): Promise<string> => {
  const keycloakCfg = await getKeycloakConfig();

  const parameters: Record<string, string> = {
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Force account selection to allow users to choose a different account
    // even if they have an active session with the provider
    prompt: 'select_account',
  };

  // If a specific Identity Provider is requested (google, facebook, github, etc.)
  // we pass it to Keycloak using kc_idp_hint
  if (idpHint) {
    parameters.kc_idp_hint = idpHint;
  }

  const authUrl = client.buildAuthorizationUrl(keycloakCfg, parameters);
  return authUrl.href;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (
  currentUrl: URL,
  codeVerifier: string,
  expectedState: string
): Promise<client.TokenEndpointResponse> => {
  const keycloakCfg = await getKeycloakConfig();

  const tokens = await client.authorizationCodeGrant(
    keycloakCfg,
    currentUrl,
    {
      pkceCodeVerifier: codeVerifier,
      expectedState,
    }
  );

  return tokens;
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  refreshToken: string
): Promise<client.TokenEndpointResponse> => {
  const keycloakCfg = await getKeycloakConfig();

  const tokens = await client.refreshTokenGrant(keycloakCfg, refreshToken);
  return tokens;
};

/**
 * Validate and decode an access token
 */
export const validateToken = async (
  accessToken: string
): Promise<client.IntrospectionResponse | null> => {
  try {
    const keycloakCfg = await getKeycloakConfig();

    const result = await client.tokenIntrospection(keycloakCfg, accessToken);

    if (!result.active) {
      return null;
    }

    return result;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

/**
 * Get user info from Keycloak
 */
export const getUserInfo = async (
  accessToken: string
): Promise<client.UserInfoResponse | null> => {
  try {
    const keycloakCfg = await getKeycloakConfig();

    const userInfo = await client.fetchUserInfo(
      keycloakCfg,
      accessToken,
      client.skipSubjectCheck
    );

    return userInfo;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
};

/**
 * Build logout URL
 */
export const buildLogoutUrl = async (
  idTokenHint?: string,
  postLogoutRedirectUri?: string
): Promise<string> => {
  const keycloakCfg = await getKeycloakConfig();
  const metadata = keycloakCfg.serverMetadata();

  const logoutUrl = new URL(metadata.end_session_endpoint as string);

  if (idTokenHint) {
    logoutUrl.searchParams.set('id_token_hint', idTokenHint);
  }

  if (postLogoutRedirectUri) {
    logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  }

  return logoutUrl.href;
};

/**
 * Check if Keycloak is enabled and configured
 */
export const isKeycloakEnabled = (): boolean => {
  return config.keycloak.enabled &&
         !!config.keycloak.url &&
         !!config.keycloak.realm &&
         !!config.keycloak.clientId;
};
