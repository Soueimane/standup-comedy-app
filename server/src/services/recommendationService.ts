/**
 * Service de recommandation d'événements pour les humoristes
 * Calcule un score de compatibilité pour trier les opportunités
 */

import { EventModel, EventDocument } from '../models/Event';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import {
  RecommendationResult,
  RecommendationsResponse,
  RecommendationsQueryOptions,
  ScoreBreakdown,
  DEFAULT_PRIORITIES,
  SmartRecommendation,
  SmartRecommendationsResponse,
  SmartRecommendationsQueryOptions
} from '../types/recommendation';
import { DEPARTMENT_TO_REGION } from '../utils/geographicMatching';
import { getCityDepartment, getCityGeoInfo } from '../utils/cityMapping';

/**
 * Normalise une chaîne pour comparaison (lowercase, sans accents, trim)
 */
const normalizeString = (str: string): string => {
  return str?.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
};

/**
 * Vérifie si deux villes correspondent (gère les arrondissements Paris/Lyon/Marseille)
 */
const citiesMatch = (city1: string, city2: string): { match: boolean; score: number } => {
  const norm1 = normalizeString(city1);
  const norm2 = normalizeString(city2);

  // Match exact
  if (norm1 === norm2) {
    return { match: true, score: 1.0 };
  }

  // Gestion des arrondissements (Paris 1er, Lyon 3ème, Marseille 8e, etc.)
  const majorCities = ['paris', 'lyon', 'marseille'];
  for (const majorCity of majorCities) {
    const isCity1Major = norm1 === majorCity || norm1.startsWith(majorCity + ' ');
    const isCity2Major = norm2 === majorCity || norm2.startsWith(majorCity + ' ');

    if (isCity1Major && isCity2Major) {
      // Les deux sont dans la même grande ville (ex: "Paris" et "Paris 11ème")
      // return { match: true, score: 0.98 };
      return { match: true, score: 1.00 };
    }
  }

  // Gestion des variantes de noms (Saint/St, Sainte/Ste)
  const normalizeVariants = (s: string) => s
    .replace(/^st\s+/i, 'saint ')
    .replace(/^ste\s+/i, 'sainte ')
    .replace(/-/g, ' ');

  if (normalizeVariants(norm1) === normalizeVariants(norm2)) {
    // return { match: true, score: 0.95 };
    return { match: true, score: 1.00 };
  }

  return { match: false, score: 0 };
};

/**
 * Calcule le score géographique (0-1)
 *
 * Scores:
 * - Match ville exact: 1.0
 * - Match ville variante (arrondissements, St/Saint): 0.95-0.98
 * - Match département: 0.75
 * - Match région: 0.50
 * - Aucun match: 0
 */
export const calculateGeographicScore = async (
  comedian: any,
  event: EventDocument
): Promise<number> => {
  const mobilityZones = comedian.profile?.mobilityZone || [];
  const eventCity = event.location?.city;

  // Cas 1: Données manquantes
  if (!eventCity || mobilityZones.length === 0) {
    return 0;
  }

  // Récupérer les infos géographiques de l'événement
  const geoInfo = await getCityGeoInfo(eventCity);
  const eventDept = geoInfo.department || getCityDepartment(eventCity);
  const eventRegion = geoInfo.region || (eventDept ? DEPARTMENT_TO_REGION[eventDept] : null);
  const normalizedEventRegion = normalizeString(eventRegion || '');

  // Cas 2: Pas d'info géographique trouvée
  if (!eventDept && !eventRegion) {
    // Tenter un match direct sur les villes
    for (const zone of mobilityZones) {
      if (zone.type === 'ville') {
        const { match, score } = citiesMatch(eventCity, zone.value);
        if (match) return score;
      }
    }
    return 0;
  }

  let bestScore = 0;

  // Parcourir les zones de mobilité
  for (const zone of mobilityZones) {
    const zoneVal = normalizeString(zone.value);

    if (zone.type === 'ville') {
      const { match, score } = citiesMatch(eventCity, zone.value);
      if (match) {
        bestScore = Math.max(bestScore, score);
      }
    } else if (zone.type === 'departement') {
      // Normaliser le département (avec ou sans zéro initial)
      const normalizedDept = zoneVal.replace(/^0+/, '').padStart(2, '0');
      const eventDeptNorm = eventDept?.replace(/^0+/, '').padStart(2, '0');

      if (eventDeptNorm === normalizedDept) {
        bestScore = Math.max(bestScore, 0.75);
      }
    } else if (zone.type === 'region') {
      if (normalizedEventRegion === zoneVal) {
        bestScore = Math.max(bestScore, 0.50);
      }
    }
  }

  return bestScore;
};

