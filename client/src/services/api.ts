import axios from 'axios';

// Configuration automatique de l'URL de base selon l'environnement
const baseURL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
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

// Fonctions pour gérer les favoris d'événements (comédiens)
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

export default api;
