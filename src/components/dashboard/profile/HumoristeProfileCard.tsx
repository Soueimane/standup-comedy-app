import React from 'react';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HumoristeProfile } from '@/types/auth';

interface HumoristeProfileCardProps {
  profile: HumoristeProfile;
  isEditing: boolean;
  formData: HumoristeProfile;
  onFormDataChange: (data: Partial<HumoristeProfile>) => void;
}

const HumoristeProfileCard: React.FC<HumoristeProfileCardProps> = ({
  profile,
  isEditing,
  formData,
  onFormDataChange
}) => {
  const genres = [
    'observationnel', 'stand-up', 'impro', 'sketch', 'parodie', 
    'politique', 'famille', 'absurde', 'noir', 'musical'
  ];

  const handleGenreChange = (genre: string, checked: boolean) => {
    const currentGenres = formData.genres || [];
    const newGenres = checked 
      ? [...currentGenres, genre]
      : currentGenres.filter(g => g !== genre);
    onFormDataChange({ genres: newGenres });
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Star className="w-5 h-5 mr-2" />
        Profil artistique
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          {isEditing ? (
            <Textarea
              value={formData.bio || ''}
              onChange={(e) => onFormDataChange({ bio: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Raconte-nous ton univers..."
              rows={4}
            />
          ) : (
            <p className="text-white">{profile.bio || 'Aucune bio définie'}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Zone de mobilité (km)</label>
            {isEditing ? (
              <Input
                type="number"
                value={formData.mobilityZone?.radius || ''}
                onChange={(e) => onFormDataChange({ mobilityZone: { ...formData.mobilityZone, radius: Number(e.target.value) } })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            ) : (
              <p className="text-white">{profile.mobilityZone?.radius} km</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Niveau d'expérience</label>
            {isEditing ? (
              <Select 
                value={formData.experienceLevel || ''} 
                onValueChange={(value: 'debutant' | 'intermediaire' | 'expert') => onFormDataChange({ experienceLevel: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="debutant">Débutant</SelectItem>
                  <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-white capitalize">{profile.experienceLevel}</p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Genres pratiqués</label>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {genres.map(genre => (
                <label key={genre} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.genres?.includes(genre) || false}
                    onChange={(e) => handleGenreChange(genre, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-300 capitalize">{genre}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.genres?.map(genre => (
                <Badge key={genre} variant="secondary" className="bg-pink-500/20 text-pink-400">
                  {genre}
                </Badge>
              )) || <span className="text-gray-400">Aucun genre défini</span>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default HumoristeProfileCard;