/**
 * Calcule le score de niveau d'expérience (nombre de scènes) (0-1)
 *
 * Cas gérés:
 * 1. Événement "tous niveaux" → Score basé sur l'expérience du comédien
 * 2. Match exact → Score parfait (1.0)
 * 3. Sur-qualification légère (+1 niveau) → Bon score (0.80)
 * 4. Sur-qualification forte (+2 niveaux) → Score moyen (0.65)
 * 5. Sous-qualification légère (-1 niveau) → Score faible (0.35)
 * 6. Sous-qualification forte (-2 niveaux) → Score très faible (0.10)
 *
 * Note: Sur-qualification = moins prioritaire mais pas bloquant
 *       Sous-qualification = potentiellement bloquant
 */
export const calculateExperienceLevelScore = (
  comedian: any,
  event: EventDocument
): number => {
  const comedianLevel = comedian.profile?.numberOfScenes || '0-50';
  const requiredLevel = event.requirements?.requiredExperienceLevel || 'all';

  // Mapping des niveaux vers valeurs numériques
  const LEVEL_VALUES: Record<string, number> = {
    '0-50': 1,    // Débutant
    '50-200': 2,  // Intermédiaire
    '200+': 3     // Expérimenté
  };

  const comedianValue = LEVEL_VALUES[comedianLevel] || 1;
  const requiredValue = LEVEL_VALUES[requiredLevel];

  // Cas 1: Événement "tous niveaux"
  // Plus l'humoriste est expérimenté, plus il est valorisé
  if (requiredLevel === 'all' || !requiredValue) {
    // Scores: débutant=0.70, intermédiaire=0.80, expérimenté=0.90
    const baseScore = 0.60;
    const experienceBonus = (comedianValue - 1) * 0.15;
    return Math.min(baseScore + experienceBonus, 0.90);
  }

  const levelDiff = comedianValue - requiredValue;

  // Cas 2: Match exact
  if (levelDiff === 0) {
    return 1.0;
  }

  // Cas 3 & 4: Sur-qualification
  // L'humoriste est plus expérimenté que requis
  // Score décroissant car l'événement est moins prioritaire pour lui
  if (levelDiff > 0) {
    if (levelDiff === 1) {
      // +1 niveau: légèrement sur-qualifié (ex: intermédiaire pour un poste débutant)
      return 0.80;
    }
    // +2 niveaux: très sur-qualifié (ex: expérimenté pour un poste débutant)
    return 0.65;
  }

  // Cas 5 & 6: Sous-qualification
  // L'humoriste est moins expérimenté que requis
  // Score faible car risque de ne pas correspondre aux attentes
  if (levelDiff === -1) {
    // -1 niveau: légèrement sous-qualifié
    // Peut tenter sa chance mais c'est limite
    return 0.35;
  }

  // -2 niveaux: très sous-qualifié
  // Quasi éliminatoire mais on laisse une petite chance
  return 0.10;
};

/**
 * Calcule le score d'années d'expérience (0-1)
 *
 * Cas gérés:
 * 1. Pas d'exigence minimum → Score basé sur l'expérience du comédien
 * 2. Zone idéale (0 à +2 ans) → Score parfait (1.0)
 * 3. Sur-qualification légère (+3 à +5 ans) → Très bon score (0.90)
 * 4. Sur-qualification moyenne (+6 à +10 ans) → Bon score (0.80)
 * 5. Sur-qualification forte (+10+ ans) → Score correct (0.70)
 * 6. Période de grâce (-1 an) → Score acceptable (0.60)
 * 7. Sous-qualification légère (-2 ans) → Score faible (0.40)
 * 8. Sous-qualification moyenne (-3 ans) → Score très faible (0.25)
 * 9. Sous-qualification forte (-4+ ans) → Score quasi éliminatoire (0.10)
 */
