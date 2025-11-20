import React, { type CSSProperties, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { IUserData } from '../types/user';
import Modal from './Modal';
import api from '../services/api';

interface EditComedianProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: IUserData;
  onSaveSuccess: () => void;
}

function EditComedianProfileForm({ isOpen, onClose, currentUser, onSaveSuccess }: EditComedianProfileFormProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<IUserData>(currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(currentUser?.avatarUrl || null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  useEffect(() => {
    setFormData(currentUser);
    setPreviewImage(currentUser?.avatarUrl || null);
    setAvatarRemoved(false);
  }, [currentUser]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image est trop grande. Taille maximale : 5MB');
        return;
      }
      
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Le fichier doit être une image');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setFormData(prev => ({ ...prev, avatarUrl: base64String }));
        setAvatarRemoved(false);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewImage(null);
    setFormData(prev => ({ ...prev, avatarUrl: undefined }));
    setAvatarRemoved(true);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else if (name === 'experience') {
        setFormData(prev => ({ ...prev, profile: { ...prev.profile, experience: Number(value) } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      // Send only the fields that are specific to the comedian's profile update
      const comedianProfileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        city: formData.city,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        avatarUrl: avatarRemoved ? null : formData.avatarUrl,
        profile: {
            bio: formData.profile?.bio,
            experience: formData.profile?.experience ? Number(formData.profile.experience) : undefined,
            speciality: formData.profile?.speciality,
            numberOfScenes: formData.profile?.numberOfScenes ? Number(formData.profile.numberOfScenes) : undefined,
            comedyStyle: formData.profile?.comedyStyle || undefined,
            performanceLanguages: formData.profile?.performanceLanguages || undefined,
            socialLinks: {
              youtube: formData.profile?.socialLinks?.youtube || undefined,
              instagram: formData.profile?.socialLinks?.instagram || undefined,
              facebook: formData.profile?.socialLinks?.facebook || undefined,
            }
        }
      };

      await api.put(`/profile/${currentUser._id}`, comedianProfileData, config);
      onSaveSuccess();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du profil:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Échec de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '5px',
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#fff',
  };

  const buttonStyle: CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
    color: 'white',
    fontSize: '1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    marginRight: '10px',
  };

  const cancelButtonClass: CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    backgroundImage: 'none',
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#ff4b2b',
    fontSize: '0.9em',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 style={{ color: '#ff416c', marginBottom: '20px' }}>Modifier le Profil Humoriste</h2>
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Photo de profil</label>
        <div style={{ marginBottom: '15px' }}>
          {previewImage && (
            <div style={{ marginBottom: '10px', textAlign: 'center' }}>
              <img 
                src={previewImage} 
                alt="Aperçu" 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '2px solid #ff416c'
                }} 
              />
            </div>
          )}
          {(previewImage || (!previewImage && !avatarRemoved && currentUser?.avatarUrl)) && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(220, 53, 69, 0.15)',
                color: '#ffb3b3',
                cursor: 'pointer',
              }}
            >
              Supprimer la photo
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: '#fff',
              cursor: 'pointer'
            }}
          />
          <p style={{ fontSize: '0.85em', color: '#aaa', marginTop: '5px' }}>
            Formats acceptés: JPG, PNG, GIF (max 5MB)
          </p>
        </div>
        
        <label style={labelStyle}>Prénom *</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder="Entrez votre prénom"
          style={inputStyle}
          required
        />
        
        <label style={labelStyle}>Nom *</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder="Entrez votre nom"
          style={inputStyle}
          required
        />
        
        <label style={labelStyle}>Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Entrez votre email"
          style={inputStyle}
          required
        />
        
        <label style={labelStyle}>Ville</label>
        <input
          type="text"
          name="city"
          value={formData.city || ''}
          onChange={handleChange}
          placeholder="Entrez votre ville"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Téléphone</label>
        <input
          type="text"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          placeholder="Entrez votre numéro de téléphone"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Genre</label>
        <select
          name="gender"
          value={formData.gender || ''}
          onChange={handleChange}
          style={inputStyle}
        >
          <option value="">Sélectionnez votre genre</option>
          <option value="femme">Femme</option>
          <option value="homme">Homme</option>
        </select>
        
        <label style={labelStyle}>Adresse</label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          placeholder="Entrez votre adresse complète"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Bio</label>
        <textarea
          name="profile.bio"
          value={formData.profile?.bio || ''}
          onChange={handleChange}
          placeholder="Décrivez votre style d'humour et votre parcours..."
          rows={5}
          style={inputStyle}
        ></textarea>
        
        <label style={labelStyle}>Années d'expérience</label>
        <input
          type="number"
          name="profile.experience"
          value={formData.profile?.experience || ''}
          onChange={handleChange}
          placeholder="Nombre d'années d'expérience"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Nombre de scènes jouées *</label>
        <input
          type="number"
          name="profile.numberOfScenes"
          value={formData.profile?.numberOfScenes || ''}
          onChange={handleChange}
          placeholder="Ex: 0-50 (Débutant), 50-200 (Expérimenté), 200+ (Pro)"
          style={inputStyle}
          min="0"
        />
        <p style={{ fontSize: '0.85em', color: '#aaa', marginTop: '-10px', marginBottom: '15px' }}>
          Débutant: 0-50 scènes | Expérimenté: 50-200 scènes | Pro: 200+ scènes
        </p>
        
        <label style={labelStyle}>Spécialité</label>
        <input
          type="text"
          name="profile.speciality"
          value={formData.profile?.speciality || ''}
          onChange={handleChange}
          placeholder="Ex: Stand-up, One-man-show, Improvisation..."
          style={inputStyle}
        />
        
        <label style={labelStyle}>Style de comédie</label>
        <div style={{ marginBottom: '15px' }}>
          {[
            { value: 'stand-up', label: 'Stand up (solo en interaction avec le public)' },
            { value: 'improvisation', label: 'Improvisation (création spontanée à partir d\'un contexte)' },
            { value: 'plateau', label: 'Plateau (plusieurs artistes se succèdent lors d\'une soirée)' },
            { value: 'sketch', label: 'Sketch (une scène courte pré écrite)' }
          ].map(style => (
            <label key={style.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', color: '#fff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.profile?.comedyStyle?.includes(style.value as any) || false}
                onChange={(e) => {
                  const currentStyles = formData.profile?.comedyStyle || [];
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        comedyStyle: [...currentStyles, style.value as any],
                      },
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        comedyStyle: currentStyles.filter(s => s !== style.value),
                      },
                    }));
                  }
                }}
                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>{style.label}</span>
            </label>
          ))}
        </div>
        
        <label style={labelStyle}>Langues du spectacle</label>
        <div style={{ marginBottom: '15px' }}>
          {[
            { value: 'francais', label: 'Français' },
            { value: 'arabe', label: 'Arabe' },
            { value: 'anglais', label: 'Anglais' },
            { value: 'italien', label: 'Italien' },
            { value: 'espagnol', label: 'Espagnol' }
          ].map(lang => (
            <label key={lang.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', color: '#fff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.profile?.performanceLanguages?.includes(lang.value as any) || false}
                onChange={(e) => {
                  const currentLanguages = formData.profile?.performanceLanguages || [];
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        performanceLanguages: [...currentLanguages, lang.value as any],
                      },
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        performanceLanguages: currentLanguages.filter(l => l !== lang.value),
                      },
                    }));
                  }
                }}
                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>{lang.label}</span>
            </label>
          ))}
        </div>
        
        <h3 style={{ color: '#ff4b2b', marginTop: '20px', marginBottom: '15px', fontSize: '1.1em' }}>Réseaux sociaux</h3>
        
        <label style={labelStyle}>Lien YouTube</label>
        <input
          type="url"
          name="profile.socialLinks.youtube"
          value={formData.profile?.socialLinks?.youtube || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                socialLinks: {
                  ...prev.profile?.socialLinks,
                  youtube: e.target.value,
                },
              },
            }));
          }}
          placeholder="https://www.youtube.com/@votre-chaine"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Lien Instagram</label>
        <input
          type="url"
          name="profile.socialLinks.instagram"
          value={formData.profile?.socialLinks?.instagram || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                socialLinks: {
                  ...prev.profile?.socialLinks,
                  instagram: e.target.value,
                },
              },
            }));
          }}
          placeholder="https://www.instagram.com/votre-compte"
          style={inputStyle}
        />
        
        <label style={labelStyle}>Lien Facebook</label>
        <input
          type="url"
          name="profile.socialLinks.facebook"
          value={formData.profile?.socialLinks?.facebook || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                socialLinks: {
                  ...prev.profile?.socialLinks,
                  facebook: e.target.value,
                },
              },
            }));
          }}
          placeholder="https://www.facebook.com/votre-page"
          style={inputStyle}
        />
        {error && <p style={{ color: '#dc3545', marginBottom: '15px' }}>{error}</p>}
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" style={cancelButtonClass} onClick={onClose} disabled={loading}>
          Annuler
        </button>
      </form>
    </Modal>
  );
}

export default EditComedianProfileForm; 