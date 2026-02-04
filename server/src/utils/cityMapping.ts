/**
 * Service de géocodage utilisant l'API Geo Gouv (gratuite)
 * Permet de récupérer le département et la région d'une ville française
 *
 * API: https://geo.api.gouv.fr/
 */

// Cache en mémoire pour éviter les appels API répétitifs
const cityCache: Map<string, { department: string | null; region: string | null }> = new Map();
const postalCodeCache: Map<string, { department: string | null; region: string | null }> = new Map();

// Durée de vie du cache: 24 heures
const CACHE_TTL = 24 * 60 * 60 * 1000;
const cacheTimestamps: Map<string, number> = new Map();
const postalCodeCacheTimestamps: Map<string, number> = new Map();

/**
 * Normalise une chaîne de caractères pour la comparaison
 * Enlève les accents, met en minuscules, et trim
 */
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Normalise le nom d'une ville pour l'API Geo Gouv
 * Gère les arrondissements de Paris, Lyon, Marseille
 * 
 * @param city - Le nom de la ville
 * @returns Le nom normalisé pour l'API
 */
const normalizeCityForAPI = (city: string): string => {
  if (!city) return city;
  
  const normalized = normalizeString(city);
  
  // Gérer les arrondissements de Paris (Paris 1er, Paris 2e, Paris 10e Arrondissement, etc.)
  if (normalized.includes('paris') && (normalized.includes('arrondissement') || /paris\s+\d+/.test(normalized))) {
    return 'Paris';
  }
  
  // Gérer les arrondissements de Lyon (Lyon 1er, Lyon 2e, etc.)
  if (normalized.includes('lyon') && /lyon\s+\d+/.test(normalized)) {
    return 'Lyon';
  }
  
  // Gérer les arrondissements de Marseille (Marseille 1er, Marseille 2e, etc.)
  if (normalized.includes('marseille') && /marseille\s+\d+/.test(normalized)) {
    return 'Marseille';
  }
  
  // Retourner la ville originale si pas d'arrondissement détecté
  return city;
};

/**
 * Interface pour la réponse de l'API Geo Gouv
 */
interface GeoGouvCommune {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  departement?: {
    code: string;
    nom: string;
  };
  region?: {
    code: string;
    nom: string;
  };
}

/**
 * Récupère les informations géographiques d'une ville via l'API Geo Gouv
 *
 * @param city - Le nom de la ville
 * @returns Les informations de département et région, ou null si non trouvé
 */
