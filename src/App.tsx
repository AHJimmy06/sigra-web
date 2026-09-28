import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { Shell } from '@/components/Shell'
import { AnnouncementsPage } from '@/pages/AnnouncementsPage'
import { AccessEventsPage } from '@/pages/AccessEventsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GuardScannerPage } from '@/pages/GuardScannerPage'
import { LoginPage } from '@/pages/LoginPage'
import { ResidentsPage } from '@/pages/ResidentsPage'
import { ResidentDetailPage } from '@/pages/ResidentDetailPage'
import { ResidentDashboardPage } from '@/pages/ResidentDashboardPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { UnitsPage } from '@/pages/UnitsPage'

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando SIGRA?</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN' && user.role !== 'GUARD' && user.role !== 'RESIDENT') return <UnsupportedRole />
  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={user.role === 'ADMIN' ? <DashboardPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/residents" element={user.role === 'ADMIN' ? <ResidentsPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/residents/:residentId" element={user.role === 'ADMIN' ? <ResidentDetailPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/units" element={user.role === 'ADMIN' ? <UnitsPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/announcements" element={user.role === 'ADMIN' ? <AnnouncementsPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/tickets" element={user.role === 'ADMIN' ? <TicketsPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/access-events" element={user.role === 'ADMIN' ? <AccessEventsPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/guard'} replace />} />
        <Route path="/guard" element={user.role === 'GUARD' ? <GuardScannerPage /> : <Navigate to={user.role === 'RESIDENT' ? '/resident-home' : '/dashboard'} replace />} />
        <Route path="/resident-home" element={user.role === 'RESIDENT' ? <ResidentDashboardPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to={user.role === 'GUARD' ? '/guard' : user.role === 'RESIDENT' ? '/resident-home' : '/dashboard'} replace />} />
      </Routes>
    </Shell>
  )
}

function UnsupportedRole() {
  const { invalidateSession } = useAuth()
  useEffect(() => invalidateSession('Unsupported session role.'), [invalidateSession])
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
