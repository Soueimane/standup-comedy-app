/**
 * Service de recommandation d'événements pour les humoristes
 * Calcule un score de pertinence pour chaque événement basé sur les critères du profil
 */

import { EventModel, EventDocument } from '../models/Event';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import {
  RecommendationResult,
  RecommendationsResponse,
  RecommendationsQueryOptions,
  RecommendationPriority,
  ScoreBreakdown,
  DEFAULT_PRIORITIES,
  CRITERION_LABELS
} from '../types/recommendation';
import {
  eventMatchesMobilityZonesAsync,
  DEPARTMENT_TO_REGION
} from '../utils/geographicMatching';
import { getCityDepartment, getCityGeoInfo } from '../utils/cityMapping';

/**
 * Calcule le score géographique (0-1) avec formule améliorée
 * Utilise des scores de base avec pénalité logarithmique et bonus de spécificité
 * - 1.0 si match exact (ville) avec 1-2 zones
 * - 0.75-0.95 si match département/région avec modulation
 * - Pénalité pour trop de zones de mobilité
 * - Bonus pour multiples correspondances
 */
export const calculateGeographicScore = async (
  comedian: any,
  event: EventDocument
): Promise<number> => {
  const mobilityZones = comedian.profile?.mobilityZone || [];
  const eventCity = event.location?.city;

  if (!eventCity || mobilityZones.length === 0) {
    return 0;
  }

  // Scores de base par type de correspondance
  const BASE_SCORES = {
    city: 1.0,        // Match exact ville
    department: 0.75, // Même département
    region: 0.50      // Même région
  };

  // Normaliser la ville de l'événement
  const normalizedEventCity = eventCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Récupérer les infos géographiques de l'événement
  const geoInfo = await getCityGeoInfo(eventCity);
  const eventDepartment = geoInfo.department || getCityDepartment(eventCity);
  const eventRegion = geoInfo.region || (eventDepartment ? DEPARTMENT_TO_REGION[eventDepartment] : null);

  let bestMatchScore = 0;
  let matchCount = 0;

  // Trouver le meilleur score et compter les correspondances
  for (const zone of mobilityZones) {
    const normalizedZoneValue = zone.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (zone.type === 'ville') {
      // Match exact sur la ville
      if (normalizedEventCity === normalizedZoneValue) {
        bestMatchScore = Math.max(bestMatchScore, BASE_SCORES.city);
        matchCount++;
      }
    } else if (zone.type === 'departement') {
      // Match département
      if (eventDepartment) {
        const normalizedDept = zone.value.trim().toUpperCase().padStart(2, '0');
        if (eventDepartment === normalizedDept) {
          bestMatchScore = Math.max(bestMatchScore, BASE_SCORES.department);
          matchCount++;
        }
      }
    } else if (zone.type === 'region') {
      // Match région
      if (eventRegion) {
        const normalizedRegion = eventRegion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (normalizedRegion === normalizedZoneValue) {
          bestMatchScore = Math.max(bestMatchScore, BASE_SCORES.region);
          matchCount++;
        }
      }
    }
  }

  if (bestMatchScore === 0) return 0;

  // Pénalité logarithmique pour trop de zones
  // Plus de zones = moins engagé dans une zone spécifique
  // 1 zone: penalty=0.976 | 5 zones: 0.944 | 10 zones: 0.917 | 20 zones: 0.894
  const totalZones = mobilityZones.length;
  const breadthPenalty = 1 - (Math.log10(totalZones + 1) * 0.08);

  // Bonus pour multiples correspondances
  // Si plusieurs zones matchent, l'événement est plus pertinent
  // 1 match: +0.03 | 2 matches: +0.06 | 3+ matches: +0.10 (capped)
  const matchSpecificityBonus = Math.min(matchCount * 0.03, 0.10);

  const finalScore = bestMatchScore * breadthPenalty + matchSpecificityBonus;

  return Math.min(Math.max(finalScore, 0), 1.0);
};

