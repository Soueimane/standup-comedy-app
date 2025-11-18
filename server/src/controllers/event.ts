import { Request, Response } from 'express';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { ApplicationModel } from '../models/Application';
import { sendNewEventNotificationToHumorists, sendEventUpdatedNotificationToApplicants, sendEventCancellationToParticipants } from '../services/emailService';
import { config } from '../config/env';

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 [DEBUG] createEvent - Données reçues:', req.body);
    const { title, description, date, location, requirements, startTime, endTime, budget, maxPerformers } = req.body;
    const organizerId = req.user?.id;
    
    console.log('📅 Date reçue:', date, 'Type:', typeof date);
    console.log('📅 Date parsée:', new Date(date));

    const event = new EventModel({
      title,
      description,
      date,
      location,
      requirements,
      organizer: organizerId,
      status: 'published', // Événement directement publié et visible aux humoristes
      applications: [],
      startTime,
      endTime,
      venue: location.venue, // Utiliser venue depuis location
      budget,
      maxPerformers
    });

    await event.save();
    console.log('✅ Événement sauvegardé avec succès:', event._id);

    // Récupérer les informations de l'organisateur pour l'email et mise à jour stats
    console.log('🔍 Récupération des infos organisateur pour email...');
    const organizer = await UserModel.findById(organizerId);
    console.log('👤 Organisateur trouvé:', organizer ? `${organizer.firstName} ${organizer.lastName} (${organizer.email})` : 'AUCUN');
    
    // Update organizer's totalEvents count et envoi d'emails
    if (organizer) {
      try {
        console.log('Organisateur trouvé dans events.ts:', organizer.email);
        console.log('Total events avant incrémentation:', organizer.stats?.totalEvents);
        if (!organizer.stats) {
          organizer.stats = {};
        }
        organizer.stats.totalEvents = (organizer.stats.totalEvents || 0) + 1;
        organizer.markModified('stats');
        await organizer.save();
        console.log('Total events après incrémentation et sauvegarde:', organizer.stats.totalEvents);
      } catch (statsError) {
        console.error('⚠️ Erreur lors de la mise à jour des stats de l\'organisateur:', statsError);
        // Ne pas faire échouer la création de l'événement si les stats échouent
      }
      
      // Envoyer les notifications par email aux humoristes (en arrière-plan)
      // Ne pas attendre la fin de l'envoi pour répondre à l'utilisateur
      console.log('📧 Démarrage envoi notifications email...');
      console.log('📋 Données événement pour email:', {
        title: event.title,
        date: event.date,
        location: event.location,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        requirements: event.requirements
      });
      console.log('👤 Données organisateur pour email:', {
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email
      });
      
      // Vérifier les variables d'environnement avant d'envoyer
      console.log('🔍 Vérification variables d\'environnement:', {
        NODE_ENV: process.env.NODE_ENV,
        DISABLE_EMAILS: process.env.DISABLE_EMAILS,
        SMTP_USER: config.email.smtpUser ? 'Configuré' : 'MANQUANT',
        SMTP_PASS: config.email.smtpPass ? 'Configuré (masqué)' : 'MANQUANT'
      });
      
      sendNewEventNotificationToHumorists({
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        requirements: event.requirements,
        startTime: req.body.startTime, // Si l'heure est fournie
        endTime: req.body.endTime // Heure de fin si fournie
      }, {
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email
      }).then((result) => {
        console.log('✅ Fonction d\'envoi d\'emails terminée avec succès', result);
      }).catch(emailError => {
        console.error('❌ Erreur lors de l\'envoi des notifications:', emailError);
        console.error('🔍 Détails de l\'erreur:', {
          message: emailError?.message,
          response: emailError?.response?.body,
          code: emailError?.code,
          stack: emailError instanceof Error ? emailError.stack : 'N/A'
        });
        // Ne pas faire échouer la création de l'événement si l'email échoue
      });
    } else {
      console.log('⚠️ Impossible d\'envoyer les emails : organisateur non trouvé');
    }

    // Convertir l'événement en objet JSON pour éviter les problèmes de sérialisation
    const eventResponse = event.toObject ? event.toObject() : event;
    
    console.log('📤 Envoi de la réponse au client...');
    res.status(201).json({
      message: 'Event created successfully',
      event: eventResponse
    });
    console.log('✅ Réponse envoyée avec succès');
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, city, organizerId } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (date) query.date = { $gte: new Date(date as string) };
    if (city) query['location.city'] = city;
    if (organizerId) {
      if (mongoose.Types.ObjectId.isValid(organizerId as string)) {
        query.organizer = new mongoose.Types.ObjectId(organizerId as string);
      } else {
        res.status(400).json({ message: 'Invalid organizerId' });
        return;
      }
    }

    const events = await EventModel.find(query)
      .populate('organizer', 'firstName lastName email')
      .sort({ date: 1 });

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await EventModel.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate({
        path: 'applications',
        populate: {
          path: 'comedian',
          select: 'firstName lastName email profile'
        }
      });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const organizerId = req.user?.id;
    const userRole = req.user?.role;

    console.log('🔍 [DEBUG updateEvent] Début de la mise à jour', {
      eventId,
      organizerId,
      userRole,
    });

    const event = await EventModel.findById(eventId);
    if (!event) {
      console.error('❌ [DEBUG updateEvent] Événement non trouvé', { eventId });
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Normaliser les IDs en strings pour la comparaison
    const eventOrganizerId = event.organizer 
      ? (typeof event.organizer === 'object' && event.organizer.toString 
          ? event.organizer.toString() 
          : String(event.organizer))
      : null;
    const normalizedOrganizerId = organizerId ? String(organizerId) : null;

    console.log('🔍 [DEBUG updateEvent] Comparaison des IDs', {
      eventOrganizerId,
      normalizedOrganizerId,
      eventOrganizerIdType: typeof eventOrganizerId,
      normalizedOrganizerIdType: typeof normalizedOrganizerId,
      areEqual: eventOrganizerId === normalizedOrganizerId,
    });

    if (!eventOrganizerId && normalizedOrganizerId) {
      console.warn('⚠️ [DEBUG updateEvent] Event without organizer detected during update', { eventId });
    }
    if (userRole !== 'SUPER_ADMIN' && normalizedOrganizerId && eventOrganizerId && eventOrganizerId !== normalizedOrganizerId) {
      console.error('❌ [DEBUG updateEvent] Accès refusé - IDs ne correspondent pas', {
        eventOrganizerId,
        normalizedOrganizerId,
      });
      res.status(403).json({ message: 'You are not authorized to update this event' });
      return;
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      { $set: { ...req.body, modifiedByOrganizer: true } },
      { new: true }
    );

    // Notifier les humoristes ayant postulé si l'événement est futur
    if (updatedEvent && new Date(updatedEvent.date) >= new Date()) {
      console.log('📧 [DEBUG] Mise à jour événement futur, préparation envoi emails de mise à jour...');
      const applications = await ApplicationModel.find({ event: updatedEvent._id, status: { $in: ['PENDING', 'ACCEPTED'] } })
        .populate('comedian', 'email firstName lastName');

      const organizer = await UserModel.findById(organizerId).select('firstName lastName email');
      console.log(`📧 [DEBUG] Candidatures ciblées: ${applications.length}`);
      if (organizer && applications.length > 0) {
        // Si l'événement est annulé, informer les candidats ACCEPTED et PENDING
        if (req.body.status === 'cancelled' || updatedEvent.status === 'cancelled') {
          const affectedApplications = await ApplicationModel.find({ 
            event: updatedEvent._id, 
            status: { $in: ['PENDING', 'ACCEPTED'] }
          }).populate('comedian', 'email firstName lastName');
          const participants = affectedApplications
            .map((app: any) => app.comedian)
            .filter((c: any) => !!c?.email);
          await sendEventCancellationToParticipants(participants as any, updatedEvent as any, {
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email,
          }, (req.body as any).cancellationReason);
        } else {
          // Sinon, envoyer une notification de mise à jour classique
          sendEventUpdatedNotificationToApplicants(applications as any, updatedEvent, {
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email,
          }).catch(err => console.error('❌ Erreur envoi emails maj événement:', err));
        }
      } else {
        console.log('ℹ️ [DEBUG] Aucun destinataire email trouvé ou organisateur introuvable.');
      }
    }

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id; // ✅ Corrigé : utiliser 'id' au lieu de 'eventId'
    const organizerId = req.user?.id;

    const event = await EventModel.findOne({ _id: eventId, organizer: organizerId });
    if (!event) {
      res.status(404).json({ message: 'Event not found or unauthorized' });
      return;
    }

    await EventModel.findByIdAndDelete(eventId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
};

export const getOrganizerEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizerId = req.user?.id;

    const events = await EventModel.find({ organizer: organizerId })
      .sort({ date: 1 });

    res.json({ events });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ message: 'Error fetching organizer events' });
  }
};

