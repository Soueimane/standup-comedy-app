import React, { useState, useMemo, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { createBooking, getTakenSlots } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';

type PricingType = 'heure' | 'demi_journee' | 'journee' | 'soiree' | 'forfait' | 'pourcentage_billetterie' | 'gratuit';

interface VenueBookingFormProps {
  venueId: string;
  venueName: string;
  blockedDates?: Date[];
  onBookingCreated?: () => void;
  pricingType?: PricingType;
  pricePerEvent?: number;
  bookingMode?: 'manual' | 'automatic';
  minBookingDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  acceptedEventTypes?: string[];
  cancellationConditions?: string;
  houseRules?: string;
}

const VenueBookingForm: React.FC<VenueBookingFormProps> = ({
  venueId,
  venueName,
  blockedDates = [],
  onBookingCreated,
  pricingType,
  pricePerEvent,
  minBookingDelay = 0,
  minDuration,
  maxDuration,
}) => {
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({ startTime: '', endTime: '', message: '' });
  const [demiJourneeSlot, setDemiJourneeSlot] = useState<'matin' | 'aprem' | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [takenSlots, setTakenSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  useEffect(() => {
    if (!selectedDate) {
      setTakenSlots([]);
      return;
    }
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    getTakenSlots(venueId, dateStr)
      .then(setTakenSlots)
      .catch((err) => {
        console.error('Impossible de charger les créneaux pris:', err);
        setTakenSlots([]);
      });
  }, [selectedDate, venueId]);

  const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };

  // Une heure de début est invalide si elle tombe dans un créneau déjà réservé
  const isStartHourDisabled = (hour: string): boolean =>
    takenSlots.some(slot => toMin(hour) >= toMin(slot.startTime) && toMin(hour) < toMin(slot.endTime));

  // Une heure de fin est invalide si la plage [startTime, hour] chevauche un créneau réservé
  // Condition de chevauchement : startTime < slot.endTime AND slot.startTime < hour
  const isEndHourDisabled = (hour: string): boolean => {
    if (!formData.startTime) return false;
    if (takenSlots.some(slot =>
      toMin(formData.startTime) < toMin(slot.endTime) && toMin(slot.startTime) < toMin(hour)
    )) return true;
    const durationH = (toMin(hour) - toMin(formData.startTime)) / 60;
    if (minDuration !== undefined && durationH < minDuration) return true;
    if (maxDuration !== undefined && durationH > maxDuration) return true;
    return false;
  };

  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const h = i.toString().padStart(2, '0');
      return { value: `${h}:00`, label: `${h}h00` };
    });
  }, []);

  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    const now = new Date();
    return selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();
  }, [selectedDate]);

  const minStartHour = useMemo(() => {
    if (!isToday) return 0;
    return new Date().getHours() + 1;
  }, [isToday]);

  // Prix estimé pour le type 'heure'
  const estimatedPrice = useMemo(() => {
    if ((pricingType === 'heure' || !pricingType) && formData.startTime && formData.endTime && pricePerEvent !== undefined) {
      const hours = Math.ceil(Math.max(1, (toMin(formData.endTime) - toMin(formData.startTime)) / 60));
      return { total: hours * pricePerEvent, hours };
    }
    return null;
  }, [pricingType, formData.startTime, formData.endTime, pricePerEvent]);

  // Date minimale de réservation selon le délai imposé par le propriétaire
  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (minBookingDelay > 0) d.setDate(d.getDate() + minBookingDelay);
    return d;
  }, [minBookingDelay]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedDate) newErrors.date = 'La date est requise.';

    if (!pricingType || pricingType === 'heure') {
      if (!formData.startTime) newErrors.startTime = "L'heure de début est requise.";
      if (!formData.endTime) newErrors.endTime = "L'heure de fin est requise.";
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = "L'heure de fin doit être après l'heure de début.";
      }
    } else if (pricingType === 'demi_journee') {
      if (!demiJourneeSlot) newErrors.slot = 'Veuillez sélectionner un créneau.';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    // Résoudre startTime / endTime selon le type de tarification
    let startTime = formData.startTime;
    let endTime = formData.endTime;

    if (pricingType === 'demi_journee') {
      startTime = demiJourneeSlot === 'matin' ? '09:00' : '14:00';
      endTime = demiJourneeSlot === 'matin' ? '13:00' : '18:00';
    } else if (pricingType === 'journee' || pricingType === 'forfait') {
      startTime = '00:00';
      endTime = '23:59';
    } else if (pricingType === 'soiree') {
      startTime = '18:00';
      endTime = '23:59';
    } else if (pricingType === 'gratuit' || pricingType === 'pourcentage_billetterie') {
      startTime = '00:00';
      endTime = '23:59';
    }

    try {
      const d = selectedDate!;
      const requestedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await createBooking(venueId, {
        requestedDate,
        startTime,
        endTime,
        message: formData.message || undefined,
      });
      showSuccess(SuccessMessages.BOOKING_CREATED);
      setSelectedDate(undefined);
      setFormData({ startTime: '', endTime: '', message: '' });
      setDemiJourneeSlot('');
      onBookingCreated?.();
      navigate('/my-bookings');
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

  const infoBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '8px 14px',
    background: 'rgba(59,130,246,0.12)',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: 8,
    fontSize: 13,
    color: '#93c5fd',
    marginBottom: 16,
    lineHeight: 1.5,
  };

  const priceBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 14px',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: 8,
    fontSize: 13,
    color: '#6ee7b7',
    marginTop: 8,
    fontWeight: 600,
  };

  const showHourSelectors = !pricingType || pricingType === 'heure';
  const showDemiJournee = pricingType === 'demi_journee';

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
          --rdp-cell-size: 38px;
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
        .rdp-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .rdp-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: rgba(255,65,108,0.18);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          margin-bottom: 10px;
        }
        .rdp-caption_label {
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-left: 0.25rem;
        }
        .rdp-nav_button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          color: #fff;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .rdp-button:hover:not([disabled]) { background: rgba(255,65,108,0.25); color: #fff; }
        .rdp-head_cell {
          color: #d7d7d7;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .rdp-day {
          color: #f6f6f8;
          font-weight: 600;
          border-radius: 10px;
          transition: background 150ms ease, color 150ms ease, transform 150ms ease;
        }
        .rdp-day:hover:not(.rdp-day_selected):not([disabled]) {
          background: rgba(255,65,108,0.22);
          color: #fff;
          transform: translateY(-1px);
        }
        .rdp-day_selected {
          background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%) !important;
          color: #fff !important;
          border-radius: 12px;
          box-shadow: 0 0 0 3px rgba(255,65,108,0.18);
        }
        .rdp-day_today {
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }
        .rdp-day_disabled {
          color: #999;
          opacity: 0.65;
          cursor: not-allowed;
        }
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
              onSelect={(date) => {
                setSelectedDate(date);
                setFormData((p) => ({ ...p, startTime: '', endTime: '' }));
              }}
              locale={fr}
              disabled={[{ before: minSelectableDate }, ...blockedDates]}
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

        {/* Sélecteurs d'heures — uniquement pour 'heure' ou type absent */}
        {showHourSelectors && (
          <div className="booking-time-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Heure de début</label>
              <select
                value={formData.startTime}
                onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value, endTime: '' }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">--</option>
                {hourOptions.filter((opt) => parseInt(opt.value) >= minStartHour).map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1a1a1a' }} disabled={isStartHourDisabled(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.startTime && <p style={errorStyle}>{errors.startTime}</p>}
            </div>
            <div>
              <label style={labelStyle}>Heure de fin</label>
              <select
                value={formData.endTime}
                onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">--</option>
                {hourOptions.filter((opt) => !formData.startTime || opt.value > formData.startTime).map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1a1a1a' }} disabled={isEndHourDisabled(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.endTime && <p style={errorStyle}>{errors.endTime}</p>}
            </div>
          </div>
        )}

        {/* Prix estimé pour le type 'heure' */}
        {showHourSelectors && estimatedPrice && (
          <div style={{ marginBottom: 16 }}>
            <span style={priceBadgeStyle}>
              Prix estimé : {estimatedPrice.total.toLocaleString('fr-FR')} € ({estimatedPrice.hours} h × {pricePerEvent} €/h)
            </span>
          </div>
        )}

        {/* Sélecteur créneau pour 'demi_journee' */}
        {showDemiJournee && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Créneau</label>
            <select
              value={demiJourneeSlot}
              onChange={(e) => setDemiJourneeSlot(e.target.value as 'matin' | 'aprem' | '')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">-- Choisir un créneau --</option>
              <option value="matin" style={{ background: '#1a1a1a' }}>Matin (09h–13h)</option>
              <option value="aprem" style={{ background: '#1a1a1a' }}>Après-midi (14h–18h)</option>
            </select>
            {errors.slot && <p style={errorStyle}>{errors.slot}</p>}
            {pricePerEvent !== undefined && (
              <span style={priceBadgeStyle}>Prix : {pricePerEvent.toLocaleString('fr-FR')} €</span>
            )}
          </div>
        )}

        {/* Infos prix pour journee / soiree / forfait */}
        {(pricingType === 'journee' || pricingType === 'soiree') && pricePerEvent !== undefined && (
          <div style={{ marginBottom: 16 }}>
            <span style={priceBadgeStyle}>Prix : {pricePerEvent.toLocaleString('fr-FR')} €</span>
          </div>
        )}

        {pricingType === 'forfait' && pricePerEvent !== undefined && (
          <div style={{ marginBottom: 16 }}>
            <span style={priceBadgeStyle}>Prix forfait : {pricePerEvent.toLocaleString('fr-FR')} €</span>
          </div>
        )}

        {/* Badge info pour 'gratuit' */}
        {pricingType === 'gratuit' && (
          <div style={{ marginBottom: 16 }}>
            <span style={{
              ...infoBadgeStyle,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#6ee7b7',
            }}>
              Réservation gratuite — confirmation directe après acceptation
            </span>
          </div>
        )}

        {/* Badge info pour 'pourcentage_billetterie' */}
        {pricingType === 'pourcentage_billetterie' && (
          <div style={{ marginBottom: 16 }}>
            <span style={infoBadgeStyle}>
              Paiement via reversement billetterie — à régler directement avec le propriétaire
            </span>
          </div>
        )}

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
