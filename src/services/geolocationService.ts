import { Location } from '@/types/auth';

// Fonction pour calculer la distance entre deux points en utilisant la formule de Haversine
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fonction utilitaire pour convertir les degrés en radians
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Fonction pour vérifier si un événement est dans la zone de mobilité d'un humoriste
export const isEventInMobilityZone = (
  humoristLocation: Location,
  eventLocation: Location,
  mobilityRadius: number
): boolean => {
  if (!humoristLocation.latitude || !humoristLocation.longitude || 
      !eventLocation.latitude || !eventLocation.longitude) {
    return false;
  }

  const distance = calculateDistance(
    humoristLocation.latitude,
    humoristLocation.longitude,
    eventLocation.latitude,
    eventLocation.longitude
  );

  return distance <= mobilityRadius;
};

// Fonction pour obtenir les coordonnées géographiques à partir d'une adresse
export const getCoordinatesFromAddress = async (address: string): Promise<Location | null> => {
  try {
    // Note: Dans un environnement de production, il faudrait utiliser une vraie API de géocodage
    // comme Google Maps Geocoding API ou OpenStreetMap Nominatim
    // Pour l'instant, nous simulons la réponse
    console.log('Géocodage de l\'adresse:', address);
    
    // Simulation d'une réponse de l'API
    // Dans un environnement réel, remplacer par un appel API
    return {
      city: address.split(',')[0],
      postalCode: '75000', // À remplacer par le vrai code postal
      address: address,
      latitude: 48.8566, // Coordonnées de Paris par défaut
      longitude: 2.3522
    };
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
};

// Fonction pour formater une adresse complète
export const formatAddress = (location: Location): string => {
  const parts = [
    location.address,
    location.postalCode,
    location.city
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Fonction pour obtenir la distance formatée entre deux points
export const getFormattedDistance = (
  location1: Location,
  location2: Location
): string => {
  if (!location1.latitude || !location1.longitude || 
      !location2.latitude || !location2.longitude) {
    return 'Distance inconnue';
  }

  const distance = calculateDistance(
    location1.latitude,
    location1.longitude,
    location2.latitude,
    location2.longitude
  );

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  
  return `${Math.round(distance)} km`;
}; 