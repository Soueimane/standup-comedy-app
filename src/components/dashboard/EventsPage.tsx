import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Euro, ListChecks, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { HumoristeProfile } from '@/types/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const EventsPage: React.FC = () => {
  console.log('🚨🚨🚨 EVENTSPAGE IS LOADING 🚨🚨🚨');
  console.log('🔥 EventsPage component started!');
  
  const { user } = useAuth();
  const { getAvailableEvents, getApplicationsByHumorist, events, applyToEvent, isLoading, error } = useData();
  const [selectedCity, setSelectedCity] = useState<string>('all');

  console.log('🎭 EventsPage - Component loaded!');
  console.log('🎭 EventsPage - User:', user);
  console.log('🎭 EventsPage - User ID:', user?.id);
  console.log('🎭 EventsPage - User role:', (user as any)?.role);
  console.log('🎭 EventsPage - isLoading:', isLoading);
  console.log('🎭 EventsPage - error:', error);

  // Récupérer TOUS les évènements disponibles ET les candidatures de l'humoriste
  const availableEvents = user ? getAvailableEvents(user.id, (user.profile as HumoristeProfile).location?.city) : [];
  const myApplications = user ? getApplicationsByHumorist(user.id) : [];
  
  console.log('🎭 EventsPage - Available events:', availableEvents);
  console.log('🎭 EventsPage - My applications:', myApplications);
  
  // Récupérer les évènements liés aux candidatures de l'humoriste
  const eventsFromApplications = myApplications
    .map(app => events.find(event => event.id === app.eventId))
    .filter(event => event !== undefined);
  
  console.log('🎭 EventsPage - Events from applications:', eventsFromApplications);
  
  // Combiner tous les évènements (disponibles + ceux où on a postulé) sans doublons
  const allEventsMap = new Map();
  [...availableEvents, ...eventsFromApplications].forEach(event => {
    if (event) {
      allEventsMap.set(event.id, event);
    }
  });
  const allEvents = Array.from(allEventsMap.values());
  
  console.log('🎭 EventsPage - All combined events:', allEvents);
  console.log('🎭 EventsPage - All combined events count:', allEvents.length);

  // Séparer les évènements par date
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const upcomingEvents = allEvents.filter(event => {
    const eventDate = new Date(event.date);
    const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return eventMidnight >= todayMidnight;
  });
  
  const archivedEvents = allEvents.filter(event => {
    const eventDate = new Date(event.date);
    const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return eventMidnight < todayMidnight;
  });

  console.log(`🎯 CLASSIFICATION DES ÉVÈNEMENTS:`);
  console.log(`   • Évènements à venir: ${upcomingEvents.length}`);
  console.log(`   • Évènements archivés: ${archivedEvents.length}`);
  
  // Debug détaillé des évènements
  console.log('🔍 ÉVÈNEMENTS ARCHIVÉS DÉTAIL:');
  archivedEvents.forEach(event => {
    const hasApplied = event.applications?.some(app => app.humoristId === user?.id);
    console.log(`   - "${event.title}" (${new Date(event.date).toLocaleDateString('fr-FR')}) - A postulé: ${hasApplied}`);
    console.log(`     Applications:`, event.applications);
  });

  // Filtrer les évènements selon la ville et l'onglet sélectionné
  const filteredUpcomingEvents = upcomingEvents.filter(event => {
    const cityMatch = selectedCity === 'all' || event.location.city?.toLowerCase() === selectedCity.toLowerCase();
    const hasApplied = event.applications?.some(app => app.humoristId === user?.id);
    return cityMatch && !hasApplied; // Ne montrer que les évènements où l'humoriste n'a pas encore postulé
  });

  const filteredArchivedEvents = archivedEvents.filter(event => {
    const cityMatch = selectedCity === 'all' || event.location.city?.toLowerCase() === selectedCity.toLowerCase();
    const myApplication = myApplications.find(app => app.eventId === event.id);
    // Montrer les évènements archivés où l'humoriste a postulé OU tous les évènements archivés
    return cityMatch && myApplication; // Montrer seulement les évènements où l'humoriste a postulé
  });

  // Récupérer la liste unique des villes des évènements disponibles
  const cities = Array.from(new Set(
    allEvents
      .map(event => event.location.city)
      .filter((city): city is string => typeof city === 'string' && city.trim() !== '')
  ));

  // Debug logs pour voir les villes et la sélection actuelle
  console.log('Debug - Cities for SelectItems:', cities);
  console.log('Debug - Current selectedCity:', selectedCity);

  const handleApply = async (eventId: string) => {
    if (!user) return;
    try {
      await applyToEvent(eventId, user.id, 'Je souhaite postuler à cet évènement.');
    } catch (error) {
      console.error('Erreur lors de la candidature:', error);
      alert('Une erreur est survenue lors de l\'envoi de votre candidature.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p>Chargement des évènements...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
      
      {/* DEBUG : Élément visible pour confirmer que le composant se charge */}
      <div className="bg-red-500 text-white p-4 text-center font-bold">
        🔥 EVENTSPAGE EST CHARGÉE - DEBUG 🔥
      </div>
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Évènements disponibles</h1>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedCity}
            onValueChange={setSelectedCity}
          >
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filtrer par ville" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city} className="text-white">
                  {city}
                </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

        {/* Section Évènements à venir */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Évènements à venir</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcomingEvents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Aucun évènement à venir
              </h3>
              <p className="text-gray-500">
                {selectedCity && selectedCity !== 'all'
                  ? `Aucun évènement à venir dans la ville de ${selectedCity}`
                  : 'Aucun évènement à venir pour le moment'}
              </p>
              </div>
            ) : (
              filteredUpcomingEvents.map((event) => (
            <Card key={event.id} className="p-6 bg-gray-800/50 border-gray-700">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                  <p className="text-gray-400">{event.description}</p>
                </div>

                  <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" /> {event.venue}, {event.location.city}</p>
                  {event.location.address && (
                    <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" /> Adresse: {event.location.address}</p>
                    )}
                    <p className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-500" /> {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : 'Date non spécifiée'}</p>
                    <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-500" /> {event.startTime || 'Heure non spécifiée'} {event.endTime ? ` - ${event.endTime}` : ''}</p>
                    <p className="flex items-center"><Euro className="w-4 h-4 mr-2 text-gray-500" /> Cachet: {event.budget?.max !== undefined ? `${event.budget.max}€` : 'Non spécifié'}</p>
                    {event.requirements?.maxPerformers !== undefined && event.requirements.maxPerformers > 0 && (
                      <p className="flex items-center"><Users className="w-4 h-4 mr-2 text-gray-500" /> Places humoristes: {event.applications?.filter(app => app.status === 'accepted').length || 0} / {event.requirements.maxPerformers}</p>
                    )}
                    {event.eventType && (
                      <p className="flex items-center"><Tag className="w-4 h-4 mr-2 text-gray-500" /> Type: {event.eventType}</p>
                    )}
                    {event.requirements && (
                      <p className="flex items-center"><ListChecks className="w-4 h-4 mr-2 text-gray-500" /> Durée: {event.requirements.duration}min</p>
                    )}
                </div>

                <div className="mt-6">
                  <Button
                    onClick={() => handleApply(event.id)}
                    className="w-full bg-pink-500 hover:bg-pink-600"
                    disabled={
                      // Évènement avec statut fermé
                      ['full', 'completed', 'cancelled'].includes(event.status) ||
                      // Déjà candidaté
                      event.applications?.some(app => app.humoristId === user?.id) || 
                      // Nombre max de performers atteint
                      (event.requirements?.maxPerformers !== undefined && (event.applications?.filter(app => app.status === 'accepted').length || 0) >= event.requirements.maxPerformers) ||
                      // Humoriste s'est déjà désinscrit de cet évènement
                      event.withdrawnComedians?.includes(user?.id || '')
                    }
                  >
                    {['full', 'completed', 'cancelled'].includes(event.status)
                      ? event.status === 'full' 
                        ? 'Évènement complet' 
                        : event.status === 'completed'
                        ? 'Évènement terminé'
                        : 'Évènement annulé'
                      : event.applications?.some(app => app.humoristId === user?.id)
                      ? 'Déjà candidaté'
                      : event.requirements?.maxPerformers !== undefined && (event.applications?.filter(app => app.status === 'accepted').length || 0) >= event.requirements.maxPerformers
                        ? 'Places épuisées'
                        : event.withdrawnComedians?.includes(user?.id || '')
                        ? 'Candidature fermée'
                        : 'Postuler'
                    }
                  </Button>
                </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Section Évènements archivés */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Évènements archivés</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArchivedEvents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              Aucun évènement archivé
            </h3>
            <p className="text-gray-500">
              {selectedCity && selectedCity !== 'all'
                ? `Aucun évènement archivé dans la ville de ${selectedCity}`
                : 'Aucun évènement archivé pour le moment'}
            </p>
            </div>
          ) : (
            filteredArchivedEvents.map((event) => (
            <Card key={event.id} className="p-6 bg-gray-800/30 border-gray-700 opacity-80">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                  <p className="text-gray-400">{event.description}</p>
                </div>

                  <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" /> {event.venue}, {event.location.city}</p>
                  {event.location.address && (
                    <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" /> Adresse: {event.location.address}</p>
                    )}
                    <p className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-500" /> {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : 'Date non spécifiée'}</p>
                    <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-500" /> {event.startTime || 'Heure non spécifiée'} {event.endTime ? ` - ${event.endTime}` : ''}</p>
                    <p className="flex items-center"><Euro className="w-4 h-4 mr-2 text-gray-500" /> Cachet: {event.budget?.max !== undefined ? `${event.budget.max}€` : 'Non spécifié'}</p>
                    {event.requirements?.maxPerformers !== undefined && event.requirements.maxPerformers > 0 && (
                      <p className="flex items-center"><Users className="w-4 h-4 mr-2 text-gray-500" /> Places humoristes: {event.applications?.filter(app => app.status === 'accepted').length || 0} / {event.requirements.maxPerformers}</p>
                    )}
                    {event.eventType && (
                      <p className="flex items-center"><Tag className="w-4 h-4 mr-2 text-gray-500" /> Type: {event.eventType}</p>
                    )}
                    {event.requirements && (
                      <p className="flex items-center"><Tag className="w-4 h-4 mr-2 text-gray-500" /> Statut: Évènement passé</p>
                    )}
                </div>

                                 <div className="mt-6">
                   {(() => {
                     const myApplication = myApplications.find(app => app.eventId === event.id);
                     if (myApplication) {
                       let buttonText = 'Candidature envoyée';
                       let buttonColor = 'bg-yellow-600';
                       
                       if (myApplication.status === 'accepted') {
                         buttonText = 'Candidature acceptée';
                         buttonColor = 'bg-green-600';
                       } else if (myApplication.status === 'rejected') {
                         buttonText = 'Candidature refusée';
                         buttonColor = 'bg-red-600';
                       }
                       
                       return (
                         <Button
                           className={`w-full ${buttonColor} cursor-not-allowed`}
                           disabled={true}
                         >
                           {buttonText}
                         </Button>
                       );
                     }
                     
                     return (
                       <Button
                         className="w-full bg-gray-600 cursor-not-allowed"
                         disabled={true}
                       >
                         Évènement passé
                       </Button>
                     );
                   })()}
                 </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 