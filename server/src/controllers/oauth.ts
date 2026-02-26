import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserInfo,
  buildLogoutUrl,
  revokeKeycloakTokens,
  deleteKeycloakUser,
  isKeycloakEnabled,
} from '../config/keycloak';
import { UserModel } from '../models/User';
import { OAuthStateModel } from '../models/OAuthState';
import { TempAuthCodeModel } from '../models/TempAuthCode';

// ══════════════════════════════════════════════════════════
// AMÉLIORATION 5: Liste blanche des redirect URIs autorisées
// ══════════════════════════════════════════════════════════
const ALLOWED_REDIRECT_URI_PATTERNS = [
  /^https:\/\/dev\.connectcomedyclub\.com\/api\/auth\/oauth\/callback$/,
  /^https:\/\/connectcomedyclub\.com\/api\/auth\/oauth\/callback$/,
  /^http:\/\/localhost:\d+\/api\/auth\/oauth\/callback$/,
];

const isValidRedirectUri = (uri: string): boolean => {
  return ALLOWED_REDIRECT_URI_PATTERNS.some(pattern => pattern.test(uri));
};

// ══════════════════════════════════════════════════════════
// AMÉLIORATION 6: Fonctions de masquage pour logs sécurisés
// ══════════════════════════════════════════════════════════

/**
 * Masque partiellement une adresse email pour les logs
 */
const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.substring(0, 2)}***@${domain}`;
};

/**
 * Masque un token pour les logs (affiche seulement les 8 premiers caractères)
 */
const maskToken = (token: string): string => {
  if (!token || token.length < 10) return '***';
  return `${token.substring(0, 8)}...`;
};

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

    // Validation de sécurité du redirect URI
    if (!isValidRedirectUri(redirectUri)) {
      console.error(`🚫 [OAuth] Invalid redirect URI attempted: ${redirectUri}`);
      res.status(400).json({ error: 'Invalid redirect URI configuration' });
      return;
    }

    // Optional: specify a particular social provider configured in Keycloak
    // via the "provider" query parameter (google, facebook, github, etc.).
    // This is mapped to Keycloak's kc_idp_hint parameter.
    const provider = typeof req.query.provider === 'string'
      ? req.query.provider
      : undefined;

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();
    const nonce = crypto.randomBytes(16).toString('hex'); // Protection replay attacks

    // Store in MongoDB for later verification (TTL: 10 minutes)
    await OAuthStateModel.create({
      state,
      codeVerifier,
      nonce,
    });

    // Build authorization URL
    const authUrl = await buildAuthorizationUrl(
      redirectUri,
      state,
      codeChallenge,
      'openid profile email',
      provider
    );

    // Ajouter le nonce à l'URL (pour validation dans l'id_token)
    const authUrlWithNonce = new URL(authUrl);
    authUrlWithNonce.searchParams.set('nonce', nonce);

    // Return authorization URL for frontend to redirect
    res.json({
      authorizationUrl: authUrlWithNonce.href,
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

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code as string,
      redirectUri,
      pending.codeVerifier
    );

    // Get user info from Keycloak
    const userInfo = await getUserInfo(tokens.access_token);
    if (!userInfo) {
      // tokens were exchanged but userinfo failed — revoke to close the Keycloak session
      await revokeKeycloakTokens(tokens.access_token, tokens.refresh_token);
      res.redirect(`${config.frontend.url}/auth/callback?error=userinfo_failed&error_description=Failed to get user info`);
      return;
    }

    // Find or create user in MongoDB
    let user = await UserModel.findOne({ email: userInfo.email });

    if (!user) {
      // OAuth login-only: user must register first via standard registration.
      // Revoke Keycloak tokens so the session is not left open on Keycloak's side.
      console.log(`⚠️ [OAuth] Tentative de connexion sans compte existant: ${maskEmail(userInfo.email)}`);
      await revokeKeycloakTokens(tokens.access_token, tokens.refresh_token);
      await deleteKeycloakUser(userInfo.sub);
      res.redirect(`${config.frontend.url}/auth/callback?error=account_not_found&error_description=${encodeURIComponent('Aucun compte trouvé. Veuillez d\'abord créer un compte.')}`);
      return;
    } else {
      // User exists - associate Keycloak ID if not already set (account linking)
      // This handles the case where a user registered via email and later signs in via OAuth
      if (!user.keycloakId) {
        user.keycloakId = userInfo.sub;
        await user.save();
        console.log(`✅ [OAuth] Compte existant associé à Keycloak: ${maskEmail(user.email)}`);
      } else if (user.keycloakId !== userInfo.sub) {
        // Should not happen: Keycloak federation ensures same sub for all linked providers
        console.error(`🚫 [OAuth] Keycloak ID mismatch for ${maskEmail(user.email)}: stored=${maskToken(user.keycloakId)}, received=${maskToken(userInfo.sub)}`);
        await revokeKeycloakTokens(tokens.access_token, tokens.refresh_token);
        await deleteKeycloakUser(userInfo.sub);
        res.redirect(`${config.frontend.url}/auth/callback?error=account_mismatch&error_description=${encodeURIComponent('Ce compte ne peut pas être utilisé pour se connecter. Veuillez réessayer.')}`);
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

    // Générer un code temporaire au lieu de passer les tokens dans l'URL
    const tempCode = crypto.randomBytes(32).toString('hex');

    await TempAuthCodeModel.create({
      code: tempCode,
      token: internalToken,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
    });

    // Rediriger avec seulement le code temporaire (pas les tokens)
    const callbackUrl = `${config.frontend.url}/auth/callback?code=${tempCode}`;
    res.redirect(callbackUrl);
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
 * POST /api/auth/oauth/exchange
 * Échange un code temporaire contre les tokens
 */
export const exchange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    // Récupérer et supprimer le code (usage unique)
    const tempAuth = await TempAuthCodeModel.findOneAndDelete({ code });

    if (!tempAuth) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    res.json({
      token: tempAuth.token,
      access_token: tempAuth.accessToken,
      refresh_token: tempAuth.refreshToken,
      id_token: tempAuth.idToken,
    });
  } catch (error) {
    console.error('OAuth exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange code' });
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