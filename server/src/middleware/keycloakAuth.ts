import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config/env';
import { validateToken, getUserInfo, isKeycloakEnabled } from '../config/keycloak';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    keycloakId?: string;
  };
}

/**
 * Dual authentication middleware
 * Supports both legacy JWT tokens and Keycloak access tokens
 */
export const dualAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    // Try to decode as our internal JWT first
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
        role: string;
        keycloakId?: string;
      };

      req.user = decoded;
      return next();
    } catch (jwtError) {
      // If JWT verification fails, try Keycloak token validation
      if (jwtError instanceof TokenExpiredError) {
        return res.status(401).json({
          message: 'Token has expired'
        });
      }

      // Token is not a valid internal JWT, try Keycloak
      if (isKeycloakEnabled()) {
        try {
          const introspectionResult = await validateToken(token);

          if (!introspectionResult) {
            return res.status(401).json({
              message: 'Invalid or expired token'
            });
          }

          // Get user info from Keycloak
          const userInfo = await getUserInfo(token);

          if (!userInfo || !userInfo.email) {
            return res.status(401).json({
              message: 'Failed to retrieve user information'
            });
          }

          // Find user in our database
          const user = await UserModel.findOne({ email: userInfo.email });

          if (!user) {
            return res.status(401).json({
              message: 'User not found in application'
            });
          }

          req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            keycloakId: userInfo.sub,
          };

          return next();
        } catch (keycloakError) {
          console.error('Keycloak token validation error:', keycloakError);
          return res.status(401).json({
            message: 'Invalid or malformed token'
          });
        }
      }

      // Keycloak not enabled and JWT failed
      return res.status(401).json({
        message: 'Invalid or malformed token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      message: 'Invalid or malformed token'
    });
  }
};

/**
 * Keycloak-only authentication middleware
 * Use this for routes that should only accept Keycloak tokens
 */
export const keycloakAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isKeycloakEnabled()) {
      return res.status(503).json({
        message: 'OAuth authentication is not configured'
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    const token = authHeader.substring(7);

    const introspectionResult = await validateToken(token);

    if (!introspectionResult) {
      return res.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    const userInfo = await getUserInfo(token);

    if (!userInfo || !userInfo.email) {
      return res.status(401).json({
        message: 'Failed to retrieve user information'
      });
    }

    const user = await UserModel.findOne({ email: userInfo.email });

    if (!user) {
      return res.status(401).json({
        message: 'User not found in application'
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      keycloakId: userInfo.sub,
    };

    next();
  } catch (error) {
    console.error('Keycloak auth middleware error:', error);
    return res.status(401).json({
      message: 'Invalid or malformed token'
    });
  }
};
