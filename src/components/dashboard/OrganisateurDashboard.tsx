import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, Archive, RefreshCw, TrendingUp, BarChart3, MessageSquare, Plus, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import MessagesPage from './MessagesPage';
import SearchHumoristsPage from './SearchHumoristsPage';
import api from '@/services/api';
import { toast } from 'sonner';
import axios from 'axios';

type TabType = 'overview' | 'events' | 'applications' | 'messages' | 'search' | 'stats';

const OrganisateurDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getOrganizerStats, applications, events } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  // Déterminer le titre selon le rôle
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';
  const dashboardTitle = isSuperAdmin ? 'Dashboard Super Admin' : 'Dashboard Organisateur';

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp, fullLabel: 'Vue d\'ensemble' },
    { id: 'events', label: 'Événements', icon: Calendar, fullLabel: 'Mes Événements' },
    { id: 'applications', label: 'Candidatures', icon: Users, fullLabel: 'Candidatures' },
    { id: 'search', label: 'Rechercher', icon: Users, fullLabel: 'Rechercher Humoristes' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, fullLabel: 'Messages' },
    { id: 'stats', label: 'Statistiques', icon: BarChart3, fullLabel: 'Statistiques' }
  ];

  // Fonction pour traiter les événements terminés
  const handleProcessCompletedEvents = async () => {
    if (!user || user.userType !== 'admin') {
      toast.error('Accès refusé');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await axios.post(
        '/api/events/process-completed-events',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;
      toast.success(
        `✅ Traitement terminé ! ${result.participationsAdded} participations ajoutées sur ${result.eventsProcessed} événements traités.`
      );
    } catch (error: any) {
      console.error('Erreur lors du traitement:', error);
      toast.error(`❌ Erreur: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = getOrganizerStats(user?.id || '');
  
  // Données mockées pour demo
  const totalEvents = stats?.totalEvents || 8;
  const activeEvents = 3;
  const totalApplications = stats?.totalApplications || 45;
  const pendingApplications = 12;
  const monthlyRevenue = 2400;

  const renderContent = () => {
    switch (activeTab) {
      case 'messages':
        return <MessagesPage />;
      case 'search':
        return <SearchHumoristsPage />;
      case 'events':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Mes Événements</h2>
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Créer un événement
              </Button>
            </div>
            {/* Contenu des événements */}
            <Card className="p-6 bg-gray-800/50 border-gray-700">
              <p className="text-gray-400">Liste des événements à implémenter ici</p>
            </Card>
          </div>
        );
      case 'applications':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Candidatures</h2>
            <Card className="p-6 bg-gray-800/50 border-gray-700">
              <p className="text-gray-400">Liste des candidatures à implémenter ici</p>
            </Card>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Statistiques</h2>
            <Card className="p-6 bg-gray-800/50 border-gray-700">
              <p className="text-gray-400">Graphiques et statistiques détaillées à implémenter ici</p>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Stats Grid - Responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Événements</p>
                    <p className="text-lg md:text-2xl font-bold text-white">{totalEvents}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Actifs</p>
                    <p className="text-lg md:text-2xl font-bold text-green-400">{activeEvents}</p>
                  </div>
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Candidatures</p>
                    <p className="text-lg md:text-2xl font-bold text-yellow-400">{totalApplications}</p>
                  </div>
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">En attente</p>
                    <p className="text-lg md:text-2xl font-bold text-orange-400">{pendingApplications}</p>
                  </div>
                  <Archive className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                </div>
              </Card>
            </div>

            {/* Quick Actions - Mobile optimized */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Créer un événement</h3>
                    <p className="text-gray-400 text-sm">Organise ta prochaine soirée</p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab('events')}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Rechercher des talents</h3>
                    <p className="text-gray-400 text-sm">Trouve les meilleurs humoristes</p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab('search')}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Super Admin Section */}
            {isSuperAdmin && (
              <Card className="p-4 md:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold mb-1">🔥 Super Admin</h3>
                    <p className="text-gray-400 text-sm">Traitement automatique des participations</p>
                  </div>
                  <Button
                    onClick={handleProcessCompletedEvents}
                    disabled={isProcessing}
                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
                    size="sm"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Traiter les événements</span>
                        <span className="sm:hidden">Traiter</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Incrémente automatiquement les participations pour les événements terminés
                </p>
              </Card>
            )}

            {/* Revenue Card */}
            <Card className="p-4 md:p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Revenus ce mois</h3>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-400">{monthlyRevenue}€</p>
                  <p className="text-gray-400 text-sm">+12% par rapport au mois dernier</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4 md:p-6 bg-gray-800/50 border-gray-700">
              <h3 className="text-white font-semibold mb-4">Activité récente</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Nouvelle candidature</p>
                      <p className="text-gray-400 text-xs">Comedy Night - Marcel Dupont</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Événement confirmé</p>
                      <p className="text-gray-400 text-xs">Soirée du Rire - 20 Dec</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Paiement reçu</p>
                      <p className="text-gray-400 text-xs">450€ - Bar Le Central</p>
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
    <div className="flex-1 p-4 md:p-8 md:pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{dashboardTitle}</h1>
        <p className="text-gray-400 text-sm md:text-base">
          {isSuperAdmin ? 'Contrôle total de la plateforme' : 'Gère tes événements et trouve des talents'}
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
        <div className="flex space-x-2 border-b border-gray-700">
          {tabs.map(({ id, fullLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors duration-200 border-b-2 ${
                activeTab === id
                  ? 'text-pink-500 border-pink-500'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
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
  );
};

export default OrganisateurDashboard;
