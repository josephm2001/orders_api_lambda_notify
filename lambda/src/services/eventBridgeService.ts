import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";

let client: EventBridgeClient | null = null;

function getClient(): EventBridgeClient {
  if (!client) client = new EventBridgeClient({});
  return client;
}

function getEventBusName(): string {
  return process.env.EVENT_BUS_NAME ?? "express-bite-events";
}

export interface OrderCreatedDetail {
  orderId: string;
  customerName: string;
  customerEmail: string;
  tableNumber: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    priceAtPurchase: number;
    lineTotal: number;
  }>;
  total: number;
  status: string;
  createdAt: string;
}

export async function publishOrderCreated(
  detail: OrderCreatedDetail,
): Promise<void> {
  const entry: PutEventsRequestEntry = {
    Source: "express-bite.orders",
    DetailType: "OrderCreated",
    EventBusName: getEventBusName(),
    Detail: JSON.stringify(detail),
  };

  const command = new PutEventsCommand({ Entries: [entry] });
  const result = await getClient().send(command);

  if (result.FailedEntryCount && result.FailedEntryCount > 0) {
    throw new Error(
      `EventBridge PutEvents failed for order ${detail.orderId}`,
    );
  }
}
