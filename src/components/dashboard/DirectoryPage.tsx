import * as React from 'react';
import { useState, useEffect } from 'react';
import apiClient, { getAllUsers } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Users, Phone, Mail, MapPin, Search, Filter, X, TrendingUp, Calendar, CheckCircle, XCircle, Clock, Star, Eye, BarChart3 } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface UserStats {
  totalEvents?: number;
  totalRevenue?: number;
  averageRating?: number;
  viralScore?: number;
  profileViews?: number;
  lastActivity?: string;
  applicationsSent?: number;
  applicationsAccepted?: number;
  applicationsRejected?: number;
  applicationsPending?: number;
  netPromoterScore?: number;
  absences?: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'COMEDIAN' | 'ORGANIZER';
  city: string;
  createdAt: string;
  stageName?: string;
  experienceLevel?: string;
  companyName?: string;
  stats?: UserStats;
}

const DirectoryPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizerCancelledCount, setOrganizerCancelledCount] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le répertoire des utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.stageName && user.stageName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrer par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'COMEDIAN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ORGANIZER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'COMEDIAN':
        return 'Humoriste';
      case 'ORGANIZER':
        return 'Organisateur';
      default:
        return role;
    }
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const calculateSuccessRate = (stats?: UserStats) => {
    const sent = stats?.applicationsSent || 0;
    const accepted = stats?.applicationsAccepted || 0;
    
    // Si aucune candidature envoyée, retour 0
    if (sent === 0) return 0;
    
    // Calcul du pourcentage de succès
    return Math.round((accepted / sent) * 100);
  };

  // Charger le nombre d'évènements annulés pour l'organisateur sélectionné
  useEffect(() => {
    const fetchCancelledForOrganizer = async () => {
      try {
        if (!isModalOpen || !selectedUser || selectedUser.role !== 'ORGANIZER') {
          setOrganizerCancelledCount(0);
          return;
        }
        const res = await apiClient.get(`/api/events?organizerId=${selectedUser.id}`);
        const events = Array.isArray(res.data) ? res.data : (res.data?.events || []);
        const cancelled = events.filter((e: any) => e.status === 'cancelled' || e.status === 'CANCELLED').length;
        setOrganizerCancelledCount(cancelled);
      } catch (err) {
        console.error('Erreur récupération évènements organisateur:', err);
        setOrganizerCancelledCount(0);
      }
    };
    fetchCancelledForOrganizer();
  }, [isModalOpen, selectedUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du répertoire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-600" />
            Répertoire des Utilisateurs
          </h1>
          <p className="text-gray-600 mt-2">
            Liste complète des humoristes et organisateurs inscrits sur la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline" className="font-normal">
            Total: {users.length} utilisateurs
          </Badge>
          <Badge variant="outline" className="font-normal">
            Affichés: {filteredUsers.length}
          </Badge>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium">Humoristes</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {users.filter(u => u.role === 'COMEDIAN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">Organisateurs</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {users.filter(u => u.role === 'ORGANIZER').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-700 mt-1">
              {users.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom, email, nom de scène..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="COMEDIAN">Humoristes</SelectItem>
                  <SelectItem value="ORGANIZER">Organisateurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadUsers} variant="outline" size="sm">
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id} 
            className="hover:shadow-md transition-shadow cursor-pointer hover:scale-[1.02] transform transition-all duration-200"
            onClick={() => handleUserClick(user)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  {user.stageName && (
                    <p className="text-sm text-purple-600 font-medium">
                      "{user.stageName}"
                    </p>
                  )}
                  {user.companyName && (
                    <p className="text-sm text-blue-600 font-medium">
                      {user.companyName}
                    </p>
                  )}
                </div>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{user.city}</span>
              </div>

              {user.experienceLevel && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Expérience: </span>
                  <span className="text-gray-600">{user.experienceLevel}</span>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Aucun utilisateur inscrit pour le moment'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal des statistiques utilisateur */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                {selectedUser?.firstName} {selectedUser?.lastName}
                {selectedUser?.role === 'COMEDIAN' && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    Humoriste
                  </Badge>
                )}
                {selectedUser?.role === 'ORGANIZER' && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    Organisateur
                  </Badge>
                )}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-6">
              {/* Informations de base */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedUser.phone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedUser.city || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Inscrit le {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  {selectedUser.stageName && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-800">
                        Nom de scène: "{selectedUser.stageName}"
                      </span>
                    </div>
                  )}
                  {selectedUser.companyName && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">
                        Entreprise: {selectedUser.companyName}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statistiques de performance */}
              {selectedUser.role === 'COMEDIAN' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Statistiques de performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Évènements totaux */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Évènements</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedUser.stats?.totalEvents || 0}
                        </p>
                        <p className="text-xs text-blue-700">Total participé</p>
                      </div>

                      {/* Candidatures envoyées */}
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">Candidatures</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedUser.stats?.applicationsSent || 0}
                        </p>
                        <p className="text-xs text-purple-700">Envoyées</p>
                      </div>

                      {/* Candidatures acceptées */}
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Acceptées</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedUser.stats?.applicationsAccepted || 0}
                        </p>
                        <p className="text-xs text-green-700">
                          {calculateSuccessRate(selectedUser.stats)}% de succès
                        </p>
                      </div>

                      {/* Taux de réussite */}
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Score viral</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                          {selectedUser.stats?.viralScore || 0}
                        </p>
                        <p className="text-xs text-orange-700">Points</p>
                      </div>
                    </div>

                    {/* Statistiques détaillées */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Candidatures rejetées</span>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-xl font-bold text-red-600">
                          {selectedUser.stats?.applicationsRejected || 0}
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">En attente</span>
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="text-xl font-bold text-yellow-600">
                          {selectedUser.stats?.applicationsPending || 0}
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Absences</span>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-xl font-bold text-red-600">
                          {selectedUser.stats?.absences || 0}
                        </p>
                      </div>

                      {/* Nouveau: Taux de participation */}
                      <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-teal-700">Taux participation</span>
                          <BarChart3 className="h-4 w-4 text-teal-600" />
                        </div>
                        <p className="text-xl font-bold text-teal-600">
                          {(() => {
                            const participations = selectedUser.stats?.totalEvents || 0;
                            const absences = selectedUser.stats?.absences || 0;
                            const total = participations + absences;
                            return total > 0 ? Math.round((participations / total) * 100) : 0;
                          })()}%
                        </p>
                        <p className="text-xs text-teal-600">
                          {selectedUser.stats?.totalEvents || 0} / {(selectedUser.stats?.totalEvents || 0) + (selectedUser.stats?.absences || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Autres métriques */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Vues du profil</span>
                        </div>
                        <p className="text-xl font-bold text-gray-600">
                          {selectedUser.stats?.profileViews || 0}
                        </p>
                      </div>

                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-700">Score NPS</span>
                        </div>
                        <p className="text-xl font-bold text-indigo-600">
                          {selectedUser.stats?.netPromoterScore || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Statistiques pour organisateurs */}
              {selectedUser.role === 'ORGANIZER' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Statistiques d'organisateur
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Évènements</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedUser.stats?.totalEvents || 0}
                        </p>
                        <p className="text-xs text-blue-700">Organisés</p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Note moyenne</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedUser.stats?.averageRating || 0}/5
                        </p>
                        <p className="text-xs text-green-700">Satisfaction</p>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">Évènements annulés</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                          {organizerCancelledCount}
                        </p>
                        <p className="text-xs text-red-700">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectoryPage; 