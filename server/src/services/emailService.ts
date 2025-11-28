import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { config } from '../config/env';
import { generateUnsubscribeToken } from '../utils/unsubscribeToken';

// Configuration SendGrid
sgMail.setApiKey(config.email.smtpPass); // Utilise SMTP_PASS comme API Key SendGrid

// SendGrid remplace Nodemailer - plus besoin de transporter

/**
 * Vérifie si l'utilisateur est abonné aux emails
 *
 * @param userId - ID MongoDB de l'utilisateur
 * @returns true si l'utilisateur peut recevoir des emails
 */
async function checkUserEmailSubscription(userId: string): Promise<boolean> {
  try {
    const user = await UserModel.findById(userId).select('emailSubscriptions email');

    if (!user) {
      console.log(`⚠️ User ${userId} not found - skipping email`);
      return false;
    }

    // Si emailSubscriptions n'existe pas, considérer comme abonné (backward compatibility)
    if (!user.emailSubscriptions) {
      return true;
    }

    const isSubscribed = user.emailSubscriptions.globalSubscribed !== false;

    if (!isSubscribed) {
      console.log(`📧 User ${user.email} (${userId}) is unsubscribed - skipping email`);
    }

    return isSubscribed;
  } catch (error) {
    console.error(`❌ Error checking subscription for user ${userId}:`, error);
    // En cas d'erreur, considérer comme abonné pour ne pas bloquer les emails
    return true;
  }
}

/**
 * Génère l'URL de désabonnement complète pour un utilisateur
 *
 * @param userId - ID de l'utilisateur
 * @param email - Email de l'utilisateur
 * @returns URL complète avec token HMAC (pour header List-Unsubscribe)
 */
function generateUnsubscribeUrl(userId: string, email: string): string {
  try {
    const token = generateUnsubscribeToken(userId, email);

    // Utiliser l'URL de l'API backend
    const apiBaseUrl = process.env.API_URL || 'http://localhost:3001';

    return `${apiBaseUrl}/api/email/unsubscribe?token=${token}&userId=${userId}&email=${encodeURIComponent(email)}`;
  } catch (error) {
    console.error(`❌ Error generating unsubscribe URL for ${email}:`, error);
    // Fallback URL générique
    return 'https://standup-comedy-app.netlify.app/unsubscribe';
  }
}

