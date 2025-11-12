import React, { useState, type CSSProperties, useEffect } from 'react';
import type { IUserData } from '../types/user';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface EditOrganizerProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: IUserData;
  onSaveSuccess: () => void;
}

function EditOrganizerProfileForm({ isOpen, onClose, currentUser, onSaveSuccess }: EditOrganizerProfileFormProps) {
  const { token, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: currentUser.firstName || '',
    lastName: currentUser.lastName || '',
    email: currentUser.email || '',
    organizerProfile: {
      companyName: currentUser.organizerProfile?.companyName || '',
      description: currentUser.organizerProfile?.description || '',
      website: currentUser.organizerProfile?.website || '',
      venueTypes: currentUser.organizerProfile?.venueTypes?.join(', ') || '',
      eventFrequency: currentUser.organizerProfile?.eventFrequency || 'monthly',
      phone: currentUser.organizerProfile?.phone || '',
      location: {
        city: currentUser.organizerProfile?.location?.city || '',
        postalCode: currentUser.organizerProfile?.location?.postalCode || '',
        address: currentUser.organizerProfile?.location?.address || '',
      },
    },
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        organizerProfile: {
          companyName: currentUser.organizerProfile?.companyName || '',
          description: currentUser.organizerProfile?.description || '',
          website: currentUser.organizerProfile?.website || '',
          venueTypes: currentUser.organizerProfile?.venueTypes?.join(', ') || '',
          eventFrequency: currentUser.organizerProfile?.eventFrequency || 'monthly',
          phone: currentUser.organizerProfile?.phone || '',
          location: {
            city: currentUser.organizerProfile?.location?.city || '',
            postalCode: currentUser.organizerProfile?.location?.postalCode || '',
            address: currentUser.organizerProfile?.location?.address || '',
          },
        },
      });
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    if (id.startsWith('organizerProfile.location.')) {
      const nestedField = id.split('.')[2];
      setFormData(prev => ({
        ...prev,
        organizerProfile: {
          ...prev.organizerProfile,
          location: {
            ...prev.organizerProfile.location,
            [nestedField]: value,
          },
        },
      }));
    } else if (id.startsWith('organizerProfile.')) {
      const nestedField = id.split('.')[1];
      setFormData(prev => ({
        ...prev,
        organizerProfile: {
          ...prev.organizerProfile,
          [nestedField]: value,
        },
      }));
    } else if (id === 'organizerProfile.phone') {
      setFormData(prev => ({ ...prev, organizerProfile: { ...prev.organizerProfile, phone: value } }));
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('token:', token, 'currentUser.id:', currentUser?.id, 'currentUser._id:', currentUser?._id, 'currentUser:', currentUser);
    if (isLoading) return;
    if (!token || !(currentUser?.id || currentUser?._id)) {
      alert("Vous devez être connecté pour modifier votre profil.");
      return;
    }

    try {
      const updatedData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        organizerProfile: {
          companyName: formData.organizerProfile.companyName,
          description: formData.organizerProfile.description,
          website: formData.organizerProfile.website,
          venueTypes: formData.organizerProfile.venueTypes.split(', ').map(type => type.trim()),
          eventFrequency: formData.organizerProfile.eventFrequency,
          phone: formData.organizerProfile.phone,
          location: {
            city: formData.organizerProfile.location.city,
            postalCode: formData.organizerProfile.location.postalCode,
            address: formData.organizerProfile.location.address,
          },
        },
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      const userId = currentUser.id || currentUser._id;
      const res = await api.put(`/profile/${userId}`, updatedData, config); // Use PUT for update via baseURL
      console.log('Profil mis à jour:', res.data);
      alert('Profil mis à jour avec succès !');
      onSaveSuccess(); // Trigger a refetch or state update in parent
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error.response?.data || error.message);
      alert(`Erreur lors de la mise à jour du profil: ${error.response?.data?.message || error.message}`);
    }
  };

  if (!isOpen) return null;
  if (isLoading || !currentUser) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>Chargement du profil...</div>;
  }
  if (!token) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>Vous devez être connecté pour modifier votre profil.</div>;
  }

  const formContainerStyle: CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#1a1a2e',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
    width: '90%',
    maxWidth: '700px',
    zIndex: 2000,
    color: '#ffffff',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1999,
  };

  const titleStyle: CSSProperties = {
    fontSize: '2em',
    color: '#ff416c',
    marginBottom: '20px',
    textAlign: 'center',
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

  const closeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#ffffff',
  };

  return (
    <div style={overlayStyle}>
      <div style={formContainerStyle}>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        <h2 style={titleStyle}>Modifier le Profil Organisateur</h2>
        <form onSubmit={handleSubmit}>
          {/* Informations personnelles */}
          <h3 style={{ color: '#ff4b2b', marginBottom: '15px' }}>Informations personnelles</h3>
          <div style={twoColumnLayout}>
            <div style={inputGroupStyle}>
              <label htmlFor="firstName" style={labelStyle}>Prénom</label>
              <input type="text" id="firstName" style={inputStyle} value={formData.firstName} onChange={handleChange} required />
            </div>
            <div style={inputGroupStyle}>
              <label htmlFor="lastName" style={labelStyle}>Nom</label>
              <input type="text" id="lastName" style={inputStyle} value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input type="email" id="email" style={inputStyle} value={formData.email} onChange={handleChange} required />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.phone" style={labelStyle}>Téléphone</label>
            <input type="tel" id="organizerProfile.phone" style={inputStyle} value={formData.organizerProfile.phone} onChange={handleChange} placeholder="06 12 34 56 78" />
          </div>

          {/* Profil Organisateur */}
          <h3 style={{ color: '#ff4b2b', marginTop: '30px', marginBottom: '15px' }}>Profil Organisateur</h3>
          <div style={twoColumnLayout}>
            <div style={inputGroupStyle}>
              <label htmlFor="organizerProfile.companyName" style={labelStyle}>Nom de l'entreprise</label>
              <input type="text" id="organizerProfile.companyName" style={inputStyle} value={formData.organizerProfile.companyName} onChange={handleChange} />
            </div>
            <div style={inputGroupStyle}>
              <label htmlFor="organizerProfile.location.city" style={labelStyle}>Ville</label>
              <input
                id="organizerProfile.location.city"
                type="text"
                value={formData.organizerProfile.location.city}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.location.postalCode" style={labelStyle}>Code Postal</label>
            <input
              id="organizerProfile.location.postalCode"
              type="text"
              value={formData.organizerProfile.location.postalCode}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.location.address" style={labelStyle}>Adresse complète</label>
            <input
              id="organizerProfile.location.address"
              type="text"
              value={formData.organizerProfile.location.address}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ex: 123 rue de la Comédie"
            />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.description" style={labelStyle}>Description</label>
            <textarea id="organizerProfile.description" style={textAreaStyle} value={formData.organizerProfile.description} onChange={handleChange}></textarea>
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.website" style={labelStyle}>Site web</label>
            <input type="url" id="organizerProfile.website" style={inputStyle} value={formData.organizerProfile.website} onChange={handleChange} placeholder="https://example.com" />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.venueTypes" style={labelStyle}>Types de lieux (séparés par des virgules)</label>
            <input type="text" id="organizerProfile.venueTypes" style={inputStyle} value={formData.organizerProfile.venueTypes} onChange={handleChange} placeholder="Salle de spectacle, Bar, Théâtre" />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="organizerProfile.eventFrequency" style={labelStyle}>Fréquence des événements</label>
            <select id="organizerProfile.eventFrequency" style={inputStyle} value={formData.organizerProfile.eventFrequency} onChange={handleChange}>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
              <option value="occasional">Occasionnel</option>
            </select>
          </div>

          <div style={buttonContainerStyle}>
            <button type="submit" style={primaryButtonStyle}>Enregistrer les modifications</button>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditOrganizerProfileForm; 