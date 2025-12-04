import { useState, useRef, useCallback, useEffect } from 'react';

const ERROR_MESSAGES = {
  REQUIRED: 'Le code postal est requis',
  FORMAT: 'Le code postal doit contenir exactement 5 chiffres',
  NOT_FOUND: "Ce code postal n'est pas valide en France",
  API_ERROR: 'Impossible de vérifier le code postal. Veuillez réessayer.'
};

export interface CityOption {
  city: string;
  postcode: string;
}

interface UsePostalCodeValidationOptions {
  postalCode: string;
  onCityAutoFill?: (city: string) => void;
  onMultipleCities?: (cities: CityOption[]) => void;
  debounceMs?: number;
}

interface UsePostalCodeValidationReturn {
  isValidating: boolean;
  error: string | null;
  cities: CityOption[];
  validatePostalCode: () => Promise<boolean>;
  clearError: () => void;
}

export const usePostalCodeValidation = ({
  postalCode,
  onCityAutoFill,
  onMultipleCities,
  debounceMs = 500
}: UsePostalCodeValidationOptions): UsePostalCodeValidationReturn => {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validatePostalCode = useCallback(async (): Promise<boolean> => {
    // Cancel any pending validation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check if postal code is empty
    if (!postalCode || !postalCode.trim()) {
      setError(ERROR_MESSAGES.REQUIRED);
      setIsValidating(false);
      setCities([]);
      return false;
    }

    // Check format: must be exactly 5 digits
    const postalCodeRegex = /^\d{5}$/;
    if (!postalCodeRegex.test(postalCode.trim())) {
      setError(ERROR_MESSAGES.FORMAT);
      setIsValidating(false);
      setCities([]);
      return false;
    }

    // Start validation
    setIsValidating(true);
    setError(null);

    return new Promise((resolve) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          // Create abort controller for this request
          abortControllerRef.current = new AbortController();

          const response = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
              postalCode.trim()
            )}&type=municipality&limit=10`,
            { signal: abortControllerRef.current.signal }
          );

          if (!response.ok) {
            setError(ERROR_MESSAGES.API_ERROR);
            setIsValidating(false);
            setCities([]);
            resolve(false);
            return;
          }

          const data = await response.json();

          // Check if results exist
          if (!data.features || data.features.length === 0) {
            setError(ERROR_MESSAGES.NOT_FOUND);
            setIsValidating(false);
            setCities([]);
            resolve(false);
            return;
          }

          // Extract all unique cities for this postal code
          const uniqueCities: CityOption[] = [];
          const seenCities = new Set<string>();

          data.features.forEach((feature: any) => {
            const returnedPostalCode = feature.properties.postcode;
            const city = feature.properties.city || feature.properties.name;

            if (returnedPostalCode === postalCode.trim() && !seenCities.has(city)) {
              seenCities.add(city);
              uniqueCities.push({
                city,
                postcode: returnedPostalCode
              });
            }
          });

          if (uniqueCities.length === 0) {
            setError(ERROR_MESSAGES.NOT_FOUND);
            setIsValidating(false);
            setCities([]);
            resolve(false);
            return;
          }

          // Store all cities
          setCities(uniqueCities);

          // Handle auto-fill or multiple choice
          if (uniqueCities.length === 1) {
            // Single city: auto-fill (TOUJOURS remplacer)
            if (onCityAutoFill) {
              onCityAutoFill(uniqueCities[0].city);
            }
          } else {
            // Multiple cities: let user choose
            if (onMultipleCities) {
              onMultipleCities(uniqueCities);
            }
          }

          // Success
          setError(null);
          setIsValidating(false);
          resolve(true);
        } catch (err: any) {
          // Don't set error if request was aborted
          if (err.name === 'AbortError') {
            setCities([]);
            resolve(false);
            return;
          }

          console.error('Erreur lors de la validation du code postal:', err);
          setError(ERROR_MESSAGES.API_ERROR);
          setIsValidating(false);
          setCities([]);
          resolve(false);
        }
      }, debounceMs);
    });
  }, [postalCode, onCityAutoFill, onMultipleCities, debounceMs]);

  return {
    isValidating,
    error,
    cities,
    validatePostalCode,
    clearError
  };
};
