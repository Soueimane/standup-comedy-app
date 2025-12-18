
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Euro, Users, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ApplyToEventModal from './ApplyToEventModal';

const EventsNearMe: React.FC = () => {
  const { user } = useAuth();
  const { getAvailableEvents } = useData();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  if (!user) return null;

  const availableEvents = getAvailableEvents(user.id, user.profile.city);

  const handleApply = (eventId: string) => {
    setSelectedEvent(eventId);
    setShowApplyModal(true);
  };

  const getEventTypeEmoji = (type: string) => {
    const emojis = {
      'open-mic': '🎤',
      'show': '🎭',
      'private': '🏢',
      'festival': '🎪'
    };
    return emojis[type as keyof typeof emojis] || '🎤';
  };

  const getEventTypeName = (type: string) => {
    const names = {
      'open-mic': 'Open Mic',
      'show': 'Spectacle',
      'private': 'Évènement privé',
      'festival': 'Festival'
    };
    return names[type as keyof typeof names] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Opportunités près de toi</h2>
          <p className="text-gray-400">
            {availableEvents.length} évènement{availableEvents.length !== 1 ? 's' : ''} disponible{availableEvents.length !== 1 ? 's' : ''} dans ta zone
          </p>
        </div>
      </div>

      {/* Events Grid */}
      {availableEvents.length === 0 ? (
        <Card className="p-12 bg-gray-800/50 border-gray-700 text-center">
          <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Aucun évènement disponible
          </h3>
          <p className="text-gray-500">
            Nouveaux évènements bientôt disponibles dans ta zone.
            <br />
            Nous t'enverrons une notification dès qu'il y en aura !
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all group">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{getEventTypeEmoji(event.eventType)}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {getEventTypeName(event.eventType)} • {event.organizerName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">{event.fee}€</div>
                    <div className="text-xs text-gray-400">par passage</div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{new Date(event.date).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-pink-400" />
                    <span>{event.venue}, {event.city}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>
                      {event.applications.length}/{event.maxPerformers} place{event.maxPerformers !== 1 ? 's' : ''} prise{event.maxPerformers !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                {/* Requirements */}
                {event.requirements && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                    <p className="text-yellow-300 text-sm">
                      <strong>Exigences :</strong> {event.requirements}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400 font-medium">
                      Places disponibles
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => handleApply(event.id)}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    disabled={event.withdrawnComedians?.includes(user?.id || '')}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {event.withdrawnComedians?.includes(user?.id || '') ? 'Candidature fermée' : 'Candidater'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedEvent && (
        <ApplyToEventModal
          isOpen={showApplyModal}
          eventId={selectedEvent}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default EventsNearMe;
