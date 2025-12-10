import { Request, Response } from 'express';
import { ApplicationModel } from '../models/Application';
import { EventModel } from '../models/Event';
import { AuthRequest } from '../middleware/auth';
import { EventDocument } from '../models/Event';
import { ApplicationDocument } from '../models/Application';
import { Event, Application } from '../types';
import { Types } from 'mongoose';
import { UserModel } from '../models/User';
import { sendApplicationNotificationToOrganizer, sendApplicationStatusToComedian } from '../services/emailService';
import { IPopulatedApplication, IPopulatedEvent } from '../types';
import { IPopulatedUser } from '../types/user';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Fonction pour construire avatarUrl à partir de avatar.data
const buildAvatarDataUrl = (user: any): string | undefined => {
  if (user?.avatar?.data) {
    const contentType = user.avatar.contentType || 'image/png';
    const base64 = user.avatar.data.toString('base64');
    return `data:${contentType};base64,${base64}`;
  }
  return user?.avatarUrl || undefined;
};

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, performanceDetails, message } = req.body;
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'événement
    if (!Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        message: 'ID d\'événement invalide'
      });
      return;
    }

    const eventObjectId = new Types.ObjectId(eventId);
    const comedianObjectId = new Types.ObjectId(comedianId);

    // Vérifier si l'événement existe
    const event = await EventModel.findById(eventObjectId);
    if (!event) {
      res.status(404).json({
        message: 'Événement non trouvé'
      });
      return;
    }

    // Vérifier si l'application existe déjà
    const existingApplication = await ApplicationModel.findOne({
      event: eventObjectId,
      comedian: comedianObjectId
    });

    if (existingApplication) {
      res.status(409).json({
        message: 'Vous avez déjà postulé pour cet événement'
      });
      return;
    }

    // Vérifier si l'humoriste s'est retiré de cet événement
    const hasWithdrawn = event.withdrawnComedians &&
      event.withdrawnComedians.some(id => id.toString() === comedianObjectId.toString());

    if (hasWithdrawn) {
      res.status(409).json({
        message: 'Vous ne pouvez pas postuler à nouveau après vous être retiré de cet événement'
      });
      return;
    }

    // Créer l'application
    const application = new ApplicationModel({
      event: eventObjectId,
      comedian: comedianObjectId,
      performanceDetails: performanceDetails || {},
      message: message || '',
      status: 'PENDING'
    });

    await application.save();

    // Ajouter l'application à l'événement
    const eventDoc = event as EventDocument;
    eventDoc.applications.push(application._id as unknown as Types.ObjectId);
    await eventDoc.save();

    // Mettre à jour les statistiques de l'humoriste
    const comedian = await UserModel.findById(comedianId);
    if (comedian) {
      if (!comedian.stats) {
        comedian.stats = {};
      }
      comedian.stats.applicationsSent = (comedian.stats.applicationsSent || 0) + 1;
      comedian.markModified('stats');
      await comedian.save();
    }

    // Envoyer une notification à l'organisateur
    try {
      const organizer = await UserModel.findById(event.organizer);
      if (organizer && comedian) {
        await sendApplicationNotificationToOrganizer(
          event,
          comedian,
          organizer,
          { performanceDetails, message }
        );
      }
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification à l\'organisateur:', emailError);
    }

    res.status(201).json({
      message: 'Application soumise avec succès',
      application
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'application:', error);
    res.status(500).json({ message: 'Erreur lors de la soumission de l\'application' });
  }
};

