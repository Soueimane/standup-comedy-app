/**
 * Service de matching géographique pour la zone de mobilité
 * Permet de vérifier si une zone de recherche (ville/département/région)
 * correspond à une zone de mobilité d'un humoriste en tenant compte des hiérarchies
 */

import { getCityDepartment, getCityGeoInfo } from './cityMapping';

// Mapping des régions françaises avec leurs départements
export const FRENCH_REGIONS: Record<string, string[]> = {
  'Auvergne-Rhône-Alpes': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  'Bourgogne-Franche-Comté': ['21', '25', '39', '58', '70', '71', '89', '90'],
  'Bretagne': ['22', '29', '35', '56'],
  'Centre-Val de Loire': ['18', '28', '36', '37', '41', '45'],
  'Corse': ['2A', '2B'],
  'Grand Est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  'Hauts-de-France': ['02', '59', '60', '62', '80'],
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  'Normandie': ['14', '27', '50', '61', '76'],
  'Nouvelle-Aquitaine': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  'Occitanie': ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'Pays de la Loire': ['44', '49', '53', '72', '85'],
  "Provence-Alpes-Côte d'Azur": ['04', '05', '06', '13', '83', '84'],
  'Guadeloupe': ['971'],
  'Martinique': ['972'],
  'Guyane': ['973'],
  'La Réunion': ['974'],
  'Mayotte': ['976'],
};

// Mapping inverse : département → région
export const DEPARTMENT_TO_REGION: Record<string, string> = {};

// Initialiser le mapping inverse
Object.entries(FRENCH_REGIONS).forEach(([region, departments]) => {
  departments.forEach(dept => {
    DEPARTMENT_TO_REGION[dept] = region;
  });
});

// Normaliser les noms de régions (enlever accents, mettre en minuscules)
export const normalizeString = (str: string): string => {
  return str
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() || '';
};

// Normaliser les numéros de départements (enlever les zéros initiaux si nécessaire)
export const normalizeDepartment = (dept: string): string => {
  const normalized = dept.trim().toUpperCase();
  // Si c'est un numéro avec zéro initial (ex: "01"), on garde tel quel
  // Si c'est un numéro sans zéro (ex: "1"), on ajoute le zéro
  if (/^\d{1,2}$/.test(normalized)) {
    return normalized.padStart(2, '0');
  }
  return normalized; // Pour les départements comme "2A", "2B"
};

/**
 * Trouve la région correspondant à un département
 */
export const getRegionByDepartment = (department: string): string | null => {
  const normalized = normalizeDepartment(department);
  return DEPARTMENT_TO_REGION[normalized] || null;
};

/**
 * Trouve tous les départements d'une région
 */
export const getDepartmentsByRegion = (region: string): string[] => {
  const normalizedRegion = normalizeString(region);
  const regionKey = Object.keys(FRENCH_REGIONS).find(
    r => normalizeString(r) === normalizedRegion
  );
  return regionKey ? FRENCH_REGIONS[regionKey] : [];
};

/**
 * Vérifie si deux zones géographiques se chevauchent
 * Prend en compte les hiérarchies : région → département → ville
 */
export const isGeographicMatch = (
  searchZone: { type: 'ville' | 'departement' | 'region'; value: string },
  mobilityZone: { type: 'ville' | 'departement' | 'region'; value: string }
): boolean => {
  const searchNormalized = normalizeString(searchZone.value);
  const mobilityNormalized = normalizeString(mobilityZone.value);

  // Cas 1: Même type et même valeur (match exact)
  if (searchZone.type === mobilityZone.type && searchNormalized === mobilityNormalized) {
    return true;
  }

  // Cas 2: Recherche par région, mobilité par département
  // Si l'organisateur recherche une région et que l'humoriste a un département de cette région
  if (searchZone.type === 'region' && mobilityZone.type === 'departement') {
    const departments = getDepartmentsByRegion(searchZone.value);
    const normalizedDept = normalizeDepartment(mobilityZone.value);
    return departments.includes(normalizedDept);
  }

  // Cas 3: Recherche par département, mobilité par région
  // Si l'organisateur recherche un département et que l'humoriste a la région correspondante
  if (searchZone.type === 'departement' && mobilityZone.type === 'region') {
    const region = getRegionByDepartment(searchZone.value);
    if (region) {
      return normalizeString(region) === mobilityNormalized;
    }
  }

  // Cas 4: Recherche par ville, mobilité par département ou région
  // (nécessiterait une base de données villes → départements, pour l'instant on fait un match partiel)
  if (searchZone.type === 'ville') {
    if (mobilityZone.type === 'departement' || mobilityZone.type === 'region') {
      // Pour l'instant, on ne peut pas faire de matching ville → département/région
      // sans une base de données complète. On retourne false.
      return false;
    }
    // Si les deux sont des villes, on fait un match exact
    if (mobilityZone.type === 'ville') {
      return searchNormalized === mobilityNormalized;
    }
  }

  // Cas 5: Recherche par département, mobilité par ville
  // (nécessiterait une base de données villes → départements)
  if (searchZone.type === 'departement' && mobilityZone.type === 'ville') {
    return false; // Pas de matching possible sans base de données
  }

  return false;
};

