import React, { type CSSProperties, useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { X, ChevronDown } from 'lucide-react';
import api from '../services/api';

interface CreateEventFormProps {
  onClose: () => void;
  onEventCreated: () => void;
}

function CreateEventForm({ onClose, onEventCreated }: CreateEventFormProps) {
  const { user, token } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Fonction pour générer les créneaux de 30 minutes
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayString = `${hour.toString().padStart(2, '0')}H${minute.toString().padStart(2, '0')}`;
        slots.push({ value: timeString, label: displayString });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    postalCode: '',
    address: '',
    country: '',
    date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD par défaut
    venue: '',
    startTime: '',
    endTime: '',
    minExperience: '',
    maxComedians: '',
    status: 'PUBLISHED',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [openStartTimeDropdown, setOpenStartTimeDropdown] = useState(false);
  const [openEndTimeDropdown, setOpenEndTimeDropdown] = useState(false);
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);

  // Fermer les dropdowns quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startTimeRef.current && !startTimeRef.current.contains(event.target as Node)) {
        setOpenStartTimeDropdown(false);
      }
      if (endTimeRef.current && !endTimeRef.current.contains(event.target as Node)) {
        setOpenEndTimeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

    // Validation en temps réel pour la date et l'heure de début
    if (id === 'date' || id === 'startTime') {
      // Si la date change, valider l'heure de début si elle existe
      if (id === 'date' && formData.startTime) {
        const selectedDate = new Date(value + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate.getTime() === today.getTime()) {
          const now = new Date();
          const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
          const eventStartDateTime = new Date();
          eventStartDateTime.setHours(startHours, startMinutes, 0, 0);
          
          // Si l'heure de début est dans le passé (avec une marge de 1 minute)
          if (eventStartDateTime.getTime() < (now.getTime() - 60000)) {
            setErrors(prev => ({
              ...prev,
              startTime: 'L\'heure de début ne peut pas être dans le passé pour aujourd\'hui. Veuillez sélectionner une heure future.'
            }));
          } else {
            // Clear error si l'heure est valide
            setErrors(prev => ({
              ...prev,
              startTime: ''
            }));
          }
        } else {
          // Clear error si la date n'est pas aujourd'hui
          setErrors(prev => ({
            ...prev,
            startTime: ''
          }));
        }
      }
      
      // Si l'heure de début change, valider immédiatement
      if (id === 'startTime' && formData.date) {
        const selectedDate = new Date(formData.date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate.getTime() === today.getTime()) {
          const now = new Date();
          const [startHours, startMinutes] = value.split(':').map(Number);
          const eventStartDateTime = new Date();
          eventStartDateTime.setHours(startHours, startMinutes, 0, 0);
          
          // Si l'heure de début est dans le passé (avec une marge de 1 minute)
          if (eventStartDateTime.getTime() < (now.getTime() - 60000)) {
            setErrors(prev => ({
              ...prev,
              startTime: 'L\'heure de début ne peut pas être dans le passé pour aujourd\'hui. Veuillez sélectionner une heure future.'
            }));
          } else {
            // Clear error si l'heure est valide
            setErrors(prev => ({
              ...prev,
              startTime: ''
            }));
          }
        } else {
          // Clear error si la date n'est pas aujourd'hui
          setErrors(prev => ({
            ...prev,
            startTime: ''
          }));
        }
      }
    }
  };

  const handleTimeSelect = (timeValue: string, field: 'startTime' | 'endTime') => {
    setFormData(prev => ({
      ...prev,
      [field]: timeValue
    }));
    if (field === 'startTime') {
      setOpenStartTimeDropdown(false);
      
      // Valider l'heure de début si la date est aujourd'hui
      if (formData.date) {
        const selectedDate = new Date(formData.date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate.getTime() === today.getTime()) {
          const now = new Date();
          const [startHours, startMinutes] = timeValue.split(':').map(Number);
          const eventStartDateTime = new Date();
          eventStartDateTime.setHours(startHours, startMinutes, 0, 0);
          
          // Si l'heure de début est dans le passé (avec une marge de 1 minute)
          if (eventStartDateTime.getTime() < (now.getTime() - 60000)) {
            setErrors(prev => ({
              ...prev,
              startTime: 'L\'heure de début ne peut pas être dans le passé pour aujourd\'hui. Veuillez sélectionner une heure future.'
            }));
          } else {
            // Clear error si l'heure est valide
            setErrors(prev => ({
              ...prev,
              startTime: ''
            }));
          }
        } else {
          // Clear error si la date n'est pas aujourd'hui
          setErrors(prev => ({
            ...prev,
            startTime: ''
          }));
        }
      }
    } else {
      setOpenEndTimeDropdown(false);
      // Clear error pour l'heure de fin
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    }
  };

  // Fonction pour obtenir les créneaux horaires disponibles pour l'heure de début
  const getAvailableStartTimeSlots = () => {
    if (!formData.date) {
      return timeSlots;
    }
    
    const selectedDate = new Date(formData.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Si la date sélectionnée est aujourd'hui, filtrer les heures passées
    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      // Ajouter une marge de 1 minute pour éviter les problèmes de timing
      const minTime = new Date(now.getTime() - 60000);
      return timeSlots.filter(slot => {
        const [hours, minutes] = slot.value.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime >= minTime;
      });
    }
    
    // Pour les dates futures, tous les créneaux sont disponibles
    return timeSlots;
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
    
    // Validation du code postal
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Le code postal est requis';
    } else {
      const postalCodeRegex = /^\d{5}$/;
      if (!postalCodeRegex.test(formData.postalCode.trim())) {
        newErrors.postalCode = 'Le code postal doit contenir exactement 5 chiffres';
      }
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
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Format de date invalide. Utilisez le sélecteur de date.';
      } else {
        const selectedDate = new Date(formData.date);
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
      } else {
        // Vérifier si l'heure de début n'est pas dans le passé si la date est aujourd'hui
        if (formData.date) {
          const selectedDate = new Date(formData.date + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          selectedDate.setHours(0, 0, 0, 0);
          
          // Si la date sélectionnée est aujourd'hui
          if (selectedDate.getTime() === today.getTime()) {
            const now = new Date();
            const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
            const eventStartDateTime = new Date();
            eventStartDateTime.setHours(startHours, startMinutes, 0, 0);
            
            // Si l'heure de début est dans le passé (avec une marge de 1 minute pour éviter les problèmes de timing)
            if (eventStartDateTime.getTime() < (now.getTime() - 60000)) {
              newErrors.startTime = 'L\'heure de début ne peut pas être dans le passé. Il est actuellement ' + 
                now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + 
                '. Veuillez sélectionner une heure future.';
            }
          }
        }
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
    if (!formData.maxComedians) {
      newErrors.maxComedians = 'Le nombre maximum de comédiens est requis';
    } else {
      const maxComedians = parseInt(formData.maxComedians);
      if (isNaN(maxComedians) || maxComedians < 1) {
        newErrors.maxComedians = 'Le nombre doit être au moins 1';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !token) {
      alert('Vous devez être connecté pour créer un événement');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
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
        date: formData.date,
        location: {
          venue: formData.venue,
          address: formData.address,
          city: formData.city,
          country: formData.country,
        },
        requirements: {
          minExperience: Number(formData.minExperience),
          maxPerformers: Number(formData.maxComedians),
          duration: durationInMinutes, // Durée calculée automatiquement
        },
        status: formData.status,
        startTime: formData.startTime,
        endTime: formData.endTime,
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await api.post('/events', eventData, config);
      console.log('✅ Réponse serveur:', response.data);
      alert('Événement créé avec succès !');
      onEventCreated();
      onClose(); // Fermer la modale après création réussie
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'événement:', error.response?.data || error.message);
      alert(`Erreur lors de la création de l'événement: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: isMobile ? '16px' : '24px',
    overflow: 'auto' // Permettre le scroll si nécessaire
  };

  const formStyle: CSSProperties = {
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: isMobile ? '100%' : '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    overflowX: 'hidden', // Empêcher le scroll horizontal
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    zIndex: 1
  };

  const headerStyle: CSSProperties = {
    padding: isMobile ? '16px' : '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: isMobile ? 'sticky' : 'static',
    top: 0,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    zIndex: 1
  };

  const contentStyle: CSSProperties = {
    padding: isMobile ? '16px' : '24px',
    color: '#fff'
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: isMobile ? '14px 16px' : '12px 16px',
    fontSize: isMobile ? '16px' : '14px', // 16px prevents zoom on iOS
    border: '1px solid #444',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    marginBottom: '4px'
  };

  // Style spécifique pour les selects (compatibilité Windows)
  const selectStyle: CSSProperties = {
    ...inputStyle,
    appearance: 'none', // Supprime le style par défaut du navigateur
    WebkitAppearance: 'none', // Pour Safari/Chrome
    MozAppearance: 'none', // Pour Firefox
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px',
    paddingRight: '40px', // Espace pour l'icône
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1
  };

  const buttonStyle: CSSProperties = {
    padding: isMobile ? '16px 24px' : '12px 24px',
    fontSize: isMobile ? '16px' : '14px',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: isMobile ? '100%' : 'auto'
  };

  return (
    <div style={modalStyle} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && onClose()}>
      <div style={formStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ 
            margin: 0, 
            color: '#fff', 
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '700'
          }}>
            Créer un nouvel événement
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '16px' : '20px'
            }}>
              {/* Titre */}
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Titre de l'événement *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.title ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: Soirée Stand-Up Comedy"
                />
                {errors.title && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    minHeight: '100px',
                    resize: 'vertical',
                    borderColor: errors.description ? '#ef4444' : '#444'
                  }}
                  placeholder="Décrivez votre événement en détail..."
                />
                {errors.description && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Lieu/Bar */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Lieu (nom de la salle) *
                </label>
                <input
                  type="text"
                  id="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.venue ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: Le Comedy Club"
                />
                {errors.venue && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.venue}
                  </p>
                )}
              </div>

              {/* Ville */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Ville *
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.city ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: Paris"
                />
                {errors.city && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.city}
                  </p>
                )}
              </div>

              {/* Code postal */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Code postal *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.postalCode ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: 75001"
                  maxLength={5}
                />
                {errors.postalCode && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.postalCode}
                  </p>
                )}
              </div>

              {/* Adresse */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Adresse *
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.address ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: 123 rue de la Comédie"
                />
                {errors.address && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.address}
                  </p>
                )}
              </div>

              {/* Pays */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Pays *
                </label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.country ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: France"
                />
                {errors.country && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.country}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.date ? '#ef4444' : '#444'
                  }}
                />
                {errors.date && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Heure de début - Dropdown personnalisé */}
              <div ref={startTimeRef} style={{ position: 'relative', zIndex: 100 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Heure de début *
                </label>
                <div
                  onClick={() => {
                    setOpenStartTimeDropdown(!openStartTimeDropdown);
                    setOpenEndTimeDropdown(false);
                  }}
                  style={{
                    ...selectStyle,
                    borderColor: errors.startTime ? '#ef4444' : '#444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: formData.startTime ? '#fff' : '#999' }}>
                    {formData.startTime 
                      ? timeSlots.find(slot => slot.value === formData.startTime)?.label 
                      : 'Sélectionnez une heure'}
                  </span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      color: '#fff', 
                      transform: openStartTimeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </div>
                {openStartTimeDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}>
                    {getAvailableStartTimeSlots().map((slot) => (
                      <div
                        key={slot.value}
                        onClick={() => handleTimeSelect(slot.value, 'startTime')}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          color: '#fff',
                          backgroundColor: formData.startTime === slot.value ? 'rgba(255, 65, 108, 0.3)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.startTime !== slot.value) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.startTime !== slot.value) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>
                )}
                {errors.startTime && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.startTime}
                  </p>
                )}
              </div>

              {/* Heure de fin - Dropdown personnalisé */}
              <div ref={endTimeRef} style={{ position: 'relative', zIndex: 100 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Heure de fin *
                </label>
                <div
                  onClick={() => {
                    setOpenEndTimeDropdown(!openEndTimeDropdown);
                    setOpenStartTimeDropdown(false);
                  }}
                  style={{
                    ...selectStyle,
                    borderColor: errors.endTime ? '#ef4444' : '#444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: formData.endTime ? '#fff' : '#999' }}>
                    {formData.endTime 
                      ? timeSlots.find(slot => slot.value === formData.endTime)?.label 
                      : 'Sélectionnez une heure'}
                  </span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      color: '#fff', 
                      transform: openEndTimeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </div>
                {openEndTimeDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}>
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.value}
                        onClick={() => handleTimeSelect(slot.value, 'endTime')}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          color: '#fff',
                          backgroundColor: formData.endTime === slot.value ? 'rgba(255, 65, 108, 0.3)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.endTime !== slot.value) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.endTime !== slot.value) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>
                )}
                {errors.endTime && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.endTime}
                  </p>
                )}
              </div>

              {/* Expérience minimale */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Expérience minimale (années) *
                </label>
                <input
                  type="number"
                  id="minExperience"
                  value={formData.minExperience}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.minExperience ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: 2"
                  min="0"
                />
                {errors.minExperience && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.minExperience}
                  </p>
                )}
              </div>

              {/* Nombre maximum de comédiens */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#ccc' }}>
                  Nombre maximum de comédiens *
                </label>
                <input
                  type="number"
                  id="maxComedians"
                  value={formData.maxComedians}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    borderColor: errors.maxComedians ? '#ef4444' : '#444'
                  }}
                  placeholder="Ex: 5"
                  min="1"
                />
                {errors.maxComedians && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    {errors.maxComedians}
                  </p>
                )}
              </div>
            </div>

            {/* Boutons */}
            <div style={{ 
              marginTop: '32px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  ...buttonStyle,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...buttonStyle,
                  background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                  color: '#fff',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Création...' : 'Créer l\'événement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEventForm; 