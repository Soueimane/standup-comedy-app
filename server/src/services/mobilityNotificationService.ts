/**
 * Service de notification par mobilité
 * Envoie des emails aux humoristes dont la zone de mobilité
 * correspond à la localisation d'un événement publié
 */

import { sendEventNotificationByMobility, sendRecurringEventNotificationByMobility } from './emailService';
import { UserModel } from '../models/User';
import { EventDocument } from '../models/Event';
import { getCityGeoInfo } from '../utils/cityMapping';

/**
 * Notifie par email les humoristes dont la zone de mobilité
 * correspond à la localisation de l'événement
 *
 * @param event - L'événement publié
 * @param organizer - Les infos de l'organisateur (optionnel)
 * @returns Le nombre d'humoristes notifiés
 */
export const notifyComediansByMobility = async (
  event: EventDocument,
  organizer?: { firstName: string; lastName: string; email: string }
): Promise<number> => {
  try {
    // 1. Vérifier que l'événement a une ville définie
    if (!event.location?.city) {
      console.log('[MobilityNotification] Événement sans ville définie, notification ignorée');
      return 0;
    }

    // 2. Trouver tous les comédiens avec une zone de mobilité définie et abonnés aux emails
    const comedians = await UserModel.find({
      role: 'COMEDIAN',
      'profile.mobilityZone': { $exists: true, $not: { $size: 0 } },
      'emailSubscriptions.globalSubscribed': { $ne: false }
    }).lean();

    if (comedians.length === 0) {
      console.log('[MobilityNotification] Aucun comédien avec zone de mobilité trouvé');
      return 0;
    }

    // 3. Récupérer les infos géographiques de la ville de l'événement (un seul appel API)
    console.log(`[MobilityNotification] Récupération des infos géo pour "${event.location.city}" via API Geo Gouv...`);
    const geoInfo = await getCityGeoInfo(event.location.city);
    
    // Normaliser la ville de l'événement pour le matching (gérer les arrondissements)
    // Ex: "Paris 10e Arrondissement" → "paris"
    let eventCity = event.location.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    
    // Si c'est un arrondissement de Paris, Lyon ou Marseille, extraire juste le nom de la ville
    if (eventCity.includes('paris') && (eventCity.includes('arrondissement') || /paris\s+\d+/.test(eventCity))) {
      eventCity = 'paris';
    } else if (eventCity.includes('lyon') && /lyon\s+\d+/.test(eventCity)) {
      eventCity = 'lyon';
    } else if (eventCity.includes('marseille') && /marseille\s+\d+/.test(eventCity)) {
      eventCity = 'marseille';
    }
    
    const eventDepartment = geoInfo.department;
    const eventRegion = geoInfo.region;

    console.log(`[MobilityNotification] Ville: ${event.location.city} (normalisé: ${eventCity}) → Département: ${eventDepartment}, Région: ${eventRegion}`);

    // 4. Filtrer les comédiens dont la zone de mobilité matche
    const matchingComedians = comedians.filter(comedian => {
      const mobilityZones = (comedian as any).profile?.mobilityZone;
      if (!mobilityZones || !Array.isArray(mobilityZones) || mobilityZones.length === 0) {
        return false;
      }

      return mobilityZones.some((zone: { type: string; value: string }) => {
        let normalizedZoneValue = zone.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        
        // Normaliser aussi les arrondissements dans les zones de mobilité
        if (normalizedZoneValue.includes('paris') && (normalizedZoneValue.includes('arrondissement') || /paris\s+\d+/.test(normalizedZoneValue))) {
          normalizedZoneValue = 'paris';
        } else if (normalizedZoneValue.includes('lyon') && /lyon\s+\d+/.test(normalizedZoneValue)) {
          normalizedZoneValue = 'lyon';
        } else if (normalizedZoneValue.includes('marseille') && /marseille\s+\d+/.test(normalizedZoneValue)) {
          normalizedZoneValue = 'marseille';
        }

        switch (zone.type) {
          case 'ville':
            // Matching exact ou partiel (pour gérer "Paris" vs "Paris 10e Arrondissement")
            return eventCity === normalizedZoneValue || 
                   eventCity.includes(normalizedZoneValue) || 
                   normalizedZoneValue.includes(eventCity);

          case 'departement':
            if (!eventDepartment) return false;
            // Normaliser le département (ajouter zéro si nécessaire)
            const normalizedDept = /^\d{1,2}$/.test(zone.value.trim())
              ? zone.value.trim().padStart(2, '0')
              : zone.value.trim().toUpperCase();
            return eventDepartment === normalizedDept;

          case 'region':
            if (!eventRegion) return false;
            const normalizedEventRegion = eventRegion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            return normalizedEventRegion === normalizedZoneValue;

          default:
            return false;
        }
      });
    });

    if (matchingComedians.length === 0) {
      console.log(`[MobilityNotification] Aucun comédien ne matche pour l'événement à ${event.location.city}`);
      return 0;
    }

    console.log(`[MobilityNotification] ${matchingComedians.length} comédiens matchent pour l'événement "${event.title}" à ${event.location.city}`);

    // 5. Envoyer les emails en parallèle (avec gestion des erreurs individuelles)
    const emailResults = await Promise.allSettled(
      matchingComedians.map(comedian =>
        sendEventNotificationByMobility(comedian, event, organizer)
      )
    );

    // Compter les succès et échecs
    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failureCount = emailResults.filter(r => r.status === 'rejected').length;

    if (failureCount > 0) {
      console.warn(`[MobilityNotification] ${failureCount} emails ont échoué sur ${matchingComedians.length}`);
    }

    console.log(`[MobilityNotification] ${successCount} humoristes notifiés avec succès pour l'événement "${event.title}" à ${event.location.city}`);

    return successCount;
  } catch (error) {
    console.error('[MobilityNotification] Erreur lors de la notification:', error);
    throw error;
  }
};

