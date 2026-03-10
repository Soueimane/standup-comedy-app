// Charger les variables d'environnement AVANT tout le reste
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/env';
import { connectDatabase } from './config/database';
import { initializeCronJobs, stopCronJobs } from './services/cronScheduler';
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import applicationsRoutes from './routes/applications';
import profileRoutes from './routes/profile';
import emailRoutes from './routes/email';
import absencesRoutes from './routes/absences';
import favoritesRoutes from './routes/favorites';
import eventFavoritesRoutes from './routes/eventFavorites';
import applicationFavoritesRoutes from './routes/applicationFavorites';
import presenceAlertsRoutes from './routes/presenceAlerts';
import lateCancellationAlertsRoutes from './routes/lateCancellationAlerts';
import comedianReportRoutes from './routes/comedianReport';
import notificationRoutes from './routes/notification';
import sseRoutes from './routes/sse';
import oauthRoutes from './routes/oauth';
import recommendationsRoutes from './routes/recommendations';
import comediansRoutes from './routes/comedians';
import usersRoutes from './routes/users';
import { sseManager } from './services/sseManager';

const app = express();

// Middleware CORS configuré + gestion explicite du preflight OPTIONS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Autoriser toutes les origines en développement, ou une liste spécifique en production
    const allowedOrigins = [
      config.frontend.url,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      ...config.cors.additionalOrigins,
    ];

    // En développement ou si pas d'origine (requêtes depuis Postman, etc.), autoriser
    if (!origin || config.nodeEnv === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // En production, vérifier si l'origine est autorisée
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400, // 24 heures pour le cache preflight
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Appliquer CORS avant tout autre middleware
app.use(cors(corsOptions));

// Gestion explicite des requêtes OPTIONS (preflight) - doit être avant les routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Middleware de logging global pour toutes les requêtes
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`📨 Requête entrante: ${req.method} ${req.path}`);
  next();
});

// Route de santé pour maintenir l'instance active
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/event-favorites', eventFavoritesRoutes);
app.use('/api/application-favorites', applicationFavoritesRoutes);
app.use('/api/presence-alerts', presenceAlertsRoutes);
app.use('/api/late-cancellation-alerts', lateCancellationAlertsRoutes);
app.use('/api/comedian-reports', comedianReportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/comedians', comediansRoutes);
app.use('/api/users', usersRoutes);

// Gestion des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur du serveur:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Valider la configuration avant de démarrer
    validateConfig();

    await connectDatabase();

    // Initialiser les cron jobs
    initializeCronJobs();

    const server = app.listen(config.port, () => {
      console.log(`🚀 Serveur démarré sur le port ${config.port} en mode ${config.nodeEnv}`);
      console.log(`📊 Niveau de log: ${config.logLevel}`);
      console.log(`🌐 CORS origin: ${config.cors.origin}`);
    });

    // Gérer l'arrêt du serveur proprement
    process.on('SIGTERM', () => {
      console.log('\n⏹️ Signal SIGTERM reçu, arrêt du serveur...');
      stopCronJobs();
      sseManager.shutdown();
      server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n⏹️ Signal SIGINT reçu, arrêt du serveur...');
      stopCronJobs();
      sseManager.shutdown();
      server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Échec du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer(); 