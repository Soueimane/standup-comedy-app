# Configuration Sécurisée du Serveur

## 🔒 Variables d'Environnement

Ce projet utilise des variables d'environnement pour sécuriser les informations sensibles. 

### 📁 Fichiers de Configuration

- **`.env`** : Contient les vraies valeurs (NE PAS COMMITER)
- **`.env.example`** : Contient des exemples de configuration (COMMITÉ)
- **`src/config/env.ts`** : Lit les variables depuis `process.env`

### 🚀 Installation

1. **Copier le fichier d'exemple :**
   ```bash
   cp .env.example .env
   ```

2. **Modifier le fichier `.env` avec vos vraies valeurs :**
   ```bash
   nano .env
   ```

### 📋 Variables Requises

#### 🔧 Configuration du Serveur
- `PORT` : Port du serveur (défaut: 3001)
- `NODE_ENV` : Environnement (development, production, test)

#### 🗄️ Base de Données
- `DATABASE_URL` : URL de connexion MongoDB (REQUIS)

#### 🔐 JWT (JSON Web Tokens)
- `JWT_SECRET` : Secret pour signer les tokens (REQUIS)
- `JWT_EXPIRES_IN` : Durée de validité des tokens (défaut: 1d)

#### 🌐 CORS
- `CORS_ORIGIN` : Origines autorisées (défaut: *)

### 📧 Email (Optionnel)
- `SMTP_HOST` : Serveur SMTP
- `SMTP_PORT` : Port SMTP
- `SMTP_USER` : Utilisateur SMTP
- `SMTP_PASS` : Mot de passe SMTP

### 🔗 Services Externes (Optionnel)
- `GOOGLE_CLIENT_ID` : ID client Google OAuth
- `GOOGLE_CLIENT_SECRET` : Secret client Google OAuth

### 📊 Logs
- `LOG_LEVEL` : Niveau de log (défaut: info)

## 🔐 Sécurité

### ✅ Bonnes Pratiques

1. **Ne jamais commiter le fichier `.env`**
2. **Utiliser des secrets forts pour JWT_SECRET**
3. **Limiter CORS_ORIGIN en production**
4. **Utiliser des variables d'environnement différentes par environnement**

### ⚠️ Variables Critiques

Ces variables sont **OBLIGATOIRES** :
- `DATABASE_URL`
- `JWT_SECRET`

### 🔍 Validation

Le serveur valide automatiquement la configuration au démarrage :
```bash
npm start
# ✅ Configuration validée avec succès
```

## 🛠️ Développement

### Générer un Secret JWT Sécurisé
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Test de la Configuration
```bash
npm run dev
```

## 🚀 Production

### Variables d'Environnement Recommandées
```bash
NODE_ENV=production
CORS_ORIGIN=https://votre-domaine.com
LOG_LEVEL=warn
```

### Déploiement
- Utilisez les variables d'environnement de votre plateforme de déploiement
- Ne stockez jamais les secrets dans le code
- Utilisez des gestionnaires de secrets (Vault, AWS Secrets Manager, etc.) 