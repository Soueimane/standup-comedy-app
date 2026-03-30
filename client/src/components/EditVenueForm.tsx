import React, { useState } from 'react';
import { updateVenue, geocodeAddress } from '../services/api';
import { SuccessMessages, ErrorMessages, getErrorMessage } from '../services/systemMessages';
import { useAlert } from '../hooks/useAlert';
import type { IVenue } from '../types/venue';
import LocationPickerMap from './LocationPickerMap';

interface EditVenueFormProps {
  venue: IVenue;
  onUpdated: (updatedVenue: IVenue) => void;
}

const VENUE_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'salle_des_fetes', label: 'Salle des fêtes' },
  { value: 'autre', label: 'Autre' },
];

const EQUIPMENT_OPTIONS = [
  'Scène', 'Sono', 'Micro', 'Éclairage', 'Projecteur', 'Bar', 'Vestiaires', 'Parking', 'Accès PMR', 'Loges',
];

const EditVenueForm: React.FC<EditVenueFormProps> = ({ venue, onUpdated }) => {
  const { showSuccess, showError } = useAlert();
  const [formData, setFormData] = useState({
    name: venue.name,
    description: venue.description,
    address: venue.address,
    city: venue.city,
    postalCode: venue.postalCode,
    country: venue.country,
    latitude: venue.latitude ?? ('' as string | number),
    longitude: venue.longitude ?? ('' as string | number),
    capacity: venue.capacity,
    pricePerEvent: venue.pricePerEvent,
    venueType: venue.venueType,
    equipment: venue.equipment || [],
    isActive: venue.isActive,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>(venue.photos || []);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(
    !venue.latitude && !venue.longitude
  );

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
      setCurrentPhotos((p) => [...p, reader.result as string]);
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
    setIsSubmitting(true);
    try {
      const updated = await updateVenue(venue._id, {
        ...formData,
        latitude: formData.latitude !== '' ? parseFloat(formData.latitude as string) : undefined,
        longitude: formData.longitude !== '' ? parseFloat(formData.longitude as string) : undefined,
        photos: currentPhotos,
      });
      showSuccess(SuccessMessages.VENUE_UPDATED);
      onUpdated(updated);
    } catch (err) {
      showError(getErrorMessage(err, ErrorMessages.VENUE_UPDATE_FAILED));
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

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Nom de la salle *</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Type de salle *</label>
          <select
            value={formData.venueType}
            onChange={(e) => setFormData((p) => ({ ...p, venueType: e.target.value as IVenue['venueType'] }))}
            style={inputStyle}
          >
            {VENUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Adresse *</label>
          <input
            value={formData.address}
            onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Code postal *</label>
          <input
            value={formData.postalCode}
            onChange={(e) => setFormData((p) => ({ ...p, postalCode: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Ville *</label>
          <input
            value={formData.city}
            onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Pays *</label>
          <input
            value={formData.country}
            onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
            style={inputStyle}
            required
          />
        </div>
      </div>

      {/* Géocodage */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={isGeocoding || !formData.address || !formData.city}
            style={{
              padding: '9px 18px',
              background: isGeocoding || !formData.address || !formData.city
                ? 'rgba(255,65,108,0.1)'
                : 'rgba(255,65,108,0.15)',
              color: isGeocoding || !formData.address || !formData.city ? '#888' : '#ff416c',
              border: '1px solid rgba(255,65,108,0.3)',
              borderRadius: 8,
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

          <button
            type="button"
            onClick={() => setShowManualCoords((v) => !v)}
            style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showManualCoords ? 'Masquer' : 'Modifier manuellement'}
          </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Capacité (personnes) *</label>
          <input
            type="number"
            min={1}
            value={formData.capacity}
            onChange={(e) => setFormData((p) => ({ ...p, capacity: parseInt(e.target.value) || 0 }))}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Prix par soirée (€) *</label>
          <input
            type="number"
            min={0}
            value={formData.pricePerEvent}
            onChange={(e) => setFormData((p) => ({ ...p, pricePerEvent: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
            required
          />
        </div>
      </div>

      {/* Équipements */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Équipements</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleEquipmentToggle(item)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
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
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Photos</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {currentPhotos.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8 }}
              />
              <button
                type="button"
                onClick={() => setCurrentPhotos((p) => p.filter((_, idx) => idx !== i))}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
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
              width: 100,
              height: 70,
              border: '2px dashed rgba(255,65,108,0.4)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ff416c',
              fontSize: 24,
            }}
          >
            {photoUploading ? '...' : '+'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Statut actif */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
          style={{ width: 16, height: 16, accentColor: '#ff416c' }}
        />
        <label htmlFor="isActive" style={{ fontSize: 14, color: '#ccc', cursor: 'pointer' }}>
          Salle active (visible dans la liste)
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '14px 32px',
          background: isSubmitting
            ? 'rgba(255,65,108,0.5)'
            : 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  );
};

export default EditVenueForm;
