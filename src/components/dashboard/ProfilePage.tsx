
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HumoristeProfile, OrganisateurProfile } from '@/types/auth';
import ProfileHeader from './profile/ProfileHeader';
import BasicInfoCard from './profile/BasicInfoCard';
import HumoristeProfileCard from './profile/HumoristeProfileCard';
import OrganisateurProfileCard from './profile/OrganisateurProfileCard';
import AvailabilityCard from './profile/AvailabilityCard';
import ProfileSidebar from './profile/ProfileSidebar';

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user?.profile || {} as HumoristeProfile | OrganisateurProfile);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const isHumoriste = user.userType === 'humoriste';
  const humoristeProfile = isHumoriste ? user.profile as HumoristeProfile : null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormDataChange = (data: Partial<HumoristeProfile | OrganisateurProfile>) => {
    setFormData({ ...formData, ...data });
  };

  return (
    <div className="space-y-6">
      <ProfileHeader
        isEditing={isEditing}
        isLoading={isLoading}
        onEditToggle={() => setIsEditing(true)}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <BasicInfoCard
            user={user}
            isEditing={isEditing}
            formData={formData}
            onFormDataChange={handleFormDataChange}
          />

          {isHumoriste ? (
            <HumoristeProfileCard
              profile={humoristeProfile!}
              isEditing={isEditing}
              formData={formData as HumoristeProfile}
              onFormDataChange={handleFormDataChange}
            />
          ) : (
            <OrganisateurProfileCard
              profile={user.profile as OrganisateurProfile}
              isEditing={isEditing}
              formData={formData as OrganisateurProfile}
              onFormDataChange={handleFormDataChange}
            />
          )}

          {isHumoriste && humoristeProfile && (
            <AvailabilityCard
              profile={humoristeProfile}
              isEditing={isEditing}
              formData={formData as HumoristeProfile}
              onFormDataChange={handleFormDataChange}
            />
          )}
        </div>

        <ProfileSidebar
          user={user}
          isEditing={isEditing}
          formData={formData}
          onFormDataChange={handleFormDataChange}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