export const getEventApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'événement
    if (!Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        message: 'ID d\'événement invalide'
      });
      return;
    }

    // Vérifier la propriété de l'organisateur
    const event = await EventModel.findOne({
      _id: eventId,
      organizer: organizerId
    });

    if (!event) {
      res.status(403).json({
        message: 'Vous n\'avez pas la permission de consulter ces applications'
      });
      return;
    }

    // Récupérer les applications
    const applications = await ApplicationModel.find({ event: eventId })
      .populate('comedian', 'firstName lastName email phone profile')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error('Erreur lors de la récupération des applications de l\'événement:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des applications' });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { status, organizerMessage } = req.body;

    const application = await ApplicationModel.findById(applicationId).populate<{ event: IPopulatedEvent }>('event');
    if (!application) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    // Vérifier si l'utilisateur est l'organisateur de l'événement
    const isOrganizer = (application.event as IPopulatedEvent).organizer._id.toString() === req.user?.id;
    if (!isOrganizer) {
      res.status(403).json({ message: 'Non autorisé à modifier cette candidature' });
      return;
    }

    const updateData: any = { status };
    if (organizerMessage !== undefined) {
      updateData.organizerMessage = organizerMessage;
    }

    // 🚨 IMPORTANT: Récupérer l'ancien statut AVANT la mise à jour pour la logique des stats
    const oldStatus = application.status;

    const updatedApplication = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      updateData,
      { new: true }
    ).populate<{ event: IPopulatedEvent; comedian: IPopulatedUser }>('event').populate('comedian');

    // Ajout du participant à l'événement si la candidature est acceptée
    if (status === 'ACCEPTED' && updatedApplication && updatedApplication.event && updatedApplication.comedian) {
      // L'identifiant peut être dans _id ou directement l'objet
      const eventId = (updatedApplication.event as any)._id || updatedApplication.event;
      const comedianId = (updatedApplication.comedian as any)._id || updatedApplication.comedian;
      await EventModel.findByIdAndUpdate(
        eventId,
        { $addToSet: { participants: comedianId } } // $addToSet évite les doublons
      );
    }

    // 🎪 AJOUT: Mise à jour des statistiques de l'humoriste
    if (updatedApplication && updatedApplication.comedian) {
      const comedianId = (updatedApplication.comedian as any)._id || updatedApplication.comedian;
      const comedian = await UserModel.findById(comedianId);

      if (comedian) {
        if (!comedian.stats) {
          comedian.stats = {};
        }

        console.log(`📊 [STATS UPDATE] ${comedian.firstName} ${comedian.lastName}: ${oldStatus} → ${status}`);

        // Logique pour applicationsAccepted
        if (status === 'ACCEPTED' && oldStatus !== 'ACCEPTED') {
          comedian.stats.applicationsAccepted = (comedian.stats.applicationsAccepted || 0) + 1;
          // Note: totalEvents sera incrémenté lors de la complétion de l'événement via processCompletedEvents
        } else if (status !== 'ACCEPTED' && oldStatus === 'ACCEPTED') {
          comedian.stats.applicationsAccepted = Math.max(0, (comedian.stats.applicationsAccepted || 0) - 1);
          // Note: totalEvents est uniquement géré par processCompletedEvents
        }

        // Logique pour applicationsRejected
        if (status === 'REJECTED' && oldStatus !== 'REJECTED') {
          comedian.stats.applicationsRejected = (comedian.stats.applicationsRejected || 0) + 1;
        } else if (status !== 'REJECTED' && oldStatus === 'REJECTED') {
          comedian.stats.applicationsRejected = Math.max(0, (comedian.stats.applicationsRejected || 0) - 1);
        }

        // Logique pour applicationsPending
        if (status === 'PENDING' && oldStatus !== 'PENDING') {
          comedian.stats.applicationsPending = (comedian.stats.applicationsPending || 0) + 1;
        } else if (status !== 'PENDING' && oldStatus === 'PENDING') {
          comedian.stats.applicationsPending = Math.max(0, (comedian.stats.applicationsPending || 0) - 1);
        }

        // Logique pour EXPIRED - décrémente applicationsPending si transition PENDING → EXPIRED
        // Note: Déjà géré par la logique ci-dessus, mais explicité ici pour clarté
        if (status === 'EXPIRED' && oldStatus === 'PENDING') {
          console.log(`⏰ Application expirée pour ${comedian.firstName} ${comedian.lastName}`);
        }

        comedian.markModified('stats');
        await comedian.save();
        console.log(`💾 Stats sauvegardées pour ${comedian.firstName} ${comedian.lastName}`);
      }
    }

    // Envoi du mail à l'humoriste lors de l'acceptation ou du refus
    if (updatedApplication && updatedApplication.comedian && updatedApplication.event && (status === 'ACCEPTED' || status === 'REJECTED')) {
      // Récupère l'id de l'événement de façon robuste
      const eventId = (typeof updatedApplication.event === 'object' && updatedApplication.event !== null && '_id' in updatedApplication.event)
        ? (updatedApplication.event as any)._id
        : updatedApplication.event;
      const event = await EventModel.findById(eventId).populate('organizer');
      const organizer = event && event.organizer ? event.organizer : null;
      if (event && organizer) {
        sendApplicationStatusToComedian(
          updatedApplication.comedian,
          event,
          organizer,
          status,
          organizerMessage || ''
        ).then(() => {
          console.log(`[EMAIL] Succès de l'envoi à l'humoriste (${(updatedApplication.comedian as any).email}) pour statut ${status}`);
        }).catch(err => {
          console.error(`[EMAIL] Erreur lors de l'envoi à l'humoriste (${(updatedApplication.comedian as any).email}) :`, err);
        });
      }
    }

    res.json(updatedApplication);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'application:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut de l\'application' });
  }
};

