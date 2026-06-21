export type OrderStatus = "pending" | "making" | "finished" | "canceled";

export type Order = {
  apiId: number;
  id: string;
  customer: string;
  branch: string;
  items: string[];
  total: number;
  status: OrderStatus;
  paidBy: "Line Pay" | "Credit Card" | "Cash";
  pickupTime: string;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  soldToday: number;
  stock: "normal" | "low" | "sold-out";
};

export type Branch = {
  id: string;
  name: string;
  manager: string;
  open: boolean;
  ordersToday: number;
  revenueToday: number;
};

export type Member = {
  id: string;
  name: string;
  tier: "一般" | "銀卡" | "金卡";
  points: number;
  lastOrder: string;
  totalSpent: number;
};

export type Coupon = {
  id: string;
  title: string;
  code: string;
  discount: string;
  active: boolean;
  used: number;
  expiresAt: string;
};
