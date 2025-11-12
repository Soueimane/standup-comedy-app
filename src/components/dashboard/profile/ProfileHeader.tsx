
import React from 'react';
import { Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileHeaderProps {
  isEditing: boolean;
  isLoading: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditing,
  isLoading,
  onEditToggle,
  onSave
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Mon Profil</h1>
        <p className="text-gray-400">Gère tes informations et préférences</p>
      </div>
      
      <Button
        onClick={isEditing ? onSave : onEditToggle}
        disabled={isLoading}
        className={isEditing ? 'bg-green-500 hover:bg-green-600' : 'bg-pink-500 hover:bg-pink-600'}
      >
        {isEditing ? (
          <>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
          </>
        ) : (
          <>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </>
        )}
      </Button>
    </div>
  );
};

export default ProfileHeader;
