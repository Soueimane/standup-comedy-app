import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Home, Calendar, Users, FileText, BarChart3, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('🔍 DashboardLayout - User:', user);
  console.log('🔍 DashboardLayout - UserType:', user?.userType);
  console.log('🔍 DashboardLayout - Role:', (user as any)?.role);

  // Fermer le menu mobile quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Empêcher le scroll en arrière-plan
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Déterminer si l'utilisateur est humoriste ou organisateur
  const isHumoriste = user?.userType === 'humoriste' || (user as any)?.role === 'COMEDIAN';
  const isOrganisateur = user?.userType === 'organisateur' || (user as any)?.role === 'ORGANIZER';
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';

  // Les super admins voient tous les onglets comme les organisateurs + le répertoire
  const showOrganizerTabs = isOrganisateur || isSuperAdmin;
  const showHumoristeTabs = isHumoriste;

  console.log('🔍 DashboardLayout - isSuperAdmin:', isSuperAdmin);
  console.log('🔍 DashboardLayout - showOrganizerTabs:', showOrganizerTabs);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items avec icônes pour mobile et desktop
  const getNavigationItems = () => {
    const items = [
      {
        to: "/dashboard",
        end: true,
        label: "Accueil",
        icon: Home,
        show: true
      }
    ];

    if (showOrganizerTabs) {
      items.push({
        to: "/dashboard/events",
        end: false,
        label: "Mes Évènements",
        icon: Calendar,
        show: true
      });
      
      items.push({
        to: "/dashboard/applications",
        end: false,
        label: "Candidatures",
        icon: FileText,
        show: true
      });

      if (isSuperAdmin) {
        items.push({
          to: "/dashboard/stats",
          end: false,
          label: "Statistiques",
          icon: BarChart3,
          show: true
        });
      }

      items.push({
        to: "/dashboard/search-humorists",
        end: false,
        label: "Répertoire",
        icon: Users,
        show: true
      });
    }

    if (showHumoristeTabs) {
      items.push({
        to: "/dashboard/opportunities",
        end: false,
        label: "Opportunités",
        icon: Calendar,
        show: true
      });
      
      items.push({
        to: "/dashboard/my-applications",
        end: false,
        label: "Mes Candidatures",
        icon: FileText,
        show: true
      });

      items.push({
        to: "/dashboard/viral-score",
        end: false,
        label: "Score Viral",
        icon: BarChart3,
        show: true
      });
    }

    items.push({
      to: "/dashboard/profile",
      end: false,
      label: "Profil",
      icon: User,
      show: isHumoriste || isOrganisateur
    });

    return items.filter(item => item.show);
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181824] via-[#23233a] to-[#181824] relative">
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <NavLink to="/dashboard" className="text-xl font-bold text-gray-800">
                  Comedy Connect Club
                </NavLink>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'border-pink-500 text-pink-500'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-700 hover:text-gray-900 transition-colors duration-200"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Header */}
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pink-500 transition-all duration-200"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <h1 className="ml-3 text-lg font-bold text-gray-800 truncate">
              Comedy Connect Club
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 mobile-menu-container">
          {/* Overlay Background */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Sidebar */}
          <div className="fixed top-0 left-0 w-80 max-w-[85vw] h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            {/* Menu Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600">
              <h2 className="text-lg font-bold text-white">Menu Navigation</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
                aria-label="Fermer le menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* User Info */}
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {isHumoriste && 'Humoriste'}
                    {isOrganisateur && !isSuperAdmin && 'Organisateur'}
                    {isSuperAdmin && 'Super Admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 group ${
                      isActive
                        ? 'text-pink-600 bg-pink-50 border-l-4 border-pink-600'
                        : 'text-gray-700 hover:text-pink-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className={`h-6 w-6 mr-4 transition-colors duration-200 ${
                    'group-hover:text-pink-600'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Logout Button */}
            <div className="px-2 pb-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group"
              >
                <LogOut className="h-6 w-6 mr-4 group-hover:text-red-700 transition-colors duration-200" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}; 