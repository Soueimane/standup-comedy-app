import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserInfo,
  buildLogoutUrl,
  isKeycloakEnabled,
} from '../config/keycloak';
import { UserModel } from '../models/User';
import { OAuthStateModel } from '../models/OAuthState';

/**
 * GET /api/auth/oauth/authorize
 * Initiates OAuth 2.1 authorization flow with PKCE
 */
export const authorize = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isKeycloakEnabled()) {
      res.status(503).json({ error: 'OAuth authentication is not configured' });
      return;
    }

    // Use full API URL including /api for proper Nginx routing
    const redirectUri = `${config.api.url}/auth/oauth/callback`;

    // Optional: specify a particular social provider configured in Keycloak
    // via the "provider" query parameter (google, facebook, github, etc.).
    // This is mapped to Keycloak's kc_idp_hint parameter.
    const provider = typeof req.query.provider === 'string'
      ? req.query.provider
      : undefined;

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    // Store in MongoDB for later verification (TTL: 10 minutes)
    await OAuthStateModel.create({
      state,
      codeVerifier,
    });

    // Build authorization URL
    const authUrl = await buildAuthorizationUrl(
      redirectUri,
      state,
      codeChallenge,
      'openid profile email',
      provider
    );

    // Return authorization URL for frontend to redirect
    res.json({
      authorizationUrl: authUrl,
      state,
    });
  } catch (error: any) {
    console.error('OAuth authorize error:', error);

    // Check if it's a connection error to Keycloak
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'Keycloak server is not reachable',
        message: 'Please ensure Keycloak is running on ' + config.keycloak.url
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      message: error.message || 'Unknown error'
    });
  }
};

/**
 * GET /api/auth/oauth/callback
 * Handles OAuth callback, exchanges code for tokens
 */
export const callback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      const frontendUrl = `${config.frontend.url}/auth/callback?error=${error}&error_description=${encodeURIComponent(error_description as string || '')}`;
      res.redirect(frontendUrl);
      return;
    }

    if (!code || !state) {
      res.redirect(`${config.frontend.url}/auth/callback?error=invalid_request&error_description=Missing code or state`);
      return;
    }

    // Retrieve and delete pending authorization from MongoDB (atomic operation)
    const pending = await OAuthStateModel.findOneAndDelete({ state: state as string });
    if (!pending) {
      res.redirect(`${config.frontend.url}/auth/callback?error=invalid_state&error_description=State mismatch or expired`);
      return;
    }

    // Build redirect_uri for token exchange — must EXACTLY match the one used in authorize
    const redirectUri = `${config.api.url}/auth/oauth/callback`;
    const currentUrl = new URL(`${redirectUri}?code=${code}&state=${state}`);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      currentUrl,
      pending.codeVerifier,
      state as string
    );

    // Get user info from Keycloak
    const userInfo = await getUserInfo(tokens.access_token);
    if (!userInfo) {
      res.redirect(`${config.frontend.url}/auth/callback?error=userinfo_failed&error_description=Failed to get user info`);
      return;
    }

    // Find or create user in MongoDB
    let user = await UserModel.findOne({ email: userInfo.email });

    if (!user) {
      // Determine the role for the new user
      const role = mapKeycloakRoles(userInfo);

      // Create new user from Keycloak data with default profile based on role
      user = new UserModel({
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || 'User',
        lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
        password: `keycloak_${Date.now()}_${Math.random().toString(36)}`, // Random password, user won't use it
        role,
        emailVerified: userInfo.email_verified || false,
        keycloakId: userInfo.sub,
        // Add default profile based on role (same as standard registration)
        ...(role === 'COMEDIAN' && {
          profile: {
            bio: '',
            yearsExperience: 0,
            genres: [],
            availability: [],
            socialLinks: {},
            profilePhoto: '',
            mediaLinks: [],
            // numberOfScenes: '',
          }
        }),
        ...(role === 'ORGANIZER' && {
          organizerProfile: {
            companyName: '',
            description: '',
            logo: '',
            website: '',
            eventTypes: [],
            regions: [],
          }
        }),
      });
      await user.save();
    } else {
      // Update Keycloak ID if not set
      if (!user.keycloakId) {
        user.keycloakId = userInfo.sub;
        await user.save();
      }
    }

    // Generate our own JWT for internal use
    const internalToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        keycloakId: userInfo.sub,
      },
      config.jwt.secret as string,
      { expiresIn: '24h' }
    );

    // Redirect to frontend with tokens
    const callbackUrl = new URL(`${config.frontend.url}/auth/callback`);
    callbackUrl.searchParams.set('token', internalToken);
    callbackUrl.searchParams.set('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      callbackUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }
    if (tokens.id_token) {
      callbackUrl.searchParams.set('id_token', tokens.id_token);
    }

    res.redirect(callbackUrl.href);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${config.frontend.url}/auth/callback?error=token_exchange_failed&error_description=Failed to exchange code for tokens`);
  }
};

/**
 * POST /api/auth/oauth/refresh
 * Refreshes the access token using refresh token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const tokens = await refreshAccessToken(refresh_token);

    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    console.error('OAuth refresh error:', error);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
};

/**
 * POST /api/auth/oauth/logout
 * Logs out user from Keycloak
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_token } = req.body;
    const postLogoutRedirectUri = `${config.frontend.url}`;

    const logoutUrl = await buildLogoutUrl(id_token, postLogoutRedirectUri);

    res.json({ logoutUrl });
  } catch (error) {
    console.error('OAuth logout error:', error);
    res.status(500).json({ error: 'Failed to build logout URL' });
  }
};

/**
 * GET /api/auth/oauth/userinfo
 * Returns current user info from the token
 */
export const userinfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const accessToken = authHeader.substring(7);
    const userInfo = await getUserInfo(accessToken);

    if (!userInfo) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    res.json(userInfo);
  } catch (error) {
    console.error('OAuth userinfo error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

/**
 * GET /api/auth/oauth/status
 * Returns OAuth configuration status
 */
export const status = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    enabled: isKeycloakEnabled(),
    provider: 'keycloak',
  });
};

/**
 * Map Keycloak roles to application roles
 */
function mapKeycloakRoles(userInfo: any): string {
  // Check realm roles
  const realmRoles = userInfo.realm_access?.roles || [];

  // Check resource roles (client-specific)
  const clientRoles = userInfo.resource_access?.[config.keycloak.clientId]?.roles || [];

  const allRoles = [...realmRoles, ...clientRoles];

  // Priority order for role assignment
  if (allRoles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (allRoles.includes('ORGANIZER')) return 'ORGANIZER';
  if (allRoles.includes('COMEDIAN')) return 'COMEDIAN';

  // Default role
  return 'COMEDIAN';
}