/**
 * Calcule le score de niveau d'expérience (nombre de scènes) (0-1) avec formule améliorée
 * Utilise courbe gaussienne pour surqualification et décroissance exponentielle pour sous-qualification
 * - 1.0 si match exact
 * - 0.55-0.80 si événement accepte tous niveaux (basé sur expérience)
 * - 0.50-0.85 si légère surqualification (courbe gaussienne)
 * - 0.15-0.40 si sous-qualification (décroissance exponentielle)
 */
export const calculateExperienceLevelScore = (
  comedian: any,
  event: EventDocument
): number => {
  const comedianLevel = comedian.profile?.numberOfScenes || '0-50';
  const requiredLevel = event.requirements?.requiredExperienceLevel || 'all';

  const LEVEL_VALUES: Record<string, number> = {
    '0-50': 1,
    '50-200': 2,
    '200+': 3
  };

  const comedianValue = LEVEL_VALUES[comedianLevel] || 1;
  const requiredValue = LEVEL_VALUES[requiredLevel] || 1;

  // Cas 1: Événement "tous niveaux"
  // Valoriser l'expérience même sans exigence spécifique
  if (requiredLevel === 'all') {
    // Score range: 0.55 (débutant) à 0.80 (expert)
    const experienceFactor = (comedianValue - 1) / 2; // 0, 0.5, ou 1
    return 0.55 + (experienceFactor * 0.25);
  }

  const levelDifference = comedianValue - requiredValue;

  // Cas 2: Match exact
  if (levelDifference === 0) {
    return 1.0;
  }

  // Cas 3: Surqualification
  // Légère surqualification est bonne, mais extrême indique un mismatch
  // Utilise courbe gaussienne avec sigma=1.5
  if (levelDifference > 0) {
    const gaussianSigma = 1.5;
    const score = Math.exp(-(levelDifference ** 2) / (2 * gaussianSigma ** 2));
    // 1 niveau au-dessus: 0.85 | 2 niveaux au-dessus: 0.53
    return Math.max(score, 0.50);
  }

  // Cas 4: Sous-qualification
  // Décroissance exponentielle avec floor à 0.15
  if (levelDifference < 0) {
    const absGap = Math.abs(levelDifference);
    const score = Math.exp(-absGap * 1.2);
    // 1 niveau en-dessous: 0.40 | 2 niveaux en-dessous: 0.15
    return Math.max(score * 0.70, 0.15);
  }

  return 0;
};

/**
 * Calcule le score d'années d'expérience (0-1) avec formule améliorée
 * Utilise sigmoïde pour sous-qualification et gaussienne pour surqualification
 * - 1.0 si match dans zone optimale (±2 ans)
 * - 0.50-0.75 si pas d'exigence (basé sur expérience)
 * - 0.70-0.85 si surqualification (gaussienne douce)
 * - 0.15-0.85 si sous-qualification (sigmoïde, période grâce naturelle)
 */
export const calculateExperienceYearsScore = (
  comedian: any,
  event: EventDocument
): number => {
  const comedianExperience = comedian.profile?.experience || 0;
  const minExperience = event.requirements?.minExperience || 0;

  // Cas 1: Pas d'exigence minimum
  // Valoriser l'expérience même sans exigence spécifique
  if (minExperience === 0) {
    // Score range: 0.50 (débutant) à 0.75 (très expérimenté)
    // Normalisé sur 15 ans (max considéré comme "très expérimenté")
    const normalizedExp = Math.min(comedianExperience / 15, 1);
    return 0.50 + (normalizedExp * 0.25);
  }

  const experienceGap = comedianExperience - minExperience;

  // Cas 2: Qualification suffisante
  if (experienceGap >= 0) {
    // Zone optimale: ±2 ans autour de l'exigence
    // Score parfait pour match exact jusqu'à 2 ans au-dessus
    if (experienceGap <= 2) {
      return 1.0;
    }

    // Surqualification: pénalité gaussienne douce
    // sigma=8 pour une décroissance très progressive
    // 3-5 ans over: 0.95-0.90 | 10 ans over: 0.838 | 20+ ans: 0.741
    const excessYears = experienceGap - 2;
    const overQualificationSigma = 8;
    const overQualificationPenalty = Math.exp(
      -(excessYears ** 2) / (2 * overQualificationSigma ** 2)
    );
    return Math.max(0.70 + overQualificationPenalty * 0.30, 0.70);
  }

  // Cas 3: Sous-qualification
  // Utilise fonction sigmoïde pour transition douce
  // Crée une période de grâce naturelle autour de 1.5 ans
  const absGap = Math.abs(experienceGap);
  const sigmoidSteepness = 3.0; // k: raideur de la courbe
  const sigmoidInflection = 1.5; // x0: point d'inflexion (1.5 ans)

  const sigmoidScore =
    1 / (1 + Math.exp(sigmoidSteepness * (absGap - sigmoidInflection)));

  // Scale sigmoid output to range [0.15, 0.85]
  const scaledScore = 0.15 + sigmoidScore * 0.70;

  // Exemples:
  // 0.5 ans short: 0.85 | 1 an short: 0.72 | 1.5 ans: 0.50 | 2 ans: 0.28 | 3+ ans: 0.15
  return Math.max(scaledScore, 0.15);
};

