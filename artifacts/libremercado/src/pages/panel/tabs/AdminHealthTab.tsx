import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity,
  Database, Users, ShoppingBag, Package, Bike, FileVideo,
  Upload, Shield, Newspaper, Clock, Wifi, Server,
} from "lucide-react";

type CheckStatus = "ok" | "error" | "warning";

interface HealthCheck {
  name: string;
  status: CheckStatus;
  latency?: number;
  detail?: string;
  message?: string;
}

interface HealthData {
  status: "healthy" | "degraded" | "warning";
  uptime: number;
  checkedAt: string;
  totalMs: number;
  checks: HealthCheck[];
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  "Base de datos (PostgreSQL)": Database,
  "Módulo Usuarios": Users,
  "Módulo Comercios": ShoppingBag,
  "Módulo Productos": Package,
  "Módulo Pedidos": ShoppingBag,
  "Módulo Riders": Bike,
  "Módulo Novedades": Newspaper,
  "KYC / Verificación": Shield,
  "Módulo Videos (ReelMark)": FileVideo,
  "Servicio de archivos (Upload)": Upload,
};

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusIcon({ status, size = 5 }: { status: CheckStatus | "healthy" | "degraded"; size?: number }) {
  const cls = `h-${size} w-${size}`;
  if (status === "ok" || status === "healthy") return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (status === "error" || status === "degraded") return <XCircle className={`${cls} text-red-500`} />;
  return <AlertTriangle className={`${cls} text-amber-500`} />;
}

function StatusBadge({ status }: { status: HealthData["status"] }) {
  if (status === "healthy") return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold">Operativo</Badge>;
  if (status === "degraded") return <Badge className="bg-red-100 text-red-700 border border-red-200 font-semibold">Con errores</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-semibold">Advertencias</Badge>;
}

function LatencyBar({ ms }: { ms: number }) {
  const color = ms < 50 ? "bg-emerald-500" : ms < 200 ? "bg-amber-400" : "bg-red-500";
  const width = Math.min(100, (ms / 500) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${width}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold w-14 text-right ${ms < 50 ? "text-emerald-600" : ms < 200 ? "text-amber-600" : "text-red-600"}`}>
        {ms}ms
      </span>
    </div>
  );
}

export function AdminHealthTab() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
        setCountdown(30);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchHealth();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const globalBg = !data ? "from-gray-50 to-gray-100" :
    data.status === "healthy" ? "from-emerald-50 to-green-50" :
    data.status === "degraded" ? "from-red-50 to-rose-50" :
    "from-amber-50 to-yellow-50";

  const globalBorder = !data ? "border-gray-200" :
    data.status === "healthy" ? "border-emerald-200" :
    data.status === "degraded" ? "border-red-200" : "border-amber-200";

  const okCount = data?.checks.filter(c => c.status === "ok").length ?? 0;
  const errCount = data?.checks.filter(c => c.status === "error").length ?? 0;
  const warnCount = data?.checks.filter(c => c.status === "warning").length ?? 0;
  const avgLatency = data
    ? Math.round(data.checks.filter(c => c.latency != null).reduce((s, c) => s + (c.latency ?? 0), 0) /
        Math.max(1, data.checks.filter(c => c.latency != null).length))
    : null;

  return (
    <div className="space-y-6">

      {/* Header card */}
      <Card className={`bg-gradient-to-r ${globalBg} border ${globalBorder}`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                !data ? "bg-gray-200" :
                data.status === "healthy" ? "bg-emerald-100" :
                data.status === "degraded" ? "bg-red-100" : "bg-amber-100"
              }`}>
                {loading
                  ? <RefreshCw className="h-7 w-7 text-gray-400 animate-spin" />
                  : data
                    ? <StatusIcon status={data.status} size={7} />
                    : <Activity className="h-7 w-7 text-gray-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-gray-800">Salud del Sistema</h2>
                  {data && <StatusBadge status={data.status} />}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  {data && (
                    <>
                      <span className="flex items-center gap-1">
                        <Server className="h-3.5 w-3.5" />
                        Uptime: <strong className="text-gray-700">{formatUptime(data.uptime)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Verificado: <strong className="text-gray-700">
                          {new Date(data.checkedAt).toLocaleTimeString("es-AR")}
                        </strong>
                      </span>
                      {avgLatency !== null && (
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3.5 w-3.5" />
                          Latencia prom: <strong className="text-gray-700">{avgLatency}ms</strong>
                        </span>
                      )}
                    </>
                  )}
                  {!data && !loading && <span className="text-gray-400">Sin datos — hacé clic en Verificar</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Próximo refresh</div>
                <div className="text-2xl font-black text-gray-600 tabular-nums">{countdown}s</div>
              </div>
              <Button onClick={fetchHealth} disabled={loading} className="gap-2" data-testid="button-health-refresh">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Verificar ahora
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border border-emerald-100 bg-emerald-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <div className="text-2xl font-black text-emerald-700">{okCount}</div>
                <div className="text-xs font-semibold text-emerald-600">Módulos operativos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-red-100 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500 shrink-0" />
              <div>
                <div className="text-2xl font-black text-red-700">{errCount}</div>
                <div className="text-xs font-semibold text-red-600">Con errores</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-amber-100 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <div className="text-2xl font-black text-amber-700">{warnCount}</div>
                <div className="text-xs font-semibold text-amber-600">Advertencias</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checks grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Estado por módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !data && (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p className="text-sm">Verificando todos los módulos...</p>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.checks.map((check, i) => {
                const Icon = MODULE_ICONS[check.name] ?? Activity;
                const borderColor = check.status === "ok"
                  ? "border-emerald-100 hover:border-emerald-200"
                  : check.status === "error"
                  ? "border-red-200 bg-red-50/50 hover:border-red-300"
                  : "border-amber-200 bg-amber-50/50 hover:border-amber-300";

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${borderColor} transition-colors`}
                    data-testid={`health-check-${i}`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      check.status === "ok" ? "bg-emerald-100" :
                      check.status === "error" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      <Icon className={`h-4.5 w-4.5 ${
                        check.status === "ok" ? "text-emerald-600" :
                        check.status === "error" ? "text-red-600" : "text-amber-600"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{check.name}</span>
                        <StatusIcon status={check.status} size={4} />
                      </div>

                      {check.detail && (
                        <p className="text-xs text-gray-500 mb-1.5 truncate">{check.detail}</p>
                      )}
                      {check.message && (
                        <p className="text-xs text-red-600 font-medium mb-1.5 break-words">{check.message}</p>
                      )}

                      {check.latency !== undefined && (
                        <LatencyBar ms={check.latency} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last refresh footer */}
      {lastRefresh && (
        <p className="text-center text-xs text-gray-400">
          Última verificación: {lastRefresh.toLocaleString("es-AR")} · Refresh automático cada 30 segundos
        </p>
      )}
    </div>
  );
}
