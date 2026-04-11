import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";

interface TrackerClient {
  ws: WebSocket;
  orderId: string;
  role: "customer" | "merchant" | "rider" | "admin";
}

interface OrderEvent {
  type: "order_status_update" | "rider_location_update" | "order_cancelled";
  orderId: string;
  payload: Record<string, unknown>;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, TrackerClient>();

export function setupWebSocket(httpServer: HttpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "subscribe_order" && msg.orderId) {
        clients.set(ws, {
          ws,
          orderId: msg.orderId,
          role: msg.role || "customer",
        });
        ws.send(JSON.stringify({ type: "subscribed", orderId: msg.orderId }));
      }

      if (msg.type === "rider_location" && msg.orderId) {
        broadcastToOrder(msg.orderId, {
          type: "rider_location_update",
          orderId: msg.orderId,
          payload: { lat: msg.lat, lng: msg.lng },
        });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: "connected" }));
  });

  console.log("[ws] WebSocket server ready on /ws");
  return wss;
}

export function broadcastToOrder(orderId: string, event: OrderEvent) {
  if (!wss) return;
  const msg = JSON.stringify(event);
  for (const [ws, client] of clients.entries()) {
    if (client.orderId === orderId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

export function broadcastOrderStatus(
  orderId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  broadcastToOrder(orderId, {
    type: "order_status_update",
    orderId,
    payload: { status, ...extra },
  });
}
