import { randomUUID } from "crypto";
import { Order, OrderStatus, OrderItem } from "../types/order";

const orders: Map<string, Order> = new Map();

export function findAll(): Order[] {
  return Array.from(orders.values());
}

export function findById(id: string): Order | undefined {
  return orders.get(id);
}

export interface CreateOrderData {
  id?: string;
  customerName: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
}

export function create(data: CreateOrderData): Order {
  const order: Order = {
    id: data.id ?? randomUUID(),
    customerName: data.customerName,
    tableNumber: data.tableNumber,
    items: data.items,
    total: data.total,
    status: OrderStatus.PENDING,
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  return order;
}

export function updateStatus(
  id: string,
  status: OrderStatus,
): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const updated: Order = { ...order, status };
  orders.set(id, updated);
  return updated;
}
