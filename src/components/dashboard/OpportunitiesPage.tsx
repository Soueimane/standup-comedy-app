
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Euro, Users, Filter, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ApplyToEventModal from './ApplyToEventModal';

const OpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const { getAvailableEvents } = useData();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');

  if (!user) return null;

  const availableEvents = getAvailableEvents(user.id);
  
  // Filtres
  const filteredEvents = availableEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === 'all' || event.city === cityFilter;
    const matchesFee = feeFilter === 'all' || 
                      (feeFilter === 'low' && event.fee < 100) ||
                      (feeFilter === 'medium' && event.fee >= 100 && event.fee < 200) ||
                      (feeFilter === 'high' && event.fee >= 200);
    
    return matchesSearch && matchesCity && matchesFee;
  });

  const cities = [...new Set(availableEvents.map(event => event.city))];

  const getEventTypeColor = (type: string) => {
    const colors = {
      'open-mic': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'show': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'private': 'bg-green-500/20 text-green-400 border-green-500/30',
      'festival': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      'open-mic': 'Open Mic',
      'show': 'Spectacle',
      'private': 'Événement privé',
      'festival': 'Festival'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Opportunités près de toi</h1>
          <p className="text-gray-400">{filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} disponible{filteredEvents.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full lg:w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-full lg:w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Cachet" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Tous les cachets</SelectItem>
              <SelectItem value="low">Moins de 100€</SelectItem>
              <SelectItem value="medium">100€ - 200€</SelectItem>
              <SelectItem value="high">Plus de 200€</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des événements */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
          <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Aucun événement trouvé
          </h3>
          <p className="text-gray-500">
            Essayez de modifier vos filtres ou revenez plus tard
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(event.eventType)}`}>
                    {getEventTypeLabel(event.eventType)}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{event.fee}€</div>
                    <div className="text-xs text-gray-400">cachet</div>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.venue}, {event.city}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.applications.length}/{event.maxPerformers} candidatures</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setSelectedEvent(event.id)}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  disabled={event.applications.length >= event.maxPerformers}
                >
                  {event.applications.length >= event.maxPerformers ? 'Complet' : 'Candidater'}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de candidature */}
      {selectedEvent && (
        <ApplyToEventModal
          eventId={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default OpportunitiesPage;
