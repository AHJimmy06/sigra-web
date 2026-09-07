import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/PageState'
import { validateFieldOnFocus, validateFieldOnInput, validateFieldOnInvalid } from '@/components/FieldFeedback'

export function LoginPage() {
  const { user, login } = useAuth(); const navigate = useNavigate()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={user.role === 'GUARD' ? '/guard' : '/dashboard'} replace />
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { await login(email, password); navigate('/') } catch (value) { setError(value instanceof Error ? value.message : 'No fue posible iniciar sesión.') } finally { setBusy(false) } }
  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><form onSubmit={submit} onInvalid={validateFieldOnInvalid} onInput={validateFieldOnInput} onFocus={validateFieldOnFocus} className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
    <div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck /></span><div><h1 className="text-2xl font-semibold">Bienvenido a SIGRA</h1><p className="text-sm text-muted-foreground">Inicie sesión para continuar</p></div></div>
    {error && <ErrorState message={error} />}
    <label className="mb-4 block text-sm font-medium">Correo electrónico<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2" type="email" autoComplete="email" placeholder="ejemplo@correo.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label className="mb-2 block text-sm font-medium">Contraseña<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2" type="password" autoComplete="current-password" placeholder="Escriba su contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    <div className="mb-6 text-right"><Link to="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">¿Olvidó su contraseña?</Link></div>
    <Button className="w-full" disabled={busy}><LogIn className="size-4" />{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</Button>
  </form></main>
}
