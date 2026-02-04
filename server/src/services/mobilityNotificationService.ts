/**
 * Service de notification par mobilité
 * Envoie des emails aux humoristes dont la zone de mobilité
 * correspond à la localisation d'un événement publié
 */

import { sendEventNotificationByMobility, sendRecurringEventNotificationByMobility } from './emailService';
import { UserModel } from '../models/User';
import { EventDocument } from '../models/Event';
import { getCityGeoInfo, getCityGeoInfoByPostalCode } from '../utils/cityMapping';

/**
 * Résultat d'une notification par mobilité
 */
export interface MobilityNotificationResult {
  count: number;
  comedians: { _id: string; email: string }[];
}

/**
 * Notifie par email les humoristes dont la zone de mobilité
 * correspond à la localisation de l'événement
 *
 * @param event - L'événement publié
 * @param organizer - Les infos de l'organisateur (optionnel)
 * @param excludeComedianIds - IDs des comédiens à exclure (ex: ceux qui ont déjà candidaté)
 * @returns Objet avec le nombre d'humoristes notifiés et leurs détails
 */
export const notifyComediansByMobility = async (
  event: EventDocument,
  organizer?: { firstName: string; lastName: string; email: string },
  excludeComedianIds?: string[]
): Promise<MobilityNotificationResult> => {
  try {
    // 1. Vérifier que l'événement a une ville définie
    if (!event.location?.city) {
      console.log('[MobilityNotification] Événement sans ville définie, notification ignorée');
      return { count: 0, comedians: [] };
    }

    // 2. Trouver tous les comédiens avec une zone de mobilité définie et abonnés aux emails
    // Exclure ceux déjà dans la liste d'exclusion
    const query: any = {
      role: 'COMEDIAN',
      'profile.mobilityZone': { $exists: true, $not: { $size: 0 } },
      'emailSubscriptions.globalSubscribed': { $ne: false }
    };

    if (excludeComedianIds && excludeComedianIds.length > 0) {
      query._id = { $nin: excludeComedianIds };
    }

    const comedians = await UserModel.find(query).lean();

    if (comedians.length === 0) {
      console.log('[MobilityNotification] Aucun comédien avec zone de mobilité trouvé');
      return { count: 0, comedians: [] };
    }

    // 3. Récupérer les infos géographiques : priorité au département stocké en base
    //    Puis au code postal stocké ou extrait de l'adresse
    //    (évite les ambiguïtés : ex. Grigny 91 vs Grigny 62)
    let geoInfo: { department: string | null; region: string | null };
    
    // Priorité 1: Utiliser le département stocké en base
    if (event.location.department) {
      console.log(`[MobilityNotification] Utilisation du département stocké en base: ${event.location.department}`);
      // On récupère quand même la région via l'API
      const cityGeoInfo = await getCityGeoInfo(event.location.city);
      geoInfo = {
        department: event.location.department,
        region: cityGeoInfo.region
      };
    } else {
      // Priorité 2: Utiliser le code postal stocké ou extraire de l'adresse
      const postalCode = event.location.postalCode || event.location.address?.match(/\b(\d{5})\b/)?.[1] || null;
      if (postalCode) {
        console.log(`[MobilityNotification] Récupération des infos géo pour code postal "${postalCode}" (événement: ${event.location.city}) via API Geo Gouv...`);
        geoInfo = await getCityGeoInfoByPostalCode(postalCode);
      } else {
        console.log(`[MobilityNotification] Récupération des infos géo pour "${event.location.city}" via API Geo Gouv...`);
        geoInfo = await getCityGeoInfo(event.location.city);
      }
    }
    
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
      return { count: 0, comedians: [] };
    }

    console.log(`[MobilityNotification] ${matchingComedians.length} comédiens matchent pour l'événement "${event.title}" à ${event.location.city}`);

    // 5. Envoyer les emails en parallèle (avec gestion des erreurs individuelles)
    const emailResults = await Promise.allSettled(
      matchingComedians.map(comedian =>
        sendEventNotificationByMobility(comedian, event, organizer)
      )
    );

    // Identifier les comedians notifiés avec succès
    const notifiedComedians: { _id: string; email: string }[] = [];
    emailResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const comedian = matchingComedians[index] as any;
        notifiedComedians.push({
          _id: comedian._id?.toString() || '',
          email: comedian.email || ''
        });
      }
    });

    const failureCount = emailResults.filter(r => r.status === 'rejected').length;

    if (failureCount > 0) {
      console.warn(`[MobilityNotification] ${failureCount} emails ont échoué sur ${matchingComedians.length}`);
    }

    console.log(`[MobilityNotification] ${notifiedComedians.length} humoristes notifiés avec succès pour l'événement "${event.title}" à ${event.location.city}`);

    return { count: notifiedComedians.length, comedians: notifiedComedians };
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

    // Priorité 1: Utiliser le département stocké en base
    let geoInfo: { department: string | null; region: string | null };
    
    if (event.location.department) {
      console.log(`[MobilityNotification] Utilisation du département stocké en base pour groupe récurrent: ${event.location.department}`);
      const cityGeoInfo = await getCityGeoInfo(event.location.city);
      geoInfo = {
        department: event.location.department,
        region: cityGeoInfo.region
      };
    } else {
      // Priorité 2: Utiliser le code postal stocké ou extraire de l'adresse
      const postalCodeRec = event.location.postalCode || event.location.address?.match(/\b(\d{5})\b/)?.[1] || null;
      if (postalCodeRec) {
        console.log(`[MobilityNotification] Récupération des infos géo pour code postal "${postalCodeRec}" (groupe récurrent: ${event.location.city}, ${events.length} dates)...`);
        geoInfo = await getCityGeoInfoByPostalCode(postalCodeRec);
      } else {
        console.log(`[MobilityNotification] Récupération des infos géo pour "${event.location.city}" (groupe récurrent, ${events.length} dates)...`);
        geoInfo = await getCityGeoInfo(event.location.city);
      }
    }

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
