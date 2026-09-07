import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/PageState";
import {
  clearSpanishValidationMessage,
  setSpanishValidationMessage,
} from "@/lib/formValidation";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  if (user)
    return (
      <Navigate to={user.role === "GUARD" ? "/guard" : "/dashboard"} replace />
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <form
        onSubmit={submit}
        onInvalid={setSpanishValidationMessage}
        onInput={clearSpanishValidationMessage}
        className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm"
      >
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Bienvenido a SIGRA</h1>
            <p className="text-sm text-muted-foreground">
              Inicie sesión para continuar
            </p>
          </div>
        </div>
        {error && <ErrorState message={error} />}
        <label className="mb-4 block text-sm font-medium">
          Correo electrónico
          <input
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
            type="email"
            autoComplete="email"
            placeholder="ejemplo@correo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {/* Campo de Contraseña con el botón del "ojito" */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"} // Cambia dinámicamente el tipo
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showPassword ? (
                /* Ícono de Ojo Cerrado (Ocultar) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                /* Ícono de Ojo Abierto (Mostrar) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mb-6 text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ¿Olvidó su contraseña?
          </Link>
        </div>
        <Button className="w-full" disabled={busy}>
          <LogIn className="size-4" />
          {busy ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>
    </main>
  );
}
