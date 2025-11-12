import React, { type CSSProperties, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { IEvent } from '../types/event';
import api from '../services/api';

interface EditEventFormProps {
  onClose: () => void;
  onEventUpdated: () => void;
  eventToEdit: IEvent;
}

function EditEventForm({ onClose, onEventUpdated, eventToEdit }: EditEventFormProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    address: '',
    country: '',
    date: '',
    venue: '',
    startTime: '',
    endTime: '',
    minExperience: '',
    maxPerformers: '',
    status: 'PUBLISHED',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (eventToEdit) {
      const eventDate = new Date(eventToEdit.date);
      const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')}/${(eventDate.getMonth() + 1).toString().padStart(2, '0')}/${eventDate.getFullYear()}`;
      
      setFormData({
        title: eventToEdit.title,
        description: eventToEdit.description,
        city: eventToEdit.location.city,
        address: eventToEdit.location.address,
        country: eventToEdit.location.country,
        date: formattedDate,
        venue: eventToEdit.location.venue || '',
        startTime: eventToEdit.startTime || '',
        endTime: eventToEdit.endTime || '',
        minExperience: eventToEdit.requirements.minExperience.toString(),
        maxPerformers: eventToEdit.requirements.maxPerformers?.toString() || '',
        status: eventToEdit.status,
      });
    }
  }, [eventToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear error when user starts typing
    if (errors[id]) {
      setErrors(prev => ({
        ...prev,
        [id]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Validation du titre
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Le titre doit contenir au moins 3 caractères';
    }
    
    // Validation de la description
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }
    
    // Validation du lieu/bar
    if (!formData.venue.trim()) {
      newErrors.venue = 'Le lieu (nom de la salle) est requis';
    } else if (formData.venue.trim().length < 2) {
      newErrors.venue = 'Le nom de la salle doit contenir au moins 2 caractères';
    }
    
    // Validation de la ville
    if (!formData.city.trim()) {
      newErrors.city = 'La ville est requise';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'Le nom de la ville doit contenir au moins 2 caractères';
    }
    
    // Validation de l'adresse
    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'L\'adresse doit contenir au moins 5 caractères';
    }
    
    // Validation du pays
    if (!formData.country.trim()) {
      newErrors.country = 'Le pays est requis';
    } else if (formData.country.trim().length < 2) {
      newErrors.country = 'Le nom du pays doit contenir au moins 2 caractères';
    }
    
    // Validation de la date
    if (!formData.date) {
      newErrors.date = 'La date est requise';
    } else {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Format de date invalide (JJ/MM/AAAA)';
      } else {
        const [day, month, year] = formData.date.split('/').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(selectedDate.getTime())) {
          newErrors.date = 'Date invalide';
        } else if (selectedDate < today) {
          newErrors.date = 'La date ne peut pas être dans le passé';
        }
      }
    }
    
    // Validation de l'heure de début
    if (!formData.startTime) {
      newErrors.startTime = 'L\'heure de début est requise';
    } else {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.startTime)) {
        newErrors.startTime = 'Format d\'heure invalide (HH:MM)';
      }
    }
    
    // Validation de l'heure de fin
    if (!formData.endTime) {
      newErrors.endTime = 'L\'heure de fin est requise';
    } else {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.endTime)) {
        newErrors.endTime = 'Format d\'heure invalide (HH:MM)';
      } else if (formData.startTime && formData.endTime) {
        const startTime = new Date(`2000-01-01T${formData.startTime}`);
        const endTime = new Date(`2000-01-01T${formData.endTime}`);
        if (endTime <= startTime) {
          newErrors.endTime = 'L\'heure de fin doit être après l\'heure de début';
        }
      }
    }
    
    // Validation de l'expérience minimale
    if (!formData.minExperience) {
      newErrors.minExperience = 'L\'expérience minimale est requise';
    } else {
      const experience = parseInt(formData.minExperience);
      if (isNaN(experience) || experience < 0) {
        newErrors.minExperience = 'L\'expérience doit être un nombre positif';
      }
    }
    
    // Validation du nombre maximum de comédiens
    if (!formData.maxPerformers) {
      newErrors.maxPerformers = 'Le nombre maximum de comédiens est requis';
    } else {
      const maxPerformers = parseInt(formData.maxPerformers);
      if (isNaN(maxPerformers) || maxPerformers < 1) {
        newErrors.maxPerformers = 'Le nombre doit être au moins 1';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert("Vous devez être connecté pour modifier un événement.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const [day, month, year] = formData.date.split('/').map(Number);
      const eventDate = new Date(year, month - 1, day);

      // Calculate duration in minutes
      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      const startMinutes = parseTime(formData.startTime);
      const endMinutes = parseTime(formData.endTime);
      let durationInMinutes = 0;
      if (endMinutes >= startMinutes) {
        durationInMinutes = endMinutes - startMinutes;
      } else {
        durationInMinutes = (24 * 60 - startMinutes) + endMinutes;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventDate.toISOString(),
        location: {
          venue: formData.venue,
          address: formData.address,
          city: formData.city,
          country: formData.country,
        },
        requirements: {
          minExperience: Number(formData.minExperience),
          maxPerformers: Number(formData.maxPerformers),
          duration: durationInMinutes,
        },
        status: formData.status.toUpperCase(),
        startTime: formData.startTime,
        endTime: formData.endTime,
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      await api.put(`/events/${eventToEdit._id}`, eventData, config);
      alert('Événement mis à jour avec succès !');
      onEventUpdated();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error.response?.data || error.message);
      alert(`Erreur lors de la mise à jour de l'événement: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContainerStyle: CSSProperties = {
    maxWidth: '1000px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
  };

  const formTitleStyle: CSSProperties = {
    fontSize: '2em',
    color: '#ff416c',
    marginBottom: '20px',
  };

  const inputGroupStyle: CSSProperties = {
    marginBottom: '15px',
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#ff4b2b',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#ffffff',
    boxSizing: 'border-box',
  };

  const textAreaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

  const twoColumnLayout: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px',
  };

  const buttonContainerStyle: CSSProperties = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
  };

  const primaryButtonStyle: CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #28a745, #218838)',
    color: 'white',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    opacity: isSubmitting ? 0.7 : 1,
  };

  const secondaryButtonStyle: CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #dc3545, #c82333)',
    color: 'white',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  };

  return (
    <div style={formContainerStyle}>
      <h2 style={formTitleStyle}>Modifier l'événement</h2>
      <form onSubmit={handleSubmit}>
        <div style={inputGroupStyle}>
          <label htmlFor="title" style={labelStyle}>Titre de l'événement *</label>
          <input 
            type="text" 
            id="title" 
            style={{
              ...inputStyle,
              borderColor: errors.title ? '#ef4444' : '#555'
            }} 
            value={formData.title} 
            onChange={handleChange} 
            placeholder="Ex: Soirée Stand-Up Comedy"
          />
          {errors.title && (
            <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
              {errors.title}
            </p>
          )}
        </div>

        <div style={inputGroupStyle}>
          <label htmlFor="description" style={labelStyle}>Description *</label>
          <textarea 
            id="description" 
            style={{
              ...textAreaStyle,
              borderColor: errors.description ? '#ef4444' : '#555'
            }} 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="Décrivez votre événement en détail..."
          />
          {errors.description && (
            <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
              {errors.description}
            </p>
          )}
        </div>
        
        <div style={twoColumnLayout}>
          <div style={inputGroupStyle}>
            <label htmlFor="city" style={labelStyle}>Ville *</label>
            <input 
              type="text" 
              id="city" 
              style={{
                ...inputStyle,
                borderColor: errors.city ? '#ef4444' : '#555'
              }} 
              value={formData.city} 
              onChange={handleChange} 
              placeholder="Ex: Paris"
            />
            {errors.city && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.city}
              </p>
            )}
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="country" style={labelStyle}>Pays *</label>
            <input 
              type="text" 
              id="country" 
              style={{
                ...inputStyle,
                borderColor: errors.country ? '#ef4444' : '#555'
              }} 
              value={formData.country} 
              onChange={handleChange} 
              placeholder="Ex: France"
            />
            {errors.country && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.country}
              </p>
            )}
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label htmlFor="address" style={labelStyle}>Adresse *</label>
          <input 
            type="text" 
            id="address" 
            style={{
              ...inputStyle,
              borderColor: errors.address ? '#ef4444' : '#555'
            }} 
            value={formData.address} 
            onChange={handleChange} 
            placeholder="Ex: 123 rue de la Comédie"
          />
          {errors.address && (
            <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
              {errors.address}
            </p>
          )}
        </div>

        <div style={twoColumnLayout}>
          <div style={inputGroupStyle}>
            <label htmlFor="date" style={labelStyle}>Date *</label>
            <input 
              type="text" 
              id="date" 
              style={{
                ...inputStyle,
                borderColor: errors.date ? '#ef4444' : '#555'
              }} 
              placeholder="JJ/MM/AAAA" 
              value={formData.date} 
              onChange={handleChange} 
            />
            {errors.date && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.date}
              </p>
            )}
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="venue" style={labelStyle}>Lieu (nom de la salle) *</label>
            <input 
              type="text" 
              id="venue" 
              style={{
                ...inputStyle,
                borderColor: errors.venue ? '#ef4444' : '#555'
              }} 
              value={formData.venue} 
              onChange={handleChange} 
              placeholder="Ex: Le Comedy Club"
            />
            {errors.venue && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.venue}
              </p>
            )}
          </div>
        </div>

        <div style={twoColumnLayout}>
          <div style={inputGroupStyle}>
            <label htmlFor="startTime" style={labelStyle}>Heure de début *</label>
            <input 
              type="text" 
              id="startTime" 
              style={{
                ...inputStyle,
                borderColor: errors.startTime ? '#ef4444' : '#555'
              }} 
              placeholder="HH:MM" 
              value={formData.startTime} 
              onChange={handleChange} 
            />
            {errors.startTime && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.startTime}
              </p>
            )}
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="endTime" style={labelStyle}>Heure de fin *</label>
            <input 
              type="text" 
              id="endTime" 
              style={{
                ...inputStyle,
                borderColor: errors.endTime ? '#ef4444' : '#555'
              }} 
              placeholder="HH:MM" 
              value={formData.endTime} 
              onChange={handleChange} 
            />
            {errors.endTime && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.endTime}
              </p>
            )}
          </div>
        </div>

        <div style={twoColumnLayout}>
          <div style={inputGroupStyle}>
            <label htmlFor="minExperience" style={labelStyle}>Expérience minimale (années) *</label>
            <input 
              type="number" 
              id="minExperience" 
              style={{
                ...inputStyle,
                borderColor: errors.minExperience ? '#ef4444' : '#555'
              }} 
              value={formData.minExperience} 
              onChange={handleChange} 
              placeholder="Ex: 2"
              min="0"
            />
            {errors.minExperience && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.minExperience}
              </p>
            )}
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="maxPerformers" style={labelStyle}>Nombre maximum de comédiens *</label>
            <input 
              type="number" 
              id="maxPerformers" 
              style={{
                ...inputStyle,
                borderColor: errors.maxPerformers ? '#ef4444' : '#555'
              }} 
              value={formData.maxPerformers} 
              onChange={handleChange} 
              placeholder="Ex: 5"
              min="1"
            />
            {errors.maxPerformers && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                {errors.maxPerformers}
              </p>
            )}
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label htmlFor="status" style={labelStyle}>Statut *</label>
          <select 
            id="status" 
            style={{
              ...inputStyle,
              borderColor: errors.status ? '#ef4444' : '#555'
            }} 
            value={formData.status} 
            onChange={handleChange}
          >
            <option value="PUBLISHED">Publié</option>
            <option value="CANCELLED">Annulé</option>
            <option value="COMPLETED">Terminé</option>
          </select>
        </div>

        <div style={buttonContainerStyle}>
          <button type="submit" style={primaryButtonStyle} disabled={isSubmitting}>
            {isSubmitting ? 'Modification...' : 'Sauvegarder'}
          </button>
          <button type="button" onClick={onClose} style={secondaryButtonStyle} disabled={isSubmitting}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditEventForm;