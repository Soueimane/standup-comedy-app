import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css';
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import Organisateur from './pages/LoginOrganisateur'
import RegisterPage from './pages/RegisterPage'
import MyEventsPage from './pages/MyEventsPage'
import OrganizerProfilePage from './pages/OrganizerProfilePage'
import ApplicationsPage from './pages/ApplicationsPage'
import ComedianProfilePage from './pages/ComedianProfilePage'
import ComedianDashboardPage from './pages/ComedianDashboardPage'
import DirectoryPage from './pages/DirectoryPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PasswordResetManagementPage from './pages/PasswordResetManagementPage'
import PresenceAlertsPage from './pages/PresenceAlertsPage'
import ComedianReportsPage from './pages/ComedianReportsPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
// import type { IUserData } from './types/user.ts'
import LandingPage from './pages/LandingPage'
import OAuthCallback from './pages/OAuthCallback'
import { SSEProvider } from './components/SSEProvider'
import CalendarPage from './pages/CalendarPage';
import LegalMentionsPage from './pages/LegalMentionsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/organisateur" element={<Organisateur />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/dashboard" element={<DashboardRouter />} />
      <Route path="/events" element={<MyEventsPage />} />
      <Route path="/profile/organizer" element={<OrganizerProfilePage />} />
      <Route path="/applications" element={<ApplicationsPage />} />
      <Route path="/profile/comedian/:id" element={<ComedianProfilePage />} />
      <Route path="/profile/comedian" element={<ComedianProfilePage />} />
      <Route path="/directory" element={<DirectoryPage />} />
      <Route path="/admin/password-resets" element={<PasswordResetManagementPage />} />
      <Route path="/admin/presence-alerts" element={<PresenceAlertsPage />} />
      <Route path="/admin/comedian-reports" element={<ComedianReportsPage />} />
      
<Route path="/calendar" element={<CalendarPage/>} />
      <Route path="/mentions-legales" element={<LegalMentionsPage />} />
      <Route path="/politique-confidentialite" element={<PrivacyPolicyPage />} />
      <Route path="/cgu" element={<TermsOfServicePage />} />
    </Routes>
  );
};

// const HomeRedirect = ({ token, user }: { token: string | null; user: IUserData | null }) => {
//   if (!token) {
//     return <Navigate to="/login" replace />
//   }

//   if (user?.role === 'ORGANIZER') {
//     return <Navigate to="/dashboard" replace />
//   } else if (user?.role === 'COMEDIAN') {
//     return <Navigate to="/comedian-dashboard" replace />
//   } else if (user?.role === 'SUPER_ADMIN') {
//     return <Navigate to="/dashboard" replace />
//   }

//   return <Navigate to="/login" replace />
// };

const DashboardRouter = () => {
  const { user, isLoading } = useAuth()
  console.log("🏠 DashboardRouter - Utilisateur:", user?.email, "Rôle:", user?.role, "Loading:", isLoading);

  // Attendre la fin de l'initialisation avant de prendre des décisions de routing
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
      }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (user?.role === 'ORGANIZER') {
    console.log("📊 Chargement dashboard ORGANIZER");
    return <Dashboard />
  } else if (user?.role === 'COMEDIAN') {
    console.log("🎭 Chargement dashboard COMEDIAN");
    return <ComedianDashboardPage />
  } else if (user?.role === 'SUPER_ADMIN') {
    console.log("🔥 Chargement dashboard SUPER_ADMIN");
    return <Dashboard /> // Pour l'instant, même interface que l'organisateur
  }

  console.log("❌ Aucun rôle reconnu, redirection vers login");
  return <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AlertProvider>
          <SSEProvider>
            <AppRouter />
          </SSEProvider>
        </AlertProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Router>,
)
