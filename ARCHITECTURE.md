# Architecture du Projet Standup Comedy Connect

## 1. Vue d'ensemble
Standup Comedy Connect est une plateforme qui connecte les comédiens de stand-up avec les organisateurs d'événements. Le projet est divisé en deux parties principales : le frontend (React + Vite) et le backend (Node.js + Express + MongoDB).

## 2. Structure du Backend

### 2.1 Organisation des Dossiers
```
server/
├── src/
│   ├── config/           # Configuration
│   │   ├── env.ts       # Variables d'environnement
│   │   └── database.ts  # Configuration MongoDB
│   ├── controllers/     # Logique métier
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── event.ts
│   │   └── application.ts
│   ├── middleware/      # Middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── models/         # Modèles MongoDB
│   │   ├── User.ts
│   │   ├── Event.ts
│   │   └── Application.ts
│   ├── routes/         # Routes API
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── event.ts
│   │   └── application.ts
│   ├── services/       # Services métier
│   │   ├── email.ts
│   │   └── notification.ts
│   ├── types/          # Types TypeScript
│   │   └── index.ts
│   ├── utils/          # Utilitaires
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── index.ts        # Point d'entrée
└── tests/             # Tests
```

### 2.2 Modèles de Données

#### User
```typescript
interface User {
  _id: ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'COMEDIAN' | 'ORGANIZER' | 'ADMIN';
  profile: {
    bio: string;
    experience: string;
    socialLinks: {
      youtube?: string;
      instagram?: string;
      twitter?: string;
    };
    performances: Performance[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Event
```typescript
interface Event {
  _id: ObjectId;
  title: string;
  description: string;
  date: Date;
  location: {
    venue: string;
    address: string;
    city: string;
    country: string;
  };
  organizer: ObjectId; // Référence à User
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  requirements: {
    minExperience: number;
    maxPerformers: number;
    duration: number; // en minutes
  };
  applications: ObjectId[]; // Références à Application
  createdAt: Date;
  updatedAt: Date;
}
```

#### Application
```typescript
interface Application {
  _id: ObjectId;
  event: ObjectId; // Référence à Event
  comedian: ObjectId; // Référence à User
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  performanceDetails: {
    duration: number;
    description: string;
    videoLink?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 API Endpoints

#### Authentication
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh-token` - Rafraîchir le token
- `POST /api/auth/logout` - Déconnexion

#### Users
- `GET /api/users/profile` - Obtenir le profil
- `PUT /api/users/profile` - Mettre à jour le profil
- `GET /api/users/:id` - Obtenir un profil public
- `GET /api/users/performances` - Obtenir les performances

#### Events
- `GET /api/events` - Lister les événements
- `POST /api/events` - Créer un événement
- `GET /api/events/:id` - Obtenir un événement
- `PUT /api/events/:id` - Mettre à jour un événement
- `DELETE /api/events/:id` - Supprimer un événement
- `GET /api/events/organizer` - Événements de l'organisateur

#### Applications
- `POST /api/applications` - Soumettre une candidature
- `GET /api/applications/event/:eventId` - Candidatures d'un événement
- `PUT /api/applications/:id/status` - Mettre à jour le statut
- `GET /api/applications/comedian` - Candidatures du comédien

### 2.4 Sécurité
- Authentification JWT
- Validation des données avec Zod
- Rate limiting
- CORS configuré
- Sanitization des entrées
- Hachage des mots de passe avec bcrypt

### 2.5 Services
- Service d'email pour les notifications
- Service de notification en temps réel
- Service de gestion des fichiers (vidéos, images)
- Service de logging

## 3. Structure du Frontend

### 3.1 Organisation des Dossiers
```
src/
├── assets/            # Ressources statiques
├── components/        # Composants réutilisables
│   ├── common/       # Composants génériques
│   ├── features/     # Composants spécifiques
│   └── layout/       # Composants de mise en page
├── hooks/            # Custom hooks React
├── pages/            # Pages de l'application
├── services/         # Services API
├── store/            # État global
├── styles/           # Styles globaux
├── types/            # Types TypeScript
└── utils/            # Utilitaires
```

### 3.2 Pages Principales
- Page d'accueil
- Page de connexion/inscription
- Profil utilisateur
- Liste des événements
- Détails d'un événement
- Gestion des candidatures
- Dashboard organisateur
- Dashboard comédien

### 3.3 Fonctionnalités Frontend
- Authentification
- Gestion des profils
- Recherche et filtrage d'événements
- Soumission de candidatures
- Gestion des performances
- Notifications en temps réel
- Upload de vidéos
- Interface responsive

## 4. Base de Données
- MongoDB comme base de données principale
- Indexation optimisée pour les requêtes fréquentes
- Validation des schémas
- Relations entre collections

## 5. Déploiement
- Backend : Vercel ou Heroku
- Frontend : Vercel
- Base de données : MongoDB Atlas
- CDN pour les assets statiques
- CI/CD avec GitHub Actions

## 6. Monitoring et Logging
- Logging avec Winston
- Monitoring avec Sentry
- Métriques de performance
- Alertes automatiques

## 7. Tests
- Tests unitaires avec Jest
- Tests d'intégration
- Tests end-to-end avec Cypress
- Couverture de code

## 8. Documentation
- Documentation API avec Swagger
- Documentation du code
- Guide de contribution
- Guide de déploiement 