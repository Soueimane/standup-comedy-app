import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event, Application } from '@/types/events';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const statusLabels = {
  pending: 'En attente',
  accepted: 'Validé',
  rejected: 'Refusé',
};

const MyApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const { events } = useEvents();
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('all');

  if (!user) return null;

  // Toast en fonction de la réponse via email (?update=kept|withdrawn)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const update = params.get('update');
    if (update === 'kept') {
      toast({ title: 'Confirmation prise en compte', description: "Vous restez inscrit à l'événement.", duration: 6000 });
    } else if (update === 'withdrawn') {
      toast({ title: 'Désinscription confirmée', description: "Votre candidature a été retirée de l'événement.", duration: 6000 });
    }
  }, [location.search]);

  const myApplications = events.flatMap(event =>
    event.applications
      .filter(app => app.humoristId === user.id)
      .map(app => ({
        ...app,
        eventTitle: event.title,
        eventCity: event.location?.city,
        eventVenue: event.venue,
        eventDate: event.date,
        eventStartTime: event.startTime,
        eventEndTime: event.endTime,
        eventFee: event.fee || event.budget.min,
      }))
  );

  const filteredApplications = filter === 'all' 
    ? myApplications 
    : myApplications.filter(app => app.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const renderApplicationCard = (application: Application & {
    eventTitle: string;
    eventCity: string;
    eventVenue: string;
    eventDate: string;
    eventStartTime: string;
    eventEndTime: string;
    eventFee: number;
  }, index: number) => {
    return (
      <motion.div
        key={application.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">{application.eventTitle}</h3>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(application.status)}
              <Badge className={`${getStatusColor(application.status)} border`}>
                {statusLabels[application.status]}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{new Date(application.eventDate).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Clock className="w-4 h-4 mr-2" />
                <span>{application.eventStartTime} - {application.eventEndTime}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{application.eventVenue}, {application.eventCity}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-400">
                <span className="font-medium">Cachet:</span> 
                <span className="text-green-400 font-bold ml-2">{application.eventFee}€</span>
              </div>
              <div className="text-sm text-gray-400">
                <span className="font-medium">Candidature envoyée:</span>
                <div className="text-gray-300">{new Date(application.appliedAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>

          {application.message && (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Mon message:</h4>
              <p className="text-gray-400 text-sm">{application.message}</p>
            </div>
          )}

          {application.organizerMessage && (
            <div className="bg-blue-700/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-300 mb-2">Message de l'Organisateur:</h4>
              <p className="text-blue-200 text-sm">{application.organizerMessage}</p>
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Mes candidatures</h1>
          <p className="text-gray-400">Suivi de toutes tes candidatures aux événements</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-pink-500">
              Toutes ({myApplications.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500">
              En attente ({myApplications.filter(app => app.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="data-[state=active]:bg-green-500">
              Acceptées ({myApplications.filter(app => app.status === 'accepted').length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500">
              Refusées ({myApplications.filter(app => app.status === 'rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {myApplications.length === 0 ? (
              <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
                <ClockIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucune candidature</h3>
                <p className="text-gray-500">Commence par candidater à des événements !</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application, index) => renderApplicationCard(application, index))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            <div className="space-y-4">
              {myApplications.filter(app => app.status === 'pending').map((application, index) => renderApplicationCard(application, index))}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4 mt-6">
            <div className="space-y-4">
              {myApplications.filter(app => app.status === 'accepted').map((application, index) => renderApplicationCard(application, index))}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            <div className="space-y-4">
              {myApplications.filter(app => app.status === 'rejected').map((application, index) => renderApplicationCard(application, index))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyApplicationsPage;
