
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Trophy, Target, Calendar, Star, Users, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ViralScorePage: React.FC = () => {
  const { user } = useAuth();
  const { getHumoristeStats } = useData();

  if (!user) return null;

  const stats = getHumoristeStats(user.id);
  
  // Calcul du score viral et des métriques
  const viralScore = Math.min(1000, (stats.acceptedApplications * 100) + (stats.completedShows * 150) + (stats.averageRating * 50));
  const viralProgress = (viralScore / 1000) * 100;
  
  // Métriques détaillées
  const metrics = {
    spectacles: {
      value: stats.completedShows,
      points: stats.completedShows * 150,
      max: 10,
      label: 'Spectacles réalisés'
    },
    taux: {
      value: stats.totalApplications > 0 ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100) : 0,
      points: stats.acceptedApplications * 100,
      max: 100,
      label: 'Taux d\'acceptation'
    },
    note: {
      value: stats.averageRating,
      points: Math.round(stats.averageRating * 50),
      max: 5,
      label: 'Note moyenne'
    }
  };

  const nextLevel = Math.ceil(viralScore / 250) * 250;
  const pointsToNext = nextLevel - viralScore;

  const getScoreLevel = (score: number) => {
    if (score >= 750) return { level: 'Légende', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (score >= 500) return { level: 'Expert', color: 'text-purple-400', bg: 'bg-purple-500/20' };
    if (score >= 250) return { level: 'Pro', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    return { level: 'Débutant', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const levelInfo = getScoreLevel(viralScore);

  const tips = [
    {
      icon: Calendar,
      title: 'Participe régulièrement',
      description: 'Plus tu fais de spectacles, plus ton score augmente',
      points: '+150 points par spectacle'
    },
    {
      icon: Star,
      title: 'Vise l\'excellence',
      description: 'Une bonne note moyenne booste ton score viral',
      points: '+50 points par étoile'
    },
    {
      icon: Target,
      title: 'Soigne tes candidatures',
      description: 'Un bon taux d\'acceptation montre ta popularité',
      points: '+100 points par acceptation'
    },
    {
      icon: Users,
      title: 'Développe ton réseau',
      description: 'Travaille avec différents organisateurs pour étendre ta réputation',
      points: 'Bonus multiplicateur'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Score Viral</h1>
        <p className="text-gray-400">Mesure ta popularité dans la communauté stand-up</p>
      </div>

      {/* Score principal */}
      <Card className="p-8 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-pink-500 mb-4"
          >
            <Zap className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2"
          >
            {viralScore}
          </motion.div>
          
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${levelInfo.bg} ${levelInfo.color} border border-current/30 mb-4`}>
            Niveau {levelInfo.level}
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progression</span>
              <span>{viralScore}/1000</span>
            </div>
            <Progress 
              value={viralProgress} 
              className="h-3 bg-gray-700"
            />
            <p className="text-sm text-gray-400 mt-2">
              Plus que {pointsToNext} points pour atteindre le niveau suivant
            </p>
          </div>
        </div>
      </Card>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">+{metrics.spectacles.points}</span>
            </div>
            <h3 className="font-semibold text-white mb-2">{metrics.spectacles.label}</h3>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{metrics.spectacles.value} spectacles</span>
              <span>150 pts/spectacle</span>
            </div>
            <Progress 
              value={(metrics.spectacles.value / metrics.spectacles.max) * 100} 
              className="h-2 mt-3 bg-gray-700"
            />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-purple-500/10 border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-purple-400">+{metrics.taux.points}</span>
            </div>
            <h3 className="font-semibold text-white mb-2">{metrics.taux.label}</h3>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{metrics.taux.value}%</span>
              <span>100 pts/acceptation</span>
            </div>
            <Progress 
              value={metrics.taux.value} 
              className="h-2 mt-3 bg-gray-700"
            />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">+{metrics.note.points}</span>
            </div>
            <h3 className="font-semibold text-white mb-2">{metrics.note.label}</h3>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{metrics.note.value}/5 étoiles</span>
              <span>50 pts/étoile</span>
            </div>
            <Progress 
              value={(metrics.note.value / metrics.note.max) * 100} 
              className="h-2 mt-3 bg-gray-700"
            />
          </Card>
        </motion.div>
      </div>

      {/* Conseils pour améliorer le score */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
          Comment améliorer ton score
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-4 p-4 bg-gray-700/50 rounded-lg"
            >
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
                <tip.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{tip.title}</h3>
                <p className="text-gray-400 text-sm mb-2">{tip.description}</p>
                <span className="text-green-400 text-xs font-medium">{tip.points}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Historique (simulation) */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Évolution récente</h2>
        
        <div className="space-y-4">
          {[
            { date: '2024-11-20', action: 'Spectacle réalisé au Comedy Club', points: '+150', type: 'positive' },
            { date: '2024-11-15', action: 'Candidature acceptée chez Café Comédie', points: '+100', type: 'positive' },
            { date: '2024-11-10', action: 'Note 5/5 reçue', points: '+50', type: 'positive' },
            { date: '2024-11-05', action: 'Profil consulté 50 fois', points: '+25', type: 'neutral' }
          ].map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  event.type === 'positive' ? 'bg-green-400' : 'bg-blue-400'
                }`} />
                <div>
                  <p className="text-white text-sm font-medium">{event.action}</p>
                  <p className="text-gray-400 text-xs">{new Date(event.date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                event.type === 'positive' ? 'text-green-400' : 'text-blue-400'
              }`}>
                {event.points}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ViralScorePage;
