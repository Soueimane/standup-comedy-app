import { Router } from 'express';
import {
  authorize,
  callback,
  refresh,
  logout,
  status,
} from '../controllers/oauth';
import { oauthRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// OAuth 2.1 endpoints with rate limiting
router.get('/authorize', oauthRateLimiter, authorize);
router.get('/callback', oauthRateLimiter, callback);
router.post('/refresh', oauthRateLimiter, refresh);
router.post('/logout', logout);
router.get('/status', status);

export default router;
