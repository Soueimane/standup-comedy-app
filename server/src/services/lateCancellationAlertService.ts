import { UserModel } from '../models/User';
import { LateCancellationAlertModel } from '../models/LateCancellationAlert';
import { config } from '../config/env';
import sgMail from '@sendgrid/mail';

// Configuration SendGrid
sgMail.setApiKey(config.email.smtpPass);

/**
 * Crée une alerte d'annulation tardive et envoie un email aux super-admins
 * 
 * @param application - La candidature retirée
 * @param comedian - L'humoriste qui s'est désisté
 * @param event - L'événement concerné
 * @param hoursBeforeEvent - Nombre d'heures avant l'événement
 * @param totalLateCancellations - Nombre total d'annulations tardives de l'humoriste
 */
export const createLateCancellationAlert = async (
  application: any,
  comedian: any,
  event: any,
  hoursBeforeEvent: number,
  totalLateCancellations: number
): Promise<void> => {
  try {
    // Créer l'alerte
    await LateCancellationAlertModel.create({
      comedian: comedian._id,
      event: event._id,
      application: application._id,
      cancellationDate: new Date(),
      eventDate: event.date,
      hoursBeforeEvent,
      totalLateCancellations,
      alertSentAt: new Date(),
      isActive: true
    });

    console.log(`🚨 Alerte d'annulation tardive créée pour ${comedian.firstName} ${comedian.lastName} (${hoursBeforeEvent.toFixed(1)}h avant l'événement)`);

    // Envoyer l'email aux super-admins
    await sendLateCancellationAlertEmail(comedian, event, hoursBeforeEvent, totalLateCancellations);

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'alerte d\'annulation tardive:', error);
  }
};

/**
 * Envoie un email d'alerte aux super-admins
 */
const sendLateCancellationAlertEmail = async (
  comedian: any,
  event: any,
  hoursBeforeEvent: number,
  totalLateCancellations: number
): Promise<void> => {
  try {
    // Récupérer tous les Super Admins
    const superAdmins = await UserModel.find({ role: 'SUPER_ADMIN' });
    
    if (superAdmins.length === 0) {
      console.log('⚠️ Aucun Super Admin trouvé pour envoyer l\'alerte');
      return;
    }

    // Mode économie mémoire
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_EMAILS === 'true') {
      console.log('⚠️ 📧 Emails désactivés pour économiser la mémoire');
      return;
    }

    // Vérifier la configuration email
    if (!config.email.smtpUser || !config.email.smtpPass) {
      console.error('❌ Configuration email manquante');
      return;
    }

    // Calculer la sévérité de l'alerte
    let severity: 'NORMALE' | 'MOYENNE' | 'ÉLEVÉE' = 'NORMALE';
    let severityColor = '#28a745';
    if (totalLateCancellations >= 3) {
      severity = 'ÉLEVÉE';
      severityColor = '#dc3545';
    } else if (totalLateCancellations >= 2) {
      severity = 'MOYENNE';
      severityColor = '#ffc107';
    }

    const eventDate = new Date(event.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `🚨 Alerte: Désistement tardif de ${comedian.firstName} ${comedian.lastName} (${severity})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerte Désistement Tardif</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, ${severityColor} 0%, #c82333 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        .alert-box {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .alert-box h2 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 24px;
        }
        .severity-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            background-color: ${severityColor};
            margin-top: 10px;
        }
        .info-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #dee2e6;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #495057;
        }
        .value {
            color: #212529;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .action-button {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Alerte Désistement Tardif</h1>
            <div class="severity-badge">Sévérité: ${severity}</div>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <h2>Un humoriste s'est désisté moins de 72h avant l'événement</h2>
                <p style="margin: 0; color: #856404;">
                    L'événement a été automatiquement mis en avant dans les recommandations.
                </p>
            </div>

            <div class="info-card">
                <div class="info-row">
                    <span class="label">Humoriste:</span>
                    <span class="value">${comedian.firstName} ${comedian.lastName} (${comedian.email})</span>
                </div>
                <div class="info-row">
                    <span class="label">Événement:</span>
                    <span class="value">${event.title}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date de l'événement:</span>
                    <span class="value">${eventDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Désistement:</span>
                    <span class="value" style="color: #dc3545; font-weight: bold;">${hoursBeforeEvent.toFixed(1)} heures avant</span>
                </div>
                <div class="info-row">
                    <span class="label">Total annulations tardives:</span>
                    <span class="value" style="color: ${totalLateCancellations >= 3 ? '#dc3545' : '#ffc107'}; font-weight: bold;">${totalLateCancellations}</span>
                </div>
            </div>

            <p style="text-align: center; margin-top: 30px;">
                <a href="${config.frontend.url}/dashboard/alerts" class="action-button">
                    📊 Voir les Alertes
                </a>
            </p>
        </div>

        <div class="footer">
            <p><strong>L'équipe Connect Comedy Club</strong></p>
            <p>Connecter les talents avec les opportunités</p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
🚨 Alerte Désistement Tardif - Sévérité: ${severity}

Un humoriste s'est désisté moins de 72h avant l'événement.

Humoriste: ${comedian.firstName} ${comedian.lastName} (${comedian.email})
Événement: ${event.title}
Date: ${eventDate}
Désistement: ${hoursBeforeEvent.toFixed(1)} heures avant l'événement
Total annulations tardives: ${totalLateCancellations}

L'événement a été automatiquement mis en avant dans les recommandations.

Voir les alertes: ${config.frontend.url}/dashboard/alerts

L'équipe Connect Comedy Club
    `.trim();

    // Envoyer l'email à tous les Super Admins
    const emailPromises = superAdmins.map(async (admin) => {
      try {
        await sgMail.send({
          from: {
            email: config.email.smtpUser,
            name: 'Connect Comedy Club'
          },
          to: admin.email,
          subject: subject,
          html: htmlContent,
          text: textContent,
          categories: ['alerte', 'late-cancellation', 'super-admin']
        });
        console.log(`✅ Email d'alerte envoyé à ${admin.email}`);
      } catch (error) {
        console.error(`❌ Erreur lors de l'envoi à ${admin.email}:`, error);
      }
    });

    await Promise.all(emailPromises);
    console.log(`✅ Emails d'alerte envoyés à ${superAdmins.length} Super Admin(s)`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des emails d\'alerte:', error);
  }
};

/**
 * Récupère toutes les alertes actives
 */
export const getActiveLateCancellationAlerts = async () => {
  return LateCancellationAlertModel.find({ isActive: true })
    .populate('comedian', 'firstName lastName email')
    .populate('event', 'title date location')
    .sort({ alertSentAt: -1 });
};

/**
 * Acquitte une alerte
 */
export const acknowledgeLateCancellationAlert = async (
  alertId: string,
  adminId: string
): Promise<boolean> => {
  try {
    const result = await LateCancellationAlertModel.findByIdAndUpdate(
      alertId,
      {
        isActive: false,
        acknowledgedAt: new Date(),
        acknowledgedBy: adminId
      },
      { new: true }
    );

    return !!result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'acquittement de l\'alerte:', error);
    return false;
  }
};

/**
 * Récupère l'historique des annulations tardives d'un humoriste
 */
export const getComedianLateCancellationHistory = async (comedianId: string) => {
  return LateCancellationAlertModel.find({ comedian: comedianId })
    .populate('event', 'title date location')
    .populate('acknowledgedBy', 'firstName lastName')
    .sort({ cancellationDate: -1 });
};
