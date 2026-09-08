import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/PageState'
import { applyApiFieldErrors, validateFieldOnInput, validateFieldOnInvalid } from '@/components/FieldFeedback'

export function LoginPage() {
  const { user, login } = useAuth(); const navigate = useNavigate()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false)
  if (user) return <Navigate to={user.role === 'GUARD' ? '/guard' : '/dashboard'} replace />
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; if (form.dataset.submitting) return; form.dataset.submitting = 'true'; setBusy(true); setError(''); try { await login(email.trim().toLowerCase(), password); navigate('/') } catch (value) { applyApiFieldErrors(form, value); setError(value instanceof Error ? value.message : 'No fue posible iniciar sesión.') } finally { delete form.dataset.submitting; setBusy(false) } }
  return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><form id="login-form" onSubmit={submit} onInvalid={validateFieldOnInvalid} onInput={validateFieldOnInput} className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
    <div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck /></span><div><h1 className="text-2xl font-semibold">Bienvenido a SIGRA</h1><p className="text-sm text-muted-foreground">Inicie sesión para continuar</p></div></div>
    {error && <ErrorState message={error} />}
    <label className="mb-4 block text-sm font-medium">Correo electrónico<input name="email" className="mt-2 w-full rounded-lg border bg-background px-3 py-2" type="email" autoComplete="email" placeholder="ejemplo@correo.com" required value={email} onBlur={() => setEmail((value) => value.trim().toLowerCase())} onChange={(e) => setEmail(e.target.value)} /></label>
    <div className="mb-6"><label htmlFor="login-password" className="block text-sm font-medium">Contraseña</label><div className="relative mt-2"><input id="login-password" name="password" className="w-full rounded-lg border bg-background px-3 py-2 pr-11" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="current-password" placeholder="Escriba su contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
    <Button className="w-full" disabled={busy}><LogIn className="size-4" />{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</Button>
  </form></main>
}
