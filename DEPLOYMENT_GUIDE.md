# 🚀 Guide de Déploiement - Standup Comedy App

## 🎯 Problème Actuel
- ✅ Frontend déployé sur Netlify (dossier `dist`)
- ❌ Backend non déployé → Authentification ne fonctionne pas

## 📋 Solution Complète

### 1️⃣ **Déployer le Backend (OBLIGATOIRE)**

#### Option A : Render (Recommandé - Gratuit)
1. Va sur [render.com](https://render.com)
2. Connecte ton compte GitHub
3. Clique "New +" → "Web Service"
4. Sélectionne ton repo `standup-comedy-V1`
5. Configuration :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Node Version** : 18 ou plus récent

#### Variables d'environnement sur Render :
```
MONGODB_URI=mongodb+srv://ton-uri-mongodb
JWT_SECRET=ton-secret-jwt
NODE_ENV=production
PORT=3001
```

### 2️⃣ **Configurer le Frontend**

#### Sur Netlify - Variables d'environnement :
1. Va dans ton dashboard Netlify
2. Site Settings → Environment variables
3. Ajoute :
   ```
   VITE_API_URL=https://ton-app-backend.onrender.com/api
   ```
   (Remplace par l'URL de ton backend déployé)

#### Rebuild le frontend :
```bash
cd client
npm run build
```
Puis redéploie le nouveau `dist` sur Netlify.

### 3️⃣ **Alternative : Déploiement Full-Stack**

#### Option B : Vercel Full-Stack
- Peut héberger frontend + backend ensemble
- Configuration dans `vercel.json`

#### Option C : DigitalOcean App Platform
- Interface simple
- Base de données intégrée possible

## 🔧 Modifications Déjà Apportées

✅ Le code a été modifié pour s'adapter automatiquement :
- Développement : `http://localhost:3001/api`
- Production : Utilise `VITE_API_URL` ou '/api'

## 🚨 Étapes Urgentes

1. **IMMÉDIAT** : Déploie ton backend sur Render
2. **ENSUITE** : Configure `VITE_API_URL` sur Netlify
3. **ENFIN** : Rebuild et redéploie le frontend

## 📞 Aide Supplémentaire

Si tu veux que je t'aide à :
- Créer les fichiers de configuration Render
- Optimiser le déploiement
- Résoudre des erreurs spécifiques

Dis-le moi ! 🎯 