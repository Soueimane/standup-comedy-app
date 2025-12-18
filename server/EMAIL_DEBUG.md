# 🔍 Debug Email - Guide de résolution

## Problèmes identifiés et corrigés

### ✅ 1. Code dupliqué dans `sendApplicationNotificationToOrganizer`
- **Problème** : Code dupliqué avec `mailOptions` non utilisé et deux appels `sgMail.send()`
- **Correction** : Suppression du code dupliqué, correction du `replyTo` et du `name`

### ✅ 2. Logs améliorés
- **Ajout** : Logs détaillés pour chaque étape d'envoi d'email
- **Ajout** : Gestion d'erreur individuelle pour chaque email (un email qui échoue n'empêche pas les autres)

### ✅ 3. Vérification de configuration
- **Ajout** : Logs pour `DISABLE_EMAILS` et `NODE_ENV` dans les logs

## 🔧 Vérifications à faire sur Render

### 1. Variables d'environnement sur Render

Vérifiez que vous avez ces variables définies :

```
SMTP_USER = votre-email@sendgrid.com (l'email vérifié sur SendGrid)
SMTP_PASS = SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (votre API Key SendGrid)
DISABLE_EMAILS = false (ou non défini, pas 'true')
NODE_ENV = production
```

### 2. Vérifier DISABLE_EMAILS

**IMPORTANT** : Si `DISABLE_EMAILS=true`, les emails seront **automatiquement bloqués** même si SendGrid est configuré.

Pour vérifier :
1. Allez sur Render Dashboard
2. Sélectionnez votre service backend
3. Allez dans "Environment"
4. Cherchez `DISABLE_EMAILS`
5. Si elle est définie à `true`, **changez-la à `false`** ou **supprimez-la**

### 3. Vérifier la clé API SendGrid

Assurez-vous que `SMTP_PASS` contient bien votre clé API SendGrid complète :
- Format : `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Pas de guillemets ou espaces
- La clé doit être active sur SendGrid

### 4. Vérifier l'email SendGrid

L'email dans `SMTP_USER` doit être :
- Vérifié sur SendGrid
- Un email que vous possédez

## 📋 Test des emails

### Test 1 : Création d'évènement
1. Connectez-vous en tant qu'organisateur
2. Créez un évènement
3. Vérifiez les logs Render pour voir :
   - `📬 Service Email: Début de la fonction d'envoi...`
   - `🎭 X humoristes trouvés dans la base`
   - `🚀 Début de l'envoi des emails à X humoristes...`
   - `✅ Email X/X envoyé à ...`

### Test 2 : Candidature humoriste
1. Connectez-vous en tant qu'humoriste
2. Postulez à un évènement
3. Vérifiez les logs Render pour voir :
   - `📬 Service Email: Notification candidature à l'organisateur...`
   - `📧 Envoi email à l'organisateur:`
   - `✅ Notification envoyée à l'organisateur...`

## 🔍 Logs à surveiller

### Si les emails ne s'envoient pas, cherchez ces messages dans les logs :

1. **Emails désactivés** :
   ```
   ⚠️ 📧 Emails désactivés pour économiser la mémoire (plan gratuit)
   ```
   → Solution : Mettre `DISABLE_EMAILS=false` sur Render

2. **Configuration manquante** :
   ```
   ❌ Configuration email manquante: { SMTP_USER: 'MANQUANT', SMTP_PASS: 'MANQUANT' }
   ```
   → Solution : Vérifier que `SMTP_USER` et `SMTP_PASS` sont définis sur Render

3. **Erreur SendGrid** :
   ```
   ❌ Erreur lors de l'envoi à ...: [détails erreur]
   ```
   → Solution : Vérifier la clé API SendGrid et l'email vérifié

## 📝 Checklist de résolution

- [ ] `DISABLE_EMAILS=false` (ou non défini) sur Render
- [ ] `SMTP_USER` = email vérifié SendGrid
- [ ] `SMTP_PASS` = clé API SendGrid complète (SG.xxx...)
- [ ] `NODE_ENV=production` sur Render
- [ ] Email vérifié sur SendGrid Dashboard
- [ ] Clé API SendGrid active
- [ ] Logs Render montrent les tentatives d'envoi
- [ ] Au moins un humoriste dans la base de données (pour test évènement)
- [ ] Au moins un organisateur dans la base de données (pour test candidature)

## 🚀 Après mise à jour

1. Pousser les modifications sur GitHub
2. Render détectera automatiquement les changements
3. Attendre le déploiement
4. Tester la création d'évènement
5. Vérifier les logs Render pour confirmer l'envoi



