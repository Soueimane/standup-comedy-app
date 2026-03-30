import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listBlockedDates, blockDate, unblockDate } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import type { IVenueBlockedDate } from '../types/venue';

interface BlockedDatesManagerProps {
  venueId: string;
}

const BlockedDatesManager: React.FC<BlockedDatesManagerProps> = ({ venueId }) => {
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IVenueBlockedDate[]>({
    queryKey: ['blocked-dates', venueId],
    queryFn: () => listBlockedDates(venueId),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.date) errs.date = 'La date est requise.';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errs.endTime = "L'heure de fin doit être après l'heure de début.";
    }
    return errs;
  };

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    try {
      await blockDate(venueId, {
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        reason: form.reason || undefined,
      });
      showSuccess(SuccessMessages.DATE_BLOCKED);
      queryClient.invalidateQueries({ queryKey: ['blocked-dates', venueId] });
      setForm({ date: '', startTime: '', endTime: '', reason: '' });
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.DATE_BLOCK_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblock = async (blockedDateId: string) => {
    setDeletingId(blockedDateId);
    try {
      await unblockDate(venueId, blockedDateId);
      showSuccess(SuccessMessages.DATE_UNBLOCKED);
      queryClient.invalidateQueries({ queryKey: ['blocked-dates', venueId] });
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.DATE_UNBLOCK_FAILED));
    } finally {
      setDeletingId(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#aaa',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div>
      <style>{`
        @media (max-width: 600px) {
          .blocked-dates-grid { grid-template-columns: 1fr !important; }
          .blocked-date-row { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .blocked-date-row button { align-self: flex-start; }
        }
      `}</style>
      {/* Formulaire d'ajout */}
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h4 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
          Bloquer une date
        </h4>
        <form onSubmit={handleBlock}>
          <div className="blocked-dates-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                style={inputStyle}
              />
              {errors.date && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.date}</p>}
            </div>
            <div>
              <label style={labelStyle}>Heure début (optionnel)</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Heure fin (optionnel)</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                style={inputStyle}
              />
              {errors.endTime && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.endTime}</p>}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Raison (optionnel)</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Maintenance, événement privé..."
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              background: isSubmitting
                ? 'rgba(255,65,108,0.4)'
                : 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {isSubmitting ? 'Ajout...' : 'Bloquer cette date'}
          </button>
        </form>
      </div>

      {/* Liste des dates bloquées */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#fff' }}>
          Dates bloquées ({isLoading ? '...' : (data?.length || 0)})
        </h4>
        {error ? (
          <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', padding: 24 }}>
            Impossible de charger les dates bloquées.
          </p>
        ) : !isLoading && (!data || data.length === 0) ? (
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 24 }}>
            Aucune date bloquée.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data || []).map((blocked) => (
              <div
                key={blocked._id}
                className="blocked-date-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    {new Date(blocked.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {blocked.startTime && blocked.endTime && (
                      <span style={{ color: '#aaa', fontWeight: 400 }}>
                        {' '}· {blocked.startTime} – {blocked.endTime}
                      </span>
                    )}
                  </p>
                  {blocked.reason && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{blocked.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => handleUnblock(blocked._id)}
                  disabled={deletingId === blocked._id}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {deletingId === blocked._id ? '...' : 'Débloquer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedDatesManager;
