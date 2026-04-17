/**
 * URLs del API y medios cuando el front (Vercel) y el backend (Railway) están en distintos orígenes.
 *
 * - VITE_API_BASE_URL: origen del API, sin barra final (ej. https://api.tudominio.com)
 * - VITE_WS_URL: opcional; si falta, se deriva del API (http→ws, https→wss)
 */

const apiBase =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
    : "";

/** Prefijo para rutas /api y /uploads en fetch. */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!apiBase) {
    return path;
  }
  if (path.startsWith("/api") || path.startsWith("/uploads")) {
    return `${apiBase}${path}`;
  }
  return path;
}

/** Imágenes/videos guardados como /api/files/… o /uploads/… deben apuntar al host del API. */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (url == null || url === "") {
    return undefined;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (!apiBase) {
    return url;
  }
  if (url.startsWith("/api/") || url.startsWith("/uploads/")) {
    return `${apiBase}${url}`;
  }
  return url;
}

/** WebSocket del backend (tracking de pedidos, etc.). */
export function websocketUrl(path = "/ws"): string {
  const explicit =
    typeof import.meta.env.VITE_WS_URL === "string"
      ? import.meta.env.VITE_WS_URL.replace(/\/$/, "")
      : "";
  const p = path.startsWith("/") ? path : `/${path}`;

  if (explicit) {
    return `${explicit}${p}`;
  }

  if (apiBase) {
    let href = apiBase;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    const u = new URL(href);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return `${u.origin.replace(/\/$/, "")}${p}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${p}`;
}
