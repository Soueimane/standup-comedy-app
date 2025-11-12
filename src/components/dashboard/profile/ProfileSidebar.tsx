import React from 'react';
import { Camera, Instagram, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, HumoristeProfile, OrganisateurProfile } from '@/types/auth';
import { useData } from '@/contexts/DataContext';

interface ProfileSidebarProps {
  user: User;
  isEditing: boolean;
  formData: HumoristeProfile | OrganisateurProfile;
  onFormDataChange: (data: Partial<HumoristeProfile | OrganisateurProfile>) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  user,
  isEditing,
  formData,
  onFormDataChange
}) => {
  const isHumoriste = user.userType === 'humoriste';
  const humoristeProfile = isHumoriste ? user.profile as HumoristeProfile : null;
  const organisateurProfile = !isHumoriste ? user.profile as OrganisateurProfile : null;

  const { getOrganizerStats } = useData();

  const organizerStats = isHumoriste ? null : getOrganizerStats(user.id);

  const handleSocialLinkChange = (platform: 'instagram' | 'tiktok', value: string) => {
    if (isHumoriste) {
      onFormDataChange({
        socialLinks: { ...(formData as HumoristeProfile).socialLinks, [platform]: value }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo de profil */}
      <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
        <div className="relative inline-block mb-4">
          <Avatar className="w-24 h-24">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-gray-700 text-white text-2xl">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <button className="absolute bottom-0 right-0 bg-pink-500 p-2 rounded-full hover:bg-pink-600 transition-colors">
              <Camera className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white">
          {isHumoriste 
            ? humoristeProfile?.stageName || `${user.firstName} ${user.lastName}`
            : organisateurProfile?.companyName || `${user.firstName} ${user.lastName}`
          }
        </h3>
        <p className="text-gray-400 capitalize">
          {isHumoriste ? humoristeProfile?.experienceLevel : 'Organisateur'}
        </p>
        
        {isHumoriste && humoristeProfile?.socialLinks && (
          <div className="flex justify-center space-x-3 mt-4">
            {humoristeProfile.socialLinks.instagram && (
              <a href="#" className="text-pink-400 hover:text-pink-300">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {humoristeProfile.socialLinks.tiktok && (
              <a href="#" className="text-purple-400 hover:text-purple-300">
                <MessageSquare className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Réseaux sociaux (humoristes uniquement) */}
      {isHumoriste && (
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Réseaux sociaux</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Instagram</label>
              {isEditing ? (
                <Input
                  value={(formData as HumoristeProfile).socialLinks?.instagram || ''}
                  onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="@username"
                />
              ) : (
                <p className="text-gray-400">{humoristeProfile?.socialLinks?.instagram || 'Non défini'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">TikTok</label>
              {isEditing ? (
                <Input
                  value={(formData as HumoristeProfile).socialLinks?.tiktok || ''}
                  onChange={(e) => handleSocialLinkChange('tiktok', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="@username"
                />
              ) : (
                <p className="text-gray-400">{humoristeProfile?.socialLinks?.tiktok || 'Non défini'}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Statistiques rapides */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Stats rapides</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">
              {isHumoriste ? 'Spectacles' : 'Événements créés'}
            </span>
            <span className="text-white font-semibold">{isHumoriste ? user.stats?.totalEvents || 0 : organizerStats?.totalEvents || 0}</span>
          </div>
          {isHumoriste && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Score viral</span>
                <span className="text-yellow-400 font-semibold">{user.stats?.viralScore || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Note moyenne</span>
                <span className="text-green-400 font-semibold">{user.stats?.averageRating || 0}/5</span>
              </div>
            </>
          )}
          {isHumoriste && (
          <div className="flex justify-between">
            <span className="text-gray-400">Vues profil</span>
            <span className="text-blue-400 font-semibold">{user.stats?.profileViews || 0}</span>
          </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProfileSidebar;
