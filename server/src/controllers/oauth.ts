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

    // Build redirect_uri for token exchange - must EXACTLY match the one used in authorize
    const redirectUri = `${config.api.url}/auth/oauth/callback`;

    // Reconstruct the callback URL with the correct redirect_uri
    // and add the query parameters from the current request
    const queryString = req.originalUrl.split('?')[1] || '';
    const currentUrl = new URL(`${redirectUri}?${queryString}`);

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
      // OAuth login-only: user must register first via standard registration
      console.log(`⚠️ [OAuth] Tentative de connexion sans compte existant: ${userInfo.email}`);
      res.redirect(`${config.frontend.url}/auth/callback?error=account_not_found&error_description=${encodeURIComponent('Aucun compte trouvé. Veuillez d\'abord créer un compte.')}`);
      return;
    } else {
      // User exists - associate Keycloak ID if not already set (account linking)
      // This handles the case where a user registered via email and later signs in via OAuth
      if (!user.keycloakId) {
        user.keycloakId = userInfo.sub;
        await user.save();
        console.log(`✅ [OAuth] Compte existant associé à Keycloak: ${user.email}`);
      } else if (user.keycloakId !== userInfo.sub) {
        // Different Keycloak ID - security risk, block login
        console.error(`🚫 [OAuth] Keycloak ID mismatch for ${user.email}: stored=${user.keycloakId}, received=${userInfo.sub}`);
        res.redirect(`${config.frontend.url}/auth/callback?error=account_mismatch&error_description=${encodeURIComponent('Ce compte est déjà lié à un autre identifiant. Contactez le support.')}`);
        return;
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
      { expiresIn: '1h' }
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
 * GET /api/auth/oauth/status
 * Returns OAuth configuration status
 */
export const status = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    enabled: isKeycloakEnabled(),
    provider: 'keycloak',
  });
};