import React from 'react';
import { User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User as UserType, HumoristeProfile, OrganisateurProfile } from '@/types/auth';

interface BasicInfoCardProps {
  user: UserType;
  isEditing: boolean;
  formData: HumoristeProfile | OrganisateurProfile;
  onFormDataChange: (data: Partial<HumoristeProfile | OrganisateurProfile>) => void;
}

const BasicInfoCard: React.FC<BasicInfoCardProps> = ({
  user,
  isEditing,
  formData,
  onFormDataChange
}) => {
  const isHumoriste = user.userType === 'humoriste';
  const isOrganisateur = user.userType === 'organisateur';
  const humoristeProfile = isHumoriste ? user.profile as HumoristeProfile : null;
  const organisateurProfile = isOrganisateur ? user.profile as OrganisateurProfile : null;

  const cities = [
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 
    'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'
  ];

  // Helper function to safely access formData properties
  const getFormDataValue = (key: keyof (HumoristeProfile | OrganisateurProfile)) => {
    return (formData as any)[key] || '';
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <User className="w-5 h-5 mr-2" />
        Informations personnelles
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
          {isEditing ? (
            <Input
              value={user.firstName}
              className="bg-gray-700 border-gray-600 text-white"
              disabled
            />
          ) : (
            <p className="text-white">{user.firstName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
          {isEditing ? (
            <Input
              value={user.lastName}
              className="bg-gray-700 border-gray-600 text-white"
              disabled
            />
          ) : (
            <p className="text-white">{user.lastName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <p className="text-gray-400">{user.email}</p>
        </div>

        {isHumoriste && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nom de scène</label>
              {isEditing ? (
                <Input
                  value={(formData as HumoristeProfile).stageName || ''}
                  onChange={(e) => onFormDataChange({ stageName: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Ton nom d'artiste"
                />
              ) : (
                <p className="text-white">{humoristeProfile?.stageName || 'Non défini'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Numéro de téléphone</label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={(formData as HumoristeProfile).phone || ''}
                  onChange={(e) => onFormDataChange({ phone: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Votre numéro de téléphone"
                />
              ) : (
                <p className="text-white">{humoristeProfile?.phone || 'Non défini'}</p>
              )}
            </div>
          </>
        )}

        {isOrganisateur && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nom de l'entreprise</label>
              {isEditing ? (
                <Input
                  value={(formData as OrganisateurProfile).companyName || ''}
                  onChange={(e) => onFormDataChange({ companyName: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Nom de votre entreprise"
                />
              ) : (
                <p className="text-white">{organisateurProfile?.companyName || 'Non défini'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Numéro de téléphone</label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={(formData as OrganisateurProfile).phone || ''}
                  onChange={(e) => onFormDataChange({ phone: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Votre numéro de téléphone"
                />
              ) : (
                <p className="text-white">{organisateurProfile?.phone || 'Non défini'}</p>
              )}
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Ville</label>
          {isEditing ? (
            <Select 
              value={formData.location?.city || ''}
              onValueChange={(value) => onFormDataChange({ location: { ...(formData as any).location, city: value } })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Sélectionne ta ville" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white">{user.profile.location?.city || 'Non défini'}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BasicInfoCard;
