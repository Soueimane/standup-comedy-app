import { Request, Response } from 'express';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { ApplicationModel } from '../models/Application';
import { expirePendingApplicationsForEvent } from './application';
import { sendNewEventNotificationToHumorists, sendEventUpdatedNotificationToApplicants, sendEventCancellationToParticipants } from '../services/emailService';
import { config } from '../config/env';
import { AbsenceModel } from '../models/Absence';
import { emitEventCreated, emitEventUpdated, emitEventDeleted, emitEventCompleted } from '../services/eventEmitter';

// ============================================================================
// CREATE EVENT
// ============================================================================
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 [DEBUG] createEvent - Données reçues:', req.body);

    // Vérifier que l'utilisateur est authentifié
    const organizerId = req.user?.id;
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    const { title, description, date, location, requirements, startTime, endTime, budget, maxPerformers } = req.body;

    console.log('📅 Date reçue:', date, 'Type:', typeof date);
    console.log('📅 Date parsée:', new Date(date));

    const event = new EventModel({
      title,
      description,
      date,
      location,
      requirements,
      organizer: organizerId,
      status: 'published',
      applications: [],
      startTime,
      endTime,
      venue: location.venue,
      budget,
      maxPerformers
    });

    await event.save();
    console.log('✅ Événement sauvegardé avec succès:', event._id);

    // Émettre un événement SSE pour notifier tous les clients
    emitEventCreated(event._id.toString());

    // Récupérer les informations de l'organisateur pour l'email et mise à jour stats
    console.log('🔍 Récupération des infos organisateur pour email...');
    const organizer = await UserModel.findById(organizerId);
    if (!organizer) {
      console.error('❌ Organisateur non trouvé:', organizerId);
      res.status(404).json({ message: 'Organisateur non trouvé' });
      return;
    }
    console.log('👤 Organisateur trouvé:', `${organizer.firstName} ${organizer.lastName} (${organizer.email})`);

    // Update organizer's totalEvents count et envoi d'emails
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
      startTime: req.body.startTime,
      endTime: req.body.endTime
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
    });

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

// ============================================================================
// GET EVENTS (with filtering by role)
// ============================================================================
export const getEventsList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user?.id) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    const organizerId = req.query.organizerId as string;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query: any = {};

    // If an organizerId is provided, filter events by it
    if (organizerId && mongoose.Types.ObjectId.isValid(organizerId)) {
      query.organizer = organizerId;
    } else if (organizerId && !mongoose.Types.ObjectId.isValid(organizerId)) {
      res.status(400).json({ message: 'Invalid organizerId format' });
      return;
    } else if (userRole === 'ORGANIZER') {
      // If no specific organizerId, and user is an ORGANIZER, show their own events
      query.organizer = userId;
    } else if (userRole === 'COMEDIAN') {
      // For comedians, show all published events
      query.status = { $in: ['published', 'PUBLISHED', 'completed', 'COMPLETED', 'cancelled', 'CANCELLED'] };
    } else if (userRole === 'SUPER_ADMIN') {
      // Super Admin can see ALL events
      query = {};
    } else {
      // Fallback
      query.status = 'published';
    }

    const events = await EventModel.find(query).select('+withdrawnComedians').populate('participants').populate('organizer', 'firstName lastName email');

    // Filtrer les événements qui n'ont pas d'organisateur valide
    const validEvents = events.filter(event => {
      const hasValidOrganizer = event.organizer &&
        (typeof event.organizer === 'object' ?
          (event.organizer as any).firstName || (event.organizer as any)._id :
          true);

      if (!hasValidOrganizer) {
        console.warn(`⚠️ [WARNING] Événement "${event.title}" (${event._id}) a un organisateur invalide/null - sera exclu des résultats`);
      }

      return hasValidOrganizer;
    });

    // Debug temporaire pour voir quels événements sont retournés
    console.log(`🔍 [DEBUG] Route GET /api/events - Role: ${userRole}, Query:`, JSON.stringify(query, null, 2));
    console.log(`📊 [DEBUG] Événements trouvés: ${events.length}, Événements valides (avec organisateur): ${validEvents.length}`);
    validEvents.forEach(event => {
      const organizerName = event.organizer && typeof event.organizer === 'object'
        ? `${(event.organizer as any).firstName || ''} ${(event.organizer as any).lastName || ''}`.trim()
        : 'N/A';
      console.log(`📅 [DEBUG] - "${event.title}" (${new Date(event.date).toLocaleDateString('fr-FR')}) - Statut: ${event.status} - Organisateur: ${organizerName}`);
    });

    res.json({ events: validEvents });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
};

