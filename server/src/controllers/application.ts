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

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, performanceDetails, message } = req.body;
    const comedianId = req.user?.id;

    console.log('createApplication - Received eventId (string):', eventId);
    console.log('createApplication - Received comedianId (string):', comedianId);

    if (!comedianId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const eventObjectId = new Types.ObjectId(eventId);
    const comedianObjectId = new Types.ObjectId(comedianId);

    console.log('createApplication - Converted eventObjectId:', eventObjectId);
    console.log('createApplication - Converted comedianObjectId:', comedianObjectId);

    // Vérifier si l'événement existe
    const event = await EventModel.findById(eventObjectId);
    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur a déjà postulé
    const existingApplication = await ApplicationModel.findOne({
      event: eventObjectId,
      comedian: comedianObjectId
    });

    if (existingApplication) {
      res.status(400).json({ message: 'Vous avez déjà postulé à cet événement' });
      return;
    }

    // Vérifier si l'humoriste s'est déjà désinscrit de cet événement
    const hasWithdrawn = event.withdrawnComedians && event.withdrawnComedians.includes(comedianObjectId);
    if (hasWithdrawn) {
      res.status(403).json({ 
        message: 'Vous ne pouvez pas postuler à nouveau à un événement après vous être désinscrit' 
      });
      return;
    }

    // Créer la candidature
    const application = new ApplicationModel({
      event: eventObjectId,
      comedian: comedianObjectId,
      performanceDetails,
      message,
      status: 'PENDING'
    });

    await application.save();

    // Ajouter la candidature à l'événement
    const eventDoc = event as EventDocument;
    eventDoc.applications.push(application._id as unknown as Types.ObjectId);
    await eventDoc.save();

    // Incrémenter applicationsSent pour l'humoriste
    const comedian = await UserModel.findById(comedianId);
    if (comedian) {
      if (!comedian.stats) {
        comedian.stats = {};
      }
      comedian.stats.applicationsSent = (comedian.stats.applicationsSent || 0) + 1;
      comedian.markModified('stats');
      await comedian.save();
    }

    // Récupérer les données de l'organisateur pour l'email
    const organizer = await UserModel.findById(event.organizer);
    
    // Envoyer une notification email à l'organisateur
    if (organizer && comedian) {
      console.log('🎭 Envoi de notification à l\'organisateur après candidature...');
      await sendApplicationNotificationToOrganizer(
        event,
        comedian,
        organizer,
        { performanceDetails, message }
      );
    }

    res.status(201).json({
      message: 'Candidature soumise avec succès',
      application
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Erreur lors de la soumission de la candidature' });
  }
};

export const getEventApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Vérifier si l'organisateur est propriétaire de l'événement
    const event = await EventModel.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      res.status(404).json({ message: 'Event not found or unauthorized' });
      return;
    }

    const applications = await ApplicationModel.find({ event: eventId })
      .populate('comedian', 'firstName lastName email profile')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error('Get event applications error:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { status: newStatus, organizerMessage } = req.body;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const application = await ApplicationModel.findById(applicationId)
      .populate({
        path: 'event',
        select: 'organizer'
      })
      .populate('comedian');

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    // Vérifier si l'organisateur est propriétaire de l'événement
    const applicationDoc = application as unknown as ApplicationDocument & { event: { organizer: Types.ObjectId }, comedian: { _id: Types.ObjectId } };
    if (applicationDoc.event.organizer.toString() !== organizerId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    const oldStatus = applicationDoc.status;

    applicationDoc.status = newStatus;
    if (organizerMessage !== undefined) {
      applicationDoc.organizerMessage = organizerMessage;
    }
    await applicationDoc.save();

    // Mettre à jour les statistiques de l'humoriste
    const comedianId = applicationDoc.comedian._id;
    const comedian = await UserModel.findById(comedianId);

    if (comedian) {
      if (!comedian.stats) {
        comedian.stats = {};
      }
      // Logique pour applicationsAccepted
      if (newStatus === 'ACCEPTED' && oldStatus !== 'ACCEPTED') {
        comedian.stats.applicationsAccepted = (comedian.stats.applicationsAccepted || 0) + 1;
        
        // 🎪 NOUVEAU: Incrémenter automatiquement les participations (totalEvents) lors de l'acceptation
        comedian.stats.totalEvents = (comedian.stats.totalEvents || 0) + 1;
        console.log(`✅ Participation automatiquement ajoutée pour ${comedian.firstName} ${comedian.lastName} - Total: ${comedian.stats.totalEvents}`);
        
      } else if (newStatus !== 'ACCEPTED' && oldStatus === 'ACCEPTED') {
        comedian.stats.applicationsAccepted = Math.max(0, (comedian.stats.applicationsAccepted || 0) - 1);
        
        // 🎪 NOUVEAU: Décrémenter les participations si on passe d'ACCEPTED à autre chose
        comedian.stats.totalEvents = Math.max(0, (comedian.stats.totalEvents || 0) - 1);
        console.log(`❌ Participation retirée pour ${comedian.firstName} ${comedian.lastName} - Total: ${comedian.stats.totalEvents}`);
      }
      
      // Logique pour applicationsRejected
      if (newStatus === 'REJECTED' && oldStatus !== 'REJECTED') {
        comedian.stats.applicationsRejected = (comedian.stats.applicationsRejected || 0) + 1;
      } else if (newStatus !== 'REJECTED' && oldStatus === 'REJECTED') {
        comedian.stats.applicationsRejected = Math.max(0, (comedian.stats.applicationsRejected || 0) - 1);
      }
      
      // Logique pour applicationsPending (quand le statut devient PENDING)
      if (newStatus === 'PENDING' && oldStatus !== 'PENDING') {
        comedian.stats.applicationsPending = (comedian.stats.applicationsPending || 0) + 1;
      } else if (newStatus !== 'PENDING' && oldStatus === 'PENDING') {
        comedian.stats.applicationsPending = Math.max(0, (comedian.stats.applicationsPending || 0) - 1);
      }
      comedian.markModified('stats');
      await comedian.save();
    }

    // Après la mise à jour du statut et des stats, notifier l'humoriste par email (logique inspirée de la création d'événement)
    if (comedian && (newStatus === 'ACCEPTED' || newStatus === 'REJECTED')) {
      const event = await EventModel.findById(application.event).populate('organizer');
      const organizer = event && event.organizer ? event.organizer : null;
      if (event && organizer) {
        console.log(`[EMAIL] Tentative d'envoi à l'humoriste (${comedian.email}) pour statut ${newStatus}`);
        sendApplicationStatusToComedian(
          comedian,
          event,
          organizer,
          newStatus,
          organizerMessage || ''
        ).then(() => {
          console.log(`[EMAIL] Succès de l'envoi à l'humoriste (${comedian.email}) pour statut ${newStatus}`);
        }).catch(err => {
          console.error(`[EMAIL] Erreur lors de l'envoi à l'humoriste (${comedian.email}) :`, err);
        });
      }
    }

    res.json({
      message: 'Application status updated successfully',
      application: applicationDoc
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Error updating application status' });
  }
};

export const getComedianApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const applications = await ApplicationModel.find({ comedian: comedianId })
      .populate({
        path: 'event',
        select: 'title date location status'
      })
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error('Get comedian applications error:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
}; 