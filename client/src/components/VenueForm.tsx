import React, { useState, useEffect } from 'react';
import LocationPickerMap from './LocationPickerMap';
import { geocodeAddress } from '../services/api';
import type { IVenue } from '../types/venue';
import {
  VENUE_TYPES,
  EQUIPMENT_OPTIONS,
  CONFIGURATION_TYPES,
  PRICING_TYPES,
  BOOKING_MODES,
  ACCEPTED_EVENT_TYPES,
  CANCELLATION_POLICIES,
  CANCELLATION_POLICY_DESCRIPTIONS,
} from '../types/venue';

export interface VenueFormData {
  // Étape 1 — Informations générales
  name: string;
  venueType: string;
  shortDescription: string;
  fullDescription: string;
  description: string;
  photos: string[];
  // Étape 2 — Localisation
  address: string;
  addressComplement: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: string | number;
  longitude: string | number;
  // Étape 3 — Caractéristiques du lieu
  capacity: string | number;
  seatedCapacity: string | number;
  standingCapacity: string | number;
  stageArea: string | number;
  configurationType: string;
  dressingRooms: string | number;
  accessiblePMR: boolean;
  parkingAvailable: boolean;
  // Étape 4 — Équipements
  equipment: string[];
  equipmentOther: string;
  // Étape 5 — Conditions de réservation
  pricePerEvent: string | number;
  pricingType: string;
  currency: string;
  deposit: string | number;
  extraFees: string;
  bookingMode: string;
  minBookingDelay: string | number;
  minDuration: string | number;
  maxDuration: string | number;
  acceptedEventTypes: string[];
  cancellationPolicy: IVenue['cancellationPolicy'];
  cancellationConditions: string;
  houseRules: string;
  // Étape 6 — Contact & infos légales
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  legalStatus: string;
  siret: string;
  invoicingAvailable: boolean;
}

interface VenueFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<VenueFormData>;
  onSubmit: (data: VenueFormData) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  /** Si true, affiche tous les champs sur une seule page sans stepper */
  flat?: boolean;
}

const STEPS = [
  'Informations générales',
  'Localisation',
  'Caractéristiques',
  'Équipements',
  'Conditions de réservation',
  'Contact & Légal',
];

const defaultData: VenueFormData = {
  name: '',
  venueType: 'bar',
  shortDescription: '',
  description: '',
  fullDescription: '',
  photos: [],
  address: '',
  addressComplement: '',
  city: '',
  postalCode: '',
  country: 'France',
  latitude: '',
  longitude: '',
  capacity: '',
  seatedCapacity: '',
  standingCapacity: '',
  stageArea: '',
  configurationType: '',
  dressingRooms: '',
  accessiblePMR: false,
  parkingAvailable: false,
  equipment: [],
  equipmentOther: '',
  pricePerEvent: '',
  pricingType: '',
  currency: 'EUR',
  deposit: '',
  extraFees: '',
  bookingMode: 'manual',
  minBookingDelay: '',
  minDuration: '',
  maxDuration: '',
  acceptedEventTypes: [],
  cancellationPolicy: 'moderate',
  cancellationConditions: '',
  houseRules: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  legalStatus: '',
  siret: '',
  invoicingAvailable: false,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '12px 16px',
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

const sectionStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 28,
  marginBottom: 20,
};