// ============================================================================
// GET EVENTS (original, without role filtering)
// ============================================================================
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, city, organizerId } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (date) {
      try {
        query.date = { $gte: new Date(date as string) };
      } catch {
        res.status(400).json({ message: 'Invalid date format' });
        return;
      }
    }
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

// ============================================================================
// GET EVENT BY ID
// ============================================================================
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    // Valider le format de l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({ message: 'Invalid event ID format' });
      return;
    }

    const event = await EventModel.findById(eventId)
      .select('+withdrawnComedians')
      .populate('organizer', 'firstName lastName email')
      .populate('participants');

    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }

    // Vérifier que l'organisateur est valide
    if (!event.organizer || (typeof event.organizer === 'object' && !(event.organizer as any).firstName)) {
      console.warn(`⚠️ [WARNING] Événement "${event.title}" (${eventId}) a un organisateur invalide/null`);
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

// ============================================================================
// UPDATE EVENT
// ============================================================================
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Support à la fois :id et :eventId pour compatibilité avec différentes routes
    const eventId = req.params.eventId || req.params.id;
    const organizerId = req.user?.id;
    const userRole = req.user?.role;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Valider le format de l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({ message: 'Invalid event ID format' });
      return;
    }

    console.log('🔍 [DEBUG updateEvent] Début de la mise à jour', {
      eventId,
      organizerId,
      userRole,
    });

    // Pour SUPER_ADMIN, on peut modifier n'importe quel événement
    // Sinon, on vérifie que l'événement appartient à l'organisateur connecté
    const event = userRole === 'SUPER_ADMIN'
      ? await EventModel.findById(eventId)
      : await EventModel.findOne({ _id: eventId, organizer: organizerId });

    if (!event) {
      console.error('❌ [DEBUG updateEvent] Événement non trouvé ou non autorisé', {
        eventId,
        organizerId,
        userRole,
        searchMethod: userRole === 'SUPER_ADMIN' ? 'findById' : 'findOne with organizer filter'
      });
      res.status(404).json({ message: 'Event not found or unauthorized' });
      return;
    }

    console.log('✅ [DEBUG updateEvent] Événement trouvé et autorisé', {
      eventId: event._id,
      eventOrganizer: event.organizer?.toString?.() || event.organizer,
      requestingOrganizer: organizerId,
    });

    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      { $set: { ...req.body, modifiedByOrganizer: true } },
      { new: true }
    );

    if (!updatedEvent) {
      console.error('❌ [DEBUG updateEvent] Échec de la mise à jour - événement non trouvé après update', { eventId });
      res.status(404).json({ message: 'Event not found after update attempt' });
      return;
    }

    console.log('✅ [DEBUG updateEvent] Événement mis à jour avec succès', {
      eventId: updatedEvent._id,
      title: updatedEvent.title,
    });

    // Émettre un événement SSE pour notifier tous les clients
    emitEventUpdated(updatedEvent._id.toString());

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