export const getComedianApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Vérifier que l'utilisateur est un humoriste
    const user = await UserModel.findById(comedianId);
    if (!user || user.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les humoristes peuvent accéder à leurs applications'
      });
      return;
    }

    const applications = await ApplicationModel.find({ comedian: comedianId })
      .populate({
        path: 'event',
        select: 'title date location status'
      })
      .sort({ createdAt: -1 });

    // Transformer les applications pour ajouter avatarUrl à chaque humoriste
    const transformedApplications = applications.map(app => {
      const appObj: any = app.toObject ? app.toObject() : app;
      if (appObj.comedian) {
        appObj.comedian = {
          ...appObj.comedian,
          avatarUrl: buildAvatarDataUrl(appObj.comedian)
        };
        // Supprimer le champ avatar pour ne pas l'envoyer au client
        if ('avatar' in appObj.comedian) {
          delete appObj.comedian.avatar;
        }
      }
      return appObj;
    });

    res.json({ applications: transformedApplications });
  } catch (error) {
    console.error('Erreur lors de la récupération des applications de l\'humoriste:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des applications' });
  }
};

/**
 * Vérifie si une candidature existe déjà pour un comédien et un événement
 */
export const checkApplicationExists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, comedianId } = req.params;
    const existingApplication = await ApplicationModel.findOne({
      event: new Types.ObjectId(eventId),
      comedian: new Types.ObjectId(comedianId),
    });
    res.json({ hasApplied: !!existingApplication });
  } catch (error) {
    console.error('Erreur lors de la vérification de la candidature:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification de la candidature' });
  }
};

/**
 * Récupère toutes les candidatures visibles par l'utilisateur
 * Filtre selon le rôle: Super Admin voit tout, Comédien voit les siennes, Organisateur voit celles de ses événements
 */