export const calculateExperienceYearsScore = (
  comedian: any,
  event: EventDocument
): number => {
  const comedianExp = comedian.profile?.experience || 0;
  const minExp = event.requirements?.minExperience || 0;

  // Cas 1: Pas d'exigence minimum
  // L'expérience est valorisée mais pas déterminante
  if (minExp === 0) {
    // Score progressif basé sur l'expérience (normalisé sur 15 ans)
    // 0 ans: 0.60 | 5 ans: 0.73 | 10 ans: 0.87 | 15+ ans: 0.95
    const normalizedExp = Math.min(comedianExp / 15, 1);
    return 0.60 + (normalizedExp * 0.35);
  }

  const diff = comedianExp - minExp;

  // Cas 2: Zone idéale (0 à +2 ans au-dessus du minimum)
  // L'humoriste répond parfaitement aux attentes
  if (diff >= 0 && diff <= 2) {
    return 1.0;
  }

  // Cas 3, 4, 5: Sur-qualification
  // L'humoriste est plus expérimenté que requis
  // Score décroissant progressivement (l'événement est moins prioritaire)
  if (diff > 2) {
    if (diff <= 5) {
      // +3 à +5 ans: très bon score
      return 0.90;
    }
    if (diff <= 10) {
      // +6 à +10 ans: bon score
      return 0.80;
    }
    // +10+ ans: score correct (très sur-qualifié)
    return 0.70;
  }

  // Cas 6, 7, 8, 9: Sous-qualification
  // L'humoriste a moins d'expérience que requis
  // Score décroissant rapidement (potentiellement bloquant)
  if (diff === -1) {
    // Période de grâce: 1 an de moins est acceptable
    return 0.60;
  }
  if (diff === -2) {
    // 2 ans de moins: limite mais possible
    return 0.40;
  }
  if (diff === -3) {
    // 3 ans de moins: très limite
    return 0.25;
  }

  // -4+ ans de moins: quasi éliminatoire
  return 0.10;
};

/**
 * Génère des raisons de match claires et nuancées pour l'UI
 *
 * Types de raisons:
 * - Positives (score élevé): mises en avant
 * - Neutres (score moyen): informatives
 * - Négatives (score faible): avertissements
 */
export const generateMatchReasons = (breakdown: ScoreBreakdown): string[] => {
  const reasons: string[] = [];

  // --- Raisons géographiques ---
  if (breakdown.geographic >= 0.98) {
    reasons.push('Dans votre ville');
  } else if (breakdown.geographic >= 0.95) {
    reasons.push('Dans votre ville (variante)');
  } else if (breakdown.geographic >= 0.75) {
    reasons.push('Dans votre département');
  } else if (breakdown.geographic >= 0.50) {
    reasons.push('Dans votre région');
  } else if (breakdown.geographic > 0) {
    reasons.push('Proche de votre zone de mobilité');
  }
  // Pas de raison si geographic === 0 (hors zone)

  // --- Raisons niveau d'expérience (nombre de scènes) ---
  if (breakdown.experienceLevel === 1.0) {
    reasons.push("Niveau d'expérience idéal");
  } else if (breakdown.experienceLevel >= 0.80) {
    reasons.push("Vous êtes légèrement sur-qualifié");
  } else if (breakdown.experienceLevel >= 0.65) {
    reasons.push("Événement pour débutants");
  } else if (breakdown.experienceLevel >= 0.60) {
    reasons.push("Ouvert à tous les niveaux");
  } else if (breakdown.experienceLevel >= 0.35) {
    reasons.push("Niveau requis légèrement supérieur");
  } else if (breakdown.experienceLevel > 0) {
    reasons.push("Niveau requis élevé pour votre profil");
  }

  // --- Raisons années d'expérience ---
  if (breakdown.experienceYears === 1.0) {
    reasons.push("Années d'expérience idéales");
  } else if (breakdown.experienceYears >= 0.90) {
    reasons.push("Très bonne expérience pour cet événement");
  } else if (breakdown.experienceYears >= 0.80) {
    reasons.push("Expérience au-delà des attentes");
  } else if (breakdown.experienceYears >= 0.70) {
    reasons.push("Expérience solide");
  } else if (breakdown.experienceYears >= 0.60) {
    reasons.push("Expérience acceptable (période de grâce)");
  } else if (breakdown.experienceYears >= 0.40) {
    reasons.push("Expérience légèrement insuffisante");
  } else if (breakdown.experienceYears >= 0.25) {
    reasons.push("Expérience insuffisante");
  }
  // Pas de raison si < 0.25 (trop sous-qualifié)

  return reasons;
};

/**
 * Calcule un indicateur de confiance global (0-100)
 * Indique à quel point la recommandation est fiable
 */
