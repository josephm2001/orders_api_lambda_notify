import * as orderRepository from "../repositories/orderRepository";
import * as productService from "../services/productService";
import {
  CreateOrderBody,
  UpdateOrderBody,
  OrderStatus,
  OrderItem,
  NotifyOrderRequest,
} from "../types/order";
import {
  publishOrderCreated,
  type OrderCreatedDetail,
} from "../services/eventBridgeService";

const VALID_STATUSES = Object.values(OrderStatus);

// Respuesta estándar para Lambda / API Gateway
export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function buildResponse(statusCode: number, body: unknown): LambdaResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// GET /api/orders
export function handleGetOrders(): LambdaResponse {
  try {
    return buildResponse(200, orderRepository.findAll());
  } catch {
    return buildResponse(500, { error: "Failed to fetch orders" });
  }
}

// POST /api/orders
export async function handleCreateOrder(
  rawBody: string,
): Promise<LambdaResponse> {
  try {
    const body = JSON.parse(rawBody || "{}") as CreateOrderBody;
    const { items, customerName, tableNumber } = body;

    if (!items || items.length === 0) {
      return buildResponse(400, { error: "Items are required" });
    }

    const resolvedItems: OrderItem[] = [];

    for (const item of items) {
      const product = await productService.getProduct(item.productId);
      if (!product) {
        return buildResponse(500, {
          error: `Product ${item.productId} not found`,
        });
      }
      if (product.stock < item.quantity) {
        return buildResponse(500, {
          error: `Insufficient stock for ${product.name}`,
        });
      }
      resolvedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });
    }

    const total = resolvedItems.reduce(
      (sum, item) => sum + item.priceAtPurchase * item.quantity,
      0,
    );

    const order = orderRepository.create({
      customerName: customerName ?? "Usuario Actual",
      tableNumber: tableNumber ?? "Virtual",
      items: resolvedItems,
      total,
    });

    return buildResponse(201, order);
  } catch {
    return buildResponse(500, { error: "Failed to create order" });
  }
}

// PATCH /api/orders/:id
export async function handleUpdateOrder(
  id: string,
  rawBody: string,
): Promise<LambdaResponse> {
  try {
    const body = JSON.parse(rawBody || "{}") as UpdateOrderBody;
    const { status } = body;

    if (!status) {
      return buildResponse(400, { error: "Status is required" });
    }

    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      return buildResponse(400, {
        error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const order = orderRepository.findById(id);
    if (!order) {
      return buildResponse(404, { error: `Order ${id} not found` });
    }

    const newStatus = status as OrderStatus;

    if (newStatus === OrderStatus.READY && order.status !== OrderStatus.READY) {
      for (const item of order.items) {
        const product = await productService.getProduct(item.productId);
        if (!product) {
          return buildResponse(500, {
            error: `Failed to update order ${id} to READY`,
          });
        }
        await productService.deductStock(
          item.productId,
          product.stock,
          item.quantity,
        );
      }
    }

    const updated = orderRepository.updateStatus(id, newStatus);
    return buildResponse(200, updated);
  } catch {
    return buildResponse(500, { error: `Failed to update order ${id}` });
  }
}

// POST /api/orders/notify
export async function handleNotifyOrder(
  rawBody: string,
): Promise<LambdaResponse> {
  try {
    const body = JSON.parse(rawBody || "{}") as NotifyOrderRequest;
    const { orderId, customerName, customerEmail, tableNumber, items, total } =
      body;

    if (!customerEmail) {
      return buildResponse(400, { error: "customerEmail is required" });
    }
    if (!items || items.length === 0) {
      return buildResponse(400, { error: "items are required" });
    }
    if (total === undefined || total === null) {
      return buildResponse(400, { error: "total is required" });
    }

    const repositoryItems = items.map(({ productId, quantity, priceAtPurchase }) => ({
      productId,
      quantity,
      priceAtPurchase,
    }));

    const order = orderRepository.create({
      id: orderId,
      customerName: customerName ?? "Unknown",
      tableNumber: tableNumber ?? "Virtual",
      items: repositoryItems,
      total,
    });

    const detail: OrderCreatedDetail = {
      orderId: order.id,
      customerName: order.customerName,
      customerEmail,
      tableNumber: order.tableNumber,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        lineTotal: item.quantity * item.priceAtPurchase,
      })),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    };

    await publishOrderCreated(detail);

    return buildResponse(201, order);
  } catch (err) {
    console.error("handleNotifyOrder error:", err);
    return buildResponse(500, { error: "Failed to process order notification" });
  }
}