// ============================================================================
// DELETE EVENT
// ============================================================================
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user?.id;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Valider le format de l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({ message: 'Invalid event ID format' });
      return;
    }

    const event = await EventModel.findById(eventId).populate('organizer', 'firstName lastName email');

    console.log('🔍 DEBUG Suppression événement:', {
      eventId,
      userId: organizerId,
      eventOrganizer: event?.organizer,
      eventOrganizerId: event?.organizer?._id?.toString(),
      eventOrganizerString: event?.organizer?.toString()
    });

    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est l'organisateur de l'événement
    const organizerIdFromEvent = (event.organizer as any)._id?.toString() || event.organizer.toString();
    if (organizerIdFromEvent !== organizerId) {
      console.log('❌ Autorisation refusée:', {
        eventOrganizer: event.organizer,
        organizerId: organizerIdFromEvent,
        userId: organizerId,
        match: organizerIdFromEvent === organizerId
      });
      res.status(403).json({ message: 'Non autorisé à supprimer cet événement' });
      return;
    }

    // Notifier les candidats PENDING et ACCEPTED avant suppression
    try {
      const applications = await ApplicationModel.find({
        event: eventId,
        status: { $in: ['PENDING', 'ACCEPTED'] }
      }).populate('comedian', 'email firstName lastName');

      const participants = applications
        .map((app: any) => app.comedian)
        .filter((c: any) => !!c?.email);

      if (participants.length > 0 && event.organizer && (event.organizer as any).email) {
        await sendEventCancellationToParticipants(
          participants as any,
          { title: event.title, date: event.date, location: (event as any).location } as any,
          {
            firstName: (event.organizer as any).firstName,
            lastName: (event.organizer as any).lastName,
            email: (event.organizer as any).email,
          },
          'Événement supprimé par l\'organisateur (plus de 10 jours avant).'
        );
      }
    } catch (emailErr) {
      console.error('❌ Erreur lors de l\'envoi des emails d\'annulation avant suppression:', emailErr);
    }

    // Delete all applications for this event after notifications
    await ApplicationModel.deleteMany({ event: eventId });

    await EventModel.findByIdAndDelete(eventId);

    // Émettre un événement SSE pour notifier tous les clients
    emitEventDeleted(eventId);

    // Décrémenter le compteur d'événements créés de l'organisateur
    const organizer = await UserModel.findById(organizerId);
    if (organizer) {
      if (organizer.stats && organizer.stats.totalEvents && organizer.stats.totalEvents > 0) {
        organizer.stats.totalEvents -= 1;
        organizer.markModified('stats');
        await organizer.save();
        console.log('Total events après décrémentation et sauvegarde:', organizer.stats.totalEvents);
      }
    }

    res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
};

// ============================================================================
// GET ORGANIZER EVENTS
// ============================================================================
export const getOrganizerEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizerId = req.user?.id;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    const events = await EventModel.find({ organizer: organizerId })
      .sort({ date: 1 });

    res.json({ events });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ message: 'Error fetching organizer events' });
  }
};

