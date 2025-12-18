# Configuration Email

## Problème identifié
Les emails ne sont pas envoyés aux humoristes lors de la création d'évènements car les variables d'environnement email ne sont pas configurées.

## Variables d'environnement requises

Créez un fichier `.env` dans le dossier `server/` avec les variables suivantes :

```env
# Configuration Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password-here
```

## Configuration Gmail

1. **Activez l'authentification à 2 facteurs** sur votre compte Gmail
2. **Générez un mot de passe d'application** :
   - Allez dans Paramètres Google > Sécurité
   - Activez l'authentification à 2 facteurs
   - Générez un "Mot de passe d'application" pour "Mail"
   - Utilisez ce mot de passe dans `SMTP_PASS`

## Test de la configuration

Une fois configuré, redéployez le serveur. Les emails devraient être envoyés automatiquement lors de :
- Création d'évènements (notification aux humoristes)
- Candidatures (notification aux organisateurs)
- Changements de statut (notification aux humoristes)

## Vérification des logs

Vérifiez les logs du serveur pour voir si les emails sont envoyés :
- ✅ `📬 Service Email: Début de la fonction d'envoi...`
- ✅ `✅ Notifications envoyées à X humoristes`
- ❌ `❌ Erreur lors de l'envoi des notifications`