export const getAllApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Utilisateur non authentifié.' });
      return;
    }

    const { status, eventId } = req.query as { status?: string | string[]; eventId?: string };

    // Construire un filtre DB minimal si eventId est fourni
    const dbFilter: any = {};
    if (eventId && Types.ObjectId.isValid(eventId)) {
      dbFilter.event = new Types.ObjectId(eventId);
    }

    // Récupérer les candidatures (avec filtre éventuel par eventId)
    const applications = await ApplicationModel.find(dbFilter).select('+performanceDetails +message +organizerMessage')
      .populate({
        path: 'event',
        select: 'title date startTime endTime organizer location updatedAt modifiedByOrganizer status requirements participants',
        populate: {
          path: 'organizer',
          select: 'firstName lastName email'
        }
      })
      .populate('comedian');

    // Récupérer les informations de l'utilisateur pour vérifier son rôle
    const currentUser = await UserModel.findById(userId);
    const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';

    // Filtrage JS : l'utilisateur est soit le comédien, soit l'organisateur de l'événement, soit un super admin
    let filteredApplications = applications.filter(app => {
      // Super admin peut voir toutes les candidatures
      if (isSuperAdmin) {
        return true;
      }

      const isComedian = app.comedian && (app.comedian as any)._id.toString() === userId;
      const isOrganizer = app.event && (app.event as any).organizer && (app.event as any).organizer._id.toString() === userId;
      return isComedian || isOrganizer;
    });

    // Filtrage par statut si demandé
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredApplications = filteredApplications.filter(app => statusArray.includes(app.status));
    }

    // Transformer les applications pour ajouter avatarUrl à chaque humoriste
    const transformedApplications = filteredApplications.map(app => {
      const appObj: any = app.toObject ? app.toObject() : app;
      if (appObj.comedian) {
        appObj.comedian = {
          ...appObj.comedian,
          avatarUrl: buildAvatarDataUrl(appObj.comedian)
        };
        // Supprimer le champ avatar pour ne pas l'envoyer au client
        if ('avatar' in appObj.comedian) {
          delete appObj.comedian.avatar;
        }
      }
      return appObj;
    });

    res.json(transformedApplications);
  } catch (error) {
    console.error('Erreur lors de la récupération des candidatures:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des candidatures' });
  }
};

/**
 * Récupère une candidature spécifique avec vérification d'autorisation
 */
export const getApplicationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const application = await ApplicationModel.findById(applicationId)
      .populate<{ event: IPopulatedEvent; comedian: IPopulatedUser }>('event')
      .populate('comedian');

    if (!application) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    // Vérifier si l'utilisateur est le candidat ou l'organisateur de l'événement
    const isComedian = (application.comedian as IPopulatedUser)._id.toString() === req.user?.id;
    const isOrganizer = (application.event as IPopulatedEvent).organizer._id.toString() === req.user?.id;

    if (!isComedian && !isOrganizer) {
      res.status(403).json({ message: 'Non autorisé à voir cette candidature' });
      return;
    }

    // Transformer l'application pour ajouter avatarUrl à l'humoriste
    const appObj: any = application.toObject ? application.toObject() : application;
    if (appObj.comedian) {
      appObj.comedian = {
        ...appObj.comedian,
        avatarUrl: buildAvatarDataUrl(appObj.comedian)
      };
      // Supprimer le champ avatar pour ne pas l'envoyer au client
      if ('avatar' in appObj.comedian) {
        delete appObj.comedian.avatar;
      }
    }

    res.json(appObj);
  } catch (error) {
    console.error('Erreur lors de la récupération de la candidature:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la candidature' });
  }
};

/**
 * Confirme la participation d'un comédien à un événement
 */
