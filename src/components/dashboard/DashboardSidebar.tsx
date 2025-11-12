
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home,
  Calendar,
  Users,
  MessageCircle,
  BarChart3,
  Settings,
  LogOut,
  MapPin,
  Trophy,
  Zap,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  userType: 'humoriste' | 'organisateur';
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ userType }) => {
  const { user, logout } = useAuth();

  const humoristeMenuItems = [
    { icon: Home, label: 'Tableau de bord', href: '/dashboard/humoriste' },
    { icon: MapPin, label: 'Opportunités', href: '/dashboard/humoriste/opportunities' },
    { icon: Calendar, label: 'Mes candidatures', href: '/dashboard/humoriste/applications' },
    { icon: MessageCircle, label: 'Messages', href: '/dashboard/humoriste/messages' },
    { icon: Zap, label: 'Score viral', href: '/dashboard/humoriste/viral' },
    { icon: BarChart3, label: 'Statistiques', href: '/dashboard/humoriste/stats' },
    { icon: Settings, label: 'Profil', href: '/dashboard/humoriste/profile' }
  ];

  const organisateurMenuItems = [
    { icon: Home, label: 'Tableau de bord', href: '/dashboard/organisateur' },
    { icon: Calendar, label: 'Mes événements', href: '/dashboard/organisateur/events' },
    { icon: Users, label: 'Rechercher', href: '/dashboard/organisateur/search' },
    { icon: MessageCircle, label: 'Messages', href: '/dashboard/organisateur/messages' },
    { icon: FileText, label: 'Facturation', href: '/dashboard/organisateur/billing' },
    { icon: BarChart3, label: 'Statistiques', href: '/dashboard/organisateur/stats' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/organisateur/settings' }
  ];

  const menuItems = userType === 'humoriste' ? humoristeMenuItems : organisateurMenuItems;

  return (
    <div className="w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 p-6 flex flex-col">
      {/* Logo & User Info */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
            userType === 'humoriste' 
              ? 'bg-gradient-to-r from-pink-500 to-red-500' 
              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
          }`}>
            {userType === 'humoriste' ? '🎤' : '🎪'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Stand Up Connect</h2>
            <p className="text-xs text-gray-400">
              {userType === 'humoriste' ? 'Espace Humoriste' : 'Espace Organisateur'}
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
              {user?.firstName[0]}{user?.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {userType === 'humoriste' && user?.userType === 'humoriste' && 'stageName' in user.profile && user.profile.stageName 
                  ? user.profile.stageName 
                  : `${user?.firstName} ${user?.lastName}`}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.li
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <a
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/70 transition-all group"
              >
                <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">{item.label}</span>
              </a>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="pt-6 border-t border-gray-800">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800/70"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
