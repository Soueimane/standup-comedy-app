import crypto from 'crypto';
import { config } from '../config/env';

/**
 * Génère un token HMAC SHA-256 pour le désabonnement
 * Le token est dérivable (pas besoin de DB lookup) mais sécurisé
 *
 * @param userId - ID MongoDB de l'utilisateur
 * @param email - Email de l'utilisateur (pour double validation)
 * @returns Token hexadécimal (64 caractères)
 */
export function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = config.email.unsubscribeSecret;

  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET is not configured');
  }

  // Payload: userId:email (le : sert de séparateur)
  const payload = `${userId}:${email.toLowerCase().trim()}`;

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Valide un token HMAC de désabonnement
 * Utilise timingSafeEqual pour éviter les attaques de timing
 *
 * @param token - Token à valider (64 chars hex)
 * @param userId - ID de l'utilisateur
 * @param email - Email de l'utilisateur
 * @returns true si le token est valide
 */
export function validateUnsubscribeToken(
  token: string,
  userId: string,
  email: string
): boolean {
  try {
    // Validation du format
    if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      return false;
    }

    const expectedToken = generateUnsubscribeToken(userId, email);

    // Protection contre les attaques de timing
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch (error) {
    console.error('❌ Error validating token:', error);
    return false;
  }
}

/**
 * Décode et valide un token de désabonnement
 * Note: HMAC ne peut pas être "décodé" - on valide juste
 *
 * @param token - Token HMAC
 * @param userId - userId fourni dans l'URL
 * @param email - email fourni dans l'URL
 * @returns Object avec userId et email si valide, null sinon
 */
export function decodeUnsubscribeToken(
  token: string,
  userId: string,
  email: string
): { userId: string; email: string } | null {
  if (!validateUnsubscribeToken(token, userId, email)) {
    return null;
  }

  return { userId, email: email.toLowerCase().trim() };
}
