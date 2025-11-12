import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { HumoristeProfile } from '@/types/auth';

interface AvailabilityCardProps {
  profile: HumoristeProfile;
  isEditing: boolean;
  formData: HumoristeProfile;
  onFormDataChange: (data: Partial<HumoristeProfile>) => void;
}

const AvailabilityCard: React.FC<AvailabilityCardProps> = ({
  profile,
  isEditing,
  formData,
  onFormDataChange
}) => {
  const availabilityOptions = [
    { key: 'weekdays', label: 'Semaine (Lun-Jeu)' },
    { key: 'weekends', label: 'Week-end (Ven-Dim)' },
  ];

  const handleAvailabilityChange = (key: string, checked: boolean) => {
    onFormDataChange({
      availability: { ...formData.availability, [key]: checked }
    });
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Calendar className="w-5 h-5 mr-2" />
        Disponibilités
      </h2>
      
      <div className="space-y-4">
        {availabilityOptions.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-white">{label}</span>
            {isEditing ? (
              <Switch
                checked={formData.availability?.[key as keyof HumoristeProfile['availability']] || false}
                onCheckedChange={(checked) => handleAvailabilityChange(key, checked)}
              />
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs ${
                profile.availability?.[key as keyof HumoristeProfile['availability']]
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {profile.availability?.[key as keyof HumoristeProfile['availability']] ? 'Disponible' : 'Non disponible'}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AvailabilityCard;
