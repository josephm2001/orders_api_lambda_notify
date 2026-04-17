export enum OrderStatus {
  PENDING = "PENDING",
  PREPARING = "PREPARING",
  READY = "READY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  tableNumber: string;
}

export interface CreateOrderBody {
  customerName?: string;
  tableNumber?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface UpdateOrderBody {
  status: string;
}

export interface NotifyOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface NotifyOrderRequest {
  orderId?: string;
  customerName: string;
  customerEmail: string;
  tableNumber: string;
  items: NotifyOrderItem[];
  total: number;
}
