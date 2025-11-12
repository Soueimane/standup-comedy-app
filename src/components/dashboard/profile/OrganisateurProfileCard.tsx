import React, { useState } from 'react';
import { Building2, Globe, DollarSign } from 'lucide-react';
import { Card, Button, TextField, Typography, Box } from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { OrganisateurProfile } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

interface OrganisateurProfileCardProps {
  profile: OrganisateurProfile;
}

const OrganisateurProfileCard: React.FC<OrganisateurProfileCardProps> = ({ profile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const { updateProfile, user, loading: authLoading, error: authError } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "venueTypes") {
      setFormData({ ...formData, venueTypes: value.split(', ').map(item => item.trim()) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    try {
      const updatedProfileData = {
        companyName: formData.companyName,
        description: formData.description,
        website: formData.website,
        venueTypes: formData.venueTypes,
        averageBudget: formData.averageBudget,
        eventFrequency: formData.eventFrequency,
      };

      await updateProfile({
        ...user.profile,
        ...updatedProfileData
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update organizer profile:", error);
    }
  };

  const venueTypesOptions = [
    'bar', 'restaurant', 'theatre', 'salle_spectacle', 'club', 'en_plein_air', 'autre'
  ];

  const eventFrequencyOptions = [
    'weekly', 'monthly', 'occasional'
  ];

  const handleVenueTypeChange = (type: string, checked: boolean) => {
    const currentTypes = formData.venueTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    setFormData({ ...formData, venueTypes: newTypes });
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <Typography variant="h5" component="h2" gutterBottom>
        Profil Organisateur
      </Typography>
          {isEditing ? (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Nom de l'entreprise"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
              rows={4}
            />
          <TextField
            fullWidth
            label="Site web"
            name="website"
            value={formData.website}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Types de lieux"
            name="venueTypes"
            value={formData.venueTypes?.join(', ') || ''}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Budget moyen"
            name="averageBudget"
            type="number"
            value={formData.averageBudget?.min}
            onChange={(e) => setFormData({ ...formData, averageBudget: { ...formData.averageBudget, min: Number(e.target.value) } })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Budget moyen max"
            name="averageBudgetMax"
            type="number"
            value={formData.averageBudget?.max}
            onChange={(e) => setFormData({ ...formData, averageBudget: { ...formData.averageBudget, max: Number(e.target.value) } })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Fréquence des événements"
            name="eventFrequency"
            value={formData.eventFrequency}
            onChange={handleChange}
            margin="normal"
          />
          <Button type="submit" variant="contained" color="primary">
            Enregistrer
          </Button>
        </Box>
      ) : (
        <Box>
          <Typography variant="body1">Nom de l'entreprise: {profile.companyName}</Typography>
          <Typography variant="body1">Description: {profile.description}</Typography>
          <Typography variant="body1">Site web: {profile.website}</Typography>
          <Typography variant="body1">Types de lieux: {profile.venueTypes?.join(', ') || 'Non spécifié'}</Typography>
          <Typography variant="body1">Budget moyen: {profile.averageBudget?.min || 'Non spécifié'} - {profile.averageBudget?.max || 'Non spécifié'}€</Typography>
          <Typography variant="body1">Fréquence des événements: {profile.eventFrequency || 'Non spécifiée'}</Typography>
          <Button onClick={() => setIsEditing(true)} variant="outlined" color="primary">
            Modifier
          </Button>
        </Box>
      )}
    </Card>
  );
};

export default OrganisateurProfileCard;
