import React, { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { createBooking } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';

interface VenueBookingFormProps {
  venueId: string;
  venueName: string;
  blockedDates?: Date[];
  onBookingCreated?: () => void;
}

const VenueBookingForm: React.FC<VenueBookingFormProps> = ({
  venueId,
  venueName,
  blockedDates = [],
  onBookingCreated,
}) => {
  const { showSuccess, showError } = useAlert();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({ startTime: '', endTime: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedDate) newErrors.date = 'La date est requise.';
    if (!formData.startTime) newErrors.startTime = "L'heure de début est requise.";
    if (!formData.endTime) newErrors.endTime = "L'heure de fin est requise.";
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = "L'heure de fin doit être après l'heure de début.";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const requestedDate = selectedDate!.toISOString().split('T')[0];
      await createBooking(venueId, {
        requestedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        message: formData.message || undefined,
      });
      showSuccess(SuccessMessages.BOOKING_CREATED);
      setSelectedDate(undefined);
      setFormData({ startTime: '', endTime: '', message: '' });
      onBookingCreated?.();
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.BOOKING_CREATE_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
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

  const errorStyle: React.CSSProperties = { color: '#ef4444', fontSize: 12, marginTop: 4 };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,65,108,0.3)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 24px rgba(255,65,108,0.1)',
      }}
    >
      <style>{`
        @media (max-width: 480px) {
          .booking-time-grid { grid-template-columns: 1fr !important; }
        }
        .rdp {
          --rdp-cell-size: 36px;
          --rdp-accent-color: #ff416c;
          --rdp-background-color: rgba(255,65,108,0.15);
          --rdp-accent-color-dark: #ff416c;
          --rdp-background-color-dark: rgba(255,65,108,0.15);
          --rdp-outline: 2px solid #ff416c;
          --rdp-outline-selected: 2px solid #ff416c;
          margin: 0;
          font-size: 13px;
          color: #fff;
        }
        .rdp-months { justify-content: center; }
        .rdp-month { width: 100%; }
        .rdp-table { width: 100%; }
        .rdp-head_cell { color: #666; font-size: 11px; font-weight: 600; }
        .rdp-button:hover:not([disabled]) { background: rgba(255,65,108,0.2); color: #fff; }
        .rdp-button[disabled] { color: #ef4444; text-decoration: line-through; opacity: 0.7; cursor: not-allowed; }
        .rdp-day_selected { background: #ff416c !important; color: #fff !important; border-radius: 8px; }
        .rdp-nav_button { color: #888; }
        .rdp-caption_label { color: #fff; font-weight: 700; font-size: 13px; }
        .rdp-day_outside { opacity: 0.3; }
      `}</style>

      <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
        Réserver cette salle
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#888' }}>{venueName}</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Date souhaitée</label>
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: errors.date
                ? '1px solid #ef4444'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 4px',
            }}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              disabled={[{ before: today }, ...blockedDates]}
              showOutsideDays={false}
            />
          </div>
          {errors.date && <p style={errorStyle}>{errors.date}</p>}
          {blockedDates.length > 0 && (
            <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
              🔴 Dates barrées = non disponibles
            </p>
          )}
        </div>

        <div className="booking-time-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Heure de début</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
              style={inputStyle}
            />
            {errors.startTime && <p style={errorStyle}>{errors.startTime}</p>}
          </div>
          <div>
            <label style={labelStyle}>Heure de fin</label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
              style={inputStyle}
            />
            {errors.endTime && <p style={errorStyle}>{errors.endTime}</p>}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Message (optionnel)</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
            placeholder="Décrivez votre événement, vos besoins..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '14px',
            background: isSubmitting
              ? 'rgba(255,65,108,0.5)'
              : 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
};

export default VenueBookingForm;
