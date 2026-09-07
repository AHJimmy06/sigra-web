import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppErrorBoundaryProps { children: ReactNode }
interface AppErrorBoundaryState { hasError: boolean; errorId: string }

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, errorId: '' }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true, errorId: crypto.randomUUID() }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SIGRA render error', { error, componentStack: info.componentStack, errorId: this.state.errorId })
  }

  reset = () => { this.setState({ hasError: false, errorId: '' }) }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="grid min-h-screen place-items-center bg-muted/40 p-4"><section className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-sm"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive"><ShieldAlert className="size-6" /></div><h1 className="mt-5 text-xl font-semibold">No se pudo cargar esta vista</h1><p className="mt-2 text-sm text-muted-foreground">Ocurrió un error inesperado. Intente cargar la aplicación nuevamente.</p><p className="mt-3 text-xs text-muted-foreground">Referencia: {this.state.errorId}</p><Button className="mt-6" onClick={this.reset}><RefreshCw className="size-4" />Reintentar</Button></section></main>
  }
}