// GET /api/events/stats - Nombre d'événements créés par l'organisateur
export const getEventStats = async (req: AuthRequest, res: Response) => {
  try {
    const organizerId = req.user?.id; // Utiliser req.user?.id pour le middleware d'authentification
    const userRole = req.user?.role;
    
    console.log('🔍 [DEBUG] getEventStats appelé:');
    console.log('   • User ID:', organizerId);
    console.log('   • User Role:', userRole);
    console.log('   • req.user:', req.user);
    
    if (!organizerId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const now = new Date();

    // Si c'est un super admin, récupérer les statistiques globales de toute la plateforme
    if (userRole === 'SUPER_ADMIN') {
      console.log('🔥 Super Admin - Récupération des statistiques globales');
      
      // Récupérer TOUS les événements de la plateforme avec participants peuplés
      console.log('🔍 Requête MongoDB: EventModel.find({}).populate("participants")');
      const allEvents = await EventModel.find({}).populate('participants');
      console.log('📊 Événements trouvés dans la DB:', allEvents.length);
      
      // Log des premiers événements pour debug
      if (allEvents.length > 0) {
        console.log('📅 Détail des événements trouvés:');
        allEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. "${event.title}" - ${event.date} - Status: "${event.status}" - Organisateur: ${event.organizer}`);
        });
      } else {
        console.log('❌ AUCUN événement trouvé dans la base !');
        // Test direct de connexion MongoDB
        console.log('🔍 Test de connexion MongoDB...');
        try {
          if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📚 Collections disponibles:', collections.map(c => c.name));
            
            // Test direct sur la collection events
            const rawEvents = await mongoose.connection.db.collection('events').find({}).toArray();
            console.log('📊 Événements via collection directe:', rawEvents.length);
            if (rawEvents.length > 0) {
              rawEvents.slice(0, 2).forEach((event, index) => {
                console.log(`   RAW ${index + 1}. "${event.title}" - Status: "${event.status}"`);
              });
            }
          } else {
            console.log('❌ mongoose.connection.db est undefined');
          }
        } catch (dbError) {
          console.error('❌ Erreur test DB:', dbError);
        }
      }
      
      const eventIds = allEvents.map(event => event._id);

      // Récupérer TOUTES les candidatures de la plateforme
      const allApplications = await ApplicationModel.find({ event: { $in: eventIds } });
      console.log('📊 Candidatures trouvées dans la DB:', allApplications.length);

      const totalEvents = allEvents.length;
      const pendingApplications = allApplications.filter(app => app.status === 'PENDING').length;
      const acceptedApplications = allApplications.filter(app => app.status === 'ACCEPTED').length;
      const rejectedApplications = allApplications.filter(app => app.status === 'REJECTED').length;

      // Calculer les événements à venir non complets (date >= maintenant ET participants < maxPerformers)
      const upcomingIncompleteEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate >= now;
        const isPublished = event.status === 'draft' || event.status === 'published';
        const participantsCount = event.participants?.length || 0;
        const maxPerformers = event.requirements?.maxPerformers || 0;
        const isIncomplete = participantsCount < maxPerformers;
        
        return isUpcoming && isPublished && isIncomplete;
      }).length;

      // Calculer les événements complets (participants >= maxPerformers ET événement à venir)
      // Un événement est "complet" seulement si le nombre de participants acceptés atteint le maximum
      const completedEvents = allEvents.filter(event => {
        const participantsCount = event.participants?.length || 0;
        const maxPerformers = event.requirements?.maxPerformers || 0;
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate >= now;
        
        // Un événement est complet si : participants >= maxPerformers ET événement à venir
        return participantsCount >= maxPerformers && maxPerformers > 0 && isUpcoming;
      }).length;

      const cancelledEvents = allEvents.filter(event => event.status === 'cancelled').length;

      console.log('📊 Statistiques globales calculées:', {
        totalEvents,
        pendingApplications,
        acceptedApplications,
        rejectedApplications,
        upcomingIncompleteEvents,
        completedEvents
      });

      return res.status(200).json({ 
        totalEvents, 
        upcomingIncompleteEvents, 
        completedEvents, 
        cancelledEvents,
        pendingApplications, 
        acceptedApplications, 
        rejectedApplications 
      });
    }

    console.log('👤 Utilisateur normal (non super admin) - Role:', userRole);

    // Logique existante pour les organisateurs normaux
    const objectOrganizerId = new mongoose.Types.ObjectId(organizerId);

    // Récupérer tous les événements de l'organisateur avec participants peuplés
    const allEvents = await EventModel.find({ organizer: objectOrganizerId }).populate('participants');
    const eventIds = allEvents.map(event => event._id);

    // Récupérer toutes les candidatures liées à ces événements
    const allApplications = await ApplicationModel.find({ event: { $in: eventIds } });

    const totalEvents = allEvents.length;
    const pendingApplications = allApplications.filter(app => app.status === 'PENDING').length;
    const acceptedApplications = allApplications.filter(app => app.status === 'ACCEPTED').length;
    const rejectedApplications = allApplications.filter(app => app.status === 'REJECTED').length;

    // Calculer les événements à venir non complets (date >= maintenant ET participants < maxPerformers)
    const upcomingIncompleteEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      const isUpcoming = eventDate >= now;
      const isPublished = event.status === 'draft' || event.status === 'published';
      const participantsCount = event.participants?.length || 0;
      const maxPerformers = event.requirements?.maxPerformers || 0;
      const isIncomplete = participantsCount < maxPerformers;
      
      return isUpcoming && isPublished && isIncomplete;
    }).length;

    // Calculer les événements complets (participants >= maxPerformers ET événement à venir)
    // Un événement est "complet" seulement si le nombre de participants acceptés atteint le maximum
    const completedEvents = allEvents.filter(event => {
      const participantsCount = event.participants?.length || 0;
      const maxPerformers = event.requirements?.maxPerformers || 0;
      const eventDate = new Date(event.date);
      const isUpcoming = eventDate >= now;
      
      // Un événement est complet si : participants >= maxPerformers ET événement à venir
      return participantsCount >= maxPerformers && maxPerformers > 0 && isUpcoming;
    }).length;

    const cancelledEvents = allEvents.filter(event => event.status === 'cancelled').length;

    console.log('📊 Statistiques calculées pour organisateur:', {
      totalEvents,
      upcomingIncompleteEvents,
      completedEvents,
      cancelledEvents,
      pendingApplications,
      acceptedApplications,
      rejectedApplications
    });

    res.status(200).json({ totalEvents, upcomingIncompleteEvents, completedEvents, cancelledEvents, pendingApplications, acceptedApplications, rejectedApplications });
  } catch (err) {
    console.error('Error fetching event stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const notifyHumorists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const organizerId = req.user?.id;

    // Récupérer l'événement
    const event = await EventModel.findById(eventId)
      .populate('organizer', 'firstName lastName email');
    
    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur est bien l'organisateur de l'événement
    const eventOrganizerId = typeof event.organizer === 'object' && event.organizer !== null 
      ? (event.organizer as any)._id?.toString() 
      : event.organizer?.toString();
    
    if (eventOrganizerId !== organizerId) {
      res.status(403).json({ message: 'Vous n\'êtes pas autorisé à envoyer des notifications pour cet événement' });
      return;
    }

    // Récupérer les informations de l'organisateur
    const organizer = await UserModel.findById(organizerId);
    if (!organizer) {
      res.status(404).json({ message: 'Organisateur non trouvé' });
      return;
    }

    // Préparer les données de l'événement pour l'email
    const eventData = {
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      requirements: event.requirements,
      startTime: event.startTime,
      endTime: event.endTime
    };

    const organizerData = {
      _id: organizer._id,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      email: organizer.email
    };

    // Envoyer les notifications en arrière-plan
    sendNewEventNotificationToHumorists(eventData, organizerData)
      .then(() => {
        console.log(`✅ Notifications envoyées manuellement pour l'événement "${event.title}" par ${organizer.firstName} ${organizer.lastName}`);
      })
      .catch((error) => {
        console.error('❌ Erreur lors de l\'envoi manuel des notifications:', error);
      });

    res.status(200).json({ 
      message: 'Envoi des notifications aux humoristes en cours',
      eventId: event._id,
      eventTitle: event.title
    });
  } catch (error) {
    console.error('Error notifying humorists:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi des notifications' });
  }
}; 