/**
 * Vérifie si une zone de recherche correspond à au moins une zone de mobilité
 */
export const matchesMobilityZones = (
  searchZone: { type: 'ville' | 'departement' | 'region'; value: string },
  mobilityZones: Array<{ type: 'ville' | 'departement' | 'region'; value: string }>
): boolean => {
  if (!mobilityZones || mobilityZones.length === 0) {
    return false;
  }

  return mobilityZones.some(zone => isGeographicMatch(searchZone, zone));
};

/**
 * Vérifie si un événement (par sa ville) match avec les zones de mobilité d'un humoriste
 * Matching ASCENDANT: ville de l'événement → département → région
 *
 * Exemple: événement à "Paris" matche avec:
 *   - mobilityZone ville: "Paris"
 *   - mobilityZone département: "75"
 *   - mobilityZone région: "Île-de-France"
 *
 * @param eventCity - La ville où se déroule l'événement
 * @param mobilityZones - Les zones de mobilité de l'humoriste
 * @returns true si l'événement est dans une zone de mobilité de l'humoriste
 */
export const eventMatchesMobilityZones = (
  eventCity: string,
  mobilityZones: Array<{ type: 'ville' | 'departement' | 'region'; value: string }>
): boolean => {
  if (!eventCity || !mobilityZones || mobilityZones.length === 0) {
    return false;
  }

  const normalizedEventCity = normalizeString(eventCity);

  // Obtenir le département de la ville de l'événement
  const eventDepartment = getCityDepartment(eventCity);

  // Obtenir la région à partir du département
  const eventRegion = eventDepartment ? DEPARTMENT_TO_REGION[eventDepartment] : null;

  return mobilityZones.some(zone => {
    const normalizedZoneValue = normalizeString(zone.value);

    switch (zone.type) {
      case 'ville':
        // Match exact sur la ville
        return normalizedEventCity === normalizedZoneValue;

      case 'departement':
        // Match si le département de la ville de l'événement correspond
        if (!eventDepartment) {
          // Si la ville n'est pas dans notre mapping, on ne peut pas matcher par département
          return false;
        }
        const normalizedDept = normalizeDepartment(zone.value);
        return eventDepartment === normalizedDept;

      case 'region':
        // Match si la région de la ville de l'événement correspond
        if (!eventRegion) {
          // Si la ville n'est pas dans notre mapping, on ne peut pas matcher par région
          return false;
        }
        return normalizeString(eventRegion) === normalizedZoneValue;

      default:
        return false;
    }
  });
};

/**
 * Version ASYNC de eventMatchesMobilityZones
 * Utilise l'API Geo Gouv pour récupérer le département et la région de la ville
 *
 * @param eventCity - La ville où se déroule l'événement
 * @param mobilityZones - Les zones de mobilité de l'humoriste
 * @returns true si l'événement est dans une zone de mobilité de l'humoriste
 */
export const eventMatchesMobilityZonesAsync = async (
  eventCity: string,
  mobilityZones: Array<{ type: 'ville' | 'departement' | 'region'; value: string }>
): Promise<boolean> => {
  if (!eventCity || !mobilityZones || mobilityZones.length === 0) {
    return false;
  }

  const normalizedEventCity = normalizeString(eventCity);

  // Récupérer les infos géographiques via l'API Geo Gouv
  const geoInfo = await getCityGeoInfo(eventCity);
  const eventDepartment = geoInfo.department;
  const eventRegion = geoInfo.region;

  return mobilityZones.some(zone => {
    const normalizedZoneValue = normalizeString(zone.value);

    switch (zone.type) {
      case 'ville':
        // Match exact sur la ville
        return normalizedEventCity === normalizedZoneValue;

      case 'departement':
        // Match si le département de la ville de l'événement correspond
        if (!eventDepartment) {
          return false;
        }
        const normalizedDept = normalizeDepartment(zone.value);
        return eventDepartment === normalizedDept;

      case 'region':
        // Match si la région de la ville de l'événement correspond
        if (!eventRegion) {
          return false;
        }
        return normalizeString(eventRegion) === normalizedZoneValue;

      default:
        return false;
    }
  });
};

/**
 * Détecte le type de zone géographique à partir d'une chaîne de recherche
 * et récupère les informations géographiques associées (département, région)
 *
 * @param searchTerm - Le terme de recherche (ville, département ou région)
 * @returns Les informations sur le type de zone et ses données géographiques
 */