const VenueForm: React.FC<VenueFormProps> = ({
  mode,
  initialData,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  flat = false,
}) => {
  const totalSteps = flat ? 1 : STEPS.length;
  const allStepLabels = flat ? [] : STEPS;

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<VenueFormData>({ ...defaultData, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    setErrors({});
  }, [step]);

  const set = (key: keyof VenueFormData, value: unknown) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('La photo ne doit pas dépasser 5MB.'); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFormData((p) => ({ ...p, photos: [...p.photos, result] }));
      setPhotoUploading(false);
      e.target.value = '';
    };
    reader.onerror = () => { alert('Impossible de lire la photo.'); setPhotoUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleGeocode = async () => {
    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const result = await geocodeAddress(formData.address, formData.city, formData.postalCode, formData.country);
      if ('error' in result) {
        setGeocodeError('Adresse introuvable. Vérifiez les champs ou saisissez manuellement.');
        setShowManualCoords(true);
      } else {
        setFormData((p) => ({ ...p, latitude: result.lat, longitude: result.lng }));
        setShowManualCoords(false);
      }
    } catch {
      setGeocodeError('Erreur inattendue. Saisissez les coordonnées manuellement.');
      setShowManualCoords(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const toggleArrayItem = (key: 'equipment' | 'acceptedEventTypes', item: string) => {
    setFormData((p) => {
      const arr = p[key] as string[];
      return {
        ...p,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  };

  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!formData.name.trim()) errs.name = 'Le nom est requis.';
      if (!formData.venueType) errs.venueType = 'Le type de lieu est requis.';
      if (!formData.shortDescription.trim()) errs.shortDescription = 'La description courte est requise.';
      else if (formData.shortDescription.trim().length < 10) errs.shortDescription = 'La description courte doit contenir au moins 10 caractères.';
    }
    if (s === 1) {
      if (!formData.address.trim()) errs.address = "L'adresse est requise.";
      if (!formData.city.trim()) errs.city = 'La ville est requise.';
      if (!formData.postalCode.trim()) errs.postalCode = 'Le code postal est requis.';
      if (!formData.country.trim()) errs.country = 'Le pays est requis.';
    }
    if (s === 2) {
      if (!formData.capacity || parseInt(formData.capacity as string) < 1)
        errs.capacity = 'La capacité doit être supérieure à 0.';
      if (!formData.configurationType) errs.configurationType = 'Le type de configuration est requis.';
    }
    if (s === 4) {
      if (formData.pricePerEvent === '' || parseFloat(formData.pricePerEvent as string) < 0)
        errs.pricePerEvent = 'Le prix est requis.';
    }
    if (s === 5) {
      if (!formData.contactName.trim()) errs.contactName = 'Le nom du responsable est requis.';
      if (!formData.contactEmail.trim()) errs.contactEmail = "L'email est requis.";
      if (!formData.contactPhone.trim()) errs.contactPhone = 'Le téléphone est requis.';
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const goPrev = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (flat) {
      const allErrs: Record<string, string> = {};
      for (let i = 0; i < STEPS.length; i++) {
        Object.assign(allErrs, validateStep(i));
      }
      if (Object.keys(allErrs).length > 0) { setErrors(allErrs); return; }
    } else {
      const errs = validateStep(step);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    await onSubmit(formData);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 24,
    border: active ? '1px solid #ff416c' : '1px solid rgba(255,255,255,0.15)',
    background: active ? 'rgba(255,65,108,0.15)' : 'transparent',
    color: active ? '#ff416c' : '#aaa',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  });

  const photoGrid = (
    images: string[],
    onRemove: (i: number) => void,
    onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {images.map((url, i) => (
        <div key={i} style={{ position: 'relative' }}>
          <img src={url} alt="" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 10 }} />
          <button
            type="button"
            onClick={() => onRemove(i)}
            style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}
          >
            ✕
          </button>
        </div>
      ))}
      <label style={{ width: 120, height: 84, border: '2px dashed rgba(255,65,108,0.4)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff416c', gap: 4 }}>
        <span style={{ fontSize: 24 }}>{photoUploading ? '⏳' : '+'}</span>
        <span style={{ fontSize: 11, color: '#888' }}>Ajouter</span>
        <input type="file" accept="image/*" onChange={onAdd} style={{ display: 'none' }} disabled={photoUploading} />
      </label>
    </div>
  );

  // ── Étape 0 : Informations générales ──────────────────────────────────────
  const renderStep0 = () => (
    <div style={sectionStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nom du lieu *</label>
          <input value={formData.name} onChange={(e) => set('name', e.target.value)} placeholder="Le Comedy Club de Paris" style={inputStyle} />
          {errors.name && <p style={errorStyle}>{errors.name}</p>}
        </div>
        <div>
          <label style={labelStyle}>Type de lieu *</label>
          <select value={formData.venueType} onChange={(e) => set('venueType', e.target.value)} style={inputStyle}>
            {VENUE_TYPES.map((t) => <option key={t.value} value={t.value} style={{ background: '#1a1a2e' }}>{t.label}</option>)}
          </select>
          {errors.venueType && <p style={errorStyle}>{errors.venueType}</p>}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description courte * (max 300 caractères)</label>
        <input value={formData.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} maxLength={300} placeholder="Un comedy club au coeur de Paris..." style={inputStyle} />
        {errors.shortDescription && <p style={errorStyle}>{errors.shortDescription}</p>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description complète</label>
        <textarea value={formData.fullDescription} onChange={(e) => set('fullDescription', e.target.value)} rows={5} placeholder="Décrivez votre salle, son ambiance, son histoire..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div>
        <label style={labelStyle}>Photos (max 10)</label>
        {photoGrid(
          formData.photos,
          (i) => setFormData((p) => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) })),
          (e) => { if (formData.photos.length < 10) handlePhotoUpload(e); }
        )}
      </div>
    </div>
  );

  // ── Étape 1 : Localisation ────────────────────────────────────────────────
  const renderStep1 = () => (
    <div style={sectionStyle}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Adresse *</label>
        <input value={formData.address} onChange={(e) => set('address', e.target.value)} placeholder="12 rue de la Comédie" style={inputStyle} />
        {errors.address && <p style={errorStyle}>{errors.address}</p>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Complément d'adresse</label>
        <input value={formData.addressComplement} onChange={(e) => set('addressComplement', e.target.value)} placeholder="Bâtiment B, 2ème étage..." style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Ville *</label>
          <input value={formData.city} onChange={(e) => set('city', e.target.value)} placeholder="Paris" style={inputStyle} />
          {errors.city && <p style={errorStyle}>{errors.city}</p>}
        </div>
        <div>
          <label style={labelStyle}>Code postal *</label>
          <input value={formData.postalCode} onChange={(e) => set('postalCode', e.target.value)} placeholder="75001" style={inputStyle} />
          {errors.postalCode && <p style={errorStyle}>{errors.postalCode}</p>}
        </div>
        <div>
          <label style={labelStyle}>Pays *</label>
          <input value={formData.country} onChange={(e) => set('country', e.target.value)} style={inputStyle} />
          {errors.country && <p style={errorStyle}>{errors.country}</p>}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleGeocode} disabled={isGeocoding || !formData.address || !formData.city}
            style={{ padding: '10px 20px', background: 'rgba(255,65,108,0.15)', color: '#ff416c', border: '1px solid rgba(255,65,108,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {isGeocoding ? '⏳ Détection...' : '📍 Détecter automatiquement'}
          </button>
          {formData.latitude !== '' && formData.longitude !== '' && !geocodeError && (
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}</span>
          )}
          {formData.latitude !== '' && (
            <button type="button" onClick={() => setShowManualCoords((v) => !v)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              {showManualCoords ? 'Masquer' : 'Modifier manuellement'}
            </button>
          )}
        </div>
        {geocodeError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f59e0b' }}>⚠ {geocodeError}</p>}
        {formData.latitude !== '' && formData.longitude !== '' && (
          <LocationPickerMap lat={Number(formData.latitude)} lng={Number(formData.longitude)} name={formData.name}
            onPositionChange={(lat, lng) => setFormData((p) => ({ ...p, latitude: lat, longitude: lng }))} />
        )}
        {showManualCoords && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input type="number" step="any" value={formData.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="48.8566" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input type="number" step="any" value={formData.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="2.3522" style={inputStyle} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Étape 2 : Caractéristiques du lieu ────────────────────────────────────
  const renderStep2 = () => (
    <div style={sectionStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Capacité totale *</label>
          <input type="number" min={1} value={formData.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="200" style={inputStyle} />
          {errors.capacity && <p style={errorStyle}>{errors.capacity}</p>}
        </div>
        <div>
          <label style={labelStyle}>Type de configuration *</label>
          <select value={formData.configurationType} onChange={(e) => set('configurationType', e.target.value)} style={inputStyle}>
            <option value="" style={{ background: '#1a1a2e' }}>Choisir...</option>
            {CONFIGURATION_TYPES.map((t) => <option key={t.value} value={t.value} style={{ background: '#1a1a2e' }}>{t.label}</option>)}
          </select>
          {errors.configurationType && <p style={errorStyle}>{errors.configurationType}</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Places assises</label>
          <input type="number" min={0} value={formData.seatedCapacity} onChange={(e) => set('seatedCapacity', e.target.value)} placeholder="150" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Places debout</label>
          <input type="number" min={0} value={formData.standingCapacity} onChange={(e) => set('standingCapacity', e.target.value)} placeholder="50" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Surface scène (m²)</label>
          <input type="number" min={0} value={formData.stageArea} onChange={(e) => set('stageArea', e.target.value)} placeholder="20" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nombre de loges</label>
          <input type="number" min={0} value={formData.dressingRooms} onChange={(e) => set('dressingRooms', e.target.value)} placeholder="2" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.accessiblePMR} onChange={(e) => set('accessiblePMR', e.target.checked)} />
          Accessible PMR
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.parkingAvailable} onChange={(e) => set('parkingAvailable', e.target.checked)} />
          Parking disponible
        </label>
      </div>
    </div>
  );

  // ── Étape 3 : Équipements ──────────────────────────────────────────────
  const renderStep3 = () => (
    <div style={sectionStyle}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#ff416c' }}>Équipements</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {EQUIPMENT_OPTIONS.map((item) => (
          <button key={item} type="button" onClick={() => toggleArrayItem('equipment', item)} style={chipStyle(formData.equipment.includes(item))}>
            {formData.equipment.includes(item) ? '✓ ' : ''}{item}
          </button>
        ))}
      </div>
      <div>
        <label style={labelStyle}>Autre équipement</label>
        <input value={formData.equipmentOther} onChange={(e) => set('equipmentOther', e.target.value)} placeholder="Précisez..." style={inputStyle} />
      </div>
    </div>
  );

  // ── Étape 4 : Conditions de réservation ──────────────────────────────────
  const renderStep4 = () => (
    <>
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#ff416c' }}>Tarification</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Prix *</label>
            <input type="number" min={0} step={0.01} value={formData.pricePerEvent} onChange={(e) => set('pricePerEvent', e.target.value)} placeholder="500" style={inputStyle} />
            {errors.pricePerEvent && <p style={errorStyle}>{errors.pricePerEvent}</p>}
          </div>
          <div>
            <label style={labelStyle}>Devise</label>
            <select value={formData.currency} onChange={(e) => set('currency', e.target.value)} style={inputStyle}>
              <option value="EUR" style={{ background: '#1a1a2e' }}>EUR</option>
              <option value="USD" style={{ background: '#1a1a2e' }}>USD</option>
              <option value="GBP" style={{ background: '#1a1a2e' }}>GBP</option>
              <option value="CHF" style={{ background: '#1a1a2e' }}>CHF</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type de tarification</label>
            <select value={formData.pricingType} onChange={(e) => set('pricingType', e.target.value)} style={inputStyle}>
              <option value="" style={{ background: '#1a1a2e' }}>Choisir...</option>
              {PRICING_TYPES.map((t) => <option key={t.value} value={t.value} style={{ background: '#1a1a2e' }}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Caution</label>
            <input type="number" min={0} value={formData.deposit} onChange={(e) => set('deposit', e.target.value)} placeholder="100" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mode de réservation</label>
            <select value={formData.bookingMode} onChange={(e) => set('bookingMode', e.target.value)} style={inputStyle}>
              {BOOKING_MODES.map((m) => <option key={m.value} value={m.value} style={{ background: '#1a1a2e' }}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Frais supplémentaires</label>
          <input value={formData.extraFees} onChange={(e) => set('extraFees', e.target.value)} placeholder="Nettoyage 50€, sécurité sur devis..." style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Délai min. réservation (jours)</label>
            <input type="number" min={0} value={formData.minBookingDelay} onChange={(e) => set('minBookingDelay', e.target.value)} placeholder="3" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Durée min. (heures)</label>
            <input type="number" min={0} value={formData.minDuration} onChange={(e) => set('minDuration', e.target.value)} placeholder="2" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Durée max. (heures)</label>
            <input type="number" min={0} value={formData.maxDuration} onChange={(e) => set('maxDuration', e.target.value)} placeholder="8" style={inputStyle} />
          </div>
        </div>
      </div>
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#ff416c' }}>Types d'événements acceptés</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ACCEPTED_EVENT_TYPES.map((item) => (
            <button key={item} type="button" onClick={() => toggleArrayItem('acceptedEventTypes', item)} style={chipStyle(formData.acceptedEventTypes.includes(item))}>
              {formData.acceptedEventTypes.includes(item) ? '✓ ' : ''}{item}
            </button>
          ))}
        </div>
      </div>
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#ff416c' }}>Conditions & Règles</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Politique d'annulation</label>
          <select value={formData.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value as IVenue['cancellationPolicy'])} style={inputStyle}>
            {CANCELLATION_POLICIES.map((p) => <option key={p.value} value={p.value} style={{ background: '#1a1a2e' }}>{p.label}</option>)}
          </select>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ccc' }}>{CANCELLATION_POLICY_DESCRIPTIONS[formData.cancellationPolicy]}</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Conditions d'annulation (texte libre)</label>
          <textarea value={formData.cancellationConditions} onChange={(e) => set('cancellationConditions', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Règlement intérieur</label>
          <textarea value={formData.houseRules} onChange={(e) => set('houseRules', e.target.value)} rows={3} placeholder="Interdiction de fumer, respect du voisinage..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>
    </>
  );

  // ── Étape 5 : Contact & infos légales ─────────────────────────────────────
  const renderStep5 = () => (
    <div style={sectionStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nom du responsable *</label>
          <input value={formData.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Jean Dupont" style={inputStyle} />
          {errors.contactName && <p style={errorStyle}>{errors.contactName}</p>}
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input type="email" value={formData.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="contact@mon-lieu.fr" style={inputStyle} />
          {errors.contactEmail && <p style={errorStyle}>{errors.contactEmail}</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Téléphone *</label>
          <input value={formData.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="0612345678" style={inputStyle} />
          {errors.contactPhone && <p style={errorStyle}>{errors.contactPhone}</p>}
        </div>
        <div>
          <label style={labelStyle}>Statut juridique</label>
          <input value={formData.legalStatus} onChange={(e) => set('legalStatus', e.target.value)} placeholder="SARL, SAS, Association..." style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>SIRET</label>
          <input value={formData.siret} onChange={(e) => set('siret', e.target.value)} placeholder="12345678901234" style={inputStyle} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={formData.invoicingAvailable} onChange={(e) => set('invoicingAvailable', e.target.checked)} />
        Facturation disponible
      </label>
    </div>
  );

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  const isLastStep = flat ? true : step === totalSteps - 1;
  const defaultSubmitLabel = mode === 'create' ? 'Créer la salle' : 'Enregistrer';

  return (
    <div>
      <style>{`
        @media (max-width: 640px) {
          .venue-form-grid-2 { grid-template-columns: 1fr !important; }
          .venue-form-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Stepper (masqué en mode flat) */}
      {!flat && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            {allStepLabels.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i < step ? '#10b981' : i === step ? '#ff416c' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i === step ? '#ff416c' : i < step ? '#10b981' : '#888', whiteSpace: 'nowrap', fontWeight: i === step ? 600 : 400 }}>{label}</span>
                {i < totalSteps - 1 && (
                  <div style={{ height: 1, background: i < step ? '#10b981' : 'rgba(255,255,255,0.1)', flex: 1 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
      >
        {flat ? (
          // Mode flat : toutes les sections sur une seule page
          <>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informations générales</h3>
            {renderStep0()}
            <h3 style={{ margin: '20px 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Localisation</h3>
            {renderStep1()}
            <h3 style={{ margin: '20px 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caractéristiques</h3>
            {renderStep2()}
            <h3 style={{ margin: '20px 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Équipements</h3>
            {renderStep3()}
            <h3 style={{ margin: '20px 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conditions de réservation</h3>
            {renderStep4()}
            <h3 style={{ margin: '20px 0 12px 0', fontSize: 13, fontWeight: 700, color: '#ff416c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact & Légal</h3>
            {renderStep5()}
          </>
        ) : (
          stepContent[step]()
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, justifyContent: flat ? 'flex-end' : 'space-between', marginTop: 8 }}>
          {!flat && (
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: step === 0 ? '#555' : '#aaa',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                cursor: step === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ← Précédent
            </button>
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              style={{
                padding: '12px 32px',
                background: isSubmitting ? 'rgba(255,65,108,0.5)' : 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'En cours...' : (submitLabel ?? defaultSubmitLabel)}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Suivant →
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default VenueForm;
