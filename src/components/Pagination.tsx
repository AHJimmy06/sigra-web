import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageCount, total, pageSize, onPageChange }: PaginationProps) {
  if (total === 0) return null
  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, total)
  return <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
    <p className="text-sm text-muted-foreground">Mostrando {firstItem}-{lastItem} de {total}</p>
    {pageCount > 1 && <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="size-4" />Anterior</Button><span className="min-w-20 text-center text-sm text-muted-foreground">Página {page} de {pageCount}</span><Button type="button" variant="outline" size="sm" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>Siguiente<ChevronRight className="size-4" /></Button></div>}
  </nav>
}
