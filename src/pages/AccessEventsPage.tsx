import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/api/client";
import { Pagination } from "@/components/Pagination";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/PageState";
import { Modal } from "@/components/ui/modal";
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface AccessEvent {
  id: string;
  decision: "ALLOWED" | "DENIED";
  reason: string;
  direction: "ENTRY" | "EXIT";
  occurredAt: string;
  resident?: { name: string; unitCode?: string };
  guard?: { email: string };
}
const reasonLabels: Record<string, string> = {
  ALLOWED: "Acceso autorizado",
  DENIED: "Acceso denegado",
  EXPIRED: "Código vencido",
  INVALID: "Código no válido",
  INVALID_TOTP: "Código no válido",
  RESIDENT_INACTIVE: "Residente inactivo",
  UNIT_INACTIVE: "Unidad inactiva",
};
const decisionLabels = {
  ALL: "Todas las decisiones",
  ALLOWED: "Autorizados",
  DENIED: "Denegados",
} as const;

export function AccessEventsPage() {
  const [items, setItems] = useState<AccessEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] =
    useState<keyof typeof decisionLabels>("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AccessEvent | null>(null);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    searchParams.set("page", page.toString());
    searchParams.set("pageSize", pageSize.toString());
    if (query.trim()) searchParams.set("search", query.trim());
    if (decisionFilter !== "ALL") searchParams.set("decision", decisionFilter);
    if (directionFilter !== "ALL") searchParams.set("direction", directionFilter);
    if (fromDate) searchParams.set("from", fromDate);
    if (toDate) searchParams.set("to", toDate);

    api<PaginatedResponse<AccessEvent>>(`/access/events?${searchParams.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, query, decisionFilter, directionFilter, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Historial de accesos"
        description="Consulte las decisiones registradas por la garita y supervise el flujo de entradas y salidas."
      />
      {error && <ErrorState message={error} />}
      <section
        className="mb-6 rounded-xl border bg-card p-4"
        aria-label="Filtros del historial de accesos"
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4" />
          Buscar y filtrar eventos
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_150px_150px]">
          <label className="relative">
            <span className="sr-only">Buscar residente, unidad o guardia</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Ej. Ana García o Torre A-101"
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por decisión</span>
            <select
              value={decisionFilter}
              onChange={(event) => {
                setDecisionFilter(
                  event.target.value as keyof typeof decisionLabels,
                );
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            >
              {Object.entries(decisionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por dirección</span>
            <select
              value={directionFilter}
              onChange={(event) => {
                setDirectionFilter(event.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            >
              <option value="ALL">Ambas direcciones</option>
              <option value="ENTRY">Entradas</option>
              <option value="EXIT">Salidas</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Fecha inicial</span>
            <input
              type="date"
              aria-label="Fecha inicial"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <label>
            <span className="sr-only">Fecha final</span>
            <input
              type="date"
              aria-label="Fecha final"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"
            />
          </label>
        </div>
      </section>
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState>
          {total === 0
            ? "Todavía no hay eventos de acceso."
            : "No hay eventos que coincidan con los filtros seleccionados."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3">Resultado</th>
                <th className="p-3">Residente / unidad</th>
                <th className="p-3">Dirección</th>
                <th className="p-3">Motivo</th>
                <th className="p-3">Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedEvent(item)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-2 font-medium ${item.decision === "ALLOWED" ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {item.decision === "ALLOWED" ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <ShieldAlert className="size-4" />
                      )}
                      {item.decision === "ALLOWED" ? "Autorizado" : "Denegado"}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">
                      {item.resident?.name ?? "No identificado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.resident?.unitCode ?? "Unidad no disponible"}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      {item.direction === "ENTRY" ? (
                        <ArrowDownToLine className="size-4" />
                      ) : (
                        <ArrowUpFromLine className="size-4" />
                      )}
                      {item.direction === "ENTRY" ? "Entrada" : "Salida"}
                    </span>
                  </td>
                  <td className="p-3">
                    {reasonLabels[item.reason] ?? item.reason}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(item.occurredAt).toLocaleString("es")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && total > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}

      {selectedEvent && (
        <Modal
          open={true}
          onClose={() => setSelectedEvent(null)}
          title="Detalle de Auditoría de Acceso"
          description="Información detallada del evento registrado en la garita. Esta bitácora es inalterable y no expone secretos criptográficos."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
              <div>
                <span className="text-xs text-muted-foreground block">ID del Evento</span>
                <span className="text-sm font-mono">{selectedEvent.id}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Fecha y Hora</span>
                <span className="text-sm">{new Date(selectedEvent.occurredAt).toLocaleString("es")}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Dirección</span>
                <span className="text-sm">{selectedEvent.direction === "ENTRY" ? "Entrada" : "Salida"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Guardia de Turno</span>
                <span className="text-sm font-medium">{selectedEvent.guard?.email ?? "Desconocido"}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Información del Solicitante</h3>
              <p className="text-sm"><span className="text-muted-foreground">Residente:</span> {selectedEvent.resident?.name ?? "No identificado"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Unidad:</span> {selectedEvent.resident?.unitCode ?? "N/A"}</p>
            </div>

            <div className={`rounded-lg border p-4 ${selectedEvent.decision === "ALLOWED" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <h3 className={`font-semibold mb-2 ${selectedEvent.decision === "ALLOWED" ? "text-emerald-800" : "text-red-800"}`}>
                Decisión: {selectedEvent.decision === "ALLOWED" ? "Acceso Permitido" : "Acceso Denegado"}
              </h3>
              <p className="text-sm text-foreground/80">
                <span className="font-medium">Razón:</span> {reasonLabels[selectedEvent.reason] ?? selectedEvent.reason}
              </p>
              <p className="text-xs mt-2 opacity-60">
                Nota: No se muestran llaves criptográficas ni el token QR original por políticas de seguridad.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
