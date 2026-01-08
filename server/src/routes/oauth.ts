import { Router } from 'express';
import {
  authorize,
  callback,
  refresh,
  logout,
  userinfo,
  status,
} from '../controllers/oauth';

const router = Router();

// OAuth 2.1 endpoints
router.get('/authorize', authorize);
router.get('/callback', callback);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/userinfo', userinfo);
router.get('/status', status);

export default router;