/**
 * Génère les raisons de correspondance en français
 * Utilise seuils nuancés pour refléter la gradation du scoring
 */
export const generateMatchReasons = (breakdown: ScoreBreakdown): string[] => {
  const reasons: string[] = [];

  // Raisons géographiques - avec nuances
  if (breakdown.geographic >= 0.9) {
    reasons.push('Dans votre zone de mobilité préférée');
  } else if (breakdown.geographic >= 0.7) {
    reasons.push('Proche de votre zone de mobilité');
  } else if (breakdown.geographic >= 0.5) {
    reasons.push('Dans votre région');
  }

  // Raisons de niveau d'expérience - avec nuances
  if (breakdown.experienceLevel >= 0.95) {
    reasons.push("Niveau d'expérience idéal");
  } else if (breakdown.experienceLevel >= 0.7) {
    reasons.push("Niveau d'expérience bien adapté");
  } else if (breakdown.experienceLevel >= 0.5) {
    reasons.push("Niveau d'expérience acceptable");
  }

  // Raisons d'années d'expérience - avec nuances
  if (breakdown.experienceYears >= 0.95) {
    reasons.push("Expérience idéale pour cet événement");
  } else if (breakdown.experienceYears >= 0.7) {
    reasons.push("Années d'expérience adaptées");
  } else if (breakdown.experienceYears >= 0.5) {
    reasons.push("Expérience acceptable");
  }

  return reasons;
};

/**
 * Calcule le score total d'un événement pour un humoriste
 */
export const calculateEventScore = async (
  comedian: any,
  event: EventDocument,
  priorities?: RecommendationPriority[]
): Promise<{ score: number; breakdown: ScoreBreakdown; matchReasons: string[] }> => {
  const prefs = comedian.profile?.recommendationPreferences;
  const enabledPriorities = priorities || prefs?.priorities?.filter((p: RecommendationPriority) => p.enabled) || DEFAULT_PRIORITIES;

  // Calculer les scores par critère
  const breakdown: ScoreBreakdown = {
    geographic: await calculateGeographicScore(comedian, event),
    experienceLevel: calculateExperienceLevelScore(comedian, event),
    experienceYears: calculateExperienceYearsScore(comedian, event)
  };

  // Calculer le poids total des critères activés
  const totalWeight = enabledPriorities.reduce((sum: number, p: RecommendationPriority) => sum + p.weight, 0);

  // Si aucun poids, retourner 0
  if (totalWeight === 0) {
    return { score: 0, breakdown, matchReasons: [] };
  }

  // Calculer le score pondéré
  let totalScore = 0;
  for (const priority of enabledPriorities) {
    const normalizedWeight = priority.weight / totalWeight;
    const criterionScore = breakdown[priority.criterion as keyof ScoreBreakdown] || 0;
    totalScore += criterionScore * normalizedWeight;
  }

  // Convertir en pourcentage (0-100)
  const finalScore = Math.round(totalScore * 100);

  // Générer les raisons
  const matchReasons = generateMatchReasons(breakdown);

  return { score: finalScore, breakdown, matchReasons };
};

/**
 * Récupère les événements recommandés pour un humoriste
 */