export const getCityGeoInfo = async (city: string): Promise<{ department: string | null; region: string | null }> => {
  if (!city) {
    return { department: null, region: null };
  }

  const normalizedCity = normalizeString(city);
  const apiCityName = normalizeCityForAPI(city); // Normaliser pour l'API (gérer arrondissements)
  const normalizedApiCity = normalizeString(apiCityName);

  // Vérifier le cache avec la ville normalisée (inclut les arrondissements)
  const cached = cityCache.get(normalizedCity);
  const cacheTime = cacheTimestamps.get(normalizedCity);
  if (cached && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cached;
  }
  
  // Vérifier aussi le cache avec la ville API (sans arrondissement)
  const cachedApi = cityCache.get(normalizedApiCity);
  const cacheTimeApi = cacheTimestamps.get(normalizedApiCity);
  if (cachedApi && cacheTimeApi && (Date.now() - cacheTimeApi) < CACHE_TTL) {
    // Mettre en cache pour la ville originale aussi
    cityCache.set(normalizedCity, cachedApi);
    cacheTimestamps.set(normalizedCity, Date.now());
    return cachedApi;
  }

  try {
    // Appel à l'API Geo Gouv avec la ville normalisée (sans arrondissement si applicable)
    const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(apiCityName)}&fields=departement,region&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout de 5 secondes
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[GeoGouv] API error for city "${city}": ${response.status}`);
      return { department: null, region: null };
    }

    const data = await response.json() as GeoGouvCommune[];

    if (!data || data.length === 0) {
      console.log(`[GeoGouv] City "${city}" (normalisé: "${apiCityName}") not found`);
      // Mettre en cache le résultat négatif pour éviter des appels répétés
      const result = { department: null, region: null };
      cityCache.set(normalizedCity, result);
      cacheTimestamps.set(normalizedCity, Date.now());
      if (normalizedCity !== normalizedApiCity) {
        cityCache.set(normalizedApiCity, result);
        cacheTimestamps.set(normalizedApiCity, Date.now());
      }
      return result;
    }

    const commune = data[0];
    const result = {
      department: commune.departement?.code || commune.codeDepartement || null,
      region: commune.region?.nom || null,
    };

    // Mettre en cache pour la ville API (sans arrondissement)
    cityCache.set(normalizedApiCity, result);
    cacheTimestamps.set(normalizedApiCity, Date.now());
    
    // Mettre aussi en cache pour la ville originale (avec arrondissement si applicable)
    // pour que les prochains appels avec la même ville soient plus rapides
    if (normalizedCity !== normalizedApiCity) {
      cityCache.set(normalizedCity, result);
      cacheTimestamps.set(normalizedCity, Date.now());
    }

    console.log(`[GeoGouv] City "${city}" (normalisé: "${apiCityName}") → Département: ${result.department}, Région: ${result.region}`);
    return result;

  } catch (error) {
    // En cas d'erreur réseau ou timeout, log et retourne null
    const errorName = error instanceof Error ? error.name : 'Unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      console.warn(`[GeoGouv] Timeout for city "${city}"`);
    } else {
      console.error(`[GeoGouv] Error fetching city "${city}":`, errorMessage);
    }
    return { department: null, region: null };
  }
};

/**
 * Récupère les informations géographiques d'une commune via l'API Geo Gouv
 * en utilisant le code postal (5 chiffres). Utiliser en priorité quand disponible
 * pour éviter les ambiguïtés (ex. plusieurs "Grigny" : 91 Essonne vs 62 Pas-de-Calais).
 *
 * @param postalCode - Code postal français (5 chiffres)
 * @returns Les informations de département et région, ou null si non trouvé
 */
export const getCityGeoInfoByPostalCode = async (postalCode: string): Promise<{ department: string | null; region: string | null }> => {
  const trimmed = String(postalCode || '').trim();
  if (!/^\d{5}$/.test(trimmed)) {
    return { department: null, region: null };
  }

  const cached = postalCodeCache.get(trimmed);
  const cacheTime = postalCodeCacheTimestamps.get(trimmed);
  if (cached && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cached;
  }

  try {
    const url = `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(trimmed)}&fields=departement,region&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[GeoGouv] API error for codePostal "${trimmed}": ${response.status}`);
      return { department: null, region: null };
    }

    const data = await response.json() as GeoGouvCommune[];
    if (!data || data.length === 0) {
      const result = { department: null, region: null };
      postalCodeCache.set(trimmed, result);
      postalCodeCacheTimestamps.set(trimmed, Date.now());
      return result;
    }

    const commune = data[0];
    const result = {
      department: commune.departement?.code || commune.codeDepartement || null,
      region: commune.region?.nom || null,
    };
    postalCodeCache.set(trimmed, result);
    postalCodeCacheTimestamps.set(trimmed, Date.now());
    console.log(`[GeoGouv] Code postal "${trimmed}" → Département: ${result.department}, Région: ${result.region}`);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.warn(`[GeoGouv] Error for codePostal "${trimmed}":`, err);
    return { department: null, region: null };
  }
};

/**
 * Obtient le code département d'une ville (version async)
 *
 * @param city - Le nom de la ville
 * @returns Le code département ou null si non trouvé
 */
export const getCityDepartmentAsync = async (city: string): Promise<string | null> => {
  const geoInfo = await getCityGeoInfo(city);
  return geoInfo.department;
};

/**
 * Obtient le nom de la région d'une ville (version async)
 *
 * @param city - Le nom de la ville
 * @returns Le nom de la région ou null si non trouvé
 */
export const getCityRegionAsync = async (city: string): Promise<string | null> => {
  const geoInfo = await getCityGeoInfo(city);
  return geoInfo.region;
};

/**
 * Version synchrone avec fallback sur un mapping minimal pour les villes principales
 * Utilisée quand on ne peut pas faire d'appel async
 */
const FALLBACK_CITIES: Record<string, string> = {
  'paris': '75',
  'lyon': '69',
  'marseille': '13',
  'toulouse': '31',
  'nice': '06',
  'nantes': '44',
  'strasbourg': '67',
  'montpellier': '34',
  'bordeaux': '33',
  'lille': '59',
  'rennes': '35',
  'reims': '51',
  'saint-etienne': '42',
  'le havre': '76',
  'toulon': '83',
  'grenoble': '38',
  'dijon': '21',
  'angers': '49',
  'nimes': '30',
  'villeurbanne': '69',
};

/**
 * Version synchrone - utilise le cache ou le fallback
 * Pour compatibilité avec le code existant
 *
 * @param city - Le nom de la ville
 * @returns Le code département ou null si non trouvé
 */
export const getCityDepartment = (city: string): string | null => {
  if (!city) return null;

  const normalizedCity = normalizeString(city);

  // Vérifier le cache d'abord
  const cached = cityCache.get(normalizedCity);
  if (cached) {
    return cached.department;
  }

  // Fallback sur le mapping minimal
  return FALLBACK_CITIES[normalizedCity] || null;
};

/**
 * Vérifie si une ville est dans le cache ou le fallback
 *
 * @param city - Le nom de la ville
 * @returns true si la ville est connue
 */
export const isCityKnown = (city: string): boolean => {
  if (!city) return false;
  const normalizedCity = normalizeString(city);
  return cityCache.has(normalizedCity) || normalizedCity in FALLBACK_CITIES;
};

/**
 * Précharge les informations géographiques pour une liste de villes
 * Utile pour optimiser les performances avant un batch de notifications
 *
 * @param cities - Liste des villes à précharger
 */
export const preloadCities = async (cities: string[]): Promise<void> => {
  const uniqueCities = [...new Set(cities.filter(c => c && !cityCache.has(normalizeString(c))))];

  if (uniqueCities.length === 0) return;

  console.log(`[GeoGouv] Preloading ${uniqueCities.length} cities...`);

  // Charger les villes en parallèle avec une limite de concurrence
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueCities.length; i += BATCH_SIZE) {
    const batch = uniqueCities.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(city => getCityGeoInfo(city)));

    // Petite pause entre les batches pour ne pas surcharger l'API
    if (i + BATCH_SIZE < uniqueCities.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[GeoGouv] Preloading complete`);
};