export const confirmParticipation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🎪 DEBUT confirm participation');
    console.log('🎪 Application ID:', req.params.applicationId);
    console.log('🎪 User ID:', req.user?.id);

    const { applicationId } = req.params;
    const comedianId = req.user?.id;

    if (!comedianId) {
      console.log('❌ Non authentifié');
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    // Trouver la candidature
    const application = await ApplicationModel.findById(applicationId);
    console.log('🔍 Application trouvée:', !!application);

    if (!application) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    // Vérifier propriétaire
    if (application.comedian.toString() !== comedianId) {
      console.log('❌ Pas le bon propriétaire');
      res.status(403).json({ message: 'Non autorisé' });
      return;
    }

    // Mettre à jour l'événement
    const event = await EventModel.findByIdAndUpdate(
      application.event,
      { modifiedByOrganizer: false },
      { new: true }
    );

    console.log('✅ Event modifié:', !!event);

    res.json({
      success: true,
      message: 'Participation confirmée'
    });
  } catch (error) {
    console.error('❌ ERREUR:', error);
    res.status(500).json({
      message: 'Erreur serveur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Retire une candidature en changeant son statut à WITHDRAWN
 * Conserve la candidature dans la base de données mais la marque comme retirée
 */
export const deleteApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const application = await ApplicationModel.findById(applicationId).populate<{ event: IPopulatedEvent; comedian: IPopulatedUser }>('event').populate('comedian');

    if (!application) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    // Vérifier si l'utilisateur est le candidat ou l'organisateur de l'événement
    const isComedian = (application.comedian as IPopulatedUser)._id.toString() === req.user?.id;
    const isOrganizer = (application.event as IPopulatedEvent).organizer._id.toString() === req.user?.id;

    if (!isComedian && !isOrganizer) {
      res.status(403).json({ message: 'Non autorisé à retirer cette candidature' });
      return;
    }

    // Si la candidature était ACCEPTED, retirer le comédien des participants de l'événement
    // ET ajouter le comédien aux withdrawnComedians pour empêcher une nouvelle candidature
    try {
      if (application.event && application.comedian) {
        const eventId = (application.event as any)._id || application.event;
        const comedianId = (application.comedian as any)._id || application.comedian;

        // Si accepté, retirer des participants
        if (application.status === 'ACCEPTED') {
          await EventModel.findByIdAndUpdate(eventId, { $pull: { participants: comedianId } });
        }

        // Dans tous les cas, ajouter aux withdrawnComedians pour empêcher re-candidature
        await EventModel.findByIdAndUpdate(eventId, {
          $addToSet: { withdrawnComedians: comedianId }
        });
      }
    } catch (e) {
      console.error('Erreur lors du retrait du participant de l\'événement:', e);
    }

    // Au lieu de supprimer, changer le statut à WITHDRAWN
    await ApplicationModel.findByIdAndUpdate(applicationId, { status: 'WITHDRAWN' });
    res.json({ message: 'Candidature retirée avec succès' });
  } catch (error) {
    console.error('Erreur lors du retrait de la candidature:', error);
    res.status(500).json({ message: 'Erreur lors du retrait de la candidature' });
  }
};

/**
 * Expire toutes les candidatures en attente pour un événement terminé
 * Appelé par le cron job lors du marquage de l'événement comme completed
 * @param eventId - L'ID de l'événement
 * @returns Le nombre de candidatures expirées
 */
export const expirePendingApplicationsForEvent = async (eventId: Types.ObjectId): Promise<number> => {
  try {
    const pendingApplications = await ApplicationModel.find({
      event: eventId,
      status: 'PENDING'
    }).populate('comedian');

    let expiredCount = 0;

    for (const application of pendingApplications) {
      // Mettre à jour le statut
      application.status = 'EXPIRED';
      await application.save();

      // Mettre à jour les stats du comédien
      if (application.comedian) {
        const comedianId = (application.comedian as any)._id || application.comedian;
        const comedian = await UserModel.findById(comedianId);

        if (comedian && comedian.stats) {
          comedian.stats.applicationsPending = Math.max(0, (comedian.stats.applicationsPending || 0) - 1);
          comedian.markModified('stats');
          await comedian.save();
          console.log(`📊 applicationsPending décrementé pour ${comedian.firstName} ${comedian.lastName}`);
        }
      }

      expiredCount++;
      console.log(`⏰ Candidature ${application._id} expirée`);
    }

    return expiredCount;
  } catch (error) {
    console.error(`❌ Erreur lors de l'expiration des candidatures:`, error);
    return 0;
  }
};

/**
 * Gère la réponse d'un humoriste après mise à jour d'événement (via lien email avec token JWT)
 */
export const respondToEventUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, action } = req.query as { token?: string; action?: 'keep' | 'withdraw' };
    if (!token || !action) {
      res.status(400).send('Requête invalide');
      return;
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret as string) as any;
      const applicationId = payload.applicationId as string;
      if (!applicationId) {
        res.status(400).send('Token invalide');
        return;
      }

      if (action === 'withdraw') {
        await ApplicationModel.findByIdAndDelete(applicationId);
        res.redirect('https://standup-comedy-app.netlify.app/applications?update=withdrawn');
        return;
      }

      // keep: on ne change rien, simple confirmation
      res.redirect('https://standup-comedy-app.netlify.app/applications?update=kept');
    } catch (_e) {
      res.status(400).send('Lien expiré ou invalide');
    }
  } catch (error) {
    console.error('Erreur lors du traitement de la réponse à la mise à jour:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
