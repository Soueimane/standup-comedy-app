
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Euro, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ApplicationsStatus: React.FC = () => {
  const { user } = useAuth();
  const { getApplicationsByHumorist, getEventById } = useData();

  if (!user) return null;

  const applications = getApplicationsByHumorist(user.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'viewed':
        return <Eye className="w-5 h-5 text-blue-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Acceptée';
      case 'rejected':
        return 'Refusée';
      case 'viewed':
        return 'Vue';
      default:
        return 'En attente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'rejected':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'viewed':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          Aucune candidature
        </h3>
        <p className="text-gray-500">
          Commence par candidater à des événements pour voir tes candidatures ici !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Mes candidatures</h2>
        <div className="text-sm text-gray-400">
          {applications.length} candidature{applications.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {applications.map((application, index) => {
          const event = getEventById(application.eventId);
          
          if (!event) return null;

          return (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="text-sm font-medium">{getStatusText(application.status)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{event.startTime}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{event.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-green-400">
                        <Euro className="w-4 h-4" />
                        <span className="text-sm font-medium">{event.fee}€</span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-500">
                      Candidature envoyée le {new Date(application.appliedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <div className="ml-4">
                    {application.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationsStatus;
