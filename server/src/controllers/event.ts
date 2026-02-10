import { Request, Response } from 'express';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { ApplicationModel } from '../models/Application';
import { expirePendingApplicationsForEvent } from './application';
import { sendEventUpdatedNotificationToApplicants, sendEventCancellationToParticipants, sendNewEventNotificationToHumorists, sendEventInvitationToComedian } from '../services/emailService';
import { notifyComediansByMobilityAsync, notifyComediansByMobilityForRecurringGroupAsync } from '../services/mobilityNotificationService';
import { config } from '../config/env';
import { AbsenceModel } from '../models/Absence';
import { emitEventCreated, emitEventUpdated, emitEventDeleted, emitEventCompleted } from '../services/eventEmitter';
import { Types } from 'mongoose';
import { extractPostalCode, getDepartmentFromPostalCode } from '../utils/cityMapping';

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

    const { title, description, date, dates, location, requirements, startTime, endTime, budget, maxPerformers, isRecurring, dateTimes } = req.body;

    // Si c'est un événement récurrent avec plusieurs dates
    if (isRecurring && dates && Array.isArray(dates) && dates.length > 0) {
      return await createRecurringEvents(req, res, organizerId, {
        title,
        description,
        dates,
        location,
        requirements,
        startTime,
        endTime,
        budget,
        maxPerformers,
        dateTimes: Array.isArray(dateTimes) ? dateTimes : undefined,
      });
    }

    // Sinon, création d'un événement unique (comportement existant)
    console.log('📅 Date reçue:', date, 'Type:', typeof date);
    console.log('📅 Date parsée:', new Date(date));

    // Extraire le code postal de l'adresse et calculer le département
    let enhancedLocation = { ...location };
    if (location?.address) {
      const postalCode = extractPostalCode(location.address);
      if (postalCode) {
        enhancedLocation.postalCode = postalCode;
        const department = getDepartmentFromPostalCode(postalCode);
        if (department) {
          enhancedLocation.department = department;
          console.log(`📍 [DEBUG] Code postal extrait: ${postalCode} → Département: ${department}`);
        }
      }
    }

    const event = new EventModel({
      title,
      description,
      date,
      location: enhancedLocation,
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
    console.log('✅ Évènement sauvegardé avec succès:', event._id);

    // Émettre un évènement SSE pour notifier tous les clients
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
      // Ne pas faire échouer la création de l'évènement si les stats échouent
    }

    // Envoyer les notifications par mobilité aux humoristes dont la zone correspond
    console.log('📍 [EVENT_UNIQUE] Démarrage envoi notifications par mobilité...');
    console.log('📋 [EVENT_UNIQUE] Données évènement:', {
      title: event.title,
      date: event.date,
      location: event.location,
      requirements: event.requirements,
      eventId: event._id.toString()
    });
    console.log('👤 [EVENT_UNIQUE] Organisateur:', {
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      email: organizer.email
    });

    try {
      notifyComediansByMobilityAsync(event, {
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email
      });
      console.log('✅ [EVENT_UNIQUE] Notification mobilité lancée avec succès');
    } catch (notifError) {
      console.error('❌ [EVENT_UNIQUE] Erreur lors du lancement de la notification mobilité:', notifError);
      // Ne pas faire échouer la création de l'événement si la notification échoue
    }

    // Convertir l'évènement en objet JSON pour éviter les problèmes de sérialisation
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

/**
 * Crée plusieurs événements récurrents avec les mêmes informations mais des dates différentes
 * Utilise une transaction MongoDB pour garantir l'atomicité
 */
const createRecurringEvents = async (
  req: AuthRequest,
  res: Response,
  organizerId: string,
  eventData: {
    title: string;
    description: string;
    dates: string[];
    location: any;
    requirements: any;
    startTime?: string;
    endTime?: string;
    budget?: any;
    maxPerformers?: number;
    /** Heures par date (optionnel). Si fourni, utilise startTime/endTime par date au lieu des valeurs globales. */
    dateTimes?: Array<{ date: string; startTime: string; endTime: string }>;
  }
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🔄 [RECURRENCE] Création de', eventData.dates.length, 'événements récurrents');

    // Validation : vérifier qu'il n'y a pas de doublons de dates
    const uniqueDates = [...new Set(eventData.dates)];
    if (uniqueDates.length !== eventData.dates.length) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'Les dates doivent être uniques' });
      return;
    }

    // Validation : vérifier que toutes les dates sont dans le futur
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const dateStr of eventData.dates) {
      const eventDate = new Date(dateStr);
      eventDate.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: `La date ${dateStr} est dans le passé` });
        return;
      }
    }

    // Générer un ID de groupe de récurrence (utiliser le premier événement comme référence)
    const recurrenceGroupId = new Types.ObjectId();
    
    // Convertir organizerId en ObjectId si nécessaire
    const organizerObjectId = Types.ObjectId.isValid(organizerId) 
      ? new Types.ObjectId(organizerId) 
      : organizerId;

    // Créer tous les événements dans la transaction
    const createdEvents = [];
    console.log('🔄 [RECURRENCE] Données reçues:', {
      title: eventData.title,
      dates: eventData.dates,
      location: eventData.location,
      requirements: eventData.requirements,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      organizerId: organizerId,
      organizerObjectId: organizerObjectId.toString()
    });
    
    // Vérifier que les champs requis sont présents
    if (!eventData.location || !eventData.location.address || !eventData.location.city || !eventData.location.country) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'Les champs de localisation sont incomplets (address, city, country requis)' });
      return;
    }
    
    if (!eventData.requirements) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'Les exigences sont requises' });
      return;
    }
    
    if (typeof eventData.requirements.minExperience !== 'number') {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'minExperience doit être un nombre' });
      return;
    }
    
    if (typeof eventData.requirements.duration !== 'number' || eventData.requirements.duration <= 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'duration doit être un nombre positif (en minutes)' });
      return;
    }
    
    if (!eventData.startTime || !eventData.endTime) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: 'startTime et endTime sont requis' });
      return;
    }
    
    const dateTimesMap = new Map<string, { startTime: string; endTime: string }>();
    if (eventData.dateTimes && eventData.dateTimes.length > 0) {
      for (const dt of eventData.dateTimes) {
        const key = typeof dt.date === 'string' ? dt.date.split('T')[0] : String(dt.date).split('T')[0];
        dateTimesMap.set(key, { startTime: dt.startTime, endTime: dt.endTime });
      }
    }

    // Extraire le code postal et le département de l'adresse (une seule fois pour tous les événements)
    let enhancedLocation = { ...eventData.location };
    if (eventData.location?.address) {
      const postalCode = extractPostalCode(eventData.location.address);
      if (postalCode) {
        enhancedLocation.postalCode = postalCode;
        const department = getDepartmentFromPostalCode(postalCode);
        if (department) {
          enhancedLocation.department = department;
          console.log(`📍 [RECURRENCE] Code postal extrait: ${postalCode} → Département: ${department}`);
        }
      }
    }

    for (const dateStr of eventData.dates) {
      try {
        console.log(`🔄 [RECURRENCE] Création de l'événement pour le ${dateStr}...`);
        const override = dateTimesMap.get(dateStr);
        const startTime = override?.startTime ?? eventData.startTime;
        const endTime = override?.endTime ?? eventData.endTime;
        if (!startTime || !endTime) {
          await session.abortTransaction();
          session.endSession();
          res.status(400).json({ message: `Heures manquantes pour la date ${dateStr}` });
          return;
        }

        const event = new EventModel({
          title: eventData.title,
          description: eventData.description,
          date: new Date(dateStr),
          location: enhancedLocation,
          requirements: eventData.requirements,
          organizer: organizerObjectId,
          status: 'published',
          applications: [],
          startTime,
          endTime,
          venue: enhancedLocation.venue,
          budget: eventData.budget,
          maxPerformers: eventData.maxPerformers,
          recurrenceGroupId: recurrenceGroupId
        });

        console.log(`🔄 [RECURRENCE] Événement modèle créé, validation...`);
        const savedEvent = await event.save({ session });
        createdEvents.push(savedEvent);
        console.log(`✅ [RECURRENCE] Événement créé pour le ${dateStr}:`, savedEvent._id);

        // Émettre un évènement SSE pour chaque événement créé
        emitEventCreated(savedEvent._id.toString());
      } catch (eventError: any) {
        console.error(`❌ [RECURRENCE] Erreur lors de la création de l'événement pour ${dateStr}:`, eventError);
        console.error(`❌ [RECURRENCE] Détails de l'erreur:`, {
          message: eventError?.message,
          name: eventError?.name,
          errors: eventError?.errors
        });
        throw eventError; // Re-lancer l'erreur pour que le catch principal la gère
      }
    }

    // Récupérer l'organisateur pour les notifications (sans session pour éviter les problèmes de validation)
    let organizer;
    try {
      organizer = await UserModel.findById(organizerId).select('firstName lastName email').lean();
      if (!organizer) {
        console.error('⚠️ [RECURRENCE] Organisateur non trouvé pour les notifications');
      }
    } catch (organizerError) {
      console.error('⚠️ [RECURRENCE] Erreur lors de la récupération de l\'organisateur:', organizerError);
    }

    // Mettre à jour les statistiques de l'organisateur
    // Utiliser findByIdAndUpdate avec $inc pour éviter les problèmes de validation
    // car on ne modifie que les stats, pas le profil
    try {
      await UserModel.findByIdAndUpdate(
        organizerId,
        { $inc: { 'stats.totalEvents': createdEvents.length } },
        { 
          session,
          runValidators: false // Ne pas valider les autres champs comme numberOfScenes
        }
      );
      console.log(`✅ [RECURRENCE] Stats de l'organisateur mises à jour (+${createdEvents.length} événements)`);
    } catch (statsError: any) {
      console.error('❌ [RECURRENCE] Erreur lors de la mise à jour des stats:', statsError);
      // Ne pas faire échouer la création des événements si les stats échouent
      // Les événements sont déjà créés, on continue
    }

    // Valider la transaction
    await session.commitTransaction();
    await session.endSession();

    console.log(`✅ [RECURRENCE] Transaction commitée - ${createdEvents.length} événements créés avec succès dans le groupe ${recurrenceGroupId}`);
    console.log(`✅ [RECURRENCE] IDs des événements créés:`, createdEvents.map(e => e._id.toString()));

    // Vérifier que les événements sont bien en base (optionnel, pour debug)
    try {
      const eventIds = createdEvents.map(e => e._id);
      const verifiedEvents = await EventModel.find({ _id: { $in: eventIds } });
      console.log(`✅ [RECURRENCE] Vérification: ${verifiedEvents.length}/${createdEvents.length} événements trouvés en base`);
    } catch (verifyError) {
      console.error('⚠️ [RECURRENCE] Erreur lors de la vérification (non-bloquant):', verifyError);
    }

    // Envoyer UN SEUL email par humoriste regroupant toutes les dates (au lieu d'un email par date)
    if (organizer) {
      console.log(`📧 [RECURRENCE] Démarrage envoi notifications groupées (1 email par humoriste, ${createdEvents.length} dates)...`);

      const eventIds = createdEvents.map(e => e._id);
      const eventsForNotification = await EventModel.find({ _id: { $in: eventIds } }).sort({ date: 1 });

      console.log(`📧 [RECURRENCE] ${eventsForNotification.length} événements récupérés pour notification groupée`);

      try {
        notifyComediansByMobilityForRecurringGroupAsync(eventsForNotification, {
          firstName: organizer.firstName || '',
          lastName: organizer.lastName || '',
          email: organizer.email || ''
        });
        console.log(`✅ [RECURRENCE] Notification groupée lancée (1 email par humoriste avec toutes les dates)`);
      } catch (notifError) {
        console.error(`⚠️ [RECURRENCE] Erreur notification mobilité groupée (non-bloquant):`, notifError);
      }
    } else {
      console.error('⚠️ [RECURRENCE] Organisateur non trouvé, notifications non envoyées');
    }

    // Retourner le premier événement et le nombre total créé
    try {
      const eventsResponse = createdEvents.map(e => {
        try {
          return e.toObject ? e.toObject() : e;
        } catch (toObjectError) {
          console.error('⚠️ [RECURRENCE] Erreur toObject (non-bloquant):', toObjectError);
          // Retourner un objet simplifié si toObject échoue
          return {
            _id: e._id,
            title: e.title,
            date: e.date,
            status: e.status
          };
        }
      });

      res.status(201).json({
        message: `${createdEvents.length} événements récurrents créés avec succès`,
        events: eventsResponse,
        recurrenceGroupId: recurrenceGroupId.toString(),
        count: createdEvents.length
      });
      
      console.log(`✅ [RECURRENCE] Réponse HTTP envoyée avec succès`);
    } catch (responseError) {
      // Si la réponse échoue mais que les événements sont créés, on doit quand même informer
      console.error('❌ [RECURRENCE] Erreur lors de l\'envoi de la réponse HTTP:', responseError);
      console.error('⚠️ [RECURRENCE] ATTENTION: Les événements sont créés en base mais la réponse a échoué');
      
      // Essayer d'envoyer une réponse simplifiée
      try {
        res.status(201).json({
          message: `${createdEvents.length} événements récurrents créés avec succès`,
          count: createdEvents.length,
          recurrenceGroupId: recurrenceGroupId.toString(),
          note: 'Les événements ont été créés mais certains détails n\'ont pas pu être renvoyés'
        });
      } catch (fallbackError) {
        console.error('❌ [RECURRENCE] Impossible d\'envoyer une réponse de secours:', fallbackError);
        // À ce stade, les événements sont créés mais on ne peut pas répondre
        // Le client verra une erreur mais les événements existent en base
      }
    }

  } catch (error: any) {
    console.error('❌ [RECURRENCE] Erreur lors de la création des événements récurrents:', error);
    console.error('❌ [RECURRENCE] Détails de l\'erreur:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      errors: error?.errors,
      eventData: {
        title: eventData.title,
        datesCount: eventData.dates?.length,
        location: eventData.location,
        requirements: eventData.requirements
      }
    });
    
    try {
      await session.abortTransaction();
      await session.endSession();
    } catch (sessionError) {
      console.error('❌ [RECURRENCE] Erreur lors de l\'abandon de la transaction:', sessionError);
    }
    
    // Retourner un message d'erreur plus détaillé
    const errorMessage = error?.message || 'Erreur lors de la création des événements récurrents';
    const validationErrors = error?.errors ? Object.values(error.errors).map((e: any) => e.message).join(', ') : null;
    
    res.status(500).json({ 
      message: 'Erreur lors de la création des événements récurrents',
      error: errorMessage,
      validationErrors: validationErrors || undefined
    });
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

    // Filtrer les évènements qui n'ont pas d'organisateur valide
    const validEvents = events.filter(event => {
      const hasValidOrganizer = event.organizer &&
        (typeof event.organizer === 'object' ?
          (event.organizer as any).firstName || (event.organizer as any)._id :
          true);

      if (!hasValidOrganizer) {
        console.warn(`⚠️ [WARNING] Évènement "${event.title}" (${event._id}) a un organisateur invalide/null - sera exclu des résultats`);
      }

      return hasValidOrganizer;
    });

    // Debug temporaire pour voir quels évènements sont retournés
    console.log(`🔍 [DEBUG] Route GET /api/events - Role: ${userRole}, Query:`, JSON.stringify(query, null, 2));
    console.log(`📊 [DEBUG] Évènements trouvés: ${events.length}, Évènements valides (avec organisateur): ${validEvents.length}`);
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
      res.status(404).json({ message: 'Évènement non trouvé' });
      return;
    }

    // Vérifier que l'organisateur est valide
    if (!event.organizer || (typeof event.organizer === 'object' && !(event.organizer as any).firstName)) {
      console.warn(`⚠️ [WARNING] Évènement "${event.title}" (${eventId}) a un organisateur invalide/null`);
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

    // Pour SUPER_ADMIN, on peut modifier n'importe quel évènement
    // Sinon, on vérifie que l'évènement appartient à l'organisateur connecté
    const event = userRole === 'SUPER_ADMIN'
      ? await EventModel.findById(eventId)
      : await EventModel.findOne({ _id: eventId, organizer: organizerId });

    if (!event) {
      console.error('❌ [DEBUG updateEvent] Évènement non trouvé ou non autorisé', {
        eventId,
        organizerId,
        userRole,
        searchMethod: userRole === 'SUPER_ADMIN' ? 'findById' : 'findOne with organizer filter'
      });
      res.status(404).json({ message: 'Event not found or unauthorized' });
      return;
    }

    console.log('✅ [DEBUG updateEvent] Évènement trouvé et autorisé', {
      eventId: event._id,
      eventOrganizer: event.organizer?.toString?.() || event.organizer,
      requestingOrganizer: organizerId,
    });

    // Sauvegarder l'ancienne ville pour détecter le changement
    const oldCity = event.location?.city;

    // Préparer les données de mise à jour avec extraction du code postal/département si la location est fournie
    let updateData = { ...req.body, modifiedByOrganizer: true };
    
    if (req.body.location?.address) {
      const postalCode = extractPostalCode(req.body.location.address);
      if (postalCode) {
        updateData.location = {
          ...req.body.location,
          postalCode: postalCode,
          department: getDepartmentFromPostalCode(postalCode)
        };
        console.log(`📍 [DEBUG updateEvent] Code postal extrait: ${postalCode} → Département: ${updateData.location.department}`);
      }
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedEvent) {
      console.error('❌ [DEBUG updateEvent] Échec de la mise à jour - évènement non trouvé après update', { eventId });
      res.status(404).json({ message: 'Event not found after update attempt' });
      return;
    }

    console.log('✅ [DEBUG updateEvent] Évènement mis à jour avec succès', {
      eventId: updatedEvent._id,
      title: updatedEvent.title,
    });

    // Si la ville a changé, notifier les humoristes dont la zone de mobilité correspond
    const newCity = updatedEvent.location?.city;
    if (oldCity !== newCity && newCity) {
      console.log(`📍 [MobilityNotification] Ville de l'événement modifiée: "${oldCity}" → "${newCity}"`);

      const organizer = await UserModel.findById(organizerId).select('firstName lastName email');
      if (organizer) {
        notifyComediansByMobilityAsync(updatedEvent, {
          firstName: organizer.firstName,
          lastName: organizer.lastName,
          email: organizer.email
        });
        console.log('📧 [MobilityNotification] Notification des humoristes par zone de mobilité lancée en arrière-plan');
      }
    }

    // Émettre un évènement SSE pour notifier tous les clients
    emitEventUpdated(updatedEvent._id.toString());

    // Dès qu'un organisateur annule l'événement : email + notification in-app pour tous les humoristes acceptés ou en attente (quel que soit la date de l'événement)
    if (updatedEvent.status === 'cancelled') {
      const organizer = await UserModel.findById(organizerId).select('firstName lastName email _id');
      const affectedApplications = await ApplicationModel.find({
        event: updatedEvent._id,
        status: { $in: ['PENDING', 'ACCEPTED'] }
      }).populate('comedian', 'email firstName lastName role');

      if (organizer && affectedApplications.length > 0) {
        const participants = affectedApplications
          .map((app: any) => app.comedian)
          .filter((c: any) => !!c?.email);
        try {
          await sendEventCancellationToParticipants(participants as any, updatedEvent as any, {
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email,
          }, (req.body as any).cancellationReason);
          console.log(`✅ [Annulation] Emails d'alerte envoyés à ${participants.length} humoriste(s).`);
        } catch (emailErr) {
          console.error('❌ Erreur envoi emails d\'annulation:', emailErr);
        }
        try {
          const { createNotification } = await import('./notification');
          for (const app of affectedApplications) {
            const comedian = app.comedian as any;
            const comedianId = comedian?._id?.toString() || comedian?.toString();
            if (comedianId && (!comedian.role || comedian.role === 'COMEDIAN')) {
              await createNotification(
                comedianId,
                'event_cancelled',
                'Évènement annulé',
                `L'évènement "${updatedEvent.title}" auquel vous avez postulé a été annulé.`,
                updatedEvent._id.toString(),
                app._id.toString(),
                organizer._id?.toString() || organizer.toString()
              );
            }
          }
          console.log(`✅ [Annulation] Notifications in-app créées pour ${affectedApplications.length} candidature(s).`);
        } catch (notificationError) {
          console.error('Erreur lors de la création des notifications in-app pour l\'annulation:', notificationError);
        }
      }
    }

    // Notifier les humoristes ayant postulé si l'évènement est futur et non annulé (mise à jour classique)
    if (updatedEvent && updatedEvent.status !== 'cancelled' && new Date(updatedEvent.date) >= new Date()) {
      console.log('📧 [DEBUG] Mise à jour évènement futur, préparation envoi emails de mise à jour...');
      const applications = await ApplicationModel.find({ event: updatedEvent._id, status: { $in: ['PENDING', 'ACCEPTED'] } })
        .populate('comedian', 'email firstName lastName role');

      const organizer = await UserModel.findById(organizerId).select('firstName lastName email');
      console.log(`📧 [DEBUG] Candidatures ciblées: ${applications.length}`);
      if (organizer && applications.length > 0) {
        try {
          await sendEventUpdatedNotificationToApplicants(applications as any, updatedEvent, {
            firstName: organizer.firstName,
            lastName: organizer.lastName,
            email: organizer.email,
          });
          console.log(`✅ [DEBUG] Emails de mise à jour envoyés à ${applications.length} humoriste(s)`);

          const { createNotification } = await import('./notification');
          for (const app of applications) {
            const comedian = app.comedian as any;
            if (comedian && (!comedian.role || comedian.role === 'COMEDIAN')) {
              const comedianId = comedian._id?.toString() || comedian?.toString();
              await createNotification(
                comedianId,
                'event_updated',
                'Évènement modifié',
                `L'évènement "${updatedEvent.title}" auquel vous avez postulé a été modifié.`,
                updatedEvent._id.toString(),
                app._id.toString(),
                organizer._id?.toString() || organizer.toString()
              );
            }
          }
        } catch (err) {
          console.error('❌ Erreur envoi emails ou notifications (mise à jour évènement):', err);
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

    console.log('🔍 DEBUG Suppression évènement:', {
      eventId,
      userId: organizerId,
      eventOrganizer: event?.organizer,
      eventOrganizerId: event?.organizer?._id?.toString(),
      eventOrganizerString: event?.organizer?.toString()
    });

    if (!event) {
      res.status(404).json({ message: 'Évènement non trouvé' });
      return;
    }

    // Vérifier si l'utilisateur est l'organisateur de l'évènement
    const organizerIdFromEvent = (event.organizer as any)._id?.toString() || event.organizer.toString();
    if (organizerIdFromEvent !== organizerId) {
      console.log('❌ Autorisation refusée:', {
        eventOrganizer: event.organizer,
        organizerId: organizerIdFromEvent,
        userId: organizerId,
        match: organizerIdFromEvent === organizerId
      });
      res.status(403).json({ message: 'Non autorisé à supprimer cet évènement' });
      return;
    }

    // Notifier les candidats PENDING et ACCEPTED avant suppression (email + notifications in-app)
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
          'Évènement supprimé par l\'organisateur (plus de 10 jours avant).'
        );
      }

      const organizerIdForNotif = (event.organizer as any)?._id?.toString() || event.organizer?.toString();
      try {
        const { createNotification } = await import('./notification');
        for (const app of applications) {
          const comedian = app.comedian as any;
          const comedianId = comedian?._id?.toString() || comedian?.toString();
          if (comedianId) {
            await createNotification(
              comedianId,
              'event_cancelled',
              'Évènement annulé',
              `L'évènement "${event.title}" auquel vous avez postulé a été annulé par l'organisateur.`,
              eventId,
              app._id.toString(),
              organizerIdForNotif
            );
          }
        }
      } catch (notificationError) {
        console.error('❌ Erreur lors de la création des notifications in-app (suppression évènement):', notificationError);
      }
    } catch (emailErr: any) {
      console.error('❌ Erreur lors de l\'envoi des emails d\'annulation avant suppression:', emailErr);
      if (emailErr?.code === 401 || emailErr?.response?.body?.errors) {
        console.error('📧 SendGrid 401 = clé API invalide ou absente. Vérifiez SMTP_PASS dans .env (doit être une API Key SendGrid, pas un mot de passe SMTP).', emailErr?.response?.body?.errors || '');
      }
    }

    // Delete all applications for this event after notifications
    await ApplicationModel.deleteMany({ event: eventId });

    await EventModel.findByIdAndDelete(eventId);

    // Émettre un évènement SSE pour notifier tous les clients
    emitEventDeleted(eventId);

    // Décrémenter le compteur d'évènements créés de l'organisateur
    // Utiliser findByIdAndUpdate avec $inc pour éviter les problèmes de validation
    try {
      await UserModel.findByIdAndUpdate(
        organizerId,
        { $inc: { 'stats.totalEvents': -1 } },
        { runValidators: false } // Ne pas valider les autres champs comme numberOfScenes
      );
      console.log('✅ Stats de l\'organisateur décrémentées (suppression événement)');
    } catch (statsError) {
      console.error('⚠️ Erreur lors de la décrémentation des stats de l\'organisateur:', statsError);
      // Ne pas faire échouer la suppression si les stats échouent
    }

    res.json({ message: 'Évènement supprimé avec succès' });
  } catch (error: any) {
    console.error('❌ Delete event error:', error);
    console.error('❌ Détails de l\'erreur:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      errors: error?.errors
    });
    res.status(500).json({ 
      message: 'Error deleting event',
      error: error?.message || 'Erreur inconnue'
    });
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

      // Récupérer TOUS les évènements de la plateforme avec participants peuplés
      console.log('🔍 Requête MongoDB: EventModel.find({}).populate("participants")');
      const allEvents = await EventModel.find({}).populate('participants');
      console.log('📊 Évènements trouvés dans la DB:', allEvents.length);

      // Log des premiers évènements pour debug
      if (allEvents.length > 0) {
        console.log('📅 Détail des évènements trouvés:');
        allEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. "${event.title}" - ${event.date} - Status: "${event.status}" - Organisateur: ${event.organizer}`);
        });
      } else {
        console.log('❌ AUCUN évènement trouvé dans la base !');
        // Test direct de connexion MongoDB
        console.log('🔍 Test de connexion MongoDB...');
        try {
          if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📚 Collections disponibles:', collections.map(c => c.name));

            // Test direct sur la collection events
            const rawEvents = await mongoose.connection.db.collection('events').find({}).toArray();
            console.log('📊 Évènements via collection directe:', rawEvents.length);
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

      // Calculer les évènements à venir non complets
      const upcomingIncompleteEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        const isUpcoming = eventDate >= now;
        const isPublished = event.status === 'draft' || event.status === 'published';
        const participantsCount = event.participants?.length || 0;
        const maxPerformers = event.requirements?.maxPerformers || 0;
        const isIncomplete = participantsCount < maxPerformers;

        return isUpcoming && isPublished && isIncomplete;
      }).length;

      // Calculer les évènements complets (toutes les places prises)
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

    // Récupérer tous les évènements de l'organisateur avec participants peuplés
    console.log('🔍 Recherche évènements pour organisateur:', objectOrganizerId);
    const allEvents = await EventModel.find({ organizer: objectOrganizerId }).populate('participants');
    console.log('📊 Évènements trouvés:', allEvents.length);
    const eventIds = allEvents.map(event => event._id);

    // Récupérer toutes les candidatures liées à ces évènements (SAUF WITHDRAWN)
    console.log('🔍 Recherche candidatures pour évènements:', eventIds.length);
    const allApplications = await ApplicationModel.find({
      event: { $in: eventIds },
      status: { $ne: 'WITHDRAWN' }
    });
    console.log('📊 Candidatures trouvées (hors WITHDRAWN):', allApplications.length);

    const totalEvents = allEvents.length;
    const pendingApplications = allApplications.filter(app => app.status === 'PENDING').length;
    const acceptedApplications = allApplications.filter(app => app.status === 'ACCEPTED').length;
    const rejectedApplications = allApplications.filter(app => app.status === 'REJECTED').length;

    // Calculer les évènements à venir non complets
    const upcomingIncompleteEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      const isUpcoming = eventDate >= now;
      const isPublished = event.status === 'draft' || event.status === 'published';
      const participantsCount = event.participants?.length || 0;
      const maxPerformers = event.requirements?.maxPerformers || 0;
      const isIncomplete = participantsCount < maxPerformers;

      return isUpcoming && isPublished && isIncomplete;
    }).length;

    // Calculer les évènements complets (toutes les places prises)
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

    // Récupérer l'évènement
    const event = await EventModel.findById(eventId)
      .populate('organizer', 'firstName lastName email');

    if (!event) {
      res.status(404).json({ message: 'Évènement non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur est bien l'organisateur de l'évènement
    const eventOrganizerId = typeof event.organizer === 'object' && event.organizer !== null
      ? (event.organizer as any)._id?.toString()
      : event.organizer?.toString();

    if (eventOrganizerId !== organizerId) {
      res.status(403).json({ message: 'Vous n\'êtes pas autorisé à envoyer des notifications pour cet évènement' });
      return;
    }

    // Récupérer les informations de l'organisateur
    const organizer = await UserModel.findById(organizerId);
    if (!organizer) {
      res.status(404).json({ message: 'Organisateur non trouvé' });
      return;
    }

    // Préparer les données de l'évènement pour l'email
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
        console.log(`✅ Notifications envoyées manuellement pour l'évènement "${event.title}" par ${organizer.firstName} ${organizer.lastName}`);
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
// INVITE COMEDIAN TO EVENT
// ============================================================================
/**
 * Permet à un organisateur d'inviter un humoriste spécifique à postuler pour un de ses événements
 */
export const inviteComedian = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, comedianId } = req.params;
    const organizerId = req.user?.id;

    // Vérifier que l'utilisateur est authentifié
    if (!organizerId) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    // Vérifier que l'utilisateur est un organisateur
    if (req.user?.role !== 'ORGANIZER') {
      res.status(403).json({ message: 'Seuls les organisateurs peuvent inviter des humoristes' });
      return;
    }

    // Valider les formats des IDs
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({ message: 'Format d\'ID d\'événement invalide' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(comedianId)) {
      res.status(400).json({ message: 'Format d\'ID d\'humoriste invalide' });
      return;
    }

    // Récupérer l'événement
    const event = await EventModel.findById(eventId);
    if (!event) {
      res.status(404).json({ message: 'Événement non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur est bien l'organisateur de l'événement
    const eventOrganizerId = typeof event.organizer === 'object' && event.organizer !== null
      ? (event.organizer as any)._id?.toString()
      : event.organizer?.toString();

    if (eventOrganizerId !== organizerId) {
      res.status(403).json({ message: 'Vous n\'êtes pas autorisé à inviter des humoristes pour cet événement' });
      return;
    }

    // Vérifier que l'événement est publié
    const eventStatus = event.status?.toLowerCase();
    if (eventStatus !== 'published') {
      res.status(400).json({ message: 'L\'événement doit être publié pour inviter des humoristes' });
      return;
    }

    // Vérifier que l'événement est à venir
    const eventDate = new Date(event.date);
    const now = new Date();
    if (eventDate < now) {
      res.status(400).json({ message: 'Impossible d\'inviter des humoristes pour un événement passé' });
      return;
    }

    // Récupérer l'humoriste
    const comedian = await UserModel.findById(comedianId);
    if (!comedian) {
      res.status(404).json({ message: 'Humoriste non trouvé' });
      return;
    }

    // Vérifier que c'est bien un humoriste
    if (comedian.role !== 'COMEDIAN') {
      res.status(400).json({ message: 'L\'utilisateur n\'est pas un humoriste' });
      return;
    }

    // Récupérer les informations de l'organisateur
    const organizer = await UserModel.findById(organizerId);
    if (!organizer) {
      res.status(404).json({ message: 'Organisateur non trouvé' });
      return;
    }

    // Préparer les données pour l'email
    const comedianData = {
      _id: comedian._id.toString(),
      email: comedian.email,
      firstName: comedian.firstName,
      lastName: comedian.lastName,
      emailSubscriptions: comedian.emailSubscriptions
    };

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
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      email: organizer.email
    };

    // Envoyer l'invitation en arrière-plan
    sendEventInvitationToComedian(comedianData, eventData, organizerData)
      .then(() => {
        console.log(`✅ Invitation envoyée à ${comedian.email} pour l'événement "${event.title}" par ${organizer.firstName} ${organizer.lastName}`);
      })
      .catch((error) => {
        console.error('❌ Erreur lors de l\'envoi de l\'invitation:', error);
      });

    res.status(200).json({
      message: 'Invitation envoyée avec succès',
      eventId: event._id,
      eventTitle: event.title,
      comedianEmail: comedian.email,
      comedianName: `${comedian.firstName} ${comedian.lastName}`
    });
  } catch (error) {
    console.error('Error inviting comedian:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'invitation' });
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
      res.status(403).json({ message: 'Accès refusé. Seuls les super-admins peuvent traiter les évènements.' });
      return;
    }

    const now = new Date();

    // Trouver tous les évènements passés qui ont des participants acceptés
    const pastEvents = await EventModel.find({
      date: { $lt: now },
      status: { $in: ['published', 'completed'] }
    }).populate('participants');

    let totalProcessed = 0;
    let participationsAdded = 0;

    for (const event of pastEvents) {
      // Pour chaque participant de l'évènement
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

          // Vérifier si cet évènement a déjà été traité pour ce participant
          const eventIdStr = (event._id as mongoose.Types.ObjectId).toString();
          const alreadyProcessed = participant.stats.processedEvents.includes(eventIdStr);

          if (!alreadyProcessed) {
            // Vérifier si ce humoriste a été marqué absent pour cet évènement
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
              console.log(`✅ Participation ajoutée pour ${participant.firstName} ${participant.lastName} à l'évènement "${event.title}"`);
            } else {
              // Marquer comme traité même si absent pour éviter de le retraiter
              participant.stats.processedEvents.push(eventIdStr);
              participant.markModified('stats');
              await participant.save();
              console.log(`⚠️ ${participant.firstName} ${participant.lastName} était absent à l'évènement "${event.title}" - pas de participation ajoutée`);
            }
          } else {
            console.log(`ℹ️ Évènement "${event.title}" déjà traité pour ${participant.firstName} ${participant.lastName}`);
          }
        }
      }
      totalProcessed++;
    }

    res.json({
      message: 'Traitement des évènements terminés effectué avec succès',
      eventsProcessed: totalProcessed,
      participationsAdded: participationsAdded
    });
  } catch (error) {
    console.error('Erreur lors du traitement des évènements terminés:', error);
    res.status(500).json({ message: 'Erreur lors du traitement des évènements terminés' });
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
 * Marque automatiquement les évènements passés comme "completed" - Cron job
 *
 * Logique:
 * - Trouve tous les évènements qui ne sont pas déjà "completed" ou "cancelled"
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

    console.log('🔔 Démarrage du job cron: marquage des évènements comme completed');
    const now = new Date();

    // Récupérer tous les évènements qui ne sont pas déjà completed ou cancelled
    const events = await EventModel.find({
      status: { $nin: ['completed', 'COMPLETED', 'cancelled', 'CANCELLED'] },
      date: { $lt: now } // Date dans le passé
    });

    console.log(`📊 ${events.length} évènements passés trouvés (non-completed, non-cancelled)`);

    let updatedCount = 0;
    const updatedEvents: string[] = [];

    // Traiter chaque évènement
    for (const event of events) {
      try {
        // Construire la date/heure de fin de l'évènement
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

        // Vérifier si l'évènement est vraiment terminé
        if (now > eventEndDateTime) {
          event.status = 'completed';
          await event.save();
          updatedCount++;
          updatedEvents.push(event.title);
          console.log(`✅ Évènement "${event.title}" marqué comme completed`);

          // Émettre un évènement SSE pour notifier tous les clients
          emitEventCompleted(event._id.toString());

          // Expirer les candidatures en attente pour cet évènement
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
        console.error(`❌ Erreur lors du traitement de l'évènement ${event._id}:`, eventError);
      }
    }

    const response = {
      message: 'Évènements passés marqués comme completed',
      updated: updatedCount,
      totalChecked: events.length,
      updatedEvents: updatedEvents,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 Résumé: ${updatedCount} évènements marqués comme completed sur ${events.length} vérifiés`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur CRON mark-events-completed:', error);
    res.status(500).json({
      message: 'Erreur lors du marquage des évènements comme completed',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};
