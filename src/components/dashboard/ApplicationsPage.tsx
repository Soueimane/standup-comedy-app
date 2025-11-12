import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, Navigation, Loader2, Euro } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import ResponseMessageModal from './ResponseMessageModal';
import type { Application } from '@/types/events';
import type { HumoristeProfile } from '@/types/auth';

const statusLabels = {
  pending: 'En attente',
  viewed: 'Vue',
  accepted: 'Validé',
  rejected: 'Refusé',
};

export const ApplicationsPage = () => {
  const { user, isAuthenticated, isOrganisateur } = useAuth();
  const { events, getUserById, isLoading, error, updateApplicationStatus } = useData();
  
  // État pour la modal de message
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    applicationId: string;
    action: 'accepted' | 'rejected';
    humoristName: string;
    eventTitle: string;
  }>({
    isOpen: false,
    applicationId: '',
    action: 'accepted',
    humoristName: '',
    eventTitle: ''
  });

  useEffect(() => {
    console.log('=== INFORMATIONS DE DÉBOGAGE APPLICATIONS PAGE ===');
    console.log('Utilisateur:', user);
    console.log('ID Utilisateur:', user?.id);
    console.log('Type d\'utilisateur:', user?.userType);
    console.log('Est authentifié:', isAuthenticated);
    console.log('Est organisateur:', isOrganisateur);
    console.log('Événements chargés dans ApplicationsPage:', events);
    console.log('Nombre d\'événements chargés:', events?.length);
    if (events && events.length > 0) {
      console.log('IDs des organisateurs:', events.map(e => e?.organizerId));
    }
    console.log('Chargement:', isLoading);
    console.log('Erreur:', error);
  }, [user, isAuthenticated, isOrganisateur, events, isLoading, error]);

  // Afficher un toast si l'URL contient ?update=kept|withdrawn
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

  // Vérification de l'authentification
  if (!isAuthenticated || !user) {
    console.log('Non authentifié');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Vous devez être connecté</p>
          <p className="text-gray-400">Veuillez vous connecter pour accéder à cette page</p>
        </div>
      </div>
    );
  }

  // Vérification du type d'utilisateur
  if (!isOrganisateur) {
    console.log('Pas un organisateur');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Accès non autorisé</p>
          <p className="text-gray-400">Cette page est réservée aux organisateurs</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p>Chargement des candidatures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Une erreur est survenue</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Vérification des événements
  if (!events || events.length === 0) {
    console.log('Aucun événement trouvé');
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Candidatures reçues</h1>
            <p className="text-gray-400">Gérez les candidatures pour vos événements</p>
          </div>
          <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucun événement</h3>
            <p className="text-gray-500">Créez un événement pour recevoir des candidatures</p>
          </Card>
        </div>
      </div>
    );
  }

  // Récupérer toutes les candidatures pour les événements de l'organisateur
  const myEvents = events.filter(e => e?.organizerId === user.id);
  console.log('Mes événements:', myEvents);

  if (myEvents.length === 0) {
    console.log('Aucun événement pour cet organisateur');
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Candidatures reçues</h1>
            <p className="text-gray-400">Gérez les candidatures pour vos événements</p>
          </div>
          <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucun événement</h3>
            <p className="text-gray-500">Créez un événement pour recevoir des candidatures</p>
          </Card>
        </div>
      </div>
    );
  }

  const allApplications = myEvents.flatMap(event => {
    if (!event?.applications) return [];
    return event.applications.map(app => ({
      ...app,
      eventTitle: event.title || 'Sans titre',
      eventId: event.id,
      eventDate: event.date,
      eventVenue: event.venue || 'Lieu non spécifié',
      eventCity: event.location.city || 'Ville non spécifiée',
      eventTime: event.startTime || 'Horaire non spécifié',
      eventFee: event.budget?.max || 0,
    }));
  });

  console.log('Toutes les candidatures (après mappage dans ApplicationsPage):', allApplications);

  if (!allApplications || allApplications.length === 0) {
    console.log('Aucune candidature trouvée après traitement');
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Candidatures reçues</h1>
            <p className="text-gray-400">Gérez les candidatures pour vos événements</p>
          </div>
          <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucune candidature</h3>
            <p className="text-gray-500">Les candidatures apparaîtront ici</p>
          </Card>
        </div>
      </div>
    );
  }

  const handleStatusClick = (
    applicationId: string, 
    status: 'accepted' | 'rejected', 
    humoristName: string, 
    eventTitle: string
  ) => {
    setModalState({
      isOpen: true,
      applicationId,
      action: status,
      humoristName,
      eventTitle
    });
  };

  const handleConfirmStatus = async (message: string) => {
    if (!modalState.applicationId) return;
    try {
      // Passer le message de l'organisateur à la fonction de mise à jour
      await updateApplicationStatus(modalState.applicationId, modalState.action, message);
      setModalState({
        isOpen: false,
        applicationId: '',
        action: 'accepted',
        humoristName: '',
        eventTitle: ''
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      applicationId: '',
      action: 'accepted',
      humoristName: '',
      eventTitle: ''
    });
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

  const renderApplicationCard = (app: Application & {
    eventTitle: string;
    eventId: string;
    eventDate: string;
    eventVenue: string;
    eventCity: string;
    eventTime: string;
    eventFee: number;
  }, index: number) => {
    if (!app) return null;

    try {
      const humorist = getUserById(app.humoristId);
      console.log('Débogage - Humoriste pour la candidature:', app.id, humorist);

      if (!humorist) {
        console.warn(`Humoriste non trouvé pour l'ID: ${app.humoristId}`);
        return null;
      }

      const humoristProfile = humorist.profile as HumoristeProfile;
      const displayName = humoristProfile?.stageName || 
                         (humorist?.firstName && humorist?.lastName ? `${humorist.firstName} ${humorist.lastName}` : null) ||
                         app.stageName || 
                         app.humoristName || 
                         "Anonyme";
      
      const initial = displayName?.[0] || "?";
      const mobilityZoneDisplay = humoristProfile?.mobilityZone && humoristProfile.mobilityZone.radius ? `${humoristProfile.mobilityZone.radius} km` : "Non spécifiée";
      const eventDate = app.eventDate ? new Date(app.eventDate).toLocaleDateString('fr-FR') : 'Date non spécifiée';
      const appliedDate = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR') : 'Date non spécifiée';

      return (
        <motion.div
          key={app.id}
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
                    {initial}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                    <p className="text-gray-400 text-sm">
                      {humorist.firstName} {humorist.lastName} • {humoristProfile?.location?.city}
                    </p>
                    <p className="text-sm text-gray-400">{humorist.email}</p>
                      <p className="text-sm text-gray-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3.28-3.28c-1.5-1.5-2.3-3.37-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      Numéro de téléphone: {humoristProfile?.phone || 'Non spécifié'}
                      </p>
                  </div>

                  {/* Status Badge */}
                  <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusBadge(app.status)}`}>
                    {app.status === 'accepted' ? 'Accepté' :
                     app.status === 'rejected' ? 'Refusé' :
                     app.status === 'viewed' ? 'Vu' : 'En attente'}
                  </div>
                </div>

                {/* Bio */}
                {humoristProfile?.bio && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">Bio</h4>
                    <p className="text-gray-400 text-sm">{humoristProfile.bio}</p>
                    </div>
                )}

                {/* Genres pratiqués */}
                {humoristProfile?.genres && humoristProfile.genres.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">Genres pratiqués</h4>
                    <div className="flex flex-wrap gap-2">
                      {humoristProfile.genres.map(genre => (
                        <span key={genre} className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Informations complémentaires */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-400">
                      <Navigation className="w-4 h-4 mr-2" />
                      <span>Zone de mobilité: {mobilityZoneDisplay}</span>
                    </div>
                    {humoristProfile?.experienceLevel && (
                      <div className="flex items-center text-sm text-gray-400">
                        <User className="w-4 h-4 mr-2" />
                        <span>Niveau: {humoristProfile.experienceLevel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{eventDate}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{app.eventTime}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{app.eventVenue}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-400">
                    <Euro className="w-4 h-4" />
                    <span className="text-sm font-medium">{app.eventFee}€</span>
                  </div>
                </div>

                {/* Application Message */}
                {app.message && (
                  <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-1">Message de l'Humoriste</h4>
                    <p className="text-gray-300 text-sm italic">"{app.message}"</p>
                  </div>
                )}

                {/* Organizer Message */}
                {app.organizerMessage && (
                  <div className="bg-blue-700/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-blue-300 mb-1">Message de l'Organisateur</h4>
                    <p className="text-blue-200 text-sm">"{app.organizerMessage}"</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Candidature reçue le {appliedDate}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              {app.status === 'pending' && (
                <>
                  <Button
                    onClick={() => handleStatusClick(app.id, 'accepted', displayName, app.eventTitle)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider
                  </Button>
                  <Button
                    onClick={() => handleStatusClick(app.id, 'rejected', displayName, app.eventTitle)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      );
    } catch (error) {
      console.error('Erreur lors du rendu de la candidature:', error);
      return null;
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Candidatures reçues</h1>
          <p className="text-gray-400">Gérez les candidatures pour vos événements</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-pink-500">
              Toutes ({allApplications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500">
              En attente ({allApplications?.filter(app => app?.status === 'pending').length || 0})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="data-[state=active]:bg-green-500">
              Acceptées ({allApplications?.filter(app => app?.status === 'accepted').length || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500">
              Refusées ({allApplications?.filter(app => app?.status === 'rejected').length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            <div className="space-y-4">
              {allApplications.map((app, index) => renderApplicationCard(app, index))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            <div className="space-y-4">
              {allApplications?.filter(app => app?.status === 'pending').map((app, index) => renderApplicationCard(app, index))}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4 mt-6">
            <div className="space-y-4">
              {allApplications?.filter(app => app?.status === 'accepted').map((app, index) => renderApplicationCard(app, index))}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            <div className="space-y-4">
              {allApplications?.filter(app => app?.status === 'rejected').map((app, index) => renderApplicationCard(app, index))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal de réponse */}
      <ResponseMessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmStatus}
        action={modalState.action}
        humoristName={modalState.humoristName}
        eventTitle={modalState.eventTitle}
      />
    </div>
  );
}; 