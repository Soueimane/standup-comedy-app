import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // AUTH_012: Missing credentials - No authorization header
    if (!authHeader) {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    const parts = authHeader.split(' ');

    // AUTH_012: Missing credentials - Invalid Bearer format
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    const token = parts[1];

    // AUTH_012: Missing credentials - Empty token
    if (!token) {
      return res.status(401).json({
        message: 'Credentials missing or invalid'
      });
    }

    if (!config.jwt.secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        email: string;
        role: string;
      };

      req.user = decoded;
      next();
    } catch (jwtError) {
      // AUTH_011: Token expired
      if (jwtError instanceof TokenExpiredError) {
        return res.status(401).json({
          message: 'Token has expired'
        });
      }

      // AUTH_009: Invalid token
      return res.status(401).json({
        message: 'Invalid or malformed token'
      });
    }
  } catch (error) {
    // AUTH_009: Invalid token (fallback for unexpected errors)
    return res.status(401).json({
      message: 'Invalid or malformed token'
    });
  }
};

/**
 * Middleware to check user permissions/authorization (AUTH_010)
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: 'Unauthorized'
        });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        message: 'Unauthorized'
      });
    }
  };
}; 