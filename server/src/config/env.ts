// Configuration des variables d'environnement
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || '', // Doit être défini via variable d'environnement
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  
  database: {
    url: process.env.DATABASE_URL || '', // Doit être défini via variable d'environnement
  },
  
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpUser: process.env.SMTP_USER || 'contact.standupconnect@gmail.com',
    smtpPass: process.env.SMTP_PASS || '', // Doit être défini via variable d'environnement
  },

  cron: {
    secret: process.env.CRON_SECRET || 'dev_cron_secret_key',
    enabled: process.env.ENABLE_CRONS !== 'false', // true by default
    comedianReminderSchedule: process.env.CRON_COMEDIAN_SCHEDULE || '0 * * * *', // Toutes les heures
    organizerReminderSchedule: process.env.CRON_ORGANIZER_SCHEDULE || '0 */6 * * *', // Toutes les 6 heures
  },
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
  
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Configuration validation failed');
  }
  
  console.log('✅ Configuration validée avec succès');
};

