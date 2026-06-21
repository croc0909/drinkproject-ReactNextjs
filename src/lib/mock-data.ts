import type { Branch, Coupon, Member, MenuItem, Order } from "@/types/admin";

export const orders: Order[] = [
  {
    apiId: 1,
    id: "ORD-24061",
    customer: "林小姐",
    branch: "台北信義店",
    items: ["珍珠奶茶 L", "四季春青茶 M"],
    total: 135,
    status: "pending",
    paidBy: "Line Pay",
    pickupTime: "10:35"
  },
  {
    apiId: 2,
    id: "ORD-24060",
    customer: "王先生",
    branch: "台中公益店",
    items: ["芝士奶蓋綠 L"],
    total: 80,
    status: "making",
    paidBy: "Credit Card",
    pickupTime: "10:28"
  },
  {
    apiId: 3,
    id: "ORD-24059",
    customer: "陳小姐",
    branch: "高雄巨蛋店",
    items: ["檸檬冬瓜 M", "黑糖鮮奶 L"],
    total: 150,
    status: "finished",
    paidBy: "Cash",
    pickupTime: "10:20"
  },
  {
    apiId: 4,
    id: "ORD-24058",
    customer: "張先生",
    branch: "台北信義店",
    items: ["茉莉綠茶 M"],
    total: 40,
    status: "finished",
    paidBy: "Line Pay",
    pickupTime: "10:05"
  }
];

export const menuItems: MenuItem[] = [
  { id: "DRK-01", name: "珍珠奶茶", category: "奶茶", price: 65, description: "濃厚奶茶搭配 Q 彈珍珠。", imageUrl: "", soldToday: 128, stock: "normal" },
  { id: "DRK-02", name: "四季春青茶", category: "原茶", price: 45, description: "清香回甘的經典青茶。", imageUrl: "", soldToday: 92, stock: "normal" },
  { id: "DRK-03", name: "芝士奶蓋綠", category: "奶蓋", price: 80, description: "綠茶加上鹹甜奶蓋。", imageUrl: "", soldToday: 64, stock: "low" },
  { id: "DRK-04", name: "黑糖鮮奶", category: "鮮奶", price: 85, description: "黑糖香氣與鮮奶融合。", imageUrl: "", soldToday: 73, stock: "normal" },
  { id: "DRK-05", name: "芒果冰沙", category: "季節", price: 95, description: "清爽芒果冰沙。", imageUrl: "", soldToday: 38, stock: "sold-out" }
];

export const branches: Branch[] = [
  { id: "BR-01", name: "台北信義店", manager: "Jamie", open: true, ordersToday: 214, revenueToday: 15420 },
  { id: "BR-02", name: "台中公益店", manager: "Ming", open: true, ordersToday: 168, revenueToday: 11880 },
  { id: "BR-03", name: "高雄巨蛋店", manager: "Ivy", open: true, ordersToday: 143, revenueToday: 10230 },
  { id: "BR-04", name: "新竹光復店", manager: "Leo", open: false, ordersToday: 0, revenueToday: 0 }
];

export const members: Member[] = [
  { id: "MB-1021", name: "林小姐", tier: "金卡", points: 1840, lastOrder: "今天 10:35", totalSpent: 12680 },
  { id: "MB-1018", name: "王先生", tier: "銀卡", points: 920, lastOrder: "今天 10:28", totalSpent: 7430 },
  { id: "MB-0977", name: "陳小姐", tier: "一般", points: 260, lastOrder: "昨天 18:42", totalSpent: 2140 }
];

export const coupons: Coupon[] = [
  { id: "CP-01", title: "新會員首購折抵", code: "WELCOME50", discount: "折 $50", active: true, used: 342, expiresAt: "2026-08-31" },
  { id: "CP-02", title: "夏季冰沙活動", code: "SUMMER20", discount: "8 折", active: true, used: 186, expiresAt: "2026-07-15" },
  { id: "CP-03", title: "午後茶飲組合", code: "TEA2PM", discount: "第二杯半價", active: false, used: 91, expiresAt: "2026-06-30" }
];

export const salesByDay = [
  { day: "一", revenue: 32800 },
  { day: "二", revenue: 35200 },
  { day: "三", revenue: 29800 },
  { day: "四", revenue: 38400 },
  { day: "五", revenue: 42100 },
  { day: "六", revenue: 48600 },
  { day: "日", revenue: 44600 }
];
