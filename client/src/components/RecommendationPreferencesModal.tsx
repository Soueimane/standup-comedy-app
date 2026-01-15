import React, { useState, useEffect, type CSSProperties } from 'react';
import Modal from './Modal';
import type {
  RecommendationPriority,
  RecommendationPreferences,
  RecommendationCriterion,
} from '../types/recommendation';
import { CRITERION_LABELS, CRITERION_DESCRIPTIONS, DEFAULT_PRIORITIES } from '../types/recommendation';

interface RecommendationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: { priorities?: RecommendationPriority[] }) => Promise<void>;
  currentPreferences?: RecommendationPreferences;
  isLoading?: boolean;
}

const RecommendationPreferencesModal: React.FC<RecommendationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPreferences,
  isLoading = false,
}) => {
  const [priorities, setPriorities] = useState<RecommendationPriority[]>(DEFAULT_PRIORITIES);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Synchroniser avec les préférences actuelles
  useEffect(() => {
    if (currentPreferences) {
      // Filtrer les critères obsolètes (comme 'availability')
      const validCriteria: RecommendationCriterion[] = ['geographic', 'experienceLevel', 'experienceYears'];
      const filteredPriorities = (currentPreferences.priorities || DEFAULT_PRIORITIES)
        .filter(p => validCriteria.includes(p.criterion as RecommendationCriterion));
      setPriorities(filteredPriorities.length > 0 ? filteredPriorities : DEFAULT_PRIORITIES);
    }
  }, [currentPreferences]);

  // Calculer le poids total des critères activés
  const totalWeight = priorities
    .filter(p => p.enabled)
    .reduce((sum, p) => sum + p.weight, 0);

  // Mettre à jour le poids d'un critère
  const updateWeight = (criterion: RecommendationCriterion, weight: number) => {
    setPriorities(prev =>
      prev.map(p => (p.criterion === criterion ? { ...p, weight } : p))
    );
  };

  // Activer/désactiver un critère
  const toggleCriterion = (criterion: RecommendationCriterion) => {
    setPriorities(prev =>
      prev.map(p => (p.criterion === criterion ? { ...p, enabled: !p.enabled } : p))
    );
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    setError(null);

    // Validation
    const enabledPriorities = priorities.filter(p => p.enabled);
    if (enabledPriorities.length === 0) {
      setError('Au moins un critère doit être activé');
      return;
    }
    if (totalWeight === 0) {
      setError('Le poids total des critères activés doit être supérieur à 0');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ priorities });
      onClose();
    } catch (err) {
      setError('Erreur lors de la sauvegarde des préférences');
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = () => {
    setPriorities(DEFAULT_PRIORITIES);
  };

  // Styles
  const titleStyle: CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#ffffff',
  };

  const sectionStyle: CSSProperties = {
    marginBottom: '1.5rem',
  };

  const labelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    fontSize: '1rem',
    color: '#ffffff',
  };

  const criterionCardStyle = (isEnabled: boolean): CSSProperties => ({
    backgroundColor: isEnabled ? 'rgba(139, 92, 246, 0.1)' : 'rgba(75, 85, 99, 0.2)',
    border: `1px solid ${isEnabled ? 'rgba(139, 92, 246, 0.3)' : 'rgba(75, 85, 99, 0.3)'}`,
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '0.75rem',
    transition: 'all 0.2s',
  });

  const sliderContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
  };

  const sliderStyle: CSSProperties = {
    flex: 1,
    height: '6px',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundColor: '#4b5563',
    borderRadius: '3px',
    cursor: 'pointer',
  };

  const weightDisplayStyle: CSSProperties = {
    minWidth: '45px',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#8b5cf6',
  };

  const totalWeightStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: totalWeight > 100 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.1)',
    border: `1px solid ${totalWeight > 100 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
    borderRadius: '8px',
    marginTop: '1rem',
  };

  const buttonContainerStyle: CSSProperties = {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'link'): CSSProperties => ({
    padding: variant === 'link' ? '0' : '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    ...(variant === 'primary'
      ? {
          backgroundColor: '#8b5cf6',
          color: '#ffffff',
          flex: 1,
        }
      : variant === 'secondary'
        ? {
            backgroundColor: 'transparent',
            color: '#9ca3af',
            border: '1px solid #4b5563',
            flex: 1,
          }
        : {
            backgroundColor: 'transparent',
            color: '#8b5cf6',
            textDecoration: 'underline',
          }),
  });

  const errorStyle: CSSProperties = {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  };

  const descriptionStyle: CSSProperties = {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
  };

  const infoButtonStyle: CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #8b5cf6',
    backgroundColor: showExplanation ? '#8b5cf6' : 'transparent',
    color: showExplanation ? '#ffffff' : '#8b5cf6',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    marginBottom: '1rem',
  };

  const explanationBoxStyle: CSSProperties = {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  };

  const explanationTitleStyle: CSSProperties = {
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: '0.5rem',
  };

  const explanationListStyle: CSSProperties = {
    marginLeft: '1rem',
    marginTop: '0.5rem',
    color: '#d1d5db',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 style={titleStyle}>Configurer les recommandations</h2>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Bouton d'information */}
      <button
        style={infoButtonStyle}
        onClick={() => setShowExplanation(!showExplanation)}
      >
        <span>{showExplanation ? '📖' : 'ℹ️'}</span>
        <span>{showExplanation ? 'Masquer les détails' : 'Comment ça fonctionne ?'}</span>
      </button>

      {/* Explication détaillée du calcul */}
      {showExplanation && (
        <div style={explanationBoxStyle}>
          <div style={explanationTitleStyle}>📊 Comment fonctionnent les recommandations ?</div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#d1d5db', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Le système de scoring :
            </p>
            <p style={{ color: '#d1d5db', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Chaque événement reçoit un score de 0 à 100% calculé avec une moyenne pondérée selon vos priorités.
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#8b5cf6', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Critères de correspondance :
            </p>
            <ul style={explanationListStyle}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#8b5cf6' }}>Zone géographique</strong> (poids: {priorities.find(p => p.criterion === 'geographic')?.weight}%)
                <br />
                <span style={{ fontSize: '0.85rem' }}>
                  • 100% = événement dans votre ville<br />
                  • 80% = événement dans votre département<br />
                  • 60% = événement dans votre région<br />
                  • 0% = événement hors de vos zones de mobilité
                </span>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#8b5cf6' }}>Niveau d'expérience (scènes)</strong> (poids: {priorities.find(p => p.criterion === 'experienceLevel')?.weight}%)
                <br />
                <span style={{ fontSize: '0.85rem' }}>
                  • 100% = votre niveau correspond au requis de l'événement<br />
                  • Exemple: Si vous avez fait 150 scènes et l'événement demande 50-200 scènes → 100%<br />
                  • Si l'événement accepte "tous niveaux" → 100%
                </span>
              </li>
              <li>
                <strong style={{ color: '#8b5cf6' }}>Années d'expérience</strong> (poids: {priorities.find(p => p.criterion === 'experienceYears')?.weight}%)
                <br />
                <span style={{ fontSize: '0.85rem' }}>
                  • 100% = vous avez au moins le nombre d'années requis<br />
                  • 50% = vous avez presque le nombre d'années requis (proche)<br />
                  • Exemple: Vous avez 3 ans d'expérience, événement demande 2 ans → 100%
                </span>
              </li>
            </ul>
          </div>

          <div style={{
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            padding: '0.75rem',
            borderRadius: '6px',
            marginTop: '1rem'
          }}>
            <p style={{ color: '#ffffff', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
              💡 Exemple de calcul :
            </p>
            <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Si vous avez les poids: Géographie 50%, Scènes 30%, Années 20%<br />
              Et qu'un événement a: Géographie 80%, Scènes 100%, Années 100%<br />
              <br />
              <strong>Score final = (80% × 50% + 100% × 30% + 100% × 20%) / 100% = 86%</strong>
              <br />
              <br />
              Si vos poids totalisent plus de 100%, ils sont automatiquement normalisés
              (ex: 60+50+40=150% devient 40+33+27=100%).
            </p>
          </div>
        </div>
      )}

      {/* Liste des critères */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Priorités des critères</h3>
        <p style={{ ...descriptionStyle, marginBottom: '1rem' }}>
          Ajustez l'importance de chaque critère pour personnaliser vos recommandations
        </p>

        {priorities.map(priority => (
          <div key={priority.criterion} style={criterionCardStyle(priority.enabled)}>
            <div style={labelStyle}>
              <input
                type="checkbox"
                checked={priority.enabled}
                onChange={() => toggleCriterion(priority.criterion)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold' }}>
                {CRITERION_LABELS[priority.criterion]}
              </span>
            </div>
            <p style={descriptionStyle}>
              {CRITERION_DESCRIPTIONS[priority.criterion]}
            </p>
            <div style={sliderContainerStyle}>
              <input
                type="range"
                min="0"
                max="100"
                value={priority.weight}
                onChange={e => updateWeight(priority.criterion, parseInt(e.target.value))}
                disabled={!priority.enabled}
                style={sliderStyle}
              />
              <span style={weightDisplayStyle}>{priority.weight}%</span>
            </div>
          </div>
        ))}

        {/* Affichage du total */}
        <div style={totalWeightStyle}>
          <span>Total des poids actifs :</span>
          <span
            style={{
              fontWeight: 'bold',
              color: totalWeight > 100 ? '#ef4444' : '#8b5cf6',
            }}
          >
            {totalWeight}%
          </span>
        </div>
        {totalWeight > 100 && (
          <p style={{ ...descriptionStyle, color: '#ef4444', marginTop: '0.5rem' }}>
            Attention : le total dépasse 100%. Les poids seront normalisés.
          </p>
        )}
      </div>

      {/* Boutons d'action */}
      <div style={buttonContainerStyle}>
        <button
          style={buttonStyle('secondary')}
          onClick={onClose}
          disabled={isSaving}
        >
          Annuler
        </button>
        <button
          style={buttonStyle('primary')}
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Lien de réinitialisation */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button style={buttonStyle('link')} onClick={resetToDefaults}>
          Réinitialiser aux valeurs par défaut
        </button>
      </div>
    </Modal>
  );
};

export default RecommendationPreferencesModal;
