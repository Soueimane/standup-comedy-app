import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, MapPin, Star, MessageCircle, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HumoristeProfile } from '@/types/auth';

const SearchHumoristsPage: React.FC = () => {
  const { users, isLoading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHumorists, setFilteredHumorists] = useState<HumoristeProfile[]>([]);

  useEffect(() => {
    if (users) {
      const humorists = users.filter(user => user.userType === 'humoriste' && user.profile) as HumoristeProfile[];
      setFilteredHumorists(humorists);
    }
  }, [users]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchTerm(query);
    if (users) {
      const humorists = users.filter(user => 
        user.userType === 'humoriste' && 
        user.profile &&
        (
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          (user.profile as HumoristeProfile).stageName?.toLowerCase().includes(query) ||
          (user.profile as HumoristeProfile).specialties?.some(s => s.toLowerCase().includes(query)) ||
          (user.profile as HumoristeProfile).city?.toLowerCase().includes(query)
        )
      ) as HumoristeProfile[];
      setFilteredHumorists(humorists);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p>Chargement des humoristes...</p>
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

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Rechercher des humoristes</h1>
          <p className="text-gray-400">Trouvez les talents qui correspondent à vos événements.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par nom, ville, spécialité..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {filteredHumorists.length === 0 && !searchTerm ? (
          <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucun humoriste trouvé</h3>
            <p className="text-gray-500">Lancez une recherche pour trouver des humoristes.</p>
          </Card>
        ) : filteredHumorists.length === 0 && searchTerm ? (
          <Card className="p-12 text-center bg-gray-800/50 border-gray-700">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucun résultat pour "{searchTerm}"</h3>
            <p className="text-gray-500">Essayez une autre recherche.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHumorists.map((humorist, index) => (
              <motion.div
                key={humorist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 bg-gray-800/50 border-gray-700 flex flex-col items-center text-center hover:bg-gray-800/70 transition-colors h-full">
                  <Avatar className="w-24 h-24 mb-4">
                    <AvatarImage src={humorist.avatarUrl} />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {humorist.firstName.charAt(0)}{humorist.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold text-white mb-2">{humorist.stageName || `${humorist.firstName} ${humorist.lastName}`}</h3>
                  <p className="text-gray-400 text-sm mb-3">{humorist.experienceLevel}</p>
                  <div className="flex items-center text-yellow-400 mb-3">
                    <Star className="w-5 h-5 mr-1" />
                    <span className="font-semibold">{humorist.stats?.averageRating || 'N/A'}/5</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{humorist.description || 'Pas de description.'}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {humorist.specialties?.map(s => (
                      <span key={s} className="bg-gray-700/70 text-gray-300 text-xs px-2 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto w-full">
                    <Button 
                      className="w-full bg-pink-500 hover:bg-pink-600"
                      onClick={() => console.log(`Contacter ${humorist.stageName}`)} // TODO: Implement actual contact logic
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHumoristsPage; 