export const detectZoneType = async (searchTerm: string): Promise<{
  type: 'ville' | 'departement' | 'region';
  value: string;
  department?: string;
  region?: string;
}> => {
  const normalized = normalizeString(searchTerm);

  // Vérifier si c'est un numéro de département (01-95, 2A, 2B, 971-976)
  const deptMatch = searchTerm.match(/^(\d{1,3}|2[AB])$/i);
  if (deptMatch) {
    const dept = normalizeDepartment(deptMatch[1]);
    const region = DEPARTMENT_TO_REGION[dept];
    return { type: 'departement', value: dept, department: dept, region: region || undefined };
  }

  // Vérifier si c'est un nom de région
  const regionNames = Object.keys(DEPARTMENT_TO_REGION).map(d => DEPARTMENT_TO_REGION[d]);
  const uniqueRegions = [...new Set(regionNames)];

  for (const region of uniqueRegions) {
    if (normalizeString(region) === normalized) {
      return { type: 'region', value: region, region };
    }
  }

  // Sinon, c'est probablement une ville - essayer de récupérer le département
  const geoInfo = await getCityGeoInfo(searchTerm);
  const department = geoInfo.department || getCityDepartment(searchTerm);
  const region = department ? DEPARTMENT_TO_REGION[department] : geoInfo.region || undefined;

  return {
    type: 'ville',
    value: searchTerm,
    department: department || undefined,
    region: region || undefined
  };
};

/**
 * Vérifie si une zone de mobilité d'un humoriste correspond à la zone de recherche
 * Cette fonction gère les hiérarchies géographiques (ville → département → région)
 *
 * @param mobilityZone - La zone de mobilité de l'humoriste
 * @param searchZone - La zone de recherche avec informations géographiques enrichies
 * @returns true si la zone de mobilité correspond à la zone de recherche
 */
export const matchesMobilityZone = (
  mobilityZone: { type: 'ville' | 'departement' | 'region'; value: string },
  searchZone: { type: 'ville' | 'departement' | 'region'; value: string; department?: string; region?: string }
): boolean => {
  const mobilityNormalized = normalizeString(mobilityZone.value);
  const searchNormalized = normalizeString(searchZone.value);

  // Match exact du même type
  if (mobilityZone.type === searchZone.type && mobilityNormalized === searchNormalized) {
    return true;
  }

  // Recherche par ville
  if (searchZone.type === 'ville') {
    // Si la mobilité est une ville, vérifier le match direct
    if (mobilityZone.type === 'ville') {
      // Match partiel pour les arrondissements et variantes
      if (mobilityNormalized.includes(searchNormalized) || searchNormalized.includes(mobilityNormalized)) {
        return true;
      }
    }

    // Si la mobilité est un département, vérifier si la ville est dans ce département
    if (mobilityZone.type === 'departement' && searchZone.department) {
      const normalizedMobilityDept = normalizeDepartment(mobilityZone.value);
      if (normalizedMobilityDept === searchZone.department) {
        return true;
      }
    }

    // Si la mobilité est une région, vérifier si la ville est dans cette région
    if (mobilityZone.type === 'region' && searchZone.region) {
      if (normalizeString(mobilityZone.value) === normalizeString(searchZone.region)) {
        return true;
      }
    }
  }

  // Recherche par département
  if (searchZone.type === 'departement') {
    const searchDept = normalizeDepartment(searchZone.value);

    // Si la mobilité est un département, vérifier le match direct
    if (mobilityZone.type === 'departement') {
      const mobilityDept = normalizeDepartment(mobilityZone.value);
      if (mobilityDept === searchDept) {
        return true;
      }
    }

    // Si la mobilité est une région, vérifier si le département est dans cette région
    if (mobilityZone.type === 'region') {
      const depts = getDepartmentsByRegion(mobilityZone.value);
      if (depts.includes(searchDept)) {
        return true;
      }
    }

    // Si la mobilité est une ville, on ne peut pas vérifier sans connaître le département de la ville
    // (cela nécessiterait une base de données villes → départements)
  }

  // Recherche par région
  if (searchZone.type === 'region') {
    const searchRegionNormalized = normalizeString(searchZone.value);

    // Si la mobilité est une région, vérifier le match direct
    if (mobilityZone.type === 'region') {
      if (normalizeString(mobilityZone.value) === searchRegionNormalized) {
        return true;
      }
    }

    // Si la mobilité est un département, vérifier si ce département est dans la région recherchée
    if (mobilityZone.type === 'departement') {
      const mobilityDept = normalizeDepartment(mobilityZone.value);
      const mobilityRegion = getRegionByDepartment(mobilityDept);
      if (mobilityRegion && normalizeString(mobilityRegion) === searchRegionNormalized) {
        return true;
      }
    }
  }

  return false;
};
