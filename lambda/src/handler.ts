import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  handleGetOrders,
  handleCreateOrder,
  handleUpdateOrder,
  handleNotifyOrder,
} from "./routes/orders";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  console.log("Evento recibido:", JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path;

  // POST /api/orders/notify — debe ir ANTES del regex /{id}
  if (method === "POST" && path === "/api/orders/notify") {
    return handleNotifyOrder(event.body ?? "{}");
  }

  // Extrae el ID de /api/orders/{id}
  const match = path.match(/^\/api\/orders\/([^/]+)$/);
  const id = match?.[1];

  // GET /api/orders
  if (method === "GET" && path === "/api/orders") {
    return handleGetOrders();
  }

  // POST /api/orders
  if (method === "POST" && path === "/api/orders") {
    return handleCreateOrder(event.body ?? "{}");
  }

  // PATCH /api/orders/:id
  if (method === "PATCH" && id) {
    return handleUpdateOrder(id, event.body ?? "{}");
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Route not found" }),
  };
}