export const calculateConfidenceScore = (breakdown: ScoreBreakdown): number => {
  // Vérifier si les données sont complètes
  let dataCompleteness = 1.0;

  // Si le score géographique est 0, on manque potentiellement de données
  if (breakdown.geographic === 0) {
    dataCompleteness *= 0.7;
  }

  // Si les deux scores d'expérience sont à leur valeur par défaut
  // (0.60-0.70 pour "tous niveaux" ou "pas d'exigence")
  const isDefaultLevel = breakdown.experienceLevel >= 0.60 && breakdown.experienceLevel <= 0.70;
  const isDefaultYears = breakdown.experienceYears >= 0.60 && breakdown.experienceYears <= 0.70;

  if (isDefaultLevel && isDefaultYears) {
    dataCompleteness *= 0.85;
  }

  // Score de confiance basé sur la variance des scores
  // Si tous les scores sont proches = haute confiance
  const scores = [breakdown.geographic, breakdown.experienceLevel, breakdown.experienceYears];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;

  // Variance faible = scores cohérents = confiance élevée
  const consistencyScore = 1 - Math.min(variance * 2, 0.5);

  return Math.round(dataCompleteness * consistencyScore * 100);
};

/**
 * Catégorise le score global en niveau de recommandation
 */
export const getRecommendationLevel = (score: number): {
  level: 'excellent' | 'good' | 'average' | 'low' | 'poor';
  label: string;
  color: string;
} => {
  if (score >= 85) {
    return { level: 'excellent', label: 'Excellent match', color: '#22c55e' };
  }
  if (score >= 70) {
    return { level: 'good', label: 'Bon match', color: '#84cc16' };
  }
  if (score >= 50) {
    return { level: 'average', label: 'Match moyen', color: '#eab308' };
  }
  if (score >= 30) {
    return { level: 'low', label: 'Match faible', color: '#f97316' };
  }
  return { level: 'poor', label: 'Match insuffisant', color: '#ef4444' };
};

/**
 * Score global pondéré (Poids : Géo 50%, Niveau 30%, Années 20%)
 */
export const calculateEventScore = async (
  comedian: any,
  event: EventDocument
): Promise<{ score: number; breakdown: ScoreBreakdown; matchReasons: string[]; confidence: number }> => {
  const breakdown: ScoreBreakdown = {
    geographic: await calculateGeographicScore(comedian, event),
    experienceLevel: calculateExperienceLevelScore(comedian, event),
    experienceYears: calculateExperienceYearsScore(comedian, event)
  };

  const weights = { geographic: 0.5, experienceLevel: 0.3, experienceYears: 0.2 };

  const totalScore =
    (breakdown.geographic * weights.geographic) +
    (breakdown.experienceLevel * weights.experienceLevel) +
    (breakdown.experienceYears * weights.experienceYears);

  const confidence = calculateConfidenceScore(breakdown);

  return {
    score: Math.round(totalScore * 100),
    breakdown,
    matchReasons: generateMatchReasons(breakdown),
    confidence
  };
};

/**
 * Récupère la liste des recommandations triée
 */
export const getRecommendedEvents = async (
  comedianId: string,
  options: RecommendationsQueryOptions = {}
): Promise<RecommendationsResponse> => {
  const { page = 1, limit = 10, minScore = 0 } = options;

  const comedian = await UserModel.findById(comedianId);
  if (!comedian || comedian.role !== 'COMEDIAN') {
    throw new Error("Accès restreint aux humoristes");
  }

  const existingApps = await ApplicationModel.find({ comedian: comedianId }).select('event');
  const appliedEventIds = existingApps.map(app => app.event.toString());

  const events = await EventModel.find({
    status: 'published',
    date: { $gte: new Date() },
    _id: { $nin: appliedEventIds }
  }).populate('organizer', 'firstName lastName email organizerProfile');

  const scoredEvents: RecommendationResult[] = [];

  for (const event of events) {
    const result = await calculateEventScore(comedian, event);
    if (result.score >= minScore) {
      scoredEvents.push({
        event: event.toObject(),
        ...result
      });
    }
  }

  scoredEvents.sort((a, b) => b.score - a.score);

  return {
    recommendations: scoredEvents.slice((page - 1) * limit, page * limit),
    total: scoredEvents.length,
    page,
    limit
  };
};

// ============================================================================
// SMART RECOMMENDATIONS - Recommandations basées sur l'historique
// ============================================================================

/**
 * Récupère les recommandations intelligentes basées sur l'historique de l'utilisateur
 *
 * Critères de recommandation:
 * 1. Événements avec le même nom que ceux où l'utilisateur a été accepté
 * 2. Événements du même organisateur que ceux où l'utilisateur a été accepté
 *
 * @param comedianId - ID de l'humoriste
 * @param options - Options de pagination
 */
