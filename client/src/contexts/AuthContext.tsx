import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import type { IUserData } from '../types/user';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: IUserData | null;
  setToken: (token: string | null) => void;
  setUser: (user: IUserData | null) => void;
  loginMutation: ReturnType<typeof useMutation>;
  registerMutation: ReturnType<typeof useMutation>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<IUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/');
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    console.log("refreshUser: Tentative de rafraîchissement des données utilisateur...");
    if (token) {
      try {
        setIsLoading(true);
        const response = await api.get<IUserData>('/profile/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("refreshUser: Données utilisateur reçues de l'API:", response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        console.log("refreshUser: Utilisateur stocké dans localStorage:", response.data);
        setUser(response.data);
        console.log("refreshUser: État de l'utilisateur mis à jour:", response.data);
      } catch (err: any) {
        console.error("refreshUser: Erreur lors du rafraîchissement des données utilisateur depuis l'API", err);
        if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
          console.log("refreshUser: Erreur d'authentification détectée. Déconnexion.");
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("refreshUser: Pas de token, ne peut pas rafraîchir l'utilisateur.");
      setUser(null);
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      const userString = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (userString && storedToken) {
        try {
          const parsedUser = JSON.parse(userString) as IUserData;
          if (isMounted) setUser(parsedUser);

          // Rafraîchir les données utilisateur une seule fois au montage
          try {
            const response = await api.get<IUserData>('/profile/me', {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            });
            if (isMounted) {
              localStorage.setItem('user', JSON.stringify(response.data));
              setUser(response.data);
            }
          } catch (err: any) {
            console.error("Erreur lors du rafraîchissement des données utilisateur", err);
            if (isMounted && axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
              logout();
            }
          }
        } catch (e) {
          console.error("Erreur lors du parse de l'utilisateur depuis le localStorage", e);
          if (isMounted) setUser(null);
        }
      } else {
        if (isMounted) setUser(null);
      }
      if (isMounted) setIsLoading(false);
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      if (data.user.role === "ORGANIZER") {
        navigate("/dashboard");
      } else if (data.user.role === "COMEDIAN") {
        navigate("/profile/comedian");
      } else if (data.user.role === "SUPER_ADMIN") {
        console.log("🔥 SUPER_ADMIN connecté, redirection vers dashboard");
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("🔄 Tentative de connexion avec:", data.email);
      const response = await api.post('/auth/login', data);
      console.log("✅ Réponse de l'API de connexion:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("🎉 Connexion réussie pour:", data.user.email, "avec le rôle:", data.user.role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      if (data.user.role === "ORGANIZER") {
        console.log("📍 Redirection ORGANIZER vers /dashboard");
        navigate("/dashboard");
      } else if (data.user.role === "COMEDIAN") {
        console.log("📍 Redirection COMEDIAN vers /profile/comedian");
        navigate("/profile/comedian");
      } else if (data.user.role === "SUPER_ADMIN") {
        console.log("🔥 SUPER_ADMIN connecté, redirection vers dashboard");
        navigate("/dashboard");
      } else {
        console.log("📍 Redirection par défaut vers /");
        navigate("/");
      }
    }
    // Pas de onError ici - laisse les composants gérer leurs propres erreurs
  });


  const contextValue = {
    token,
    user,
    setToken,
    setUser,
    loginMutation,
    registerMutation,
    logout,
    refreshUser,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 