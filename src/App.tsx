import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { Shell } from '@/components/Shell'
import { AnnouncementsPage } from '@/pages/AnnouncementsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GuardScannerPage } from '@/pages/GuardScannerPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResidentsPage } from '@/pages/ResidentsPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { UnitsPage } from '@/pages/UnitsPage'

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando SIGRA…</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={user.role === 'ADMIN' ? <DashboardPage /> : <Navigate to="/guard" replace />} />
        <Route path="/residents" element={user.role === 'ADMIN' ? <ResidentsPage /> : <Navigate to="/guard" replace />} />
        <Route path="/units" element={user.role === 'ADMIN' ? <UnitsPage /> : <Navigate to="/guard" replace />} />
        <Route path="/announcements" element={user.role === 'ADMIN' ? <AnnouncementsPage /> : <Navigate to="/guard" replace />} />
        <Route path="/tickets" element={user.role === 'ADMIN' ? <TicketsPage /> : <Navigate to="/guard" replace />} />
        <Route path="/guard" element={user.role === 'GUARD' ? <GuardScannerPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to={user.role === 'GUARD' ? '/guard' : '/dashboard'} replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
