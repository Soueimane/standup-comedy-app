/**
 * Centralized message service for user-facing messages
 * Single source of truth for all alerts, errors, warnings, and success messages
 * Implements security filtering for server-sent messages
 */

/**
 * Success messages displayed when operations complete successfully
 */
export const SuccessMessages = {
  // Authentication
  SIGNUP_SUCCESS: 'Inscription réussie !',

  // Events
  EVENT_CREATED: 'Évènement créé avec succès !',
  EVENT_UPDATED: 'Évènement mis à jour avec succès !',
  EVENT_DELETED: 'Évènement supprimé avec succès.',
  EVENT_CANCELLED: 'Évènement annulé et déplacé vers "Évènements annulés".',
  NOTIFICATIONS_SENT: 'Les notifications ont été envoyées avec succès aux humoristes !',

  // Applications
  APPLICATION_SUBMITTED: 'Candidature soumise avec succès !',
  APPLICATION_CONFIRMED: 'Confirmation enregistrée !',
  APPLICATION_WITHDRAWN: 'Candidature retirée.',
  APPLICATION_UNSUBSCRIBED: 'Vous avez été désinscrit de cet évènement.',

  // Profile
  PROFILE_UPDATED: 'Profil mis à jour avec succès !',

  // Reports
  REPORT_SUBMITTED: 'Signalement envoyé avec succès. Un administrateur va examiner votre demande.',
  REPORT_UPDATED: 'Signalement mis à jour avec succès',

  // Invitations
  INVITATION_SENT: 'Invitation envoyée avec succès !',

  // Absences
  ABSENCE_MARKED: 'Absence marquée avec succès.',
  ABSENCE_CANCELLED: 'Présence confirmée avec succès.',
};

/**
 * Error messages used as fallbacks when server errors don't provide safe messages
 */
export const ErrorMessages = {
  // Authentication
  SIGNUP_FAILED: "Échec de l'inscription. Veuillez réessayer.",
  UNAUTHORIZED: 'Vous devez être connecté pour effectuer cette action.',
  FORBIDDEN: "Vous n'avez pas les permissions pour effectuer cette action.",

  // Events
  EVENT_CREATE_FAILED: "Impossible de créer l'événement.",
  EVENT_UPDATE_FAILED: "Impossible de mettre à jour l'événement.",
  EVENT_DELETE_FAILED: "Impossible de supprimer l'événement.",
  EVENT_NOT_FOUND: "Cet événement n'a pas été trouvé ou vous n'êtes pas autorisé à y accéder.",
  EVENT_MISSING_ID: "Impossible de modifier cet évènement. ID manquant.",

  // Applications
  APPLICATION_SUBMIT_FAILED: "Impossible de soumettre la candidature.",
  APPLICATION_UPDATE_FAILED: "Impossible de modifier la candidature.",
  APPLICATION_DELETE_FAILED: "Impossible d'annuler la candidature.",
  APPLICATION_CONFIRM_FAILED: "Erreur lors de la confirmation.",
  APPLICATION_WITHDRAW_FAILED: 'Échec de la désinscription.',

  // Profile
  PROFILE_UPDATE_FAILED: "Impossible de mettre à jour le profil.",
  PROFILE_NOT_FOUND: "Le profil demandé n'existe pas.",
  USER_ID_MISSING: "ID utilisateur non disponible. Veuillez vous reconnecter.",

  // Reports
  REPORT_SUBMIT_FAILED: "Impossible d'envoyer le signalement.",
  REPORT_UPDATE_FAILED: "Impossible de mettre à jour le signalement.",

  // Invitations
  INVITATION_FAILED: "Impossible d'envoyer l'invitation.",

  // Absences
  ABSENCE_MARK_FAILED: "Impossible de marquer l'absence.",
  ABSENCE_CANCEL_FAILED: "Impossible d'annuler l'absence.",

  // Network & General
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion Internet.',
  SERVER_ERROR: 'Une erreur serveur s\'est produite. Veuillez réessayer plus tard.',
  GENERIC_ERROR: 'Une erreur est survenue. Veuillez réessayer.',
};

/**
 * Warning messages for user notifications that need attention
 */
export const WarningMessages = {
  // Authentication
  AUTH_REQUIRED_CREATE_EVENT: 'Vous devez être connecté pour créer un évènement',
  AUTH_REQUIRED_EDIT_EVENT: "Vous devez être connecté pour modifier un évènement.",
  AUTH_REQUIRED_PROFILE_EDIT: "Vous devez être connecté pour modifier votre profil.",
  AUTH_REQUIRED_VIEW_PROFILE: 'Vous devez être connecté pour voir le profil',
  ADMIN_ONLY: 'Accès refusé. Super-admins uniquement.',

  // Applications
  ALREADY_APPLIED: 'Vous avez déjà postulé à cet évènement !',

  // Reports
  REPORT_REASON_REQUIRED: 'Veuillez sélectionner une raison de signalement',
  REPORT_DESCRIPTION_REQUIRED: 'Veuillez fournir une description pour la raison "Autre"',
  ALREADY_REPORTED: 'Vous avez déjà signalé cet humoriste.',

  // Profile
  IMAGE_TOO_LARGE: "L'image est trop grande (max 5MB).",
  IMAGE_REQUIRED: 'Merci de sélectionner un fichier image.',

  // Events
  CANCELLATION_REASON_REQUIRED: 'Veuillez fournir une raison d\'annulation (évènement dans moins de 10 jours).',
  EVENT_NOT_CANCELLED_OLD: 'Évènement non déplacé vers "Évènements annulés" (plus de 10 jours avant).',

  // Validation
  FORM_VALIDATION_FAILED: 'Veuillez corriger les erreurs suivantes : ',

  // Notifications
  AUTH_REQUIRED_SEND_NOTIFICATIONS: 'Vous devez être connecté pour envoyer des notifications.',

  // Invitations
  SELECT_EVENT_REQUIRED: 'Veuillez sélectionner un événement.',
};