// ============================================================================
// GET EVENT STATS
// ============================================================================
export const getEventStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const organizerId = req.user?.id;
    const userRole = req.user?.role;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    console.log('🔍 [DEBUG] getEventStats appelé:');
    console.log('   • User ID:', organizerId);
    console.log('   • User Role:', userRole);
    console.log('   • req.user:', req.user);

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

      // Récupérer TOUTES les candidatures de la plateforme (SAUF WITHDRAWN)
      const allApplications = await ApplicationModel.find({
        event: { $in: eventIds },
        status: { $ne: 'WITHDRAWN' }
      });
      console.log('📊 Candidatures trouvées dans la DB (hors WITHDRAWN):', allApplications.length);

      const totalEvents = allEvents.length;
      const pendingApplications = allApplications.filter(app => app.status === 'PENDING').length;
      const acceptedApplications = allApplications.filter(app => app.status === 'ACCEPTED').length;
      const rejectedApplications = allApplications.filter(app => app.status === 'REJECTED').length;

      // Calculer les événements à venir non complets
      const upcomingIncompleteEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate >= now;
        const isPublished = event.status === 'draft' || event.status === 'published';
        const participantsCount = event.participants?.length || 0;
        const maxPerformers = event.requirements?.maxPerformers || 0;
        const isIncomplete = participantsCount < maxPerformers;

        return isUpcoming && isPublished && isIncomplete;
      }).length;

      // Calculer les événements complets (toutes les places prises)
      const fullEvents = allEvents.filter(event => {
        const participantsCount = event.participants?.length || 0;
        const maxPerformers = event.requirements?.maxPerformers || 0;
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate >= now;

        return participantsCount >= maxPerformers && maxPerformers > 0 && isUpcoming;
      }).length;

      const cancelledEvents = allEvents.filter(event => event.status === 'cancelled').length;

      const organizerCount = await UserModel.countDocuments({ role: 'ORGANIZER' });
      const comedianCount = await UserModel.countDocuments({ role: 'COMEDIAN' });

      console.log('📊 Statistiques globales calculées:', {
        totalEvents,
        pendingApplications,
        acceptedApplications,
        rejectedApplications,
        upcomingIncompleteEvents,
        fullEvents,
        cancelledEvents,
        organizerCount,
        comedianCount
      });

      return res.status(200).json({
        totalEvents,
        upcomingIncompleteEvents,
        fullEvents,
        cancelledEvents,
        pendingApplications,
        acceptedApplications,
        rejectedApplications,
        organizerCount,
        comedianCount
      });
    }

    console.log('👤 Utilisateur normal (non super admin) - Role:', userRole);

    // Logique existante pour les organisateurs normaux
    let objectOrganizerId;
    try {
      objectOrganizerId = new mongoose.Types.ObjectId(organizerId);
      console.log('✅ ObjectId créé avec succès:', objectOrganizerId);
    } catch (e) {
      console.error('❌ Erreur création ObjectId:', e);
      return res.status(400).json({ message: 'ID organisateur invalide' });
    }

    // Récupérer tous les événements de l'organisateur avec participants peuplés
    console.log('🔍 Recherche événements pour organisateur:', objectOrganizerId);
    const allEvents = await EventModel.find({ organizer: objectOrganizerId }).populate('participants');
    console.log('📊 Événements trouvés:', allEvents.length);
    const eventIds = allEvents.map(event => event._id);

    // Récupérer toutes les candidatures liées à ces événements (SAUF WITHDRAWN)
    console.log('🔍 Recherche candidatures pour événements:', eventIds.length);
    const allApplications = await ApplicationModel.find({
      event: { $in: eventIds },
      status: { $ne: 'WITHDRAWN' }
    });
    console.log('📊 Candidatures trouvées (hors WITHDRAWN):', allApplications.length);

    const totalEvents = allEvents.length;
    const pendingApplications = allApplications.filter(app => app.status === 'PENDING').length;
    const acceptedApplications = allApplications.filter(app => app.status === 'ACCEPTED').length;
    const rejectedApplications = allApplications.filter(app => app.status === 'REJECTED').length;

    // Calculer les événements à venir non complets
    const upcomingIncompleteEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      const isUpcoming = eventDate >= now;
      const isPublished = event.status === 'draft' || event.status === 'published';
      const participantsCount = event.participants?.length || 0;
      const maxPerformers = event.requirements?.maxPerformers || 0;
      const isIncomplete = participantsCount < maxPerformers;

      return isUpcoming && isPublished && isIncomplete;
    }).length;

    // Calculer les événements complets (toutes les places prises)
    const fullEvents = allEvents.filter(event => {
      const participantsCount = event.participants?.length || 0;
      const maxPerformers = event.requirements?.maxPerformers || 0;
      const eventDate = new Date(event.date);
      const isUpcoming = eventDate >= now;

      return participantsCount >= maxPerformers && maxPerformers > 0 && isUpcoming;
    }).length;

    const cancelledEvents = allEvents.filter(event => event.status === 'cancelled').length;

    console.log('📊 Statistiques calculées pour organisateur:', {
      totalEvents,
      upcomingIncompleteEvents,
      fullEvents,
      cancelledEvents,
      pendingApplications,
      acceptedApplications,
      rejectedApplications
    });

    return res.status(200).json({
      totalEvents,
      upcomingIncompleteEvents,
      fullEvents,
      cancelledEvents,
      pendingApplications,
      acceptedApplications,
      rejectedApplications
    });
  } catch (err) {
    console.error('❌ Error fetching event stats:', err);
    return res.status(500).json({
      message: 'Erreur lors du chargement des statistiques',
      error: err instanceof Error ? err.message : 'Erreur interne du serveur'
    });
  }
};

