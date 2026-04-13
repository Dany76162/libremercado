import { useEffect, useRef, useState, useCallback } from "react";
import { websocketUrl } from "@/lib/apiBase";

export interface TrackingState {
  status: string | null;
  riderLat: number | null;
  riderLng: number | null;
  connected: boolean;
  lastUpdate: Date | null;
}

export function useOrderTracking(orderId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<TrackingState>({
    status: null,
    riderLat: null,
    riderLng: null,
    connected: false,
    lastUpdate: null,
  });

  const connect = useCallback(() => {
    if (!orderId) return;

    const wsUrl = websocketUrl("/ws");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe_order", orderId }));
      setState((prev) => ({ ...prev, connected: true }));
    };

    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "order_status_update") {
        setState((prev) => ({
          ...prev,
          status: msg.payload.status,
          lastUpdate: new Date(),
        }));
      }

      if (msg.type === "rider_location_update") {
        setState((prev) => ({
          ...prev,
          riderLat: msg.payload.lat,
          riderLng: msg.payload.lng,
          lastUpdate: new Date(),
        }));
      }

      if (msg.type === "order_cancelled") {
        setState((prev) => ({
          ...prev,
          status: "cancelled",
          lastUpdate: new Date(),
        }));
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [orderId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