/**
 * Vide le cache (utile pour les tests)
 */
export const clearCache = (): void => {
  cityCache.clear();
  cacheTimestamps.clear();
  postalCodeCache.clear();
  postalCodeCacheTimestamps.clear();
};

/**
 * Extrait le code postal d'une adresse française
 * Pattern: 5 chiffres consécutifs (ex: 75001, 69001)
 * 
 * @param address - L'adresse contenant potentiellement un code postal
 * @returns Le code postal extrait ou null si non trouvé
 */
export const extractPostalCode = (address: string): string | null => {
  if (!address) return null;
  
  // Recherche un pattern de 5 chiffres consécutifs
  const postalCodeMatch = address.match(/\b(\d{5})\b/);
  return postalCodeMatch ? postalCodeMatch[1] : null;
};

/**
 * Extrait le code département à partir d'un code postal
 * Pour les codes postaux français:
 * - Corse: 20000-20199 → 2A, 20200-20999 → 2B
 * - Outre-mer: 97XXX → 971, 972, etc.
 * - Métropole: les 2 premiers chiffres (sauf cas spéciaux)
 * 
 * @param postalCode - Le code postal (5 chiffres)
 * @returns Le code département ou null si non valide
 */
export const getDepartmentFromPostalCode = (postalCode: string): string | null => {
  if (!postalCode || postalCode.length !== 5 || !/^\d{5}$/.test(postalCode)) {
    return null;
  }
  
  const numericCode = parseInt(postalCode, 10);
  
  // Corse
  if (numericCode >= 20000 && numericCode <= 20199) return '2A';
  if (numericCode >= 20200 && numericCode <= 20999) return '2B';
  
  // Outre-mer (DOM-TOM)
  if (postalCode.startsWith('97')) {
    // Les 3 premiers chiffres pour l'outre-mer (971, 972, 973, 974, 976, 977, 978, 986, 987, 988)
    return postalCode.substring(0, 3);
  }
  
  // Métropole: les 2 premiers chiffres
  // Cas particulier: codes 01-09 deviennent 1-9 (mais avec padding)
  const dept = postalCode.substring(0, 2);
  return dept;
};