/**
 * Info messages for informational alerts
 */
export const InfoMessages = {
  APPLICATION_CONFIRMED: "Confirmation prise en compte: vous restez inscrit à l'évènement.",
  APPLICATION_WITHDRAWN: "Désinscription confirmée: votre candidature a été retirée.",
  ORGANIZER_APPLICATION_CONFIRMED: "Confirmation prise en compte: l'humoriste reste inscrit.",
  ORGANIZER_APPLICATION_WITHDRAWN: "Désinscription confirmée: la candidature a été retirée.",
  EVENT_NOT_CANCELLED_OLD: 'Évènement non déplacé vers "Évènements annulés" (plus de 10 jours avant).',
};

/**
 * Confirmation dialog messages
 */
export const ConfirmMessages = {
  UNSUBSCRIBE: 'Confirmer la désinscription ?',
  UNSUBSCRIBE_DETAIL: 'Voulez-vous vous désinscrire de cet évènement ?',
  DELETE_EVENT: 'Confirmer la suppression de cet évènement (plus de 10 jours avant) ?',
  PRESENCE_ALERT_ACKNOWLEDGE: 'Marquer cette alerte comme prise en compte ?',
};

/**
 * Whitelist of server-sent messages that are safe to display to users
 * Only French, user-friendly messages from the backend are allowed
 * Any message not in this set will be replaced by a contextual fallback
 */
const SAFE_SERVER_MESSAGES = new Set([
  // Authentication errors
  "Email deja utilise",
  "Email ou mot de passe incorrect",
  "Vous avez deja postule pour cet evenement",
  "Vous avez deja signale cet humoriste",
  "Votre compte a ete desactive. Veuillez contacter le support.",

  // Event-related
  "Impossible de postuler a un evenement annule",
  "Impossible de postuler a un evenement termine",
  "Vous ne pouvez pas postuler a nouveau apres vous etre retire de cet evenement",

  // Permission-related
  "Seuls les organisateurs peuvent signaler des humoristes",
  "Vous ne pouvez pas signaler votre propre compte",
  "Seuls les comediens peuvent ajouter des evenements aux favoris",
  "Seuls les organisateurs peuvent ajouter des favoris",
  "Seuls les humoristes peuvent acceder aux recommandations",

  // Favorites/Watchlist
  "Cet humoriste est deja dans vos favoris",
  "Cet evenement est deja dans vos favoris",
  "Ce humoriste n'est pas participant a cet evenement.",
]);

/**
 * HTTP status code to user-friendly message mapping
 * Used as fallback when no server message or contextual message is available
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Les données envoyées sont invalides.",
  401: "Vous devez être connecté pour effectuer cette action.",
  403: "Vous n'avez pas les permissions pour effectuer cette action.",
  404: "La ressource demandée n'a pas été trouvée.",
  409: "Une ressource avec ces informations existe déjà.",
  422: "Les données envoyées contiennent des erreurs.",
  429: "Trop de tentatives. Veuillez réessayer plus tard.",
  500: "Une erreur serveur s'est produite. Veuillez réessayer plus tard.",
  502: "Le serveur est temporairement indisponible.",
  503: "Le serveur est en maintenance. Veuillez réessayer plus tard.",
};

/**
 * Extracts the appropriate error message with security filtering.
 * Only server messages in the whitelist are displayed to the user.
 * Unknown messages are replaced by contextual fallback or HTTP status mapping.
 *
 * Priority:
 * 1. Server message (if in SAFE_SERVER_MESSAGES)
 * 2. Contextual fallback (if provided)
 * 3. HTTP status code mapping
 * 4. Network error or generic error
 */
export const getErrorMessage = (error: any, contextualFallback?: string): string => {
  // 1. Server message if in whitelist
  const serverMessage = error?.response?.data?.message;
  if (serverMessage && typeof serverMessage === 'string' && SAFE_SERVER_MESSAGES.has(serverMessage)) {
    return serverMessage;
  }

  // 2. Contextual fallback
  if (contextualFallback) {
    return contextualFallback;
  }

  // 3. HTTP status code mapping
  const status = error?.response?.status;
  if (status && HTTP_STATUS_MESSAGES[status]) {
    return HTTP_STATUS_MESSAGES[status];
  }

  // 4. Network error
  if (!error?.response) {
    return ErrorMessages.NETWORK_ERROR;
  }

  // 5. Generic error
  return ErrorMessages.GENERIC_ERROR;
};
