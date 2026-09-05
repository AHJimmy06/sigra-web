import { Bell, Building2, ClipboardList, LayoutDashboard, LogOut, QrCode, ShieldCheck, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

const adminLinks = [
  ['/dashboard', 'Panel', LayoutDashboard], ['/residents', 'Residentes', Users], ['/units', 'Unidades', Building2],
  ['/announcements', 'Cartelera', Bell], ['/tickets', 'Incidencias', ClipboardList],
] as const

const roleLabels = { ADMIN: 'Administrador', GUARD: 'Guardia', RESIDENT: 'Residente' } as const

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const links = user?.role === 'GUARD' ? [['/guard', 'Escáner QR', QrCode] as const] : adminLinks
  return <div className="min-h-screen bg-muted/35 md:grid md:grid-cols-[240px_1fr]">
    <aside className="border-b bg-background md:min-h-screen md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-4 md:block">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span><div><strong>SIGRA</strong><p className="text-xs text-muted-foreground">Gestión de accesos</p></div></div>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Cerrar sesión" onClick={logout}><LogOut className="size-4" /></Button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:py-5">
        {links.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</NavLink>)}
      </nav>
      <div className="hidden border-t p-4 md:block"><p className="truncate text-sm font-medium">{user?.email}</p><p className="mb-3 text-xs text-muted-foreground">{user && roleLabels[user.role]}</p><Button variant="outline" className="w-full" onClick={logout}><LogOut className="size-4" />Cerrar sesión</Button></div>
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
  </div>
}
