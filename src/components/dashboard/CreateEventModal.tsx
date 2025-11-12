import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Clock, Euro, Users } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const { createEvent } = useData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    location: {
      city: '',
    address: '',
    },
    date: '',
    startTime: '',
    endTime: '',
    fee: '',
    maxPerformers: '',
    requirements: '',
    eventType: 'open-mic' as 'open-mic' | 'show' | 'private' | 'festival'
  });

  const handleLocationChange = (field: 'city' | 'address', value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      fee: Number(formData.fee),
      maxPerformers: Number(formData.maxPerformers),
      status: 'published' as const
    };

    createEvent(eventData);
    onClose();
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      venue: '',
      location: {
        city: '',
      address: '',
      },
      date: '',
      startTime: '',
      endTime: '',
      fee: '',
      maxPerformers: '',
      requirements: '',
      eventType: 'open-mic'
    });
  };

  const eventTypes = [
    { value: 'open-mic', label: 'Open Mic', emoji: '🎤' },
    { value: 'show', label: 'Spectacle', emoji: '🎭' },
    { value: 'private', label: 'Événement privé', emoji: '🏢' },
    { value: 'festival', label: 'Festival', emoji: '🎪' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-gray-900 rounded-2xl border border-gray-700 m-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Créer un événement</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Event Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Type d'événement
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {eventTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, eventType: type.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.eventType === type.value
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Titre de l'événement
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="ex: Soirée Open Mic du Jeudi"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez votre événement..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Lieu
                  </label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="ex: Le Comedy Club"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ville
                  </label>
                  <Input
                    value={formData.location.city}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    placeholder="ex: Paris"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Adresse
                </label>
                <Input
                  value={formData.location.address}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  placeholder="ex: 15 rue de la Gaîté, 75014 Paris"
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Début
                  </label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fin
                  </label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Cachet (€)
                  </label>
                  <Input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                    placeholder="ex: 50"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Nb max d'humoristes
                  </label>
                  <Input
                    type="number"
                    value={formData.maxPerformers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPerformers: e.target.value }))}
                    placeholder="ex: 8"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exigences particulières
                </label>
                <Input
                  value={formData.requirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="ex: Maximum 7 minutes par passage"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  Créer l'événement
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateEventModal;