export const sendApplicationNotificationToOrganizer = async (eventData: any, humoristData: any, organizerData: any, applicationData: any) => {
  try {
    console.log('📬 Service Email: Notification candidature à l\'organisateur...');
    console.log('📧 Variables EMAIL disponibles:', {
      SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
      SMTP_PASS: config.email.smtpPass ? 'Configuré' : 'MANQUANT'
    });

    // ===== VÉRIFICATION ABONNEMENT EMAIL =====
    const organizerId = organizerData._id || organizerData.id;
    if (organizerId && !(await checkUserEmailSubscription(organizerId))) {
      console.log(`⏭️ Organisateur ${organizerData.email} est désabonné - email non envoyé`);
      return;
    }
    // =========================================

    // Mode économie mémoire - désactiver temporairement les emails
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_EMAILS === 'true') {
      console.log('⚠️ 📧 Emails désactivés pour économiser la mémoire (plan gratuit)');
      console.log('🔧 Pour réactiver les emails, définissez DISABLE_EMAILS=false sur Render');
      return;
    }

    // Vérifier la configuration email
    if (!config.email.smtpUser || !config.email.smtpPass) {
      console.error('❌ Configuration email manquante:', {
        SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
        SMTP_PASS: config.email.smtpPass ? 'Configuré' : 'MANQUANT'
      });
      return;
    }

    console.log('✅ Configuration SendGrid OK - Prêt à envoyer !');

    // Préparer le contenu de l'email pour l'organisateur
    const subject = `🎭 Nouvelle candidature de ${humoristData.firstName} ${humoristData.lastName} pour "${eventData.title}"`;

    // Générer l'URL de désabonnement AVANT le template HTML
    const unsubscribeUrl = organizerId
      ? generateUnsubscribeUrl(organizerId.toString(), organizerData.email)
      : 'https://standup-comedy-app.netlify.app/unsubscribe';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle candidature reçue</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header .subtitle {
            margin-top: 10px;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .humorist-card {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
        }
        .humorist-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .humorist-avatar {
            width: 60px;
            height: 60px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            margin-right: 20px;
            border: 3px solid rgba(255,255,255,0.3);
        }
        .humorist-info h2 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .humorist-info p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .event-summary {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .event-title {
            font-size: 20px;
            color: #333;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .event-details {
            display: grid;
            gap: 8px;
            color: #666;
            font-size: 14px;
        }
        .detail-item {
            display: flex;
            align-items: center;
        }
        .detail-icon {
            margin-right: 8px;
            width: 20px;
        }
        .performance-details {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .performance-details h3 {
            margin: 0 0 10px 0;
            color: #1976d2;
            font-size: 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
        }
        .cta-buttons {
            display: flex;
            gap: 15px;
            margin: 30px 0;
            justify-content: center;
        }
        .cta-button {
            display: inline-block;
            padding: 12px 25px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 14px;
            text-align: center;
            min-width: 120px;
        }
        .btn-accept {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
        }
        .btn-review {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .contact-info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            text-align: center;
        }
        .contact-info a {
            color: #0c5460;
            text-decoration: none;
            font-weight: bold;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            .header, .content {
                padding: 20px;
            }
            .humorist-card {
                padding: 20px;
            }
            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 Nouvelle Candidature Reçue !</h1>
            <div class="subtitle">Un humoriste souhaite participer à votre événement</div>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>${organizerData.firstName}</strong>,</p>
            <p>Excellente nouvelle ! Un humoriste vient de postuler pour votre événement.</p>
            
            <div class="humorist-card">
                <div class="humorist-header">
                    <div class="humorist-avatar">
                        ${humoristData.firstName.charAt(0)}${humoristData.lastName.charAt(0)}
                    </div>
                    <div class="humorist-info">
                        <h2>${humoristData.firstName} ${humoristData.lastName}</h2>
                        <p>🎤 Humoriste stand-up</p>
                    </div>
                </div>
                
                <div class="contact-info">
                    📧 Contact : <a href="mailto:${humoristData.email}">${humoristData.email}</a>
                    ${humoristData.phone ? `<br>📞 Téléphone : ${humoristData.phone}` : ''}
                </div>
            </div>
            
            <div class="event-summary">
                <div class="event-title">📅 ${eventData.title}</div>
                <div class="event-details">
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <span>${eventData.location.address}, ${eventData.location.city}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📆</span>
                        <span>${new Date(eventData.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    ${eventData.startTime ? `
                    <div class="detail-item">
                        <span class="detail-icon">⏰</span>
                        <span>${eventData.startTime}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${applicationData.performanceDetails ? `
            <div class="performance-details">
                <h3>🎭 Détails de la performance proposée</h3>
                ${applicationData.performanceDetails.duration ? `<p><strong>Durée :</strong> ${applicationData.performanceDetails.duration} minutes</p>` : ''}
                ${applicationData.performanceDetails.description ? `<p><strong>Description :</strong> ${applicationData.performanceDetails.description}</p>` : ''}
                ${applicationData.performanceDetails.videoLink ? `<p><strong>Vidéo :</strong> <a href="${applicationData.performanceDetails.videoLink}" target="_blank" style="color: #1976d2;">Voir la vidéo</a></p>` : ''}
            </div>
            ` : ''}
            
            ${applicationData.message ? `
            <div class="performance-details" style="background: #f0f8ff; border-left-color: #4682b4;">
                <h3>💬 Message de l'humoriste</h3>
                <p>${applicationData.message}</p>
            </div>
            ` : ''}
            
            ${humoristData.profile ? `
            <div class="stats-grid">
                ${humoristData.profile.experienceLevel ? `
                <div class="stat-item">
                    <div class="stat-value">${humoristData.profile.experienceLevel}</div>
                    <div class="stat-label">Niveau</div>
                </div>
                ` : ''}
                ${humoristData.stats && humoristData.stats.totalEvents ? `
                <div class="stat-item">
                    <div class="stat-value">${humoristData.stats.totalEvents}</div>
                    <div class="stat-label">Événements</div>
                </div>
                ` : ''}
                ${humoristData.profile.genres && humoristData.profile.genres.length > 0 ? `
                <div class="stat-item">
                    <div class="stat-value">${humoristData.profile.genres.length}</div>
                    <div class="stat-label">Genres</div>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="cta-buttons">
                <a href="https://standup-comedy-app.netlify.app/applications" class="cta-button btn-review">
                    📋 Voir les Candidatures
                </a>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Connectez-vous à votre tableau de bord pour examiner cette candidature en détail.
            </p>
        </div>

        <div class="footer">
            <p><strong>L'équipe Standup Comedy Connect</strong></p>
            <p>Connecter les talents avec les opportunités</p>
        </div>

        <!-- Footer de désabonnement -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
            <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
            <p>
                <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                    Se désabonner de tous les emails
                </a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Utiliser SendGrid pour envoyer l'email
    console.log('📧 Envoi email à l\'organisateur:', {
      to: organizerData.email,
      from: config.email.smtpUser,
      replyTo: humoristData.email,
      subject: subject
    });
    
    // Créer une version texte simple pour améliorer la délivrabilité
    const textContent = `
Nouvelle Candidature Reçue !

Bonjour ${organizerData.firstName},

Un humoriste vient de postuler pour votre événement.

Humoriste: ${humoristData.firstName} ${humoristData.lastName}
Email: ${humoristData.email}
${humoristData.phone ? `Téléphone: ${humoristData.phone}` : ''}

Événement: ${eventData.title}
Date: ${new Date(eventData.date).toLocaleDateString('fr-FR')}
Lieu: ${eventData.location.address}, ${eventData.location.city}

Connectez-vous à votre tableau de bord pour examiner cette candidature:
https://standup-comedy-app.netlify.app/applications

L'équipe Standup Comedy Connect
    `.trim();

    await sgMail.send({
      from: {
        email: config.email.smtpUser, // Email vérifié SendGrid
        name: 'Standup Comedy Connect' // Nom de marque cohérent
      },
      replyTo: humoristData.email, // Les réponses iront directement à l'humoriste
      to: organizerData.email,
      subject: subject,
      html: htmlContent,
      text: textContent, // Version texte pour améliorer la délivrabilité
      mailSettings: {
        sandboxMode: {
          enable: false // Désactiver le mode sandbox en production
        }
      },
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `candidature-${Date.now()}` // ID unique pour le tracking
      },
      categories: ['candidature', 'notification'], // Catégories SendGrid pour le tracking
    });
    
    console.log(`✅ Notification envoyée à l'organisateur ${organizerData.firstName} ${organizerData.lastName} (${organizerData.email}) pour la candidature de ${humoristData.firstName} ${humoristData.lastName}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification à l\'organisateur:', error);
    console.error('🔍 Détail de l\'erreur:', error instanceof Error ? error.stack : 'Erreur inconnue');
    // Ne pas faire échouer la création de la candidature si l'email échoue
  }
};

export const sendNewEventNotificationToHumorists = async (eventData: any, organizerData: any) => {
  try {
    console.log('📬 Service Email: Début de la fonction d\'envoi...');
    console.log('📧 Variables EMAIL disponibles:', {
      SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
      SMTP_PASS: config.email.smtpPass ? 'Configuré' : 'MANQUANT',
      NODE_ENV: process.env.NODE_ENV,
      DISABLE_EMAILS: process.env.DISABLE_EMAILS
    });
    
    // Mode économie mémoire - désactiver temporairement les emails
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_EMAILS === 'true') {
      console.log('⚠️ 📧 Emails désactivés pour économiser la mémoire (plan gratuit)');
      console.log('🔧 Pour réactiver les emails, définissez DISABLE_EMAILS=false sur Render');
      return;
    }
    
    // Vérifier la configuration email
    if (!config.email.smtpUser || !config.email.smtpPass) {
      console.error('❌ Configuration email manquante:', {
      SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
      SMTP_PASS: config.email.smtpPass ? 'Configuré' : 'MANQUANT'
    });
      return;
    }
    
    console.log('✅ Configuration SendGrid OK - Prêt à envoyer !');
    
    // Récupérer tous les humoristes AVEC emailSubscriptions
    const humorists = await UserModel.find({ role: 'COMEDIAN' })
      .select('_id email firstName lastName emailSubscriptions');
    console.log(`🎭 ${humorists.length} humoristes trouvés dans la base`);

    // ===== FILTRER LES HUMORISTES ABONNÉS =====
    const subscribedHumorists = humorists.filter(h =>
      h.emailSubscriptions?.globalSubscribed !== false
    );
    console.log(
      `📧 ${subscribedHumorists.length} humoristes abonnés ` +
      `(${humorists.length - subscribedHumorists.length} désabonnés ignorés)`
    );
    // ==========================================

    if (subscribedHumorists.length === 0) {
      console.log('❌ Aucun humoriste abonné pour l\'envoi de notifications');
      return;
    }

    // Préparer le contenu de l'email personnalisé avec l'organisateur
    // Sujet optimisé pour éviter les filtres spam (emoji en fin, pas au début)
    const subject = `Nouvel événement - ${eventData.title} 🎤`;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvel événement disponible</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header .subtitle {
            margin-top: 10px;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .event-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .event-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }
        .event-details {
            display: grid;
            gap: 10px;
        }
        .detail-item {
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.1);
            padding: 10px 15px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .detail-icon {
            font-size: 18px;
            margin-right: 10px;
            width: 25px;
        }
        .organizer-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .organizer-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .organizer-avatar {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-right: 15px;
        }
        .organizer-info h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
        }
        .organizer-info p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
        }
        .requirements {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .requirements h3 {
            margin: 0 0 15px 0;
            color: #856404;
            font-size: 16px;
        }
        .requirement-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .requirement-list li {
            padding: 5px 0;
            color: #856404;
            font-size: 14px;
        }
        .requirement-list li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
            margin-right: 8px;
        }
        .description {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .cta-button {
            display: block;
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 25px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin: 30px auto 20px auto;
            max-width: 250px;
            box-shadow: 0 5px 15px rgba(255, 65, 108, 0.4);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .contact-info {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            text-align: center;
        }
        .contact-info a {
            color: #155724;
            text-decoration: none;
            font-weight: bold;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            .header, .content {
                padding: 20px;
            }
            .event-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎤 Nouvel Événement Disponible !</h1>
            <div class="subtitle">Une nouvelle opportunité vous attend</div>
        </div>
        
        <div class="content">
            <p>Bonjour,</p>
            <p>Une nouvelle opportunité vient d'être publiée sur <strong>Standup Comedy Connect</strong> !</p>
            
            <div class="organizer-card">
                <div class="organizer-header">
                    <div class="organizer-avatar">
                        ${organizerData.firstName.charAt(0)}${organizerData.lastName.charAt(0)}
                    </div>
                    <div class="organizer-info">
                        <h3>👤 ${organizerData.firstName} ${organizerData.lastName}</h3>
                        <p>Organisateur de l'événement</p>
                    </div>
                </div>
                <div class="contact-info">
                    💬 Contact direct : <a href="mailto:${organizerData.email}">${organizerData.email}</a>
                </div>
            </div>
            
            <div class="event-card">
                <div class="event-title">${eventData.title}</div>
                <div class="event-details">
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <span>${eventData.location.address}, ${eventData.location.city}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📆</span>
                        <span>${new Date(eventData.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    ${eventData.startTime ? `
                    <div class="detail-item">
                        <span class="detail-icon">⏰</span>
                        <span>${eventData.startTime}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${eventData.description ? `
            <div class="description">
                <strong>📝 Description :</strong><br>
                ${eventData.description}
            </div>
            ` : ''}
            
            ${eventData.requirements ? `
            <div class="requirements">
                <h3>📋 Exigences de l'événement</h3>
                <ul class="requirement-list">
                    <li>Durée de performance : <strong>${eventData.requirements.duration} minutes</strong></li>
                    <li>Nombre maximum de performeurs : <strong>${eventData.requirements.maxPerformers}</strong></li>
                    <li>Expérience minimale : <strong>${eventData.requirements.minExperience} ans</strong></li>
                </ul>
            </div>
            ` : ''}
            
            <a href="https://standup-comedy-app.netlify.app/events" class="cta-button">
                🚀 Postuler Maintenant
            </a>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Ne ratez pas cette opportunité ! Connectez-vous à votre compte pour postuler dès maintenant.
            </p>
        </div>

        <div class="footer">
            <p><strong>L'équipe Standup Comedy Connect</strong></p>
            <p>Votre plateforme pour connecter humoristes et organisateurs</p>
        </div>

        <!-- Footer de désabonnement -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
            <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
            <p>
                <a href="\${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                    Se désabonner de tous les emails
                </a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Envoyer l'email à tous les humoristes avec SendGrid
    console.log(`🚀 Début de l'envoi des emails à ${subscribedHumorists.length} humoristes...`);
    console.log(`📧 Configuration SendGrid:`, {
      fromEmail: config.email.smtpUser,
      fromName: `${organizerData.firstName} ${organizerData.lastName}`,
      replyTo: organizerData.email,
      subject: subject
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    // Créer une version texte simple pour améliorer la délivrabilité
    const textContent = `
Nouvel Événement Disponible !

Bonjour,

Une nouvelle opportunité vient d'être publiée sur Standup Comedy Connect !

Organisateur: ${organizerData.firstName} ${organizerData.lastName}
Email: ${organizerData.email}

Événement: ${eventData.title}
Date: ${new Date(eventData.date).toLocaleDateString('fr-FR')}
Lieu: ${eventData.location.address}, ${eventData.location.city}
${eventData.startTime ? `Heure: ${eventData.startTime}` : ''}

${eventData.description ? `Description: ${eventData.description}` : ''}

${eventData.requirements ? `
Exigences:
- Durée: ${eventData.requirements.duration} minutes
- Nombre maximum de performeurs: ${eventData.requirements.maxPerformers}
- Expérience minimale: ${eventData.requirements.minExperience} ans
` : ''}

Postulez maintenant: https://standup-comedy-app.netlify.app/events

L'équipe Standup Comedy Connect
    `.trim();

    const emailPromises = subscribedHumorists.map(async (humorist, index) => {
      try {
        // Ajouter un délai entre les envois pour éviter les envois en masse simultanés
        // Cela améliore la délivrabilité en évitant de déclencher les filtres anti-spam
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre chaque email
        }

        console.log(`📧 [${index + 1}/${subscribedHumorists.length}] Envoi à ${humorist.email}...`);

        const unsubscribeUrl = generateUnsubscribeUrl(
          humorist._id.toString(),
          humorist.email
        );

        // Générer le htmlContent pour cet humoriste spécifique avec son unsubscribeUrl
        const htmlContentForHumorist = htmlContent.replace(/\$\{unsubscribeUrl\}/g, unsubscribeUrl);

        const result = await sgMail.send({
          from: {
            email: config.email.smtpUser,
            name: 'Standup Comedy Connect' // Nom de marque cohérent au lieu du nom de l'organisateur
          },
          replyTo: organizerData.email, // Les réponses iront directement à l'organisateur
          to: humorist.email,
          subject: subject,
          html: htmlContentForHumorist,
          text: textContent, // Version texte pour améliorer la délivrabilité
          mailSettings: {
            sandboxMode: {
              enable: false // Désactiver le mode sandbox en production
            }
          },
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Entity-Ref-ID': `evenement-${eventData._id || Date.now()}-${index}`, // ID unique pour le tracking
            'Precedence': 'bulk' // Indiquer que c'est un email en masse
          },
          categories: ['evenement', 'notification', 'opportunite'], // Catégories SendGrid pour le tracking
          customArgs: {
            eventId: eventData._id?.toString() || 'unknown',
            organizerId: organizerData._id?.toString() || 'unknown',
            type: 'new_event_notification'
          }
        });
        console.log(`✅ [${index + 1}/${subscribedHumorists.length}] Email envoyé avec succès à ${humorist.email}`, result[0]?.statusCode);
        successCount++;
      } catch (emailError: any) {
        errorCount++;
        console.error(`❌ [${index + 1}/${subscribedHumorists.length}] Erreur lors de l'envoi à ${humorist.email}:`, {
          message: emailError?.message,
          response: emailError?.response?.body,
          code: emailError?.code
        });
        // Continuer avec les autres emails même si un échoue
      }
    });

    await Promise.all(emailPromises);

    console.log(
      `📊 Résumé de l'envoi: ${successCount} succès, ${errorCount} erreurs ` +
      `sur ${subscribedHumorists.length} humoristes abonnés`
    );
    console.log(`✅ Notifications envoyées à ${successCount} humoristes pour l'événement "${eventData.title}" par ${organizerData.firstName} ${organizerData.lastName}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications d\'événement:', error);
    console.error('🔍 Détail de l\'erreur:', error instanceof Error ? error.stack : 'Erreur inconnue');
    // Ne pas faire échouer la création de l'événement si l'email échoue
  }
};

export const sendApplicationStatusToComedian = async (
  comedian: any,
  event: any,
  organizer: any,
  status: 'ACCEPTED' | 'REJECTED',
  organizerMessage: string
) => {
  // ===== VÉRIFICATION ABONNEMENT EMAIL =====
  const comedianId = comedian._id || comedian.id;
  if (comedianId && !(await checkUserEmailSubscription(comedianId))) {
    console.log(`⏭️ Comédien ${comedian.email} est désabonné - email non envoyé`);
    return;
  }
  // =========================================

  const subject = status === 'ACCEPTED'
    ? `🎉 Votre candidature a été ACCEPTÉE pour l'événement "${event.title}" !`
    : `😔 Votre candidature a été REFUSÉE pour l'événement "${event.title}"`;

  // Générer l'URL de désabonnement AVANT le template HTML
  const unsubscribeUrl = comedianId
    ? generateUnsubscribeUrl(comedianId.toString(), comedian.email)
    : 'https://standup-comedy-app.netlify.app/unsubscribe';

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; background: #f8f9fa; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); padding: 32px;">
      <h2 style="color: ${status === 'ACCEPTED' ? '#28a745' : '#dc3545'}; text-align: center;">
        ${status === 'ACCEPTED' ? '🎉 Félicitations !' : '😔 Candidature refusée'}
      </h2>
      <p style="font-size: 1.1em; text-align: center;">
        ${status === 'ACCEPTED'
          ? `Votre candidature pour l'événement <b>${event.title}</b> a été <b>acceptée</b> par l'organisateur.`
          : `Votre candidature pour l'événement <b>${event.title}</b> a été <b>refusée</b> par l'organisateur.`}
      </p>
      <div style="margin: 24px 0; padding: 18px; background: #f0f0f0; border-radius: 8px;">
        <b>Message de l'organisateur :</b><br/>
        <i>${organizerMessage ? organizerMessage : '(Aucun message personnalisé)'}</i>
      </div>
      <div style="margin: 24px 0; padding: 18px; background: #e3f2fd; border-radius: 8px;">
        <b>Détails de l'événement :</b><br/>
        <span>📅 <b>${event.title}</b></span><br/>
        <span>🗓️ ${new Date(event.date).toLocaleDateString('fr-FR')}</span><br/>
        <span>📍 ${event.location.address}, ${event.location.city}</span>
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://standup-comedy-app.netlify.app/applications" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #667eea, #764ba2); color: white; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 1.1em;">Voir mes candidatures</a>
      </div>
      <p style="text-align: center; color: #888; margin-top: 32px; font-size: 0.95em;">L'équipe Standup Comedy Connect</p>

      <!-- Footer de désabonnement -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
        <p>
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
            Se désabonner de tous les emails
          </a>
        </p>
      </div>
    </div>
  </div>
  `;

  // Version texte pour améliorer la délivrabilité
  const textContent = `
${status === 'ACCEPTED' ? '🎉 Félicitations !' : '😔 Candidature refusée'}

${status === 'ACCEPTED'
  ? `Votre candidature pour l'événement "${event.title}" a été acceptée par l'organisateur.`
  : `Votre candidature pour l'événement "${event.title}" a été refusée par l'organisateur.`}

${organizerMessage ? `Message de l'organisateur: ${organizerMessage}` : ''}

Détails de l'événement:
- ${event.title}
- Date: ${new Date(event.date).toLocaleDateString('fr-FR')}
- Lieu: ${event.location.address}, ${event.location.city}

Voir mes candidatures: https://standup-comedy-app.netlify.app/applications

L'équipe Standup Comedy Connect
  `.trim();

  await sgMail.send({
    from: {
      email: config.email.smtpUser,
      name: 'Standup Comedy Connect'
    },
    replyTo: organizer.email,
    to: comedian.email,
    subject,
    html: htmlContent,
    text: textContent,
    mailSettings: {
      sandboxMode: {
        enable: false
      }
    },
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Entity-Ref-ID': `status-${status}-${Date.now()}`
    },
    categories: ['candidature', 'status', status.toLowerCase()],
  });
}; 

// Notifier les humoristes ayant déjà postulé quand un événement est modifié
export const sendEventUpdatedNotificationToApplicants = async (
  applications: Array<{ _id: string; comedian: any }>,
  event: any,
  organizer: { firstName: string; lastName: string; email: string }
) => {
  if (!applications || applications.length === 0) return;

  const subject = `✏️ Mise à jour de l'événement "${event.title}"`;
  const frontendBase = 'https://standup-comedy-app.netlify.app';

  const sendAll = applications.map(async (app: any) => {
    const comedian = app.comedian;
    if (!comedian?.email) return Promise.resolve();

    // ===== VÉRIFICATION ABONNEMENT EMAIL =====
    const comedianId = comedian._id || comedian.id;
    if (comedianId && !(await checkUserEmailSubscription(comedianId))) {
      console.log(`⏭️ Comédien ${comedian.email} est désabonné - email non envoyé`);
      return Promise.resolve();
    }
    // =========================================

    const loginUrl = `${frontendBase}/login?redirect=/applications`;

    const html = `
    <div style="font-family: Arial, sans-serif; background: #f8f9fa; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); padding: 24px;">
        <h2 style="margin-top:0">✏️ L'organisateur a modifié un événement</h2>
        <p>Bonjour ${comedian.firstName || ''},</p>
        <p>L'événement auquel vous avez postulé a été mis à jour par <b>${organizer.firstName} ${organizer.lastName}</b>.</p>
        <div style="margin: 16px 0; padding: 16px; background:#e3f2fd; border-left: 4px solid #2196f3; border-radius: 8px;">
          <div><b>📛 Titre:</b> ${event.title}</div>
          <div><b>📅 Date:</b> ${new Date(event.date).toLocaleDateString('fr-FR')}</div>
          <div><b>📍 Lieu:</b> ${event.location?.address || ''} ${event.location?.city ? `- ${event.location.city}` : ''}</div>
          ${event.startTime ? `<div><b>⏰ Heure:</b> ${event.startTime}</div>` : ''}
        </div>
        <p>Pour confirmer si vous restez inscrit ou vous désinscrire, connectez-vous sur votre espace candidatures.</p>
        <div style="text-align:center; margin-top: 20px;">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;border-radius:24px;text-decoration:none;font-weight:bold">Se connecter</a>
        </div>
        <p style="color:#888; margin-top:24px;">Cet email est automatique. Merci de ne pas y répondre.</p>

        <!-- Footer de désabonnement -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
          <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
          <p>
            <a href="\${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
              Se désabonner de tous les emails
            </a>
          </p>
        </div>
      </div>
    </div>`;

    // Version texte pour améliorer la délivrabilité
    const textContent = `
✏️ L'organisateur a modifié un événement

Bonjour ${comedian.firstName || ''},

L'événement auquel vous avez postulé a été mis à jour par ${organizer.firstName} ${organizer.lastName}.

Événement: ${event.title}
Date: ${new Date(event.date).toLocaleDateString('fr-FR')}
Lieu: ${event.location?.address || ''} ${event.location?.city ? `- ${event.location.city}` : ''}
${event.startTime ? `Heure: ${event.startTime}` : ''}

Pour confirmer si vous restez inscrit ou vous désinscrire, connectez-vous sur votre espace candidatures:
https://standup-comedy-app.netlify.app/login?redirect=/applications

L'équipe Standup Comedy Connect
    `.trim();

    const unsubscribeUrl = comedianId
      ? generateUnsubscribeUrl(comedianId.toString(), comedian.email)
      : 'https://standup-comedy-app.netlify.app/unsubscribe';

    // Générer le html pour ce comédien spécifique avec son unsubscribeUrl
    const htmlForComedian = html.replace(/\$\{unsubscribeUrl\}/g, unsubscribeUrl);

    return sgMail.send({
      from: {
        email: config.email.smtpUser,
        name: 'Standup Comedy Connect'
      },
      replyTo: organizer.email,
      to: comedian.email,
      subject,
      html: htmlForComedian,
      text: textContent,
      mailSettings: {
        sandboxMode: {
          enable: false
        }
      },
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `update-${event._id || Date.now()}`
      },
      categories: ['evenement', 'mise-a-jour'],
    });
  });

  await Promise.all(sendAll);
};

export const sendEventReminder = async (
  comedian: { email: string; firstName?: string; lastName?: string },
  event: { title: string; date: Date; location?: any; startTime?: string },
  type: 'J-3' | 'J-1' | '-2H'
) => {
  // ===== VÉRIFICATION ABONNEMENT EMAIL =====
  const comedianId = (comedian as any)._id || (comedian as any).id;
  if (comedianId && !(await checkUserEmailSubscription(comedianId))) {
    console.log(`⏭️ Comédien ${comedian.email} est désabonné - rappel non envoyé`);
    return;
  }
  // =========================================

  const subjectMap = {
    'J-3': `⏳ Rappel J-3: "${event.title}" approche !`,
    'J-1': `📅 Rappel veille: "${event.title}" c'est demain`,
    '-2H': `⏰ Rappel: "${event.title}" commence dans 2 heures`,
  } as const;

  // Générer l'URL de désabonnement AVANT le template HTML
  const unsubscribeUrl = comedianId
    ? generateUnsubscribeUrl(comedianId.toString(), comedian.email)
    : 'https://standup-comedy-app.netlify.app/unsubscribe';

  const html = `
  <div style="font-family: Arial, sans-serif; background: #f8f9fa; padding: 24px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.06); padding: 24px;">
      <h2 style="margin-top:0;">${subjectMap[type]}</h2>
      <p>Bonjour ${comedian.firstName || ''},</p>
      <p>Vous êtes <b>accepté</b> pour l'événement <b>${event.title}</b>.</p>
      <div style="margin: 16px 0; padding: 16px; background:#e3f2fd; border-left: 4px solid #2196f3; border-radius: 8px;">
        <div><b>📅 Date:</b> ${new Date(event.date).toLocaleDateString('fr-FR')}</div>
        ${event.startTime ? `<div><b>⏰ Heure:</b> ${event.startTime}</div>` : ''}
        ${event.location ? `<div><b>📍 Lieu:</b> ${event.location.address || ''} ${event.location.city ? `- ${event.location.city}` : ''}</div>` : ''}
      </div>
      <p>Nous vous souhaitons une excellente performance !</p>
      <div style="text-align:center; margin-top: 12px;">
        <a href="https://standup-comedy-app.netlify.app/applications" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;border-radius:24px;text-decoration:none;font-weight:bold">Voir mes candidatures</a>
      </div>
      <p style="color:#888; margin-top:16px;">Cet email est automatique. Merci de ne pas y répondre.</p>

      <!-- Footer de désabonnement -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
        <p>
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
            Se désabonner de tous les emails
          </a>
        </p>
      </div>
    </div>
  </div>`;

  // Version texte pour améliorer la délivrabilité
  const textContent = `
${subjectMap[type]}

Bonjour ${comedian.firstName || ''},

Vous êtes accepté pour l'événement ${event.title}.

Date: ${new Date(event.date).toLocaleDateString('fr-FR')}
${event.startTime ? `Heure: ${event.startTime}` : ''}
${event.location ? `Lieu: ${event.location.address || ''} ${event.location.city ? `- ${event.location.city}` : ''}` : ''}

Nous vous souhaitons une excellente performance !

Voir mes candidatures: https://standup-comedy-app.netlify.app/applications

L'équipe Standup Comedy Connect
  `.trim();

  await sgMail.send({
    from: {
      email: config.email.smtpUser,
      name: 'Standup Comedy Connect'
    },
    to: comedian.email,
    subject: subjectMap[type],
    html,
    text: textContent,
    mailSettings: {
      sandboxMode: {
        enable: false
      }
    },
    headers: {
      'List-Unsubscribe': unsubscribeUrl ? `<${unsubscribeUrl}>` : '<https://standup-comedy-app.netlify.app/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Entity-Ref-ID': `rappel-${type}-${Date.now()}`
    },
    categories: ['rappel', 'evenement'],
  });
};

// Notifier les participants d'un événement annulé (avec raison)
export const sendEventCancellationToParticipants = async (
  participants: Array<{ email: string; firstName?: string; lastName?: string }>,
  event: { title: string; date: Date; location?: any },
  organizer: { firstName: string; lastName: string; email: string },
  cancellationReason?: string
) => {
  if (!participants || participants.length === 0) return;

  const subject = `🛑 Événement annulé: "${event.title}"`;

  const sends = participants
    .filter(p => !!p.email)
    .map(async (p) => {
      // ===== VÉRIFICATION ABONNEMENT EMAIL =====
      const participantId = (p as any)._id || (p as any).id;
      if (participantId && !(await checkUserEmailSubscription(participantId))) {
        console.log(`⏭️ Participant ${p.email} est désabonné - email non envoyé`);
        return Promise.resolve();
      }
      // =========================================

      const html = `
      <div style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px;">
        <div style="max-width: 600px; margin:auto; background:white; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.06); padding:24px;">
          <h2 style="margin-top:0;color:#dc3545;">🛑 Événement annulé</h2>
          <p>Bonjour ${p.firstName || ''}${p.lastName ? ' ' + p.lastName : ''},</p>
          <p>L'événement <b>${event.title}</b> prévu le <b>${new Date(event.date).toLocaleDateString('fr-FR')}</b> a été <b>annulé</b> par <b>${organizer.firstName} ${organizer.lastName}</b>.</p>
          ${event.location ? `<p><b>Lieu:</b> ${event.location.address || ''} ${event.location.city ? ' - ' + event.location.city : ''}</p>` : ''}
          ${cancellationReason ? `<div style="margin:16px 0; padding:12px; background:#fff3cd; border-left:4px solid #ffc107; border-radius:8px;"><b>Raison fournie:</b><br/><i>${cancellationReason}</i></div>` : ''}
          <p>Nous vous remercions pour votre compréhension.</p>
          <p style="color:#888; margin-top:16px; font-size:0.95em;">Cet email est automatique. Merci de ne pas y répondre.</p>

          <!-- Footer de désabonnement -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
            <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
            <p>
              <a href="\${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                Se désabonner de tous les emails
              </a>
            </p>
          </div>
        </div>
      </div>`;

      // Version texte pour améliorer la délivrabilité
      const textContent = `
🛑 Événement annulé

Bonjour ${p.firstName || ''}${p.lastName ? ' ' + p.lastName : ''},

L'événement ${event.title} prévu le ${new Date(event.date).toLocaleDateString('fr-FR')} a été annulé par ${organizer.firstName} ${organizer.lastName}.

${event.location ? `Lieu: ${event.location.address || ''} ${event.location.city ? ' - ' + event.location.city : ''}` : ''}
${cancellationReason ? `Raison: ${cancellationReason}` : ''}

Nous vous remercions pour votre compréhension.

L'équipe Standup Comedy Connect
      `.trim();

      const unsubscribeUrl = participantId
        ? generateUnsubscribeUrl(participantId.toString(), p.email)
        : 'https://standup-comedy-app.netlify.app/unsubscribe';

      // Générer le html pour ce participant spécifique avec son unsubscribeUrl
      const htmlForParticipant = html.replace(/\$\{unsubscribeUrl\}/g, unsubscribeUrl);

      return sgMail.send({
        from: {
          email: config.email.smtpUser,
          name: 'Standup Comedy Connect'
        },
        replyTo: organizer.email,
        to: p.email,
        subject,
        html: htmlForParticipant,
        text: textContent,
        mailSettings: {
          sandboxMode: {
            enable: false
          }
        },
        headers: {
          'List-Unsubscribe': unsubscribeUrl ? `<${unsubscribeUrl}>` : '<https://standup-comedy-app.netlify.app/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `annulation-${Date.now()}`
        },
        categories: ['annulation', 'evenement'],
      });
    });

  await Promise.all(sends);
};

/**
 * Envoie une relance automatique à l'organisateur pour un événement incomplet
 *
 * Cette fonction est appelée par le système de cron pour relancer les organisateurs
 * lorsque leur événement n'a pas atteint le quota d'humoristes ou qu'ils ont des
 * candidatures en attente de traitement.
 *
 * @param organizer - Données de l'organisateur (email, firstName, lastName)
 * @param event - Données de l'événement concerné
 * @param daysRemaining - Nombre de jours restants avant l'événement
 * @param currentCount - Nombre actuel de participants acceptés
 * @param targetCount - Nombre d'humoristes visé par l'organisateur
 * @param pendingApplicationsCount - Nombre de candidatures en attente
 */
export const sendOrganizerEventReminder = async (
  organizer: { email: string; firstName?: string; lastName?: string },
  event: {
    _id: any;
    title: string;
    date: Date;
    location?: any;
    startTime?: string;
  },
  daysRemaining: number,
  currentCount: number,
  targetCount: number,
  pendingApplicationsCount: number
) => {
  try {
    console.log(`📬 Envoi relance organisateur: ${organizer.email} pour événement "${event.title}" (J-${daysRemaining})`);

    // ===== VÉRIFICATION ABONNEMENT EMAIL =====
    const organizerId = (organizer as any)._id || (organizer as any).id;
    if (organizerId && !(await checkUserEmailSubscription(organizerId))) {
      console.log(`⏭️ Organisateur ${organizer.email} est désabonné - relance non envoyée`);
      return;
    }
    // =========================================

    // Mode économie mémoire - désactiver temporairement les emails
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_EMAILS === 'true') {
      console.log('⚠️ 📧 Emails désactivés pour économiser la mémoire (plan gratuit)');
      return;
    }

    // Vérifier la configuration email
    if (!config.email.smtpUser || !config.email.smtpPass) {
      console.error('❌ Configuration email manquante');
      return;
    }

    // Construction de l'URL frontend pour les actions
    const frontendBase = process.env.FRONTEND_URL || 'https://standup-comedy-app.netlify.app';
    const eventId = event._id?.toString() || '';
    const applicationsUrl = `${frontendBase}/applications?eventId=${eventId}`;
    const editEventUrl = `${frontendBase}/events/edit/${eventId}`;
    const eventsUrl = `${frontendBase}/events`;

    // Construire le message principal selon la situation
    let mainMessage = '';
    let actionSuggestions = '';

    if (pendingApplicationsCount > 0 && currentCount < targetCount) {
      // Cas 1: Candidatures en attente ET quota non atteint
      mainMessage = `Votre événement a lieu dans <b>${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}</b> et le quota de <b>${targetCount} humoriste${targetCount > 1 ? 's' : ''}</b> n'est pas atteint (<b>${currentCount}/${targetCount}</b>). De plus, vous avez <b>${pendingApplicationsCount} candidature${pendingApplicationsCount > 1 ? 's' : ''} en attente</b> de traitement.`;
      actionSuggestions = `
        <li>📋 <b>Consulter les ${pendingApplicationsCount} candidature${pendingApplicationsCount > 1 ? 's' : ''} en attente</b> et faire votre sélection</li>
        <li>✏️ <b>Modifier le nombre d'humoristes souhaité</b> si ${targetCount} est trop ambitieux</li>
        <li>📢 <b>Envoyer un rappel</b> aux humoristes pour attirer de nouveaux candidats</li>
      `;
    } else if (pendingApplicationsCount > 0) {
      // Cas 2: Uniquement des candidatures en attente
      mainMessage = `Votre événement a lieu dans <b>${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}</b> et vous avez <b>${pendingApplicationsCount} candidature${pendingApplicationsCount > 1 ? 's' : ''} en attente</b> de traitement.`;
      actionSuggestions = `
        <li>📋 <b>Consulter les candidatures en attente</b> et faire votre sélection</li>
        <li>✅ <b>Valider les humoristes</b> qui correspondent à vos attentes</li>
      `;
    } else {
      // Cas 3: Uniquement quota non atteint
      mainMessage = `Votre événement a lieu dans <b>${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}</b> et le quota de <b>${targetCount} humoriste${targetCount > 1 ? 's' : ''}</b> n'est pas atteint (<b>${currentCount}/${targetCount}</b>).`;
      actionSuggestions = `
        <li>✏️ <b>Réduire le nombre d'humoristes souhaité</b> si ${targetCount} est trop ambitieux</li>
        <li>📢 <b>Envoyer un rappel</b> aux humoristes pour attirer de nouveaux candidats</li>
        <li>📋 <b>Consulter les candidatures</b> pour voir s'il y a des profils intéressants</li>
      `;
    }

    const subject = `⏰ J-${daysRemaining}: Action requise pour "${event.title}" (${currentCount}/${targetCount} humoristes)`;

    // Générer l'URL de désabonnement AVANT le template HTML
    const unsubscribeUrl = organizerId
      ? generateUnsubscribeUrl(organizerId.toString(), organizer.email)
      : 'https://standup-comedy-app.netlify.app/unsubscribe';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relance événement</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header .subtitle {
            margin-top: 10px;
            font-size: 16px;
            opacity: 0.95;
        }
        .content {
            padding: 30px;
        }
        .alert-box {
            background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 8px 20px rgba(255, 152, 0, 0.3);
        }
        .alert-box p {
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
        }
        .event-summary {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .event-title {
            font-size: 20px;
            color: #333;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .event-details {
            display: grid;
            gap: 8px;
            color: #666;
            font-size: 14px;
        }
        .detail-item {
            display: flex;
            align-items: center;
        }
        .detail-icon {
            margin-right: 8px;
            width: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .stat-item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-item.warning {
            background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 13px;
            opacity: 0.95;
        }
        .action-section {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .action-section h3 {
            margin: 0 0 15px 0;
            color: #856404;
            font-size: 18px;
        }
        .action-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .action-list li {
            padding: 10px 0;
            color: #856404;
            font-size: 15px;
            border-bottom: 1px solid #ffeaa7;
        }
        .action-list li:last-child {
            border-bottom: none;
        }
        .cta-buttons {
            display: grid;
            gap: 12px;
            margin: 25px 0;
        }
        .cta-button {
            display: block;
            padding: 14px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 15px;
            text-align: center;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .btn-primary {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-tertiary {
            background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            .header, .content {
                padding: 20px;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Action Requise</h1>
            <div class="subtitle">Relance pour votre événement à venir</div>
        </div>

        <div class="content">
            <p>Bonjour <strong>${organizer.firstName || 'Organisateur'}</strong>,</p>

            <div class="alert-box">
                <p>${mainMessage}</p>
            </div>

            <div class="event-summary">
                <div class="event-title">📅 ${event.title}</div>
                <div class="event-details">
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <span>${event.location?.address || ''}, ${event.location?.city || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📆</span>
                        <span>${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    ${event.startTime ? `
                    <div class="detail-item">
                        <span class="detail-icon">⏰</span>
                        <span>${event.startTime}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item warning">
                    <div class="stat-value">${currentCount}/${targetCount}</div>
                    <div class="stat-label">Humoristes acceptés</div>
                </div>
                <div class="stat-item ${pendingApplicationsCount > 0 ? 'warning' : ''}">
                    <div class="stat-value">${pendingApplicationsCount}</div>
                    <div class="stat-label">Candidature${pendingApplicationsCount > 1 ? 's' : ''} en attente</div>
                </div>
            </div>

            <div class="action-section">
                <h3>💡 Actions suggérées</h3>
                <ul class="action-list">
                    ${actionSuggestions}
                </ul>
            </div>

            <div class="cta-buttons">
                ${pendingApplicationsCount > 0 ? `
                <a href="${applicationsUrl}" class="cta-button btn-primary">
                    📋 Voir les ${pendingApplicationsCount} candidature${pendingApplicationsCount > 1 ? 's' : ''}
                </a>
                ` : ''}
                <a href="${editEventUrl}" class="cta-button btn-secondary">
                    ✏️ Modifier l'événement
                </a>
                <a href="${eventsUrl}" class="cta-button btn-tertiary">
                    📊 Tableau de bord
                </a>
            </div>

            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 25px;">
                Connectez-vous à votre espace organisateur pour gérer votre événement.
            </p>
        </div>

        <div class="footer">
            <p><strong>L'équipe Standup Comedy Connect</strong></p>
            <p>Système de relance automatique - Ne pas répondre à cet email</p>
        </div>

        <!-- Footer de désabonnement -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
            <p>Vous recevez cet email car vous êtes inscrit sur Standup Comedy Connect.</p>
            <p>
                <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                    Se désabonner de tous les emails
                </a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Version texte pour améliorer la délivrabilité
    const textContent = `
⏰ Action Requise - Relance pour votre événement

Bonjour ${organizer.firstName || 'Organisateur'},

${mainMessage.replace(/<b>/g, '').replace(/<\/b>/g, '')}

Événement: ${event.title}
Date: ${new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Lieu: ${event.location?.address || ''}, ${event.location?.city || ''}
${event.startTime ? `Heure: ${event.startTime}` : ''}

Statistiques:
- Humoristes acceptés: ${currentCount}/${targetCount}
- Candidatures en attente: ${pendingApplicationsCount}

Actions suggérées:
${actionSuggestions.replace(/<li>/g, '- ').replace(/<\/li>/g, '').replace(/<b>/g, '').replace(/<\/b>/g, '')}

Liens utiles:
${pendingApplicationsCount > 0 ? `- Voir les candidatures: ${applicationsUrl}` : ''}
- Modifier l'événement: ${editEventUrl}
- Tableau de bord: ${eventsUrl}

L'équipe Standup Comedy Connect
Système de relance automatique - Ne pas répondre à cet email
    `.trim();

    // Envoi via SendGrid
    await sgMail.send({
      from: {
        email: config.email.smtpUser,
        name: 'Standup Comedy Connect'
      },
      to: organizer.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
      mailSettings: {
        sandboxMode: {
          enable: false
        }
      },
      headers: {
        'List-Unsubscribe': unsubscribeUrl ? `<${unsubscribeUrl}>` : '<https://standup-comedy-app.netlify.app/unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `organizer-reminder-${eventId}-j${daysRemaining}-${Date.now()}`,
        'Precedence': 'bulk'
      },
      categories: ['relance', 'organisateur', `j-${daysRemaining}`],
      customArgs: {
        eventId: eventId,
        type: 'organizer_event_reminder',
        daysRemaining: daysRemaining.toString()
      }
    });

    console.log(`✅ Relance J-${daysRemaining} envoyée à ${organizer.email} pour "${event.title}"`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la relance organisateur:', error);
    console.error('🔍 Détail de l\'erreur:', error instanceof Error ? error.stack : 'Erreur inconnue');
    // Ne pas bloquer le traitement des autres relances en cas d'erreur
  }
};