// ============================================================================
// NOTIFY HUMORISTS
// ============================================================================
export const notifyHumorists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const organizerId = req.user?.id;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Valider le format de l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({ message: 'Invalid event ID format' });
      return;
    }

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

// ============================================================================
// PROCESS COMPLETED EVENTS
// ============================================================================
export const processCompletedEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user?.id) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Vérifier que seul un super admin peut accéder à cette route
    if (req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Accès refusé. Seuls les super-admins peuvent traiter les événements.' });
      return;
    }

    const now = new Date();

    // Trouver tous les événements passés qui ont des participants acceptés
    const pastEvents = await EventModel.find({
      date: { $lt: now },
      status: { $in: ['published', 'completed'] }
    }).populate('participants');

    let totalProcessed = 0;
    let participationsAdded = 0;

    for (const event of pastEvents) {
      // Pour chaque participant de l'événement
      for (const participantId of event.participants) {
        const participant = await UserModel.findById(participantId);

        if (participant && participant.role === 'COMEDIAN') {
          // Initialiser les stats si nécessaire
          if (!participant.stats) {
            participant.stats = {};
          }
          if (!participant.stats.processedEvents) {
            participant.stats.processedEvents = [];
          }

          // Vérifier si cet événement a déjà été traité pour ce participant
          const eventIdStr = (event._id as mongoose.Types.ObjectId).toString();
          const alreadyProcessed = participant.stats.processedEvents.includes(eventIdStr);

          if (!alreadyProcessed) {
            // Vérifier si ce humoriste a été marqué absent pour cet événement
            const absence = await AbsenceModel.findOne({
              event: event._id,
              comedian: participantId
            });

            // Si pas d'absence trouvée, incrémenter totalEvents (participation)
            if (!absence) {
              const currentTotalEvents = participant.stats.totalEvents || 0;
              participant.stats.totalEvents = currentTotalEvents + 1;
              participant.stats.processedEvents.push(eventIdStr);
              participant.markModified('stats');
              await participant.save();

              participationsAdded++;
              console.log(`✅ Participation ajoutée pour ${participant.firstName} ${participant.lastName} à l'événement "${event.title}"`);
            } else {
              // Marquer comme traité même si absent pour éviter de le retraiter
              participant.stats.processedEvents.push(eventIdStr);
              participant.markModified('stats');
              await participant.save();
              console.log(`⚠️ ${participant.firstName} ${participant.lastName} était absent à l'événement "${event.title}" - pas de participation ajoutée`);
            }
          } else {
            console.log(`ℹ️ Événement "${event.title}" déjà traité pour ${participant.firstName} ${participant.lastName}`);
          }
        }
      }
      totalProcessed++;
    }

    res.json({
      message: 'Traitement des événements terminés effectué avec succès',
      eventsProcessed: totalProcessed,
      participationsAdded: participationsAdded
    });
  } catch (error) {
    console.error('Erreur lors du traitement des événements terminés:', error);
    res.status(500).json({ message: 'Erreur lors du traitement des événements terminés' });
  }
};

