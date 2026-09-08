import { Bell, Building2, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, QrCode, ShieldCheck, UserCircle, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'
import { useState } from 'react'

const adminLinks = [
  ['/dashboard', 'Panel', LayoutDashboard], ['/residents', 'Residentes', Users], ['/units', 'Unidades', Building2],
  ['/announcements', 'Cartelera', Bell], ['/tickets', 'Incidencias', ClipboardList],
] as const

const roleLabels = { ADMIN: 'Administrador', GUARD: 'Guardia', RESIDENT: 'Residente' } as const

function accountLabel(email: string | undefined) { return email?.split('@')[0] ?? '' }

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = user?.role === 'GUARD' ? [['/guard', 'Escáner QR', QrCode] as const] : adminLinks
  const shellColumns = collapsed ? 'md:grid-cols-[72px_1fr]' : 'md:grid-cols-[72px_1fr] xl:grid-cols-[240px_1fr]'
  return <div className={`min-h-screen bg-muted/35 md:grid ${shellColumns}`}>
    {mobileOpen && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-foreground/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-background shadow-xl transition-transform md:static md:z-auto md:w-auto md:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className={`flex items-center justify-between px-4 py-4 ${collapsed ? 'md:px-3' : 'xl:px-5'}`}>
        <div className={`flex min-w-0 items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span><div className={`${collapsed ? 'md:hidden' : 'md:hidden xl:block'} min-w-0`}><strong>SIGRA</strong><p className="text-xs text-muted-foreground">Gestión de accesos</p></div></div>
        <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}><X className="size-4" /></Button>
      </div>
      <nav id="primary-navigation" className={`space-y-1 px-3 py-5 ${collapsed ? 'md:px-2' : 'xl:px-3'}`}>
        {links.map(([to, label, Icon]) => <NavLink key={to} to={to} aria-label={label} title={label} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${collapsed ? 'md:justify-center md:px-2' : 'md:justify-center md:px-2 xl:justify-start xl:px-3'} ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4 shrink-0" /><span className={collapsed ? 'md:hidden' : 'md:hidden xl:inline'}>{label}</span></NavLink>)}
      </nav>
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-10"><header className="mb-8 flex items-center justify-between gap-3 border-b pb-4"><Button type="button" variant="outline" size="icon" className="md:hidden" aria-label="Abrir menú" title="Abrir menú" onClick={() => setMobileOpen(true)}><Menu className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="hidden xl:inline-flex" aria-controls="primary-navigation" aria-expanded={!collapsed} aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'} title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</Button><div className="ml-auto flex items-center gap-3"><UserCircle className="size-9 shrink-0 text-muted-foreground" /><div className="flex min-h-9 max-w-52 flex-col justify-center text-right leading-tight"><p className="truncate text-sm font-medium">{accountLabel(user?.email)}</p><p className="mt-1 text-xs text-muted-foreground">{user && roleLabels[user.role]}</p></div><Button variant="outline" size="sm" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void logout()}><LogOut className="size-4" /><span className="hidden sm:inline">Cerrar sesión</span></Button></div></header>{children}</main>
  </div>
}
