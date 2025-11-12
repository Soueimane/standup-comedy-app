import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/env';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import applicationsRoutes from './routes/applications';
import profileRoutes from './routes/profile';
import emailRoutes from './routes/email';
import absencesRoutes from './routes/absences';

const app = express();

// Middleware CORS configuré + gestion explicite du preflight OPTIONS
const corsOptions = {
  origin: true, // Autorise toutes les origines (peut être remplacé par une liste d'origines)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
  allowedHeaders: ['Content-Type', 'Authorization'] as string[],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

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
    
    app.listen(config.port, () => {
      console.log(`🚀 Serveur démarré sur le port ${config.port} en mode ${config.nodeEnv}`);
      console.log(`📊 Niveau de log: ${config.logLevel}`);
      console.log(`🌐 CORS origin: ${config.cors.origin}`);
    });
  } catch (error) {
    console.error('❌ Échec du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer(); 