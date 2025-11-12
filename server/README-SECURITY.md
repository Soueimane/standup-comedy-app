# 🔐 Configuration Sécurisée - Guide Rapide

## 🚀 Démarrage Rapide

### 1. Copier le fichier d'exemple
```bash
cp .env.example .env
```

### 2. Générer un secret JWT sécurisé
```bash
npm run generate-secret
```

### 3. Configurer les variables critiques
Éditez votre fichier `.env` et remplacez :
- `DATABASE_URL` par votre URL MongoDB
- `JWT_SECRET` par le secret généré

### 4. Démarrer le serveur
```bash
npm run dev
```

## ✅ Vérification

Si tout est configuré correctement, vous devriez voir :
```
✅ Configuration validée avec succès
🚀 Serveur démarré sur le port 3001 en mode development
📊 Niveau de log: info
🌐 CORS origin: *
```

## ⚠️ Variables Obligatoires

- `DATABASE_URL` : URL de votre base de données MongoDB
- `JWT_SECRET` : Secret pour signer les tokens JWT

## 🔧 Variables Optionnelles

- `PORT` : Port du serveur (défaut: 3001)
- `NODE_ENV` : Environnement (défaut: development)
- `CORS_ORIGIN` : Origines autorisées (défaut: *)

## 📚 Documentation Complète

Voir `CONFIGURATION.md` pour la documentation détaillée. 