import { Request, Response } from 'express';
import { config } from '../config/env';
import { ApplicationModel } from '../models/Application';
import { sendEventReminder, sendNewEventNotificationToHumorists, sendOrganizerEventReminder } from '../services/emailService';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { notifyComediansByMobility } from '../services/mobilityNotificationService';

/**
 * Envoie un email via POST /api/email/send
 */
export const sendEmail = async (req: Request, res: Response, transporter: any): Promise<void> => {
  try {
    const { to, subject, text } = req.body;

    const mailOptions = {
      from: config.email.smtpUser,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email envoyé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email', error });
  }
};

/**
 * Teste la configuration email
 */
export const testEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailConfig = {
      SMTP_HOST: config.email.smtpHost || 'MANQUANT',
      SMTP_PORT: config.email.smtpPort || 'MANQUANT',
      SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
      SMTP_PASS: config.email.smtpPass ? 'Configuré' : 'MANQUANT',
      DISABLE_EMAILS: process.env.DISABLE_EMAILS || 'Non défini',
      NODE_ENV: process.env.NODE_ENV || 'Non défini'
    };

    // Compter les humoristes
    const humoristCount = await UserModel.countDocuments({ role: 'COMEDIAN' });

    res.json({
      message: 'Configuration email',
      config: emailConfig,
      humoristCount,
      status: emailConfig.SMTP_USER !== 'MANQUANT' && emailConfig.SMTP_PASS !== 'MANQUANT' ? 'OK' : 'ERREUR'
    });
  } catch (error) {
    console.error('Erreur test config email:', error);
    res.status(500).json({ message: 'Erreur lors du test de configuration' });
  }
};

/**
 * Envoie un email de test
 */
