import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createVenue, geocodeAddress } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import Navbar from '../components/Navbar';
import LocationPickerMap from '../components/LocationPickerMap';

const VENUE_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'salle_des_fetes', label: 'Salle des fêtes' },
  { value: 'autre', label: 'Autre' },
];

const EQUIPMENT_OPTIONS = [
  'Scène', 'Sono', 'Micro', 'Éclairage', 'Projecteur', 'Bar', 'Vestiaires', 'Parking', 'Accès PMR', 'Loges',
];

const CreateVenuePage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    latitude: '' as string | number,
    longitude: '' as string | number,
    capacity: '' as string | number,
    pricePerEvent: '' as string | number,
    venueType: 'bar',
    equipment: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);

  const handleGeocode = async () => {
    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const result = await geocodeAddress(formData.address, formData.city, formData.postalCode, formData.country);
      if (result) {
        setFormData((p) => ({ ...p, latitude: result.lat, longitude: result.lng }));
        setShowManualCoords(false);
      } else {
        setGeocodeError('Adresse introuvable. Vérifiez les champs ou saisissez les coordonnées manuellement.');
        setShowManualCoords(true);
      }
    } catch {
      setGeocodeError('Erreur lors de la détection. Saisissez les coordonnées manuellement.');
      setShowManualCoords(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Le nom est requis.';
    if (!formData.description.trim()) errs.description = 'La description est requise.';
    if (!formData.address.trim()) errs.address = "L'adresse est requise.";
    if (!formData.city.trim()) errs.city = 'La ville est requise.';
    if (!formData.postalCode.trim()) errs.postalCode = 'Le code postal est requis.';
    if (!formData.country.trim()) errs.country = 'Le pays est requis.';
    if (!formData.capacity || parseInt(formData.capacity as string) < 1) errs.capacity = 'La capacité doit être supérieure à 0.';
    if (formData.pricePerEvent === '' || parseFloat(formData.pricePerEvent as string) < 0) errs.pricePerEvent = 'Le prix est requis.';
    return errs;
  };

  const handleEquipmentToggle = (item: string) => {
    setFormData((p) => ({
      ...p,
      equipment: p.equipment.includes(item)
        ? p.equipment.filter((e) => e !== item)
        : [...p.equipment, item],
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('La photo ne doit pas dépasser 5MB.');
      return;
    }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos((p) => [...p, reader.result as string]);
      setPhotoUploading(false);
    };
    reader.onerror = () => {
      showError('Impossible de lire la photo.');
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    try {
      const venue = await createVenue({
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        latitude: formData.latitude !== '' ? parseFloat(formData.latitude as string) : undefined,
        longitude: formData.longitude !== '' ? parseFloat(formData.longitude as string) : undefined,
        capacity: parseInt(formData.capacity as string),
        pricePerEvent: parseFloat(formData.pricePerEvent as string),
        venueType: formData.venueType,
        equipment: formData.equipment,
        photos,
      });
      showSuccess(SuccessMessages.VENUE_CREATED);
      navigate(`/venues/${venue._id}`);
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.VENUE_CREATE_FAILED));
    } finally {
      setIsSubmitting(false);
    }
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
    transition: 'border-color 0.2s',
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

  const errorStyle: React.CSSProperties = {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  };

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 28,
    marginBottom: 20,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)', paddingBottom: 60 }}>
      <style>{`
        @media (max-width: 640px) {
          .create-venue-grid-2 { grid-template-columns: 1fr !important; }
          .create-venue-grid-3 { grid-template-columns: 1fr !important; }
          .create-venue-header { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
          .create-venue-header h1 { font-size: 1.8em !important; }
          .create-venue-submit { flex-direction: column !important; }
          .create-venue-submit button { width: 100%; }
        }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="create-venue-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ← Retour
          </button>
          <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 800, color: '#ff416c' }}>
            Ajouter une salle
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Infos de base */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#ff416c' }}>
              Informations générales
            </h2>
            <div className="create-venue-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nom de la salle *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Le Comedy Club de Paris"
                  style={inputStyle}
                />
                {errors.name && <p style={errorStyle}>{errors.name}</p>}
              </div>
              <div>
                <label style={labelStyle}>Type de salle *</label>
                <select
                  value={formData.venueType}
                  onChange={(e) => setFormData((p) => ({ ...p, venueType: e.target.value }))}
                  style={inputStyle}
                >
                  {VENUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value} style={{ background: '#1a1a2e' }}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez votre salle, son ambiance, ses caractéristiques..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              {errors.description && <p style={errorStyle}>{errors.description}</p>}
            </div>
          </div>

          {/* Localisation */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#ff416c' }}>
              Localisation
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Adresse *</label>
              <input
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="12 rue de la Comédie"
                style={inputStyle}
              />
              {errors.address && <p style={errorStyle}>{errors.address}</p>}
            </div>
            <div className="create-venue-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Ville *</label>
                <input
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Paris"
                  style={inputStyle}
                />
                {errors.city && <p style={errorStyle}>{errors.city}</p>}
              </div>
              <div>
                <label style={labelStyle}>Code postal *</label>
                <input
                  value={formData.postalCode}
                  onChange={(e) => setFormData((p) => ({ ...p, postalCode: e.target.value }))}
                  placeholder="75001"
                  style={inputStyle}
                />
                {errors.postalCode && <p style={errorStyle}>{errors.postalCode}</p>}
              </div>
              <div>
                <label style={labelStyle}>Pays *</label>
                <input
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  style={inputStyle}
                />
                {errors.country && <p style={errorStyle}>{errors.country}</p>}
              </div>
            </div>
            {/* Géocodage */}
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={isGeocoding || !formData.address || !formData.city}
                  style={{
                    padding: '10px 20px',
                    background: isGeocoding || !formData.address || !formData.city
                      ? 'rgba(255,65,108,0.2)'
                      : 'rgba(255,65,108,0.15)',
                    color: isGeocoding || !formData.address || !formData.city ? '#888' : '#ff416c',
                    border: '1px solid rgba(255,65,108,0.3)',
                    borderRadius: 10,
                    cursor: isGeocoding || !formData.address || !formData.city ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {isGeocoding ? '⏳ Détection...' : '📍 Détecter automatiquement'}
                </button>

                {formData.latitude !== '' && formData.longitude !== '' && !geocodeError && (
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                    ✓ {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                  </span>
                )}

                {(formData.latitude !== '' || showManualCoords) && (
                  <button
                    type="button"
                    onClick={() => setShowManualCoords((v) => !v)}
                    style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showManualCoords ? 'Masquer' : 'Modifier manuellement'}
                  </button>
                )}
              </div>

              {geocodeError && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f59e0b' }}>⚠ {geocodeError}</p>
              )}

              {formData.latitude !== '' && formData.longitude !== '' && (
                <LocationPickerMap
                  lat={Number(formData.latitude)}
                  lng={Number(formData.longitude)}
                  name={formData.name}
                  onPositionChange={(lat, lng) =>
                    setFormData((p) => ({ ...p, latitude: lat, longitude: lng }))
                  }
                />
              )}

              {showManualCoords && (
                <div className="create-venue-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div>
                    <label style={labelStyle}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData((p) => ({ ...p, latitude: e.target.value }))}
                      placeholder="48.8566"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData((p) => ({ ...p, longitude: e.target.value }))}
                      placeholder="2.3522"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capacité & Prix */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#ff416c' }}>
              Capacité & Tarification
            </h2>
            <div className="create-venue-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Capacité maximale (personnes) *</label>
                <input
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
                  placeholder="200"
                  style={inputStyle}
                />
                {errors.capacity && <p style={errorStyle}>{errors.capacity}</p>}
              </div>
              <div>
                <label style={labelStyle}>Prix par soirée (€) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerEvent}
                  onChange={(e) => setFormData((p) => ({ ...p, pricePerEvent: e.target.value }))}
                  placeholder="500"
                  style={inputStyle}
                />
                {errors.pricePerEvent && <p style={errorStyle}>{errors.pricePerEvent}</p>}
              </div>
            </div>
          </div>

          {/* Équipements */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#ff416c' }}>
              Équipements disponibles
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleEquipmentToggle(item)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 24,
                    border: formData.equipment.includes(item)
                      ? '1px solid #ff416c'
                      : '1px solid rgba(255,255,255,0.15)',
                    background: formData.equipment.includes(item)
                      ? 'rgba(255,65,108,0.15)'
                      : 'transparent',
                    color: formData.equipment.includes(item) ? '#ff416c' : '#aaa',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontWeight: formData.equipment.includes(item) ? 600 : 400,
                  }}
                >
                  {formData.equipment.includes(item) ? '✓ ' : ''}{item}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: '#ff416c' }}>
              Photos
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {photos.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 22,
                      height: 22,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label
                style={{
                  width: 120,
                  height: 84,
                  border: '2px dashed rgba(255,65,108,0.4)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ff416c',
                  gap: 4,
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{ fontSize: 24 }}>{photoUploading ? '⏳' : '+'}</span>
                <span style={{ fontSize: 11, color: '#888' }}>Ajouter photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={photoUploading}
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="create-venue-submit" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '14px 28px',
                background: 'transparent',
                color: '#aaa',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px 36px',
                background: isSubmitting
                  ? 'rgba(255,65,108,0.5)'
                  : 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Création en cours...' : 'Créer la salle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVenuePage;
