import type { Order, OrderStatus } from "@/types/admin";

type ApiOrderStatus = OrderStatus;

type ApiOrderItem = {
  drink_id: number;
  drink_name: string;
  quantity: number;
  sweetness: string;
  ice_level: string;
  unit_price: number;
  subtotal: number;
};

type ApiOrder = {
  id: number;
  order_no: string;
  customer_name: string;
  phone: string;
  items: ApiOrderItem[];
  total_price: number;
  status: ApiOrderStatus;
  created_at: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function getOrders(signal?: AbortSignal): Promise<Order[]> {
  const response = await fetch(`${apiBaseUrl}/api/orders`, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  const orders = (await response.json()) as ApiOrder[];
  return orders.map(toOrder);
}

export async function updateOrderStatus(orderId: number, status: OrderStatus, token: string): Promise<Order> {
  const response = await fetch(`${apiBaseUrl}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `更新訂單狀態失敗（HTTP ${response.status}）`);
  }

  if (!data) {
    throw new Error("更新訂單狀態 API 沒有回傳 JSON。");
  }

  return toOrder(data as ApiOrder);
}

function toOrder(order: ApiOrder): Order {
  return {
    apiId: order.id,
    id: order.order_no || `ORD-${order.id}`,
    customer: order.customer_name || order.phone || "未填姓名",
    branch: "總店",
    items: order.items.map((item) => {
      const options = [item.sweetness, item.ice_level].filter(Boolean).join(" / ");
      return `${item.drink_name} x${item.quantity}${options ? `（${options}）` : ""}`;
    }),
    total: Number(order.total_price),
    status: order.status,
    paidBy: "Cash",
    pickupTime: formatOrderTime(order.created_at)
  };
}

function formatOrderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