/**
 * Version asynchrone qui ne bloque pas l'appelant
 * Utile pour appeler depuis un controller sans attendre la fin des envois
 *
 * @param event - L'événement publié
 * @param organizer - Les infos de l'organisateur (optionnel)
 */
export const notifyComediansByMobilityAsync = (
  event: EventDocument,
  organizer?: { firstName: string; lastName: string; email: string }
): void => {
  notifyComediansByMobility(event, organizer).catch(error => {
    console.error('[MobilityNotification] Erreur asynchrone:', error);
  });
};

/**
 * Notifie par email les humoristes dont la zone de mobilité correspond à la localisation
 * d'une série d'événements récurrents. Envoie UN SEUL email par humoriste avec toutes les dates
 * (au lieu d'un email par date).
 *
 * @param events - Les événements du groupe récurrent (même lieu, dates différentes)
 * @param organizer - Les infos de l'organisateur
 * @returns Le nombre d'humoristes notifiés
 */
export const notifyComediansByMobilityForRecurringGroup = async (
  events: EventDocument[],
  organizer: { firstName: string; lastName: string; email: string }
): Promise<number> => {
  if (!events || events.length === 0) {
    console.log('[MobilityNotification] Groupe récurrent vide, notification ignorée');
    return 0;
  }
  const event = events[0];
  try {
    if (!event.location?.city) {
      console.log('[MobilityNotification] Événement sans ville définie, notification récurrente ignorée');
      return 0;
    }

    const comedians = await UserModel.find({
      role: 'COMEDIAN',
      'profile.mobilityZone': { $exists: true, $not: { $size: 0 } },
      'emailSubscriptions.globalSubscribed': { $ne: false }
    }).lean();

    if (comedians.length === 0) {
      console.log('[MobilityNotification] Aucun comédien avec zone de mobilité trouvé');
      return 0;
    }

    console.log(`[MobilityNotification] Récupération des infos géo pour "${event.location.city}" (groupe récurrent, ${events.length} dates)...`);
    const geoInfo = await getCityGeoInfo(event.location.city);

    let eventCity = event.location.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (eventCity.includes('paris') && (eventCity.includes('arrondissement') || /paris\s+\d+/.test(eventCity))) {
      eventCity = 'paris';
    } else if (eventCity.includes('lyon') && /lyon\s+\d+/.test(eventCity)) {
      eventCity = 'lyon';
    } else if (eventCity.includes('marseille') && /marseille\s+\d+/.test(eventCity)) {
      eventCity = 'marseille';
    }

    const eventDepartment = geoInfo.department;
    const eventRegion = geoInfo.region;

    const matchingComedians = comedians.filter(comedian => {
      const mobilityZones = (comedian as any).profile?.mobilityZone;
      if (!mobilityZones || !Array.isArray(mobilityZones) || mobilityZones.length === 0) return false;
      return mobilityZones.some((zone: { type: string; value: string }) => {
        let normalizedZoneValue = zone.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (normalizedZoneValue.includes('paris') && (normalizedZoneValue.includes('arrondissement') || /paris\s+\d+/.test(normalizedZoneValue))) {
          normalizedZoneValue = 'paris';
        } else if (normalizedZoneValue.includes('lyon') && /lyon\s+\d+/.test(normalizedZoneValue)) {
          normalizedZoneValue = 'lyon';
        } else if (normalizedZoneValue.includes('marseille') && /marseille\s+\d+/.test(normalizedZoneValue)) {
          normalizedZoneValue = 'marseille';
        }
        switch (zone.type) {
          case 'ville':
            return eventCity === normalizedZoneValue || eventCity.includes(normalizedZoneValue) || normalizedZoneValue.includes(eventCity);
          case 'departement':
            if (!eventDepartment) return false;
            const normalizedDept = /^\d{1,2}$/.test(zone.value.trim()) ? zone.value.trim().padStart(2, '0') : zone.value.trim().toUpperCase();
            return eventDepartment === normalizedDept;
          case 'region':
            if (!eventRegion) return false;
            const normalizedEventRegion = eventRegion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            return normalizedEventRegion === normalizedZoneValue;
          default:
            return false;
        }
      });
    });

    if (matchingComedians.length === 0) {
      console.log(`[MobilityNotification] Aucun comédien ne matche pour l'événement récurrent à ${event.location.city}`);
      return 0;
    }

    console.log(`[MobilityNotification] ${matchingComedians.length} comédiens matchent pour le groupe récurrent "${event.title}" (${events.length} dates) à ${event.location.city}`);

    const emailResults = await Promise.allSettled(
      matchingComedians.map(comedian => sendRecurringEventNotificationByMobility(comedian, events, organizer))
    );

    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failureCount = emailResults.filter(r => r.status === 'rejected').length;
    if (failureCount > 0) {
      console.warn(`[MobilityNotification] ${failureCount} emails récurrents ont échoué sur ${matchingComedians.length}`);
    }
    console.log(`[MobilityNotification] ${successCount} humoristes notifiés (1 email chacun avec ${events.length} dates) pour "${event.title}"`);

    return successCount;
  } catch (error) {
    console.error('[MobilityNotification] Erreur lors de la notification récurrente:', error);
    throw error;
  }
};

/**
 * Version asynchrone pour le groupe récurrent (ne bloque pas l'appelant)
 */
export const notifyComediansByMobilityForRecurringGroupAsync = (
  events: EventDocument[],
  organizer: { firstName: string; lastName: string; email: string }
): void => {
  notifyComediansByMobilityForRecurringGroup(events, organizer).catch(error => {
    console.error('[MobilityNotification] Erreur asynchrone (groupe récurrent):', error);
  });
};
