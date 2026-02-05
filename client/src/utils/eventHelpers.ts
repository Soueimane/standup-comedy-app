import { IEvent } from '../types/event';

/**
 * Retourne le nom formaté de l'organisateur
 */
export const getOrganizerName = (organizer: any): string => {
  if (!organizer) return 'Organisateur inconnu';
  if (typeof organizer === 'string') return organizer;
  return `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || 'Organisateur inconnu';
};

/**
 * Retourne l'ID de l'organisateur
 */
export const getOrganizerIdFromEvent = (organizer: any): string | undefined => {
  if (!organizer) return undefined;
  if (typeof organizer === 'string') return organizer;
  return organizer._id || organizer.id;
};

/**
 * Traduit le statut de l'événement en français
 */
export const translateEventStatus = (status: IEvent['status']): string => {
  switch (status) {
    case 'DRAFT':
    case 'draft':
      return 'Brouillon';
    case 'PUBLISHED':
    case 'published':
      return 'Publié';
    case 'CANCELLED':
    case 'cancelled':
      return 'Annulé';
    case 'COMPLETED':
    case 'completed':
      return 'Terminé';
    default:
      return status;
  }
};

/**
 * Formate le lieu complet de l'événement
 */
export const formatLocation = (location: any): string => {
  if (location && typeof location === 'object') {
    const venue = location.venue || '';
    const address = location.address || '';
    const city = location.city || '';
    return [venue, address, city].filter(Boolean).join(', ') || 'Lieu non spécifié';
  }
  return 'Lieu non spécifié';
};

/**
 * Formate la plage horaire d'un événement
 */
export const formatTimeRange = (startTime?: string, endTime?: string): string => {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;
  return 'Horaires non précisés';
};

/**
 * Formate le niveau d'expérience requis
 */
export const formatExperienceLevel = (level?: string): string => {
  if (!level) return 'Tous niveaux';
  switch (level.toUpperCase()) {
    case 'BEGINNER':
    case 'DEBUTANT':
      return 'Débutant';
    case 'EXPERIENCED':
    case 'EXPERIENCE':
      return 'Expérimenté';
    case 'PRO':
      return 'Pro';
    default:
      return level;
  }
};

/**
 * Retourne le ratio participants/maximum
 */
export const getParticipantsRatio = (event: IEvent): string => {
  const current = event.participants?.length || 0;
  const max = event.requirements?.maxPerformers || 0;
  return `${current}/${max}`;
};

/**
 * Vérifie si l'événement a atteint son nombre max de participants
 */
export const isEventComplete = (event: IEvent): boolean => {
  const current = event.participants?.length || 0;
  const max = event.requirements?.maxPerformers || 0;
  if (!max) return false;
  return current >= max;
};