export const testEmailSend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      res.status(400).json({ message: 'Email de test requis' });
      return;
    }

    // Créer un évènement de test
    const testEvent = {
      title: 'Test Email - Évènement de test',
      description: 'Ceci est un email de test pour vérifier la configuration',
      date: new Date(),
      location: { address: 'Adresse test', city: 'Ville test' },
      requirements: { duration: 30, maxPerformers: 5, minExperience: 1 },
      startTime: '20:00'
    };

    const testOrganizer = {
      firstName: 'Test',
      lastName: 'Organisateur',
      email: testEmail
    };

    // Envoyer l'email de test
    await sendNewEventNotificationToHumorists(testEvent, testOrganizer);

    res.json({
      message: 'Email de test envoyé avec succès',
      testEmail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur test envoi email:', error);
    res.status(500).json({
      message: 'Erreur lors de l\'envoi de l\'email de test',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Traite les rappels d'évènements (J-3, J-1, -2h) - Cron job
 */
export const sendRemindersCron = async (req: Request, res: Response): Promise<void> => {
  try {
    const cronKey = req.header('X-CRON-KEY');
    if (!cronKey || cronKey !== config.cron.secret) {
      res.status(401).json({ message: 'Non autorisé' });
      return;
    }

    const now = new Date();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // Candidatures ACCEPTED uniquement, avec event et comedian peuplés
    const applications = await ApplicationModel.find({ status: 'ACCEPTED' })
      .populate('comedian')
      .populate('event');

    let sent = 0;

    for (const app of applications as any[]) {
      const event = app.event;
      const comedian = app.comedian;
      if (!event || !comedian) continue;
      if (!event.date) continue;

      // Construire l'heure de début: date + startTime (fallback 20:00)
      const eventStart = new Date(event.date);
      const [h, m] = (event.startTime ? event.startTime : '20:00').split(':').map((x: string) => parseInt(x, 10));
      eventStart.setHours(h || 0, m || 0, 0, 0);

      const diffMs = eventStart.getTime() - now.getTime();

      // J-3
      const j3 = 72 * 60 * 60 * 1000;
      if (diffMs >= j3 && diffMs < j3 + windowMs && !(app.reminders && app.reminders.j3Sent)) {
        await sendEventReminder(comedian, event, 'J-3');
        app.reminders = { ...(app.reminders || {}), j3Sent: true };
        await app.save();
        sent++;
        continue;
      }

      // J-1
      const j1 = 24 * 60 * 60 * 1000;
      if (diffMs >= j1 && diffMs < j1 + windowMs && !(app.reminders && app.reminders.j1Sent)) {
        await sendEventReminder(comedian, event, 'J-1');
        app.reminders = { ...(app.reminders || {}), j1Sent: true };
        await app.save();
        sent++;
        continue;
      }

      // -2h
      const h2 = 2 * 60 * 60 * 1000;
      if (diffMs >= h2 && diffMs < h2 + windowMs && !(app.reminders && app.reminders.h2Sent)) {
        await sendEventReminder(comedian, event, '-2H');
        app.reminders = { ...(app.reminders || {}), h2Sent: true };
        await app.save();
        sent++;
        continue;
      }
    }

    res.json({ message: 'Rappels traités', sent });
  } catch (error) {
    console.error('Erreur CRON reminders:', error);
    res.status(500).json({ message: 'Erreur lors du traitement des rappels' });
  }
};

/**
 * Traite les relances automatiques aux organisateurs - Cron job
 *
 * Envoie des rappels aux organisateurs dont les évènements n'ont pas atteint
 * leur quota d'humoristes ou qui ont des candidatures en attente.
 *
 * Délais: J-10, J-7, J-5, J-3, J-2, J-1
 */
export const sendOrganizerRemindersCron = async (req: Request, res: Response): Promise<void> => {
  try {
    // --- SÉCURITÉ: Vérifier l'authentification du cron ---
    const cronKey = req.header('X-CRON-KEY');
    if (!cronKey || cronKey !== config.cron.secret) {
      console.error('❌ Tentative d\'accès non autorisée à l\'endpoint cron organizer-reminders');
      res.status(401).json({ message: 'Non autorisé' });
      return;
    }

    console.log('🔔 Démarrage du job cron: relances organisateurs');
    const now = new Date();

    // Définition des délais de relance en millisecondes
    const reminderDelays = {
      j10: 10 * 24 * 60 * 60 * 1000,  // 10 jours
      j7: 7 * 24 * 60 * 60 * 1000,    // 7 jours
      j5: 5 * 24 * 60 * 60 * 1000,    // 5 jours
      j3: 3 * 24 * 60 * 60 * 1000,    // 3 jours
      j2: 2 * 24 * 60 * 60 * 1000,    // 2 jours
      j1: 1 * 24 * 60 * 60 * 1000     // 1 jour
    };

    // Récupérer tous les évènements publiés avec date future
    const events = await EventModel.find({
      status: 'published',
      date: { $gt: now }
    })
      .populate('organizer')
      .populate('applications');

    console.log(`📊 ${events.length} évènements publiés trouvés`);

    let sentCount = 0;
    const processedEvents: string[] = [];

    // Traiter chaque évènement
    for (const event of events as any[]) {
      try {
        const organizer = event.organizer;

        // Vérifier que l'organisateur existe
        if (!organizer || !organizer.email) {
          console.log(`⚠️ Évènement ${event._id}: organisateur manquant ou sans email`);
          continue;
        }

        // Vérifier qu'il y a un quota défini
        const targetCount = event.requirements?.maxPerformers;
        if (!targetCount || targetCount === 0) {
          continue;  // Pas de quota défini, on ne relance pas
        }

        // Calculer le nombre de participants acceptés
        const currentCount = event.participants?.length || 0;

        // Compter les candidatures en attente
        const applications = await ApplicationModel.find({
          event: event._id,
          status: 'PENDING'
        });
        const pendingCount = applications.length;

        // --- CONDITION DE RELANCE ---
        // On relance SI : quota non atteint OU candidatures en attente
        const shouldRemind = currentCount < targetCount || pendingCount > 0;

        if (!shouldRemind) {
          continue;  // Évènement complet et aucune candidature en attente
        }

        // Calculer la différence en JOURS seulement (ignorer les heures)
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);  // Reset à minuit

        const todayDate = new Date(now);
        todayDate.setHours(0, 0, 0, 0);  // Reset à minuit

        // Différence en jours (convertir en ms)
        const diffDays = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        const diffMs = diffDays * 24 * 60 * 60 * 1000;

        // Initialiser organizerReminders si nécessaire
        if (!event.organizerReminders) {
          event.organizerReminders = {};
        }

        let reminderSent = false;

        // --- VÉRIFIER CHAQUE DÉLAI ---

        // J-10
        if (
          diffMs >= reminderDelays.j10 &&
          !event.organizerReminders.j10Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            10,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j10Sent = true;
          reminderSent = true;
        }
        // J-7
        else if (
          diffMs >= reminderDelays.j7 &&
          diffMs < reminderDelays.j10 &&
          !event.organizerReminders.j7Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            7,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j7Sent = true;
          reminderSent = true;
        }
        // J-5
        else if (
          diffMs >= reminderDelays.j5 &&
          diffMs < reminderDelays.j7 &&
          !event.organizerReminders.j5Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            5,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j5Sent = true;
          reminderSent = true;
        }
        // J-3
        else if (
          diffMs >= reminderDelays.j3 &&
          diffMs < reminderDelays.j5 &&
          !event.organizerReminders.j3Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            3,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j3Sent = true;
          reminderSent = true;
        }
        // J-2
        else if (
          diffMs >= reminderDelays.j2 &&
          diffMs < reminderDelays.j3 &&
          !event.organizerReminders.j2Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            2,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j2Sent = true;
          reminderSent = true;
        }
        // J-1
        else if (
          diffMs >= 0 &&
          diffMs < reminderDelays.j2 &&
          !event.organizerReminders.j1Sent
        ) {
          await sendOrganizerEventReminder(
            organizer,
            event,
            1,
            currentCount,
            targetCount,
            pendingCount
          );
          event.organizerReminders.j1Sent = true;
          reminderSent = true;
        }

        // Sauvegarder le tracking si une relance a été envoyée
        if (reminderSent) {
          await event.save();
          sentCount++;
          processedEvents.push(event.title);
          console.log(`✅ Relance envoyée pour l'évènement "${event.title}"`);
        }

      } catch (eventError) {
        // Ne pas bloquer le traitement des autres évènements en cas d'erreur
        console.error(`❌ Erreur lors du traitement de l'évènement ${event._id}:`, eventError);
      }
    }

    const response = {
      message: 'Relances organisateurs traitées',
      sent: sentCount,
      totalEvents: events.length,
      processedEvents: processedEvents,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 Résumé: ${sentCount} relances envoyées sur ${events.length} évènements`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur CRON organizer-reminders:', error);
    res.status(500).json({
      message: 'Erreur lors du traitement des relances organisateurs',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Relances aux humoristes pour les événements incomplets à J-2 et J-1
 * Envoie des notifications aux humoristes correspondant à la zone de mobilité
 * des événements publiés qui n'ont pas atteint leur quota
 *
 * Utilise notifyComediansByMobility existant avec exclusion des candidats
 *
 * Cron job: s'exécute 1x par jour
 */
export const sendMobilityRemindersForIncompleteEventsCron = async (req: Request, res: Response): Promise<void> => {
  try {
    // --- SÉCURITÉ: Vérifier l'authentification du cron ---
    const cronKey = req.header('X-CRON-KEY');
    if (!cronKey || cronKey !== config.cron.secret) {
      console.error('❌ Tentative d\'accès non autorisée à l\'endpoint cron incomplete-event-reminders');
      res.status(401).json({ message: 'Non autorisé' });
      return;
    }

    console.log('🔔 Démarrage du job cron: relances humoristes par mobilité pour événements incomplets');
    const now = new Date();

    // Récupérer tous les événements publiés avec date future
    const events = await EventModel.find({
      status: 'published',
      date: { $gt: now }
    })
      .populate('organizer')
      .populate('participants');

    console.log(`📊 ${events.length} événements publiés trouvés`);

    let sentCount = 0;
    const processedEvents: { title: string; daysUntil: number; notifiedCount: number }[] = [];

    // Traiter chaque événement
    for (const event of events as any[]) {
      try {
        const organizer = event.organizer;

        // Vérifier que l'organisateur existe
        if (!organizer || !organizer.email) {
          console.log(`⚠️ Événement ${event._id}: organisateur manquant ou sans email`);
          continue;
        }

        // Vérifier qu'il y a un quota défini
        const targetCount = event.requirements?.maxPerformers;
        if (!targetCount || targetCount === 0) {
          continue;  // Pas de quota défini, on ne relance pas
        }

        // Calculer le nombre de participants acceptés
        const currentCount = event.participants?.length || 0;

        // --- CONDITION DE RELANCE ---
        // On relance SI : quota non atteint
        if (currentCount >= targetCount) {
          continue;  // Événement complet
        }

        // Calculer la différence en jours
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);

        const todayDate = new Date(now);
        todayDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        // Vérifier si on doit envoyer une relance (J-2 ou J-1)
        if (diffDays !== 2 && diffDays !== 1) {
          continue;  // N'est pas à J-2 ou J-1
        }

        // Vérifier si la relance a déjà été envoyée pour ce jour
        const reminderKey = diffDays === 2 ? 'j2' : 'j1';
        if (event.mobilityReminders?.[reminderKey]?.sentAt) {
          console.log(`⏭️ Relance J-${diffDays} déjà envoyée pour "${event.title}" - ignoré`);
          continue;
        }

        console.log(`📧 Traitement de l'événement "${event.title}" à ${event.location?.city} - J-${diffDays}`);

        // Récupérer les IDs des comédiens qui ont déjà candidaté (à exclure)
        const existingApplications = await ApplicationModel.find({
          event: event._id
        }).select('comedian');
        const excludeIds = existingApplications
          .map(app => app.comedian?.toString())
          .filter((id): id is string => !!id);

        // Utiliser notifyComediansByMobility existant avec exclusion
        const result = await notifyComediansByMobility(
          event,
          {
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email
          },
          excludeIds
        );

        // Sauvegarder les relances en DB pour tracking
        if (result.count > 0) {
          if (!event.mobilityReminders) {
            event.mobilityReminders = {};
          }
          event.mobilityReminders[reminderKey] = {
            sentAt: new Date(),
            comedianIds: result.comedians.map(c => c._id),
            emails: result.comedians.map(c => c.email)
          };
          await event.save();
          console.log(`💾 Relance J-${diffDays} sauvegardée en DB: ${result.comedians.map(c => c.email).join(', ')}`);
        }

        sentCount += result.count;
        processedEvents.push({
          title: event.title,
          daysUntil: diffDays,
          notifiedCount: result.count
        });

        console.log(`✅ ${result.count} humoristes notifiés pour l'événement "${event.title}" à J-${diffDays}`);

      } catch (eventError) {
        // Ne pas bloquer le traitement des autres évènements en cas d'erreur
        console.error(`❌ Erreur lors du traitement de l'évènement ${event._id}:`, eventError);
      }
    }

    const response = {
      message: 'Relances humoristes par mobilité traitées',
      sent: sentCount,
      totalEvents: events.length,
      processedEvents: processedEvents,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 Résumé: ${sentCount} relances envoyées pour ${processedEvents.length} événements`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur CRON incomplete-event-reminders:', error);
    res.status(500).json({
      message: 'Erreur lors du traitement des relances mobilité',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};
