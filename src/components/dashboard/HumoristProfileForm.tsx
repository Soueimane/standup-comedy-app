import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HumoristeProfile } from '@/types/auth';

export const HumoristProfileForm: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState<HumoristeProfile>({
    stageName: '',
    bio: '',
    genres: [],
    socialLinks: {
      instagram: '',
      tiktok: ''
    },
    location: {
      city: '',
      postalCode: '',
      address: undefined,
      latitude: undefined,
      longitude: undefined
    },
    mobilityZone: {
      radius: 30,
      preferredCities: []
    },
    experienceLevel: 'debutant',
    availability: {
      weekdays: false,
      weekends: false,
      evenings: false
    },
    phone: undefined,
  });

  useEffect(() => {
    if (user?.profile) {
      setFormData(user.profile as HumoristeProfile);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'mobilityZone') {
        setFormData(prev => ({
          ...prev,
          mobilityZone: {
            ...prev.mobilityZone,
            [child]: value
          }
        }));
      } else if (parent === 'socialLinks') {
        setFormData(prev => ({
          ...prev,
          socialLinks: {
            ...prev.socialLinks,
            [child]: value
          }
        }));
      } else if (parent === 'availability') {
        setFormData(prev => ({
          ...prev,
          availability: {
            ...prev.availability,
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name as keyof HumoristeProfile]: value
      }));
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await updateProfile(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Mon Profil Humoriste</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="space-y-4">
          <div>
            <label htmlFor="stageName" className="block text-sm font-medium text-gray-700">
              Nom de scène
            </label>
            <input
              type="text"
              id="stageName"
              name="stageName"
              value={formData.stageName || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Biographie
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio || ''}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700">
              Niveau d'expérience
            </label>
            <select
              id="experienceLevel"
              name="experienceLevel"
              value={formData.experienceLevel}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        {/* Localisation et zone de mobilité */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
          
          <div>
            <label htmlFor="location.address" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              id="location.address"
              name="address"
              value={formData.location.address || ''}
              onChange={handleLocationChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="location.postalCode" className="block text-sm font-medium text-gray-700">
              Code postal
            </label>
            <input
              type="text"
              id="location.postalCode"
              name="postalCode"
              value={formData.location.postalCode || ''}
              onChange={handleLocationChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="location.city" className="block text-sm font-medium text-gray-700">
              Ville
            </label>
            <input
              type="text"
              id="location.city"
              name="city"
              value={formData.location.city || ''}
              onChange={handleLocationChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="mobilityZone.radius" className="block text-sm font-medium text-gray-700">
              Zone de mobilité (km)
            </label>
            <input
              type="number"
              id="mobilityZone.radius"
              name="mobilityZone.radius"
              value={formData.mobilityZone.radius}
              onChange={handleChange}
              min="0"
              max="1000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Rayon maximum en kilomètres autour de votre localisation pour accepter des événements
            </p>
          </div>
        </div>

        {/* Disponibilités */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Disponibilités</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="availability.weekdays"
                  checked={formData.availability.weekdays}
                  onChange={(e) => handleChange({
                    target: { name: 'availability.weekdays', value: e.target.checked }
                  } as any)}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">En semaine</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="availability.weekends"
                  checked={formData.availability.weekends}
                  onChange={(e) => handleChange({
                    target: { name: 'availability.weekends', value: e.target.checked }
                  } as any)}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Weekends</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="availability.evenings"
                  checked={formData.availability.evenings}
                  onChange={(e) => handleChange({
                    target: { name: 'availability.evenings', value: e.target.checked }
                  } as any)}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Soirées</span>
              </label>
            </div>
          </div>
        </div>

        {/* Réseaux sociaux */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Réseaux sociaux</h3>
          
          <div>
            <label htmlFor="socialLinks.instagram" className="block text-sm font-medium text-gray-700">
              Instagram
            </label>
            <input
              type="url"
              id="socialLinks.instagram"
              name="socialLinks.instagram"
              value={formData.socialLinks?.instagram || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="socialLinks.tiktok" className="block text-sm font-medium text-gray-700">
              TikTok
            </label>
            <input
              type="url"
              id="socialLinks.tiktok"
              name="socialLinks.tiktok"
              value={formData.socialLinks?.tiktok || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}; 