export const getSmartRecommendedEvents = async (
  comedianId: string,
  options: SmartRecommendationsQueryOptions = {}
): Promise<SmartRecommendationsResponse> => {
  const { page = 1, limit = 50 } = options;

  // Vérifier que l'utilisateur est un humoriste
  const comedian = await UserModel.findById(comedianId);
  if (!comedian || comedian.role !== 'COMEDIAN') {
    throw new Error("Accès restreint aux humoristes");
  }

  // Récupérer toutes les applications de l'humoriste avec le statut 'ACCEPTED' et les événements peuplés
  const applications = await ApplicationModel.find({
    comedian: comedianId,
    status: 'ACCEPTED'
  })
    .populate({
      path: 'event',
      select: 'title organizer',
      populate: {
        path: 'organizer',
        select: 'firstName lastName organizerProfile'
      }
    });

  // Extraire les noms d'événements uniques (normalisés)
  const eventNamesSet = new Set<string>();
  const eventNamesMap = new Map<string, string>(); // normalized -> original title

  // Extraire les IDs d'organisateurs uniques
  const organizerIdsSet = new Set<string>();
  const organizerNamesMap = new Map<string, string>(); // organizerId -> name

  // IDs des événements déjà postulés (à exclure)
  const appliedEventIds: string[] = [];

  for (const app of applications) {
    const event = app.event as any;
    if (!event) continue;

    appliedEventIds.push(event._id.toString());

    // Collecter les noms d'événements
    if (event.title) {
      const normalizedTitle = normalizeString(event.title);
      eventNamesSet.add(normalizedTitle);
      eventNamesMap.set(normalizedTitle, event.title);
    }

    // Collecter les organisateurs
    const organizer = event.organizer;
    if (organizer?._id) {
      const organizerId = organizer._id.toString();
      organizerIdsSet.add(organizerId);

      // Stocker le nom de l'organisateur
      const orgName = organizer.organizerProfile?.companyName ||
                      `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() ||
                      'Organisateur';
      organizerNamesMap.set(organizerId, orgName);
    }
  }

  // Si l'utilisateur n'a pas d'historique, retourner une liste vide
  if (eventNamesSet.size === 0 && organizerIdsSet.size === 0) {
    return {
      recommendations: [],
      total: 0,
      page,
      limit
    };
  }

  // Récupérer les événements futurs publiés, excluant ceux déjà postulés
  const futureEvents = await EventModel.find({
    status: 'published',
    date: { $gte: new Date() },
    _id: { $nin: appliedEventIds }
  }).populate('organizer', 'firstName lastName organizerProfile');

  const smartRecommendations: SmartRecommendation[] = [];
  const addedEventIds = new Set<string>(); // Pour éviter les doublons

  // Parcourir les événements futurs et chercher les matchs
  for (const event of futureEvents) {
    const eventId = event._id.toString();

    // Éviter les doublons
    if (addedEventIds.has(eventId)) continue;

    const normalizedTitle = normalizeString(event.title || '');
    const organizerId = (event.organizer as any)?._id?.toString();

    // Vérifier les deux critères
    const matchesByName = eventNamesSet.has(normalizedTitle);
    const matchesByOrganizer = organizerId && organizerIdsSet.has(organizerId);

    // Cas 1: Match sur les deux critères
    if (matchesByName && matchesByOrganizer) {
      addedEventIds.add(eventId);
      smartRecommendations.push({
        event: event.toObject(),
        matchType: 'both',
        matchedEventTitle: eventNamesMap.get(normalizedTitle) || event.title,
        matchedOrganizerName: organizerNamesMap.get(organizerId)
      });
      continue;
    }

    // Cas 2: Match uniquement par nom d'événement
    if (matchesByName) {
      addedEventIds.add(eventId);
      smartRecommendations.push({
        event: event.toObject(),
        matchType: 'same_event_name',
        matchedEventTitle: eventNamesMap.get(normalizedTitle) || event.title
      });
      continue;
    }

    // Cas 3: Match uniquement par organisateur
    if (matchesByOrganizer) {
      addedEventIds.add(eventId);
      smartRecommendations.push({
        event: event.toObject(),
        matchType: 'same_organizer',
        matchedOrganizerName: organizerNamesMap.get(organizerId)
      });
    }
  }

  // Trier par date (événements les plus proches en premier)
  smartRecommendations.sort((a, b) => {
    const dateA = new Date(a.event.date).getTime();
    const dateB = new Date(b.event.date).getTime();
    return dateA - dateB;
  });

  // Pagination
  const total = smartRecommendations.length;
  const startIndex = (page - 1) * limit;
  const paginatedRecommendations = smartRecommendations.slice(startIndex, startIndex + limit);

  return {
    recommendations: paginatedRecommendations,
    total,
    page,
    limit
  };
};