/**
 * Service de matching géographique pour la zone de mobilité (version client)
 * Permet de vérifier si une zone de recherche (ville/département/région) 
 * correspond à une zone de mobilité d'un humoriste en tenant compte des hiérarchies
 */

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
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Exporter pour le débogage (alias)
export const normalizeStringForDebug = normalizeString;

// Normaliser les numéros de départements (enlever les zéros initiaux si nécessaire)
const normalizeDepartment = (dept: string): string => {
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

  console.log('🔍 isGeographicMatch:', {
    searchZone: { type: searchZone.type, value: searchZone.value, normalized: searchNormalized },
    mobilityZone: { type: mobilityZone.type, value: mobilityZone.value, normalized: mobilityNormalized }
  });

  // Cas 1: Même type et même valeur (match exact)
  if (searchZone.type === mobilityZone.type && searchNormalized === mobilityNormalized) {
    console.log('✅ Match exact trouvé');
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
    console.log('🔍 Cas 3 - Département → Région:', { 
      department: searchZone.value, 
      region, 
      mobilityRegion: mobilityZone.value,
      normalizedRegion: region ? normalizeString(region) : null,
      normalizedMobility: mobilityNormalized,
      match: region ? normalizeString(region) === mobilityNormalized : false
    });
    if (region) {
      const match = normalizeString(region) === mobilityNormalized;
      if (match) {
        console.log('✅ Match département → région trouvé');
      }
      return match;
    }
  }

  // Cas 4: Recherche par ville, mobilité par département ou région
  // Si l'événement est dans une ville et que l'humoriste a un département/région
  // On récupère le département de la ville et on vérifie s'il correspond
  if (searchZone.type === 'ville') {
    if (mobilityZone.type === 'departement') {
      // Pour l'instant, on ne peut pas faire de matching ville → département
      // sans récupérer le département de la ville d'abord
      // Ce cas sera géré dans checkGeographicCompatibility
      return false;
    }
    if (mobilityZone.type === 'region') {
      // Même chose pour la région
      return false;
    }
    // Si les deux sont des villes, on fait un match partiel (une ville peut contenir l'autre)
    if (mobilityZone.type === 'ville') {
      // Match exact
      if (searchNormalized === mobilityNormalized) {
        console.log('✅ Match ville exact');
        return true;
      }
      // Match partiel : si une ville contient l'autre (ex: "Paris 2e Arrondissement" contient "Paris")
      if (searchNormalized.includes(mobilityNormalized) || mobilityNormalized.includes(searchNormalized)) {
        console.log('✅ Match ville partiel trouvé');
        return true;
      }
      return false;
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
 * Extrait le département à partir d'une ville en utilisant l'API adresse.data.gouv.fr
 * Retourne le numéro de département (ex: "78" pour Yvelines)
 */
export const getDepartmentFromCity = async (city: string): Promise<string | null> => {
  if (!city || city.length < 2) return null;
  
  try {
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&limit=1&type=municipality`);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const postcode = data.features[0].properties.postcode;
      if (postcode) {
        // Extraire les 2 premiers chiffres du code postal (département)
        const department = postcode.substring(0, 2);
        return department;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du département:', error);
  }
  return null;
};

/**
 * Vérifie si un humoriste est compatible géographiquement avec un événement
 * en fonction de la ville de l'événement et de la zone de mobilité de l'humoriste
 */
export const checkGeographicCompatibility = async (
  eventCity: string,
  comedianMobilityZones?: Array<{ type: 'ville' | 'departement' | 'region'; value: string }>
): Promise<{ isCompatible: boolean; reason?: string }> => {
  console.log('🔍 checkGeographicCompatibility - Entrée:', { eventCity, comedianMobilityZones });
  
  if (!comedianMobilityZones || comedianMobilityZones.length === 0) {
    console.log('❌ Pas de zones de mobilité');
    return { isCompatible: false, reason: 'Aucune zone de mobilité renseignée' };
  }

  // Essayer de trouver le département à partir de la ville
  const department = await getDepartmentFromCity(eventCity);
  console.log('📍 Département trouvé pour la ville:', { eventCity, department });
  
  if (department) {
    // Vérifier si le département correspond à une zone de mobilité
    console.log('🔍 Vérification match département:', { department, zones: comedianMobilityZones });
    
    // Vérifier les zones de type département
    const departmentZones = comedianMobilityZones.filter(z => z.type === 'departement');
    for (const zone of departmentZones) {
      const normalizedDept = normalizeDepartment(zone.value);
      console.log(`  Comparaison département: "${department}" avec "${normalizedDept}"`);
      if (normalizedDept === department) {
        console.log('✅ Match département trouvé');
        return { isCompatible: true, reason: `Compatible : département ${zone.value}` };
      }
    }
    
    const departmentMatch = matchesMobilityZones(
      { type: 'departement', value: department },
      comedianMobilityZones
    );
    console.log('✅ Résultat match département (fonction):', departmentMatch);
    
    if (departmentMatch) {
      return { isCompatible: true, reason: `Compatible : département ${department}` };
    }

    // Vérifier si la région du département correspond
    const region = getRegionByDepartment(department);
    console.log('📍 Région trouvée pour le département:', { department, region });
    
    if (region) {
      console.log('🔍 Vérification match région:', { region, zones: comedianMobilityZones });
      // Normaliser la région avant de comparer
      const normalizedRegion = normalizeString(region);
      console.log('📝 Région normalisée:', normalizedRegion);
      
      // Vérifier chaque zone de mobilité de type région
      const regionZones = comedianMobilityZones.filter(z => z.type === 'region');
      console.log('🌍 Zones de mobilité de type région:', regionZones);
      
      for (const zone of regionZones) {
        const normalizedZone = normalizeString(zone.value);
        console.log(`  Comparaison région: "${normalizedRegion}" avec "${normalizedZone}"`);
        if (normalizedZone === normalizedRegion) {
          console.log('✅ Match région trouvé');
          return { isCompatible: true, reason: `Compatible : région ${zone.value}` };
        }
      }
      
      const regionMatch = matchesMobilityZones(
        { type: 'region', value: region },
        comedianMobilityZones
      );
      console.log('✅ Résultat match région (fonction):', regionMatch);
      
      if (regionMatch) {
        return { isCompatible: true, reason: `Compatible : région ${region}` };
      }
    }
  }

  // Vérifier si la ville correspond directement (avec matching partiel)
  console.log('🔍 Vérification match ville directe:', { eventCity, zones: comedianMobilityZones });
  
  // Normaliser la ville de l'événement
  const normalizedEventCity = normalizeString(eventCity);
  console.log('📝 Ville événement normalisée:', normalizedEventCity);
  
  // Vérifier chaque zone de mobilité de type "ville"
  const cityZones = comedianMobilityZones.filter(z => z.type === 'ville');
  console.log('🏙️ Zones de mobilité de type ville:', cityZones);
  
  for (const zone of cityZones) {
    const normalizedZoneCity = normalizeString(zone.value);
    console.log(`  Comparaison: "${normalizedEventCity}" avec "${normalizedZoneCity}"`);
    
    // Match exact
    if (normalizedEventCity === normalizedZoneCity) {
      console.log('✅ Match ville exact trouvé');
      return { isCompatible: true, reason: `Compatible : ville ${zone.value}` };
    }
    
    // Match partiel : si une ville contient l'autre
    if (normalizedEventCity.includes(normalizedZoneCity) || normalizedZoneCity.includes(normalizedEventCity)) {
      console.log('✅ Match ville partiel trouvé');
      return { isCompatible: true, reason: `Compatible : ville ${zone.value}` };
    }
  }
  
  const cityMatch = matchesMobilityZones(
    { type: 'ville', value: eventCity },
    comedianMobilityZones
  );
  console.log('✅ Résultat match ville (fonction):', cityMatch);

  if (cityMatch) {
    return { isCompatible: true, reason: `Compatible : ville ${eventCity}` };
  }

  console.log('❌ Aucun match trouvé');
  return { isCompatible: false, reason: 'Zone de mobilité non compatible' };
};
