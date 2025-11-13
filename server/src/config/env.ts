// Configuration des variables d'environnement
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
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

