# Orders API Lambda — Express Bite

API REST serverless para gestión de pedidos del proyecto Express Bite.

- **Runtime:** Node.js 22.x
- **Arquitectura:** x86_64
- **Handler:** `dist/handler.handler`

---

## Variables de entorno

| Variable | Descripción | Requerida para |
|---|---|---|
| `PRODUCTS_API_URL` | URL base de la Products API | `POST /api/orders`, `PATCH /api/orders/:id` |
| `EVENT_BUS_NAME` | Nombre del EventBridge custom event bus | `POST /api/orders/notify` |

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/orders` | Lista todos los pedidos |
| `POST` | `/api/orders` | Crea un pedido con validación de stock (Products API) |
| `PATCH` | `/api/orders/:id` | Actualiza el estado de un pedido |
| `POST` | `/api/orders/notify` | Registra un pedido pre-construido y publica evento en EventBridge |

---

## GET /api/orders

Retorna todos los pedidos almacenados en memoria.

**Response 200:**
```json
[
  {
    "id": "3f9c1d2a-ab44-4f7e-9b12-8e5d4c6a7f01",
    "customerName": "Maria Lopez",
    "tableNumber": "7",
    "items": [{ "productId": "prod-001", "quantity": 2, "priceAtPurchase": 4500 }],
    "total": 9000,
    "status": "PENDING",
    "createdAt": "2026-04-17T14:35:22.000Z"
  }
]
```

---

## POST /api/orders

Crea un pedido consultando precios y stock a la Products API.

**Request body:**
```json
{
  "customerName": "Maria Lopez",
  "tableNumber": "7",
  "items": [
    { "productId": "prod-001", "quantity": 2 }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `customerName` | string | No | Nombre del cliente (default: `"Usuario Actual"`) |
| `tableNumber` | string | No | Número de mesa (default: `"Virtual"`) |
| `items` | array | Sí | Lista de productos a pedir |
| `items[].productId` | string | Sí | ID del producto |
| `items[].quantity` | number | Sí | Cantidad solicitada |

**Response 201:**
```json
{
  "id": "3f9c1d2a-ab44-4f7e-9b12-8e5d4c6a7f01",
  "customerName": "Maria Lopez",
  "tableNumber": "7",
  "items": [{ "productId": "prod-001", "quantity": 2, "priceAtPurchase": 4500 }],
  "total": 9000,
  "status": "PENDING",
  "createdAt": "2026-04-17T14:35:22.000Z"
}
```

| HTTP | Error | Causa |
|---|---|---|
| 400 | `Items are required` | Array `items` vacío o ausente |
| 500 | `Product {id} not found` | Producto no existe en Products API |
| 500 | `Insufficient stock for {name}` | Stock insuficiente |

---

## PATCH /api/orders/:id

Actualiza el estado de un pedido. Al pasar a `READY`, descuenta el stock en la Products API.

**Request body:**
```json
{ "status": "PREPARING" }
```

Estados válidos: `PENDING` → `PREPARING` → `READY` → `DELIVERED` | `CANCELLED`

**Response 200:** objeto `Order` actualizado.

| HTTP | Error | Causa |
|---|---|---|
| 400 | `Status is required` | Falta el campo `status` |
| 400 | `Invalid status. Valid values: ...` | Estado no válido |
| 404 | `Order {id} not found` | Pedido no existe |

---

## POST /api/orders/notify

Registra un pedido ya construido (sin consultar la Products API) y publica un evento `OrderCreated` en Amazon EventBridge. Una Event Rule enruta el evento a un SNS Topic que notifica por correo electrónico.

**Request body:**
```json
{
  "orderId": "3f9c1d2a-ab44-4f7e-9b12-8e5d4c6a7f01",
  "customerName": "Maria Lopez",
  "customerEmail": "maria.lopez@example.com",
  "tableNumber": "7",
  "items": [
    {
      "productId": "prod-001",
      "productName": "Empanada de Pollo",
      "quantity": 2,
      "priceAtPurchase": 4500
    }
  ],
  "total": 9000
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `orderId` | string | No | UUID del pedido. Si se omite, se genera automáticamente |
| `customerName` | string | Sí | Nombre del cliente |
| `customerEmail` | string | Sí | Correo del cliente — se incluye en el evento EventBridge |
| `tableNumber` | string | Sí | Número de mesa |
| `items` | array | Sí | Ítems del pedido con datos ya resueltos |
| `items[].productId` | string | Sí | ID del producto |
| `items[].productName` | string | Sí | Nombre del producto |
| `items[].quantity` | number | Sí | Cantidad |
| `items[].priceAtPurchase` | number | Sí | Precio unitario al momento de la compra |
| `total` | number | Sí | Total del pedido |

**Response 201:**
```json
{
  "id": "3f9c1d2a-ab44-4f7e-9b12-8e5d4c6a7f01",
  "customerName": "Maria Lopez",
  "tableNumber": "7",
  "items": [{ "productId": "prod-001", "quantity": 2, "priceAtPurchase": 4500 }],
  "total": 9000,
  "status": "PENDING",
  "createdAt": "2026-04-17T14:35:22.000Z"
}
```

**Evento publicado a EventBridge:**

```json
{
  "Source": "express-bite.orders",
  "DetailType": "OrderCreated",
  "EventBusName": "<EVENT_BUS_NAME>",
  "Detail": {
    "orderId": "3f9c1d2a-ab44-4f7e-9b12-8e5d4c6a7f01",
    "customerName": "Maria Lopez",
    "customerEmail": "maria.lopez@example.com",
    "tableNumber": "7",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Empanada de Pollo",
        "quantity": 2,
        "priceAtPurchase": 4500,
        "lineTotal": 9000
      }
    ],
    "total": 9000,
    "status": "PENDING",
    "createdAt": "2026-04-17T14:35:22.000Z"
  }
}
```

**Event Rule pattern** (para enrutar al SNS Topic):
```json
{
  "source": ["express-bite.orders"],
  "detail-type": ["OrderCreated"]
}
```

**Errores posibles:**

| HTTP | Error | Causa |
|---|---|---|
| 400 | `customerEmail is required` | Falta `customerEmail` en el body |
| 400 | `items are required` | Array `items` vacío o ausente |
| 400 | `total is required` | Falta `total` en el body |
| 500 | `Failed to process order notification` | Error al publicar en EventBridge |

---

## Build y despliegue

```bash
cd lambda
npm install
npm run build

# Empaquetar para Lambda
zip -r ../orders-api-lambda.zip dist/ node_modules/
```

El ZIP debe subirse a la función Lambda con handler configurado como `dist/handler.handler`.

---

## Ciclo de vida del pedido

```
PENDING → PREPARING → READY → DELIVERED
                            ↘
                           CANCELLED
```

El descuento de stock en la Products API ocurre únicamente cuando el estado cambia a `READY`.
