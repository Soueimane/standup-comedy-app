import * as client from 'openid-client';
import axios from 'axios';
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
    // Force re-authentication to bypass Keycloak session cache
    max_age: '0',
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
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
) {
  const response = await axios.post(
    `${config.keycloak.issuer}/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.keycloak.clientId,
      client_secret: config.keycloak.clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000, // Timeout de 10 secondes
    }
  );

  return response.data;
}

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
 * Revoke Keycloak tokens to terminate the session when login is rejected by the application.
 * Should be called whenever we exchange tokens successfully but then refuse the login
 * (e.g. user not found in MongoDB, Keycloak ID mismatch).
 * Non-blocking: errors are logged but not re-thrown.
 */
export const revokeKeycloakTokens = async (
  accessToken: string,
  refreshToken?: string
): Promise<void> => {
  const revokeUrl = `${config.keycloak.issuer}/protocol/openid-connect/revoke`;

  const revokeOne = async (token: string, hint: string) => {
    await axios.post(
      revokeUrl,
      new URLSearchParams({
        token,
        token_type_hint: hint,
        client_id: config.keycloak.clientId,
        client_secret: config.keycloak.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );
  };

  try {
    // Revoke refresh token first — this also invalidates the associated access token
    if (refreshToken) {
      await revokeOne(refreshToken, 'refresh_token');
    }
    await revokeOne(accessToken, 'access_token');
    console.log('🔒 [OAuth] Keycloak tokens revoked after application login rejection');
  } catch (error) {
    console.error('⚠️ [OAuth] Failed to revoke Keycloak tokens:', error);
    // Non-blocking — the application login rejection still proceeds
  }
};

/**
 * Delete a Keycloak user via the Admin API.
 * Must be called when our application rejects a login that already created a Keycloak user
 * (account_not_found, account_mismatch) to avoid leaving orphaned users in Keycloak.
 * Requires the client's service account to have the "manage-users" role in realm-management.
 * Non-blocking: errors are logged but not re-thrown.
 */
export const deleteKeycloakUser = async (keycloakUserId: string): Promise<void> => {
  try {
    const tokenResponse = await axios.post(
      `${config.keycloak.issuer}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.keycloak.clientId,
        client_secret: config.keycloak.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );

    const adminToken: string = tokenResponse.data.access_token;

    await axios.delete(
      `${config.keycloak.url}/admin/realms/${config.keycloak.realm}/users/${keycloakUserId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeout: 5000,
      }
    );

    console.log(`🗑️ [OAuth] Keycloak user ${keycloakUserId} deleted after login rejection`);
  } catch (error: any) {
    console.error('⚠️ [OAuth] Failed to delete Keycloak user:', error?.response?.data || error?.message);
  }
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
