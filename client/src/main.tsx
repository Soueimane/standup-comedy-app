import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Dashboard from './pages/Dashboard.tsx'
import LoginPage from './pages/LoginPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import MyEventsPage from './pages/MyEventsPage.tsx'
import OrganizerProfilePage from './pages/OrganizerProfilePage.tsx'
import ApplicationsPage from './pages/ApplicationsPage.tsx'
import ComedianProfilePage from './pages/ComedianProfilePage.tsx'
import ComedianDashboardPage from './pages/ComedianDashboardPage.tsx'
import DirectoryPage from './pages/DirectoryPage.tsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
// import type { IUserData } from './types/user.ts'
import LandingPage from './pages/LandingPage'

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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardRouter />} />
      <Route path="/events" element={<MyEventsPage />} />
      <Route path="/profile/organizer" element={<OrganizerProfilePage />} />
      <Route path="/applications" element={<ApplicationsPage />} />
      <Route path="/profile/comedian" element={<ComedianProfilePage />} />
      <Route path="/directory" element={<DirectoryPage />} />
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
  const { user } = useAuth()
  console.log("🏠 DashboardRouter - Utilisateur:", user?.email, "Rôle:", user?.role);
  
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
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  </Router>,
)
