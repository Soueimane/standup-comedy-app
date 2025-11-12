
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Euro, Star, TrendingUp, Users, Zap, Trophy, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';

const StatsPage: React.FC = () => {
  const { user } = useAuth();
  const { getHumoristeStats, getApplicationsByHumorist } = useData();

  if (!user) return null;

  const stats = getHumoristeStats(user.id);
  const applications = getApplicationsByHumorist(user.id);

  // Données pour les graphiques
  const monthlyData = [
    { month: 'Juil', spectacles: 2, revenus: 150, candidatures: 5 },
    { month: 'Août', spectacles: 3, revenus: 225, candidatures: 7 },
    { month: 'Sept', spectacles: 1, revenus: 75, candidatures: 4 },
    { month: 'Oct', spectacles: 4, revenus: 300, candidatures: 8 },
    { month: 'Nov', spectacles: 3, revenus: 225, candidatures: 6 },
    { month: 'Déc', spectacles: 2, revenus: 150, candidatures: 3 }
  ];

  const applicationStatusData = [
    { name: 'Acceptées', value: stats.acceptedApplications, color: '#4CAF50' },
    { name: 'En attente', value: applications.filter(app => app.status === 'pending').length, color: '#FFC107' },
    { name: 'Refusées', value: applications.filter(app => app.status === 'rejected').length, color: '#F44336' }
  ];

  const performanceData = [
    { metric: 'Spectacles', value: stats.completedShows, max: 20, color: 'bg-blue-500' },
    { metric: 'Taux succès', value: stats.totalApplications > 0 ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100) : 0, max: 100, color: 'bg-green-500' },
    { metric: 'Note moyenne', value: stats.averageRating * 20, max: 100, color: 'bg-yellow-500' },
    { metric: 'Score viral', value: Math.min(1000, (stats.acceptedApplications * 100) + (stats.completedShows * 150) + (stats.averageRating * 50)) / 10, max: 100, color: 'bg-purple-500' }
  ];

  const topMetrics = [
    {
      title: 'Revenus totaux',
      value: `${stats.acceptedApplications * 125}€`,
      icon: Euro,
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Spectacles ce mois',
      value: stats.completedShows,
      icon: Calendar,
      change: '+2',
      changeType: 'positive'
    },
    {
      title: 'Note moyenne',
      value: `${stats.averageRating}/5`,
      icon: Star,
      change: '+0.2',
      changeType: 'positive'
    },
    {
      title: 'Taux d\'acceptation',
      value: `${stats.totalApplications > 0 ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100) : 0}%`,
      icon: TrendingUp,
      change: '+5%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Statistiques</h1>
        <p className="text-gray-400">Analyse détaillée de tes performances</p>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {topMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-gray-800/50 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <metric.icon className="w-8 h-8 text-gray-400" />
                <span className={`text-sm font-medium ${
                  metric.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.change}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                <p className="text-gray-400 text-sm">{metric.title}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Évolution mensuelle */}
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-6">Évolution mensuelle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line type="monotone" dataKey="spectacles" stroke="#EC4899" strokeWidth={3} name="Spectacles" />
              <Line type="monotone" dataKey="candidatures" stroke="#8B5CF6" strokeWidth={3} name="Candidatures" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition des candidatures */}
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-6">Répartition des candidatures</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={applicationStatusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {applicationStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Revenus mensuels */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Revenus mensuels</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }} 
            />
            <Bar dataKey="revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Barres de progression des performances */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Indicateurs de performance</h3>
        <div className="space-y-6">
          {performanceData.map((item, index) => (
            <motion.div
              key={item.metric}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{item.metric}</span>
                <span className="text-gray-400">{item.metric === 'Score viral' ? `${item.value * 10}/1000` : `${item.value}${item.metric.includes('Taux') ? '%' : ''}`}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <motion.div
                  className={`h-3 rounded-full ${item.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / item.max) * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Achievements/Objectifs */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Objectifs et achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Premier spectacle', description: 'Réalise ton premier spectacle', completed: stats.completedShows > 0, icon: Trophy },
            { title: '5 spectacles', description: 'Atteins 5 spectacles réalisés', completed: stats.completedShows >= 5, icon: Calendar },
            { title: 'Note parfaite', description: 'Obtiens une note de 5/5', completed: stats.averageRating >= 5, icon: Star },
            { title: 'Score viral 500', description: 'Atteins un score viral de 500', completed: (stats.acceptedApplications * 100) + (stats.completedShows * 150) + (stats.averageRating * 50) >= 500, icon: Zap },
            { title: 'Multi-villes', description: 'Joue dans 3 villes différentes', completed: false, icon: MapPin },
            { title: 'Fidélité', description: 'Joue 3 fois chez le même organisateur', completed: false, icon: Users }
          ].map((achievement, index) => (
            <motion.div
              key={achievement.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 ${
                achievement.completed 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <achievement.icon className={`w-6 h-6 ${
                  achievement.completed ? 'text-green-400' : 'text-gray-400'
                }`} />
                <h4 className={`font-semibold ${
                  achievement.completed ? 'text-green-400' : 'text-white'
                }`}>
                  {achievement.title}
                </h4>
              </div>
              <p className="text-gray-400 text-sm">{achievement.description}</p>
              {achievement.completed && (
                <span className="inline-block mt-2 text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                  Réalisé ✓
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StatsPage;
