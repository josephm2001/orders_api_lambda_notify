export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

function getProductsApiUrl(): string {
  const url = process.env.PRODUCTS_API_URL;
  if (!url) throw new Error("PRODUCTS_API_URL environment variable is not set");
  return url;
}

export async function getProduct(productId: string): Promise<Product | null> {
  const res = await fetch(`${getProductsApiUrl()}/api/products/${productId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch product ${productId}`);
  return res.json() as Promise<Product>;
}

export async function deductStock(
  productId: string,
  currentStock: number,
  quantity: number,
): Promise<void> {
  const newStock = currentStock - quantity;
  const res = await fetch(`${getProductsApiUrl()}/api/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock: newStock }),
  });
  if (!res.ok)
    throw new Error(`Failed to deduct stock for product ${productId}`);
}
