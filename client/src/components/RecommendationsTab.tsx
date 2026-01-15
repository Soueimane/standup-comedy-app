import React, { useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecommendations,
  getRecommendationPreferences,
  updateRecommendationPreferences,
} from '../services/api';
import type { RecommendedEvent, RecommendationsResponse, RecommendationPreferences } from '../types/recommendation';
import type { IEvent } from '../types/event';
import RecommendationPreferencesModal from './RecommendationPreferencesModal';

interface RecommendationsTabProps {
  onEventClick: (event: IEvent) => void;
  onApplyClick?: (event: IEvent) => void;
  isActive: boolean;
  userId?: string;
}

const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  onEventClick,
  onApplyClick,
  isActive,
  userId,
}) => {
  const [page, setPage] = useState(1);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const queryClient = useQueryClient();
  const limit = 20;

  // Récupérer les recommandations
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useQuery<RecommendationsResponse>({
    queryKey: ['recommendations', userId, page],
    queryFn: () => getRecommendations({ page, limit }),
    enabled: isActive && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Récupérer les préférences
  const { data: preferences, isLoading: preferencesLoading } = useQuery<RecommendationPreferences>({
    queryKey: ['recommendationPreferences', userId],
    queryFn: () => getRecommendationPreferences(),
    enabled: isActive && !!userId,
  });

  // Mutation pour mettre à jour les préférences
  const updatePreferencesMutation = useMutation({
    mutationFn: updateRecommendationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendationPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  // Formatage de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Couleur du score
  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#22c55e'; // Vert
    if (score >= 40) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
  };

  // Styles
  const containerStyle: CSSProperties = {
    padding: '1rem 0',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  };

  const configButtonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    color: '#8b5cf6',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const cardHeaderStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '0.25rem',
  };

  const scoreContainerStyle = (score: number): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: `${getScoreColor(score)}20`,
    border: `2px solid ${getScoreColor(score)}`,
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    minWidth: '60px',
  });

  const scoreValueStyle = (score: number): CSSProperties => ({
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: getScoreColor(score),
  });

  const scoreLabelStyle: CSSProperties = {
    fontSize: '0.7rem',
    color: '#9ca3af',
    textTransform: 'uppercase',
  };

  const infoRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '0.75rem',
    fontSize: '0.9rem',
    color: '#9ca3af',
  };

  const infoItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  };

  const matchReasonsStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem',
  };

  const matchBadgeStyle: CSSProperties = {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#a78bfa',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
  };

  const applyButtonStyle: CSSProperties = {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    marginTop: '0.75rem',
    transition: 'all 0.2s',
  };

  const emptyStateStyle: CSSProperties = {
    textAlign: 'center',
    padding: '3rem',
    color: '#9ca3af',
  };

  const paginationStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  };

  const pageButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    backgroundColor: isActive ? '#8b5cf6' : 'transparent',
    border: `1px solid ${isActive ? '#8b5cf6' : '#4b5563'}`,
    borderRadius: '8px',
    color: isActive ? '#ffffff' : '#9ca3af',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const loadingStyle: CSSProperties = {
    textAlign: 'center',
    padding: '3rem',
    color: '#9ca3af',
  };

  // Nombre total de pages
  const totalPages = recommendationsData
    ? Math.ceil(recommendationsData.total / limit)
    : 0;

  // Rendu du contenu
  if (recommendationsLoading) {
    return <div style={loadingStyle}>Chargement des recommandations...</div>;
  }

  if (recommendationsError) {
    return (
      <div style={{ ...emptyStateStyle, color: '#ef4444' }}>
        Erreur lors du chargement des recommandations
      </div>
    );
  }

  const recommendations = recommendationsData?.recommendations || [];

  return (
    <div style={containerStyle}>
      {/* En-tête avec bouton de configuration */}
      <div style={headerStyle}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            {recommendationsData?.total || 0} événement(s) recommandé(s)
          </span>
        </div>
        <button
          style={configButtonStyle}
          onClick={() => setShowPreferencesModal(true)}
        >
          <span>Configurer</span>
        </button>
      </div>

      {/* Liste des recommandations */}
      {recommendations.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Aucune recommandation disponible
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            Complétez votre profil (zone de mobilité, expérience, disponibilités) pour recevoir des suggestions personnalisées.
          </p>
        </div>
      ) : (
        <>
          {recommendations.map((rec: RecommendedEvent) => (
            <div
              key={rec.event._id}
              style={cardStyle}
              onClick={() => onEventClick(rec.event)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div style={cardHeaderStyle}>
                <div style={{ flex: 1 }}>
                  <h3 style={titleStyle}>{rec.event.title}</h3>
                  <div style={infoRowStyle}>
                    <span style={infoItemStyle}>
                      {formatDate(rec.event.date)}
                    </span>
                    <span style={infoItemStyle}>
                      {rec.event.location?.city || 'Lieu non précisé'}
                    </span>
                    {rec.event.startTime && (
                      <span style={infoItemStyle}>
                        {rec.event.startTime}
                      </span>
                    )}
                  </div>
                </div>
                <div style={scoreContainerStyle(rec.score)}>
                  <span style={scoreValueStyle(rec.score)}>{rec.score}%</span>
                  <span style={scoreLabelStyle}>Match</span>
                </div>
              </div>

              {/* Description tronquée */}
              <p
                style={{
                  color: '#d1d5db',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {rec.event.description}
              </p>

              {/* Badges des raisons de correspondance */}
              {rec.matchReasons.length > 0 && (
                <div style={matchReasonsStyle}>
                  {rec.matchReasons.map((reason, index) => (
                    <span key={index} style={matchBadgeStyle}>
                      {reason}
                    </span>
                  ))}
                </div>
              )}

              {/* Bouton de candidature */}
              {onApplyClick && (
                <button
                  style={applyButtonStyle}
                  onClick={e => {
                    e.stopPropagation();
                    onApplyClick(rec.event);
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#7c3aed';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#8b5cf6';
                  }}
                >
                  Postuler
                </button>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                style={pageButtonStyle(false)}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </button>
              <span style={{ color: '#9ca3af', padding: '0.5rem' }}>
                Page {page} sur {totalPages}
              </span>
              <button
                style={pageButtonStyle(false)}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de configuration des préférences */}
      <RecommendationPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={async prefs => {
          await updatePreferencesMutation.mutateAsync(prefs);
        }}
        currentPreferences={preferences}
        isLoading={preferencesLoading}
      />
    </div>
  );
};

export default RecommendationsTab;
