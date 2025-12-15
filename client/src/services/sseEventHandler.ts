import { QueryClient } from '@tanstack/react-query';
import type { SSEEvent } from '../hooks/useSSE';

/**
 * Handler pour les événements SSE
 * Mappe les types d'événements aux clés de cache React Query à invalider
 *
 * @param queryClient - Instance du QueryClient React Query
 * @param event - Événement SSE reçu
 */
export const handleSSEEvent = (queryClient: QueryClient, event: SSEEvent): void => {
  console.log(`🔄 [SSE Handler] Traitement de l'événement: ${event.type}`, event.data);

  switch (event.type) {
    // === ÉVÉNEMENTS ===
    case 'EVENT_CREATED':
      console.log('📅 [SSE] Nouvel événement créé');
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      break;

    case 'EVENT_UPDATED':
      console.log('📅 [SSE] Événement mis à jour:', event.data.id);
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.id) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.id], exact: false });
      }
      break;

    case 'EVENT_DELETED':
      console.log('🗑️ [SSE] Événement supprimé:', event.data.id);
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.id) {
        queryClient.removeQueries({ queryKey: ['event', event.data.id] });
      }
      break;

    case 'EVENT_COMPLETED':
      console.log('✅ [SSE] Événement complété:', event.data.id);
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.id) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.id], exact: false });
      }
      break;

    // === CANDIDATURES ===
    case 'APPLICATION_CREATED':
      console.log('📝 [SSE] Nouvelle candidature:', event.data.id);
      queryClient.invalidateQueries({ queryKey: ['applications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['comedianApplications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.eventId], exact: false });
      }
      break;

    case 'APPLICATION_STATUS_CHANGED':
      console.log('🔄 [SSE] Statut de candidature changé:', event.data.id, event.data.status);
      queryClient.invalidateQueries({ queryKey: ['applications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['comedianApplications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.eventId], exact: false });
      }
      break;

    case 'APPLICATION_WITHDRAWN':
      console.log('❌ [SSE] Candidature retirée:', event.data.id);
      queryClient.invalidateQueries({ queryKey: ['applications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['comedianApplications'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events', 'stats'], exact: false });
      if (event.data.eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.eventId], exact: false });
      }
      break;

    // === ABSENCES ===
    case 'ABSENCE_MARKED':
      console.log('⚠️ [SSE] Absence marquée:', event.data.eventId, event.data.comedianId);
      queryClient.invalidateQueries({ queryKey: ['absences'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      if (event.data.eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.eventId], exact: false });
      }
      break;

    case 'ABSENCE_CANCELLED':
      console.log('✅ [SSE] Absence annulée:', event.data.eventId, event.data.comedianId);
      queryClient.invalidateQueries({ queryKey: ['absences'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      if (event.data.eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', event.data.eventId], exact: false });
      }
      break;

    // === FAVORIS COMÉDIENS ===
    case 'FAVORITE_COMEDIAN_ADDED':
      console.log('⭐ [SSE] Comédien ajouté aux favoris:', event.data.comedianId);
      queryClient.invalidateQueries({ queryKey: ['favorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['organizerFavorites'], exact: false });
      break;

    case 'FAVORITE_COMEDIAN_REMOVED':
      console.log('⭐ [SSE] Comédien retiré des favoris:', event.data.comedianId);
      queryClient.invalidateQueries({ queryKey: ['favorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['organizerFavorites'], exact: false });
      break;

    // === FAVORIS ÉVÉNEMENTS ===
    case 'EVENT_FAVORITE_ADDED':
      console.log('⭐ [SSE] Événement ajouté aux favoris:', event.data.eventId);
      queryClient.invalidateQueries({ queryKey: ['event-favorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['eventFavorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      break;

    case 'EVENT_FAVORITE_REMOVED':
      console.log('⭐ [SSE] Événement retiré des favoris:', event.data.eventId);
      queryClient.invalidateQueries({ queryKey: ['event-favorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['eventFavorites'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      break;

    // === PROFILS & UTILISATEURS ===
    case 'PROFILE_UPDATED':
      console.log('👤 [SSE] Profil mis à jour:', event.data.userId);
      queryClient.invalidateQueries({ queryKey: ['profile'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user'], exact: false });
      if (event.data.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', event.data.userId], exact: false });
      }
      break;

    case 'USER_REGISTERED':
      console.log('🆕 [SSE] Nouvel utilisateur enregistré:', event.data.userId);
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });
      break;

    case 'PASSWORD_RESET':
      console.log('🔐 [SSE] Mot de passe réinitialisé:', event.data.userId);
      queryClient.invalidateQueries({ queryKey: ['user'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'], exact: false });
      if (event.data.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', event.data.userId], exact: false });
      }
      break;

    // === ÉVÉNEMENT DE CONNEXION ===
    case 'CONNECTED':
      console.log('🔌 [SSE] Connexion SSE établie');
      // Rafraîchir toutes les données au moment de la connexion
      queryClient.invalidateQueries();
      break;

    default:
      console.warn(`⚠️ [SSE Handler] Type d'événement non géré: ${event.type}`);
  }
};

/**
 * Crée une fonction handler pré-configurée avec le queryClient
 * @param queryClient - Instance du QueryClient
 * @returns Fonction handler pour les événements SSE
 */
export const createSSEEventHandler = (queryClient: QueryClient) => {
  return (event: SSEEvent) => handleSSEEvent(queryClient, event);
};