// ============================================================================
// RESET PARTICIPATIONS
// ============================================================================
export const resetParticipations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user?.id) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Vérifier que seul un super admin peut accéder à cette route
    if (req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Accès refusé. Seuls les super-admins peuvent réinitialiser les participations.' });
      return;
    }

    const humorists = await UserModel.find({ role: 'COMEDIAN' });
    let resetCount = 0;

    for (const humorist of humorists) {
      if (!humorist.stats) humorist.stats = {};
      humorist.stats.totalEvents = 0;
      humorist.stats.processedEvents = [];
      humorist.markModified('stats');
      await humorist.save();
      resetCount++;
    }

    res.json({ message: `Participations réinitialisées pour ${resetCount} humoristes.` });
  } catch (error) {
    console.error('Error resetting participations:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation des participations' });
  }
};

// ============================================================================
// MARK EVENTS AS COMPLETED - CRON JOB
// ============================================================================
/**
 * Marque automatiquement les événements passés comme "completed" - Cron job
 *
 * Logique:
 * - Trouve tous les événements qui ne sont pas déjà "completed" ou "cancelled"
 * - Vérifie si la date + endTime est passée
 * - Met à jour le statut à "completed"
 */
export const markEventsAsCompletedCron = async (req: Request, res: Response): Promise<void> => {
  try {
    // --- SÉCURITÉ: Vérifier l'authentification du cron ---
    const cronKey = req.header('X-CRON-KEY');
    if (!cronKey || cronKey !== config.cron.secret) {
      console.error('❌ Tentative d\'accès non autorisée à l\'endpoint cron mark-events-completed');
      res.status(401).json({ message: 'Non autorisé' });
      return;
    }

    console.log('🔔 Démarrage du job cron: marquage des événements comme completed');
    const now = new Date();

    // Récupérer tous les événements qui ne sont pas déjà completed ou cancelled
    const events = await EventModel.find({
      status: { $nin: ['completed', 'COMPLETED', 'cancelled', 'CANCELLED'] },
      date: { $lt: now } // Date dans le passé
    });

    console.log(`📊 ${events.length} événements passés trouvés (non-completed, non-cancelled)`);

    let updatedCount = 0;
    const updatedEvents: string[] = [];

    // Traiter chaque événement
    for (const event of events) {
      try {
        // Construire la date/heure de fin de l'événement
        const eventDate = new Date(event.date);
        let eventEndDateTime: Date;

        if (event.endTime) {
          // Si endTime est défini, l'utiliser
          const [hours, minutes] = event.endTime.split(':').map(Number);
          eventEndDateTime = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
            hours,
            minutes,
            0,
            0
          );
        } else {
          // Sinon, considérer la fin de la journée (23:59:59)
          eventEndDateTime = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate(),
            23,
            59,
            59,
            999
          );
        }

        // Vérifier si l'événement est vraiment terminé
        if (now > eventEndDateTime) {
          event.status = 'completed';
          await event.save();
          updatedCount++;
          updatedEvents.push(event.title);
          console.log(`✅ Événement "${event.title}" marqué comme completed`);

          // Émettre un événement SSE pour notifier tous les clients
          emitEventCompleted(event._id.toString());

          // Expirer les candidatures en attente pour cet événement
          try {
            const expiredCount = await expirePendingApplicationsForEvent(event._id as mongoose.Types.ObjectId);
            if (expiredCount > 0) {
              console.log(`⏰ ${expiredCount} candidature(s) expirée(s) pour "${event.title}"`);
            }
          } catch (expireError) {
            console.error(`❌ Erreur lors de l'expiration des candidatures pour "${event.title}":`, expireError);
            // Ne pas faire échouer le cron si l'expiration échoue
          }
        }

      } catch (eventError) {
        console.error(`❌ Erreur lors du traitement de l'événement ${event._id}:`, eventError);
      }
    }

    const response = {
      message: 'Événements passés marqués comme completed',
      updated: updatedCount,
      totalChecked: events.length,
      updatedEvents: updatedEvents,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 Résumé: ${updatedCount} événements marqués comme completed sur ${events.length} vérifiés`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur CRON mark-events-completed:', error);
    res.status(500).json({
      message: 'Erreur lors du marquage des événements comme completed',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};
