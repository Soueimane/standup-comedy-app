import { Document } from 'mongoose';

// Types de critères disponibles pour les recommandations
export type RecommendationCriterion = 'geographic' | 'experienceLevel' | 'experienceYears';

// Priorité de recommandation
export interface RecommendationPriority {
  criterion: RecommendationCriterion;
  weight: number; // 0-100
  enabled: boolean;
}

// Préférences de recommandation stockées dans le profil utilisateur
export interface RecommendationPreferences {
  enabled: boolean;
  priorities: RecommendationPriority[];
  lastUpdated?: Date;
}

// Détail du score par critère
export interface ScoreBreakdown {
  geographic: number;
  experienceLevel: number;
  experienceYears: number;
}

// Niveau de recommandation (catégorisation du score)
export type RecommendationLevel = 'excellent' | 'good' | 'average' | 'low' | 'poor';

// Résultat d'une recommandation
export interface RecommendationResult {
  event: any; // EventDocument populé
  score: number; // Score total 0-100
  breakdown: ScoreBreakdown;
  matchReasons: string[];
  confidence?: number; // Score de confiance 0-100 (optionnel pour rétrocompatibilité)
}

// Réponse de l'API de recommandations
export interface RecommendationsResponse {
  recommendations: RecommendationResult[];
  total: number;
  page: number;
  limit: number;
}

// Options de requête pour les recommandations
export interface RecommendationsQueryOptions {
  page?: number;
  limit?: number;
  minScore?: number;
}

// Priorités par défaut
export const DEFAULT_PRIORITIES: RecommendationPriority[] = [
  { criterion: 'geographic', weight: 50, enabled: true },
  { criterion: 'experienceLevel', weight: 30, enabled: true },
  { criterion: 'experienceYears', weight: 20, enabled: true },
];

// Labels français pour les critères
export const CRITERION_LABELS: Record<RecommendationCriterion, string> = {
  geographic: 'Zone géographique',
  experienceLevel: "Niveau d'expérience (scènes)",
  experienceYears: "Années d'expérience",
};

// Descriptions des critères
export const CRITERION_DESCRIPTIONS: Record<RecommendationCriterion, string> = {
  geographic: 'Correspond à votre zone de mobilité (ville, département, région)',
  experienceLevel: "Correspond au nombre de scènes requis par l'événement",
  experienceYears: "Correspond aux années d'expérience minimum requises",
};

// ============================================================================
// SMART RECOMMENDATIONS - Recommandations basées sur l'historique
// ============================================================================

// Type de match pour les recommandations intelligentes
export type SmartRecommendationMatchType = 'same_event_name' | 'same_organizer' | 'both';

// Résultat d'une recommandation intelligente
export interface SmartRecommendation {
  event: any; // EventDocument populé
  matchType: SmartRecommendationMatchType;
  matchedEventTitle?: string;     // Nom de l'événement original qui a déclenché le match
  matchedOrganizerName?: string;  // Nom de l'organisateur
}

// Réponse de l'API de recommandations intelligentes
export interface SmartRecommendationsResponse {
  recommendations: SmartRecommendation[];
  total: number;
  page: number;
  limit: number;
}

// Options de requête pour les recommandations intelligentes
export interface SmartRecommendationsQueryOptions {
  page?: number;
  limit?: number;
}
