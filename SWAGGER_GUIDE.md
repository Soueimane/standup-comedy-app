# 📚 Guide Swagger/OpenAPI - Standup Comedy Connect

## 🎯 Qu'est-ce que Swagger/OpenAPI ?

**Swagger** (maintenant appelé **OpenAPI**) est un standard pour documenter les APIs REST. Il permet de :
- 📖 **Documenter** toutes vos routes API
- 🧪 **Tester** vos endpoints directement dans l'interface
- 👥 **Partager** votre API avec d'autres développeurs
- 🔧 **Générer** du code client automatiquement

## 📁 Fichier créé

J'ai créé le fichier **`swagger-api.json`** qui contient la documentation complète de votre API.

## 🚀 Comment utiliser votre fichier OpenAPI

### 1. **Swagger Editor (Recommandé pour débuter)**

1. Allez sur [https://editor.swagger.io/](https://editor.swagger.io/)
2. Cliquez sur **"File"** → **"Import file"**
3. Sélectionnez votre fichier `swagger-api.json`
4. ✨ **Votre API est maintenant documentée et testable !**

### 2. **Swagger UI (Pour partager avec d'autres devs)**

1. Allez sur [https://petstore.swagger.io/](https://petstore.swagger.io/)
2. Remplacez l'URL par : `https://connectcomedyclub.com/api` (votre serveur)
3. Ou utilisez un service comme [SwaggerHub](https://swaggerhub.com/)

### 3. **Intégration dans votre projet**

Vous pouvez aussi intégrer Swagger directement dans votre serveur Node.js :

```bash
npm install swagger-ui-express swagger-jsdoc
```

## 📋 Ce que contient votre documentation

### 🔐 **Authentication**
- `POST /auth/register` - Inscription utilisateur
- `POST /auth/login` - Connexion
- `GET /auth/profile` - Profil utilisateur
- `GET /auth/users` - Répertoire des utilisateurs

### 🎪 **Events**
- `GET /events` - Liste des événements
- `POST /events` - Créer un événement
- `GET /events/{id}` - Détails d'un événement
- `PUT /events/{id}` - Modifier un événement
- `DELETE /events/{id}` - Supprimer un événement

### 📝 **Applications**
- `GET /applications` - Liste des candidatures
- `POST /applications` - Postuler à un événement
- `GET /applications/{id}` - Détails d'une candidature
- `PUT /applications/{id}` - Modifier le statut
- `DELETE /applications/{id}` - Supprimer une candidature
- `PATCH /applications/{id}/confirm` - Confirmer participation

### 👤 **Profile**
- `GET /profile/me` - Mon profil
- `PUT /profile/{userId}` - Modifier profil

### ❌ **Absences**
- `POST /absences` - Marquer une absence
- `GET /absences/event/{eventId}` - Absences d'un événement

### 💚 **Health**
- `GET /health` - État du serveur

## 🎨 Avantages pour votre projet

### ✅ **Pour vous (développeur)**
- Documentation automatique et à jour
- Test des endpoints sans Postman
- Validation des données en temps réel
- Génération de code client

### ✅ **Pour d'autres développeurs**
- Compréhension rapide de l'API
- Exemples de requêtes/réponses
- Test direct dans l'interface
- Intégration facile dans leurs projets

### ✅ **Pour votre business**
- API professionnelle et documentée
- Facilite les partenariats
- Réduit le temps d'intégration
- Améliore la crédibilité

## 🔧 Personnalisation

Vous pouvez modifier le fichier `swagger-api.json` pour :
- Ajouter de nouvelles routes
- Modifier les descriptions
- Ajouter des exemples
- Changer les serveurs (dev/prod)

## 📱 Exemple d'utilisation

1. **Ouvrez** [Swagger Editor](https://editor.swagger.io/)
2. **Importez** votre fichier `swagger-api.json`
3. **Testez** l'inscription d'un utilisateur :
   ```json
   {
     "email": "test@example.com",
     "phone": "0612345678",
     "password": "MotDePasse123",
     "confirmPassword": "MotDePasse123",
     "firstName": "Jean",
     "lastName": "Dupont",
     "role": "COMEDIAN",
     "profile": {
       "experience": "2"
     }
   }
   ```

## 🎉 Résultat

Vous avez maintenant une **documentation API professionnelle** que vous pouvez :
- Partager avec d'autres développeurs
- Utiliser pour tester votre API
- Intégrer dans votre site web
- Utiliser pour générer du code client

**Votre API est maintenant prête à être partagée !** 🚀
