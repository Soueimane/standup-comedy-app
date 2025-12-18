import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, SignupData, HumoristeProfile } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<User>;
  isAuthenticated: boolean;
  isHumoriste: boolean;
  isOrganisateur: boolean;
  clearError: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('standup_users');
    const existingUsers = savedUsers ? JSON.parse(savedUsers) : [];
    
    // Ajouter des utilisateurs de test s'ils n'existent pas déjà
    const testUsers = [
      {
        id: 'humoriste_test_001',
        email: 'humoriste@test.com',
        password: '123456',
        firstName: 'Jean',
        lastName: 'Comedy',
        userType: 'humoriste',
        onboardingCompleted: true,
        emailVerified: true,
        stats: {
          totalEvents: 5,
          totalRevenue: 2500,
          averageRating: 4.2,
          viralScore: 75,
          profileViews: 120,
          lastActivity: new Date().toISOString()
        },
        profile: {
          stageName: 'Jean Comedy',
          location: {
            city: 'Paris',
            postalCode: '75001',
            address: '1 rue de la Comédie',
            latitude: 48.8566,
            longitude: 2.3522
          },
          bio: 'Humoriste parisien passionné par le stand-up',
          mobilityZone: { radius: 50 },
          experienceLevel: 'intermediaire',
          genres: ['observationnel', 'absurde'],
          availability: {
            weekdays: true,
            weekends: true,
            evenings: true
          },
          phone: '0123456789'
        },
        createdAt: new Date('2024-01-01').toISOString(),
        lastLoginAt: new Date().toISOString()
      },
      {
        id: 'organisateur_test_001',
        email: 'organisateur@test.com',
        password: '123456',
        firstName: 'Marie',
        lastName: 'Eventuel',
        userType: 'organisateur',
        onboardingCompleted: true,
        emailVerified: true,
        stats: {
          totalEvents: 8,
          totalRevenue: 0,
          averageRating: 4.5,
          viralScore: 60,
          profileViews: 85,
          lastActivity: new Date().toISOString()
        },
        profile: {
          companyName: 'Events & Comedy',
          location: {
            city: 'Lyon',
            postalCode: '69001',
            address: '2 place Bellecour',
            latitude: 45.7640,
            longitude: 4.8357
          },
          description: 'Organisatrice d\'évènements humoristiques à Lyon',
          venueTypes: ['club', 'theater'],
          eventFrequency: 'weekly'
        },
        createdAt: new Date('2024-01-01').toISOString(),
        lastLoginAt: new Date().toISOString()
      }
    ];
    
    // Fusionner avec les utilisateurs existants en évitant les doublons
    const combinedUsers = [...existingUsers];
    testUsers.forEach(testUser => {
      if (!combinedUsers.some(u => u.email === testUser.email)) {
        combinedUsers.push(testUser);
      }
    });
    
    return combinedUsers;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('standup_token'));

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('standup_token');
        const savedUser = localStorage.getItem('standup_current_user');
        
        if (storedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const userExists = users.some(u => u.id === parsedUser.id);
          if (userExists) {
            setUser(parsedUser);
            setToken(storedToken);
            console.log("User loaded from localStorage:", parsedUser);
          } else {
            localStorage.removeItem('standup_token');
            localStorage.removeItem('standup_current_user');
            setToken(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        localStorage.removeItem('standup_token');
        localStorage.removeItem('standup_current_user');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [users]);

  useEffect(() => {
    localStorage.setItem('standup_users', JSON.stringify(users));
  }, [users]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      // D'abord, essayer la connexion localStorage (utilisateurs mock)
      const foundUser = users.find(u => u.email === credentials.email);
      
      if (foundUser && foundUser.password === credentials.password) {
        // Connexion localStorage réussie
        const newToken = 'token_' + Date.now();
        localStorage.setItem('standup_token', newToken);
        localStorage.setItem('standup_current_user', JSON.stringify(foundUser));
        setUser(foundUser);
        setToken(newToken);
        console.log("User after successful localStorage login:", foundUser);
        return;
      }

      // Si pas trouvé dans localStorage, essayer l'API backend
      console.log('🔄 Tentative de connexion via API backend...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Connexion API réussie:', data);
        
        // Mapper les données backend vers le format frontend
        const backendUser: User = {
          id: data.user.id,
          email: data.user.email,
          password: '', // Pas stocké côté frontend pour sécurité
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          userType: data.user.role === 'SUPER_ADMIN' ? 'admin' : 
                   data.user.role === 'COMEDIAN' ? 'humoriste' : 'organisateur',
          role: data.user.role, // Garder le rôle backend original
          onboardingCompleted: data.user.onboardingCompleted || true,
          emailVerified: data.user.emailVerified || true,
          stats: data.user.stats || {
            totalEvents: 0,
            totalRevenue: 0,
            averageRating: 0,
            viralScore: 0,
            profileViews: 0,
            lastActivity: new Date().toISOString()
          },
          profile: data.user.profile || {
            // Profil par défaut pour admin
            bio: 'Super-administrateur de la plateforme',
            location: {
              city: 'Paris',
              postalCode: '75001'
            }
          },
          createdAt: data.user.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        console.log('👤 Utilisateur mappé pour frontend:', backendUser);

        // Stocker le token et l'utilisateur backend
        localStorage.setItem('standup_token', data.token);
        localStorage.setItem('standup_current_user', JSON.stringify(backendUser));
        localStorage.setItem('standup_backend_token', data.token); // Token spécial pour l'API
        
        console.log('💾 Données stockées dans localStorage');
        
        setUser(backendUser);
        setToken(data.token);
        console.log("✅ User after successful backend login:", backendUser);
        console.log("🔑 Token set:", data.token ? 'YES' : 'NO');
        return;
      }

      // Si les deux méthodes échouent
      throw new Error('Email ou mot de passe incorrect');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    try {
      setLoading(true);
      setError(null);

      // Transformer userType en role pour le backend
      const role = data.userType === 'humoriste' ? 'COMEDIAN' : 
                   data.userType === 'organisateur' ? 'ORGANIZER' : 
                   'ADMIN';

      // Préparer les données pour l'API backend
      const registerData: any = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: role,
        phone: data.phone || '',
        city: data.location?.city || '',
      };

      console.log('🔄 Tentative d\'inscription via API backend...', registerData);

      // Appeler l'API backend
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur inscription API:', errorData);
        
        // Afficher les erreurs de validation détaillées si disponibles
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map((err: any) => err.message).join(', ');
          throw new Error(errorMessages || errorData.message || 'Erreur lors de l\'inscription');
        }
        
        throw new Error(errorData.message || 'Erreur lors de l\'inscription');
      }

      const apiData = await response.json();
      console.log('✅ Inscription API réussie:', apiData);

      // Mapper les données backend vers le format frontend
      const backendUser: User = {
        id: apiData.user.id,
        email: apiData.user.email,
        password: '', // Pas stocké côté frontend pour sécurité
        firstName: apiData.user.firstName,
        lastName: apiData.user.lastName,
        userType: apiData.user.role === 'COMEDIAN' ? 'humoriste' : 
                 apiData.user.role === 'ORGANIZER' ? 'organisateur' : 'admin',
        role: apiData.user.role,
        onboardingCompleted: false,
        emailVerified: false,
        stats: {
          totalEvents: 0,
          totalRevenue: 0,
          averageRating: 0,
          viralScore: 0,
          profileViews: 0,
          lastActivity: new Date().toISOString()
        },
        profile: data.userType === 'humoriste' ? {
          stageName: data.stageName,
          location: data.location,
          bio: '',
          mobilityZone: { radius: 30 },
          experienceLevel: 'debutant',
          genres: [],
          availability: {
            weekdays: false,
            weekends: false,
            evenings: false
          },
          phone: data.phone
        } : {
          companyName: data.companyName,
          location: data.location,
          description: '',
          venueTypes: [],
          eventFrequency: 'monthly'
        },
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      // Stocker le token et l'utilisateur
      localStorage.setItem('standup_token', apiData.token);
      localStorage.setItem('standup_current_user', JSON.stringify(backendUser));
      localStorage.setItem('standup_backend_token', apiData.token);
      
      setUser(backendUser);
      setToken(apiData.token);
      
      // Ajouter aussi dans users pour compatibilité
      setUsers(prev => [...prev, backendUser]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('standup_token');
    localStorage.removeItem('standup_current_user');
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (profileData: any): Promise<User> => {
    try {
      if (!user) throw new Error('Utilisateur non connecté');
      
      const updatedProfile = { ...user.profile };

      if (user.userType === 'humoriste') {
        const humoristeProfile = updatedProfile as HumoristeProfile;
        if (profileData.mobilityZone !== undefined) {
          if (typeof profileData.mobilityZone === 'number') {
            humoristeProfile.mobilityZone = { radius: Math.max(1, profileData.mobilityZone) };
          } else if (typeof profileData.mobilityZone === 'object' && profileData.mobilityZone !== null && typeof profileData.mobilityZone.radius === 'number') {
            humoristeProfile.mobilityZone = { ...humoristeProfile.mobilityZone, radius: Math.max(1, profileData.mobilityZone.radius) };
          } else {
            humoristeProfile.mobilityZone = { radius: 30 };
          }
        } else if (!humoristeProfile.mobilityZone?.radius) {
          humoristeProfile.mobilityZone = { radius: 30 };
        }
      }

      const { mobilityZone, ...restProfileData } = profileData;

      Object.assign(updatedProfile, restProfileData);

      const updatedUser: User = {
        ...user,
        profile: updatedProfile,
      };

      setUsers(prevUsers => prevUsers.map(u => (u.id === updatedUser.id ? updatedUser : u)));
      localStorage.setItem('standup_current_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil');
      throw err;
    }
  };

  const isAuthenticated = !!user && !!token;
  const isHumoriste = isAuthenticated && user?.userType === 'humoriste';
  const isOrganisateur = isAuthenticated && user?.userType === 'organisateur';

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    users,
    loading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated,
    isHumoriste,
    isOrganisateur,
    clearError,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
