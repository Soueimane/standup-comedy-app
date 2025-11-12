
import React from 'react';
import { motion } from 'framer-motion';
import { User, Star, MapPin, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventApplicationsListProps {
  eventId: string;
}

const EventApplicationsList: React.FC<EventApplicationsListProps> = ({ eventId }) => {
  const { getEventById, getApplicationsByEvent, getUserById, updateApplicationStatus } = useData();

  const event = getEventById(eventId);
  const applications = getApplicationsByEvent(eventId);

  if (!event) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          Événement non trouvé
        </h3>
      </div>
    );
  }

  const handleStatusUpdate = (applicationId: string, status: 'accepted' | 'rejected') => {
    updateApplicationStatus(applicationId, status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'viewed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
        <div className="flex items-center space-x-4 text-gray-400">
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>{event.venue}</span>
          </div>
          <div>{new Date(event.date).toLocaleDateString('fr-FR')}</div>
          <div>{event.startTime}</div>
        </div>
        <div className="mt-4">
          <span className="text-sm text-gray-400">
            {applications.length} candidature{applications.length !== 1 ? 's' : ''} reçue{applications.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              Aucune candidature
            </h3>
            <p className="text-gray-500">
              Les humoristes intéressés apparaîtront ici
            </p>
          </Card>
        ) : (
          applications.map((application, index) => {
            const humoriste = getUserById(application.humoristId);
            
            if (!humoriste) return null;

            return (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 bg-gray-800/50 border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                          {humoriste.firstName[0]}{humoriste.lastName[0]}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {humoriste.userType === 'humoriste' && 'stageName' in humoriste.profile && humoriste.profile.stageName
                              ? humoriste.profile.stageName
                              : `${humoriste.firstName} ${humoriste.lastName}`}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {humoriste.firstName} {humoriste.lastName} • {humoriste.profile.city}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusBadge(application.status)}`}>
                          {application.status === 'accepted' ? 'Accepté' :
                           application.status === 'rejected' ? 'Refusé' :
                           application.status === 'viewed' ? 'Vu' : 'En attente'}
                        </div>
                      </div>

                      {/* Bio/Description */}
                      {humoriste.userType === 'humoriste' && 'bio' in humoriste.profile && humoriste.profile.bio && (
                        <p className="text-gray-400 text-sm mb-4">{humoriste.profile.bio}</p>
                      )}

                      {/* Application Message */}
                      {application.message && (
                        <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                          <p className="text-gray-300 text-sm italic">"{application.message}"</p>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Candidature reçue le {new Date(application.appliedAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {application.status === 'pending' && (
                    <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-700">
                      <Button
                        onClick={() => handleStatusUpdate(application.id, 'accepted')}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accepter
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventApplicationsList;