export const getRecommendedEvents = async (
  comedianId: string,
  options: RecommendationsQueryOptions = {}
): Promise<RecommendationsResponse> => {
  const { page = 1, limit = 10, minScore = 0 } = options;

  // Récupérer l'humoriste
  const comedian = await UserModel.findById(comedianId);
  if (!comedian) {
    throw new Error('Humoriste non trouvé');
  }

  // Vérifier que c'est bien un humoriste
  if (comedian.role !== 'COMEDIAN') {
    throw new Error("Seuls les humoristes peuvent accéder aux recommandations");
  }

  // Récupérer les IDs des événements où l'humoriste a déjà candidaté
  const existingApplications = await ApplicationModel.find({
    comedian: comedianId
  }).select('event');
  const appliedEventIds = existingApplications.map(app => app.event.toString());

  // Récupérer les événements publiés et futurs, excluant ceux déjà candidatés
  const now = new Date();
  const events = await EventModel.find({
    status: 'published',
    date: { $gte: now },
    _id: { $nin: appliedEventIds }
  })
    .populate('organizer', 'firstName lastName email organizerProfile')
    .sort({ date: 1 });

  // Calculer le score pour chaque événement
  const scoredEvents: RecommendationResult[] = [];

  for (const event of events) {
    const { score, breakdown, matchReasons } = await calculateEventScore(comedian, event);

    // Filtrer par score minimum
    if (score >= minScore) {
      scoredEvents.push({
        event: event.toObject(),
        score,
        breakdown,
        matchReasons
      });
    }
  }

  // Trier par score décroissant
  scoredEvents.sort((a, b) => b.score - a.score);

  // Pagination
  const total = scoredEvents.length;
  const startIndex = (page - 1) * limit;
  const paginatedEvents = scoredEvents.slice(startIndex, startIndex + limit);

  return {
    recommendations: paginatedEvents,
    total,
    page,
    limit
  };
};

/**
 * Récupère les préférences de recommandation d'un humoriste
 */
export const getRecommendationPreferences = async (comedianId: string) => {
  const comedian = await UserModel.findById(comedianId);
  if (!comedian) {
    throw new Error('Humoriste non trouvé');
  }

  const prefs = comedian.profile?.recommendationPreferences || {
    enabled: true,
    priorities: DEFAULT_PRIORITIES
  };

  return prefs;
};

/**
 * Met à jour les préférences de recommandation d'un humoriste
 * Normalise les poids pour que la somme égale 100
 */
export const updateRecommendationPreferences = async (
  comedianId: string,
  preferences: { enabled?: boolean; priorities?: RecommendationPriority[] }
) => {
  const comedian = await UserModel.findById(comedianId);
  if (!comedian) {
    throw new Error('Humoriste non trouvé');
  }

  if (comedian.role !== 'COMEDIAN') {
    throw new Error("Seuls les humoristes peuvent modifier leurs préférences de recommandation");
  }

  // Initialiser le profil si nécessaire
  if (!comedian.profile) {
    comedian.profile = {} as any;
  }

  // Initialiser les préférences si nécessaires
  if (!comedian.profile.recommendationPreferences) {
    comedian.profile.recommendationPreferences = {
      enabled: true,
      priorities: DEFAULT_PRIORITIES
    } as any;
  }

  // Mettre à jour les préférences (toujours activées)
  (comedian.profile.recommendationPreferences as any).enabled = true;

  if (preferences.priorities) {
    // Normaliser les poids pour que la somme égale 100
    const enabledPriorities = preferences.priorities.filter(p => p.enabled);
    const totalWeight = enabledPriorities.reduce((sum: number, p: RecommendationPriority) => sum + p.weight, 0);

    // Normaliser les poids uniquement pour les critères activés
    const normalizedPriorities = preferences.priorities.map((priority: RecommendationPriority) => {
      if (!priority.enabled || totalWeight === 0) {
        return priority; // Pas de normalisation si désactivé ou total = 0
      }
      return {
        ...priority,
        weight: Math.round((priority.weight / totalWeight) * 100)
      };
    });

    (comedian.profile.recommendationPreferences as any).priorities = normalizedPriorities;
  }

  (comedian.profile.recommendationPreferences as any).lastUpdated = new Date();

  await comedian.save();

  return comedian.profile.recommendationPreferences;
};
