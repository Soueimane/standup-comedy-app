// Configuration des variables d'environnement
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    additionalOrigins: process.env.ADDITIONAL_CORS_ORIGINS?.split(',').filter(Boolean) || [],
  },

  jwt: {
    secret: process.env.JWT_SECRET || '', // Pas de fallback - sera validé
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  database: {
    url: process.env.DATABASE_URL || '', // Pas de fallback - sera validé
  },

  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    unsubscribeSecret: process.env.UNSUBSCRIBE_SECRET || '',
  },

  cron: {
    secret: process.env.CRON_SECRET || 'dev_cron_secret_key',
    enabled: process.env.ENABLE_CRONS !== 'false', // true by default
    comedianReminderSchedule: process.env.CRON_COMEDIAN_SCHEDULE || '0 * * * *', // Toutes les heures
    organizerReminderSchedule: process.env.CRON_ORGANIZER_SCHEDULE || '0 */6 * * *', // Toutes les 6 heures
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  }
};

// Validation de la configuration
export const validateConfig = (): void => {
  const errors: string[] = [];
  
  // Variables obligatoires
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }
  
  if (!config.jwt.secret) {
    errors.push('JWT_SECRET is required');
  }

  if (!config.email.unsubscribeSecret) {
    errors.push('UNSUBSCRIBE_SECRET is required');
  }

  if (config.email.unsubscribeSecret && config.email.unsubscribeSecret.length < 32) {
    errors.push('UNSUBSCRIBE_SECRET must be at least 32 characters long');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Configuration validation failed');
  }
  
  console.log('✅ Configuration validée avec succès');
};

