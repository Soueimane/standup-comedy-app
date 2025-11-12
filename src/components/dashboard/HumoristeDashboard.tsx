
import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Calendar, 
  Trophy, 
  TrendingUp,
  MapPin,
  Clock,
  Euro,
  Star,
  Eye,
  Bell,
  MessageSquare,
  BarChart3,
  User,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import DashboardSidebar from './DashboardSidebar';
import OpportunitiesPage from './OpportunitiesPage';
import MyApplicationsPage from './MyApplicationsPage';
import MessagesPage from './MessagesPage';
import ViralScorePage from './ViralScorePage';
import StatsPage from './StatsPage';
import ProfilePage from './ProfilePage';
import MyEventsPage from './MyEventsPage';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';

type TabType = 'overview' | 'opportunities' | 'applications' | 'messages' | 'viral-score' | 'stats' | 'profile' | 'events';

const HumoristeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Récupérer les candidatures de l'humoriste pour affichage temps réel
  const { data: applications, isLoading } = useQuery({
    queryKey: ['comedianApplications', user?._id],
    queryFn: async () => {
      if (!user?._id) return [];
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.get('/applications', config);
      const list = Array.isArray(res.data) ? res.data : (Array.isArray((res.data as any)?.applications) ? (res.data as any).applications : []);
      
      // Filtrer pour l'humoriste connecté
      return list.filter((app: any) => {
        const appComedianId = app.comedian?._id || app.comedian;
        return appComedianId === user._id;
      });
    },
    enabled: !!user?._id,
    staleTime: 30000,
  });

  // Calculs basés sur les vraies données
  const acceptedApplications = applications ? applications.filter((app: any) => app.status === 'ACCEPTED').length : 0;
  const totalApplications = applications ? applications.length : 0;
  const pendingApplications = applications ? applications.filter((app: any) => app.status === 'PENDING').length : 0;
  
  // Événements acceptés à venir
  const now = new Date();
  const acceptedUpcomingEvents = applications ? applications.filter((app: any) => {
    return app.status === 'ACCEPTED' && app.event && new Date(app.event.date) >= now;
  }).length : 0;

  // Données mockées pour autres stats
  const viralScore = 245;
  const viralProgress = (viralScore / 1000) * 100;
  const totalEvents = user?.stats?.totalEvents || 0;
  const monthlyEarnings = 850;
  const avgRating = 4.7;

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp, fullLabel: 'Vue d\'ensemble' },
    { id: 'opportunities', label: 'Opportunités', icon: MapPin, fullLabel: 'Opportunités' },
    { id: 'applications', label: 'Candidatures', icon: Calendar, fullLabel: 'Mes Candidatures' },
    { id: 'events', label: 'Événements', icon: Star, fullLabel: 'Mes Événements' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, fullLabel: 'Messages' },
    { id: 'viral-score', label: 'Score Viral', icon: Zap, fullLabel: 'Score Viral' },
    { id: 'stats', label: 'Statistiques', icon: BarChart3, fullLabel: 'Statistiques' },
    { id: 'profile', label: 'Profil', icon: User, fullLabel: 'Mon Profil' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'opportunities':
        return <OpportunitiesPage />;
      case 'applications':
        return <MyApplicationsPage />;
      case 'events':
        return <MyEventsPage />;
      case 'messages':
        return <MessagesPage />;
      case 'viral-score':
        return <ViralScorePage />;
      case 'stats':
        return <StatsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <div className="space-y-6">
            {/* Score Viral Section */}
            <Card className="p-4 md:p-6 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 mr-2" />
                    Score Viral
                  </h2>
                  <p className="text-gray-400 text-xs md:text-sm">Ta popularité dans la communauté</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-black text-yellow-400">{viralScore}</div>
                  <div className="text-xs md:text-sm text-gray-400">/ 1000</div>
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 md:h-3 mb-2">
                <motion.div
                  className="bg-gradient-to-r from-yellow-400 to-pink-500 h-2 md:h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${viralProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-gray-400">
                +{Math.floor(viralScore * 0.1)} points ce mois
              </p>
            </Card>

            {/* Stats Grid - Responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Candidatures</p>
                    <p className="text-lg md:text-2xl font-bold text-white">{totalApplications}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-pink-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Acceptées</p>
                    <p className="text-lg md:text-2xl font-bold text-green-400">{acceptedApplications}</p>
                  </div>
                  <Trophy className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Événements</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-400">{totalEvents}</p>
                  </div>
                  <Star className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Note moy.</p>
                    <p className="text-lg md:text-2xl font-bold text-yellow-400">{avgRating}</p>
                  </div>
                  <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
                </div>
              </Card>
            </div>

            {/* Quick Actions - Mobile optimized */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Carte Événements à venir avec effet clignotant */}
              <Card 
                className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 cursor-pointer hover:scale-105 transition-transform animate-pulse"
                onClick={() => setActiveTab('events')}
                style={{
                  boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Événements à venir</h3>
                    <p className="text-gray-400 text-sm">
                      {isLoading ? 'Chargement...' : `${acceptedUpcomingEvents} événement${acceptedUpcomingEvents > 1 ? 's' : ''} accepté${acceptedUpcomingEvents > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('events');
                    }}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Mes Candidatures</h3>
                    <p className="text-gray-400 text-sm">
                      {isLoading ? 'Chargement...' : `${totalApplications} candidature${totalApplications > 1 ? 's' : ''} envoyée${totalApplications > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab('applications')}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>


            {/* Notifications récentes */}
            <Card className="p-4 md:p-6 bg-gray-800/50 border-gray-700">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-yellow-400" />
                Activité récente
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Candidature acceptée</p>
                      <p className="text-gray-400 text-xs">Comedy Club Paris - 15 Dec</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Nouveau message</p>
                      <p className="text-gray-400 text-xs">Organisateur - Le Rire Libre</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Score viral +15</p>
                      <p className="text-gray-400 text-xs">Performance exceptionnelle</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#181824] via-[#23233a] to-[#181824]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar userType="humoriste" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 md:pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Salut {user?.firstName} ! 👋
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Voici un aperçu de tes performances
          </p>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="mb-6 lg:hidden">
          <div className="flex overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex space-x-2 min-w-max">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as TabType)}
                  className={`flex items-center space-x-2 py-2 px-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
                    activeTab === id
                      ? 'bg-pink-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden lg:block mb-8">
          <div className="flex flex-wrap gap-2 bg-gray-800/50 rounded-lg p-1">
            {tabs.map(({ id, fullLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all text-sm font-medium ${
                  activeTab === id
                    ? 'bg-pink-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{fullLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="pb-20 md:pb-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default HumoristeDashboard;
