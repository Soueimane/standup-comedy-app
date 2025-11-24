import express from 'express';
import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { sendEmail, testEmailConfig, testEmailSend, sendRemindersCron, sendOrganizerRemindersCron } from '../controllers/email';

const router = express.Router();

// ============================================================================
// CONFIGURATION DU TRANSPORTEUR D'EMAILS
// ============================================================================

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: config.email.smtpUser,
    pass: config.email.smtpPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
} as any);

// ============================================================================
// ROUTES POUR L'EMAIL
// ============================================================================

/**
 * POST /send
 * Envoie un email (protégée)
 * Body: { to, subject, text }
 */
router.post('/send', (req, res) => sendEmail(req, res, transporter));

/**
 * GET /test-config
 * Teste la configuration email
 */
router.get('/test-config', testEmailConfig);

/**
 * POST /test-send
 * Envoie un email de test
 * Body: { testEmail }
 */
router.post('/test-send', testEmailSend);

/**
 * POST /jobs/reminders
 * Cron job pour envoyer les rappels d'événements (J-3, J-1, -2h)
 * Header: X-CRON-KEY (authentification)
 */
router.post('/jobs/reminders', sendRemindersCron);

/**
 * POST /jobs/organizer-reminders
 * Cron job pour envoyer les relances automatiques aux organisateurs
 * Délais: J-10, J-7, J-5, J-3, J-2, J-1
 * Header: X-CRON-KEY (authentification)
 */
router.post('/jobs/organizer-reminders', sendOrganizerRemindersCron);

export default router;
