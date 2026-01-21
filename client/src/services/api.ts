import axios from 'axios';

// Configuration automatique de l'URL de base selon l'environnement
const baseURL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://connectcomedyclub.com/api'
    : process.env.NODE_ENV === 'test'
      ? 'https://test.connectcomedyclub.com/api'
      : 'http://localhost:3001/api');
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Ne rediriger que si :
      // 1. On a un token (donc c'était une session authentifiée)
      // 2. On n'est PAS déjà sur une page de login
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/login' || currentPath === '/organisateur';
      const hadToken = localStorage.getItem('token');

      // Toujours supprimer le token s'il existe
      if (hadToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      // Ne rediriger que si on n'est pas déjà sur une page de login
      // et qu'on avait un token (session expirée)
      if (!isLoginPage && hadToken) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Fonctions pour gérer les absences
export const markAbsence = async (eventId: string, comedianId: string, reason?: string) => {
  const response = await api.post('/absences', { eventId, comedianId, reason });
  return response.data;
};

export const cancelAbsence = async (eventId: string, comedianId: string) => {
  const response = await api.delete(`/absences/${eventId}/${comedianId}`);
  return response.data;
};

export const getEventAbsences = async (eventId: string) => {
  const response = await api.get(`/absences/event/${eventId}`);
  return response.data;
};

export const getComedianAbsences = async (comedianId: string) => {
  const response = await api.get(`/absences/comedian/${comedianId}`);
  return response.data;
};

// Fonctions pour gérer les favoris d'évènements (comédiens)
export const addEventFavorite = async (eventId: string) => {
  const response = await api.post('/event-favorites', { eventId });
  return response.data;
};

export const removeEventFavorite = async (eventId: string) => {
  const response = await api.delete(`/event-favorites/${eventId}`);
  return response.data;
};

export const getEventFavorites = async () => {
  const response = await api.get('/event-favorites');
  return response.data;
};

export const checkIsEventFavorite = async (eventId: string) => {
  const response = await api.get(`/event-favorites/check/${eventId}`);
  return response.data;
};

// Fonctions pour gérer les favoris de comédiens (organisateurs)
export const addFavorite = async (comedianId: string) => {
  const response = await api.post('/favorites', { comedianId });
  return response.data;
};

export const removeFavorite = async (comedianId: string) => {
  const response = await api.delete(`/favorites/${comedianId}`);
  return response.data;
};

export const getFavorites = async () => {
  const response = await api.get('/favorites');
  return response.data;
};

export const checkIsFavorite = async (comedianId: string) => {
  const response = await api.get(`/favorites/check/${comedianId}`);
  return response.data;
};

// Fonctions pour gérer les alertes de présence (Super Admin)
export const getPresenceAlerts = async () => {
  const response = await api.get('/presence-alerts');
  return response.data;
};

export const getComedianPresenceScore = async (comedianId: string) => {
  const response = await api.get(`/presence-alerts/${comedianId}`);
  return response.data;
};

export const acknowledgePresenceAlert = async (alertId: string) => {
  const response = await api.post(`/presence-alerts/${alertId}/acknowledge`);
  return response.data;
};

export const triggerPresenceCheck = async () => {
  const response = await api.post('/presence-alerts/check');
  return response.data;
};

// Fonctions pour gérer les signalements d'humoristes (Organisateurs)
export const createComedianReport = async (comedianId: string, reason: string, description?: string) => {
  const response = await api.post('/comedian-reports', { comedianId, reason, description });
  return response.data;
};

export const checkComedianReport = async (comedianId: string) => {
  const response = await api.get(`/comedian-reports/comedian/${comedianId}`);
  return response.data;
};

// Fonctions pour gérer les signalements (Super Admin)
export const getComedianReports = async (status?: string) => {
  const query = status ? `?status=${status}` : '';
  const response = await api.get(`/comedian-reports${query}`);
  return response.data;
};

export const getComedianReport = async (reportId: string) => {
  const response = await api.get(`/comedian-reports/${reportId}`);
  return response.data;
};

export const updateComedianReport = async (reportId: string, status: string) => {
  const response = await api.patch(`/comedian-reports/${reportId}`, { status });
  return response.data;
};

// Fonctions pour gérer les notifications in-app (Organisateurs)
export const getNotifications = async (read?: boolean, limit?: number) => {
  const params = new URLSearchParams();
  if (read !== undefined) params.append('read', read.toString());
  if (limit !== undefined) params.append('limit', limit.toString());
  const query = params.toString();
  const response = await api.get(`/notifications${query ? `?${query}` : ''}`);
  return response.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (notificationId: string) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

// Fonctions pour gérer les recommandations (Humoristes)
export const getRecommendations = async (options?: { page?: number; limit?: number; minScore?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.minScore !== undefined) params.append('minScore', options.minScore.toString());
  const query = params.toString();
  const response = await api.get(`/recommendations${query ? `?${query}` : ''}`);
  return response.data;
};

// Recommandations intelligentes basées sur l'historique (même nom/même organisateur)
export const getSmartRecommendations = async (options?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  const query = params.toString();
  const response = await api.get(`/recommendations/smart${query ? `?${query}` : ''}`);
  return response.data;
};

// Fonctions pour rechercher des humoristes par zone géographique (Organisateurs)
export interface SearchComediansByZoneOptions {
  zone: string;
  experienceLevel?: 'all' | '0-50' | '50-200' | '200+';
  page?: number;
  limit?: number;
}

export interface ComedianSearchResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  city?: string;
  phone?: string;
  stageName?: string;
  bio?: string;
  numberOfScenes?: string;
  comedyStyle?: string[];
  performanceLanguages?: string[];
  mobilityZone?: Array<{ type: 'ville' | 'departement' | 'region'; value: string }>;
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  stats?: {
    totalEvents?: number;
    averageRating?: number;
    absences?: number;
  };
}

export interface SearchComediansByZoneResponse {
  comedians: ComedianSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  searchZone: {
    type: 'ville' | 'departement' | 'region';
    value: string;
    department?: string;
    region?: string;
  };
}

export const searchComediansByZone = async (options: SearchComediansByZoneOptions): Promise<SearchComediansByZoneResponse> => {
  const params = new URLSearchParams();
  params.append('zone', options.zone);
  if (options.experienceLevel && options.experienceLevel !== 'all') {
    params.append('experienceLevel', options.experienceLevel);
  }
  if (options.page) params.append('page', options.page.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  const query = params.toString();
  const response = await api.get(`/comedians/search-by-zone?${query}`);
  return response.data;
};

export default api;
