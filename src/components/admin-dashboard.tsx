"use client";

import { useEffect, useMemo, useState } from "react";
import { branches, coupons, members, salesByDay } from "@/lib/mock-data";
import { currency, number } from "@/lib/format";
import { getDrinks } from "@/lib/drinks";
import { getOrders, updateOrderStatus } from "@/lib/orders";
import type { MenuItem, Order, OrderStatus } from "@/types/admin";

type Section = "dashboard" | "orders" | "menu" | "branches" | "members" | "coupons" | "reports" | "settings";
type AdminUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  roles: string[];
};

type LoginResponse = {
  admin: AdminUser;
  token: string;
};

const sections: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "儀表板", icon: "D" },
  { id: "orders", label: "訂單管理", icon: "O" },
  { id: "menu", label: "菜單管理", icon: "M" },
  { id: "branches", label: "分店管理", icon: "B" },
  { id: "members", label: "會員管理", icon: "U" },
  { id: "coupons", label: "優惠券", icon: "C" },
  { id: "reports", label: "銷售報表", icon: "R" },
  { id: "settings", label: "系統設定", icon: "S" }
];

const statusLabels: Record<OrderStatus, string> = {
  pending: "新訂單",
  making: "製作中",
  finished: "已完成",
  canceled: "已取消"
};

const orderStatusOptions: OrderStatus[] = ["pending", "making", "finished", "canceled"];

const adminSessionKey = "drink-admin-session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [query, setQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("andy@example.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const storedSession = window.localStorage.getItem(adminSessionKey);
    if (!storedSession) return;

    try {
      const session = JSON.parse(storedSession) as LoginResponse;
      if (session.admin && session.token) {
        setAdmin(session.admin);
        setAdminToken(session.token);
      }
    } catch {
      window.localStorage.removeItem(adminSessionKey);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setMenuLoading(true);
        setOrdersLoading(true);
        setMenuError("");
        setOrdersError("");

        const [drinks, latestOrders] = await Promise.all([
          getDrinks(controller.signal),
          getOrders(controller.signal)
        ]);

        setMenuItems(drinks);
        setOrders(latestOrders);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMenuError("無法載入飲品資料，請確認 Go API 是否已啟動。");
        setOrdersError("無法載入訂單資料，請確認 Go API 是否已啟動。");
      } finally {
        setMenuLoading(false);
        setOrdersLoading(false);
      }
    }

    loadData();

    return () => controller.abort();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderStatus === "all" || order.status === orderStatus;
      const text = `${order.id} ${order.customer} ${order.branch} ${order.items.join(" ")}`.toLowerCase();
      return matchesStatus && text.includes(query.toLowerCase());
    });
  }, [orderStatus, orders, query]);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const bestSeller = [...menuItems].sort((a, b) => b.soldToday - a.soldToday)[0];
  const maxRevenue = Math.max(...salesByDay.map((sale) => sale.revenue));
  const canManageOrders = admin?.roles.includes("super_admin") ?? false;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        throw new Error(data?.error ?? `登入 API 連線失敗（HTTP ${response.status}），請確認 Go 後端網址與路由。`);
      }

      if (!data) {
        throw new Error("登入 API 沒有回傳 JSON，請確認 Go 後端回應格式。");
      }

      const session = data as LoginResponse;
      setAdmin(session.admin);
      setAdminToken(session.token);
      window.localStorage.setItem(adminSessionKey, JSON.stringify(session));
      setLoginOpen(false);
      setLoginPassword("");
      setActiveSection("orders");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "登入失敗，請稍後再試。");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setAdmin(null);
    setAdminToken("");
    setLoginPassword("");
    window.localStorage.removeItem(adminSessionKey);
    setActiveSection("dashboard");
  }

  async function handleOrderStatusChange(order: Order, nextStatus: OrderStatus) {
    if (order.status === nextStatus) return;

    if (!adminToken) {
      setOrdersError("請先登入管理員帳號。");
      return;
    }

    setOrdersError("");
    setUpdatingOrderId(order.apiId);
    try {
      const updatedOrder = await updateOrderStatus(order.apiId, nextStatus, adminToken);
      setOrders((currentOrders) => currentOrders.map((item) => (item.apiId === updatedOrder.apiId ? updatedOrder : item)));
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "更新訂單狀態失敗，請稍後再試。");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">茶</div>
          <div>
            <p className="eyebrow">Drink Admin</p>
            <h1>飲料後台</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="後台功能">
          {sections.map((section) => (
            <button
              className={`nav-item ${activeSection === section.id ? "active" : ""}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div className="operator-card">
          <p className="eyebrow">{admin ? "目前登入" : "管理員功能"}</p>
          <strong>{admin?.name ?? "尚未登入"}</strong>
          <span>{admin ? admin.roles.join("、") : "登入後可管理訂單"}</span>
          <button
            className={admin ? "auth-button logout" : "auth-button"}
            onClick={admin ? handleLogout : () => {
              setLoginError("");
              setLoginOpen(true);
            }}
            type="button"
          >
            {admin ? "登出" : "管理員登入"}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">營運中心</p>
            <h2>{sections.find((section) => section.id === activeSection)?.label}</h2>
          </div>
          <div className="topbar-actions">
            {admin && <span className="session-chip">已登入：{admin.email}</span>}
            <label className="search-box">
              <span>搜尋</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="訂單、會員、分店"
              />
            </label>
            <button className="primary-button" type="button">新增項目</button>
          </div>
        </header>

        {activeSection === "dashboard" && (
          <div className="content-stack">
            <section className="metric-grid">
              <Metric title="今日營收" value={currency(totalRevenue)} trend="+12.4%" />
              <Metric title="今日訂單" value={number(totalOrders)} trend="+8.1%" />
              <Metric title="熱銷飲品" value={bestSeller?.name ?? "尚無資料"} trend={`${bestSeller?.soldToday ?? 0} 杯`} />
              <Metric title="營業分店" value={`${branches.filter((branch) => branch.open).length}/${branches.length}`} trend="正常" />
            </section>

            <section className="split-layout">
              <Panel title="即時訂單">
                {ordersLoading && <p className="empty-state">訂單資料載入中...</p>}
                {!ordersLoading && ordersError && <p className="empty-state danger">{ordersError}</p>}
                {!ordersLoading && !ordersError && filteredOrders.length === 0 && <p className="empty-state">目前沒有訂單。</p>}
                {!ordersLoading && !ordersError && filteredOrders.length > 0 && <OrderTable orders={filteredOrders.slice(0, 4)} compact />}
              </Panel>
              <Panel title="本週營收">
                <div className="bar-chart" aria-label="本週營收長條圖">
                  {salesByDay.map((sale) => (
                    <div className="bar-item" key={sale.day}>
                      <div className="bar-track">
                        <span style={{ height: `${(sale.revenue / maxRevenue) * 100}%` }} />
                      </div>
                      <small>{sale.day}</small>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <Panel title="分店狀態">
              <BranchGrid />
            </Panel>
          </div>
        )}

        {activeSection === "orders" && (
          <Panel title="訂單列表" action={<StatusFilter value={orderStatus} onChange={setOrderStatus} />}>
            {ordersLoading && <p className="empty-state">訂單資料載入中...</p>}
            {!ordersLoading && ordersError && <p className="empty-state danger">{ordersError}</p>}
            {!ordersLoading && !ordersError && filteredOrders.length === 0 && <p className="empty-state">目前沒有符合條件的訂單。</p>}
            {!ordersLoading && !ordersError && filteredOrders.length > 0 && (
              <OrderTable
                canManageOrders={canManageOrders}
                onStatusChange={handleOrderStatusChange}
                orders={filteredOrders}
                updatingOrderId={updatingOrderId}
              />
            )}
          </Panel>
        )}

        {activeSection === "menu" && (
          <Panel title="飲品菜單">
            {menuLoading && <p className="empty-state">飲品資料載入中...</p>}
            {!menuLoading && menuError && <p className="empty-state danger">{menuError}</p>}
            {!menuLoading && !menuError && (
              <div className="data-grid">
                {menuItems.map((item) => (
                  <article className="item-card" key={item.id}>
                    <div className="item-card-image" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                    <div>
                      <p className="eyebrow">{item.category}</p>
                      <h3>{item.name}</h3>
                    </div>
                    <p className="item-description">{item.description}</p>
                    <strong>{currency(item.price)}</strong>
                    <span className={`chip ${item.stock}`}>{stockText(item.stock)}</span>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        )}

        {activeSection === "branches" && (
          <Panel title="分店管理">
            <BranchGrid />
          </Panel>
        )}

        {activeSection === "members" && (
          <Panel title="會員資料">
            <table className="table">
              <thead>
                <tr>
                  <th>會員</th>
                  <th>等級</th>
                  <th>點數</th>
                  <th>最近訂購</th>
                  <th>累積消費</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.name}</strong><span>{member.id}</span></td>
                    <td>{member.tier}</td>
                    <td>{number(member.points)}</td>
                    <td>{member.lastOrder}</td>
                    <td>{currency(member.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {activeSection === "coupons" && (
          <Panel title="優惠活動">
            <div className="data-grid">
              {coupons.map((coupon) => (
                <article className="item-card" key={coupon.id}>
                  <div>
                    <p className="eyebrow">{coupon.code}</p>
                    <h3>{coupon.title}</h3>
                  </div>
                  <strong>{coupon.discount}</strong>
                  <span className={`chip ${coupon.active ? "normal" : "muted"}`}>{coupon.active ? "啟用中" : "已停用"}</span>
                  <small>已使用 {coupon.used} 次，到期 {coupon.expiresAt}</small>
                </article>
              ))}
            </div>
          </Panel>
        )}

        {activeSection === "reports" && (
          <Panel title="銷售分析">
            <div className="report-grid">
              <Metric title="平均客單價" value={currency(totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0)} trend="+3.6%" />
              <Metric title="本週營收" value={currency(salesByDay.reduce((sum, sale) => sum + sale.revenue, 0))} trend="+9.8%" />
              <Metric title="缺貨品項" value={`${menuItems.filter((item) => item.stock !== "normal").length}`} trend="需補貨" />
            </div>
            <div className="bar-chart large">
              {salesByDay.map((sale) => (
                <div className="bar-item" key={sale.day}>
                  <div className="bar-track">
                    <span style={{ height: `${(sale.revenue / maxRevenue) * 100}%` }} />
                  </div>
                  <small>{sale.day}</small>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeSection === "settings" && (
          <Panel title="系統設定">
            <div className="settings-list">
              {["訂單自動接單", "低庫存通知", "會員點數累積", "分店營業狀態同步"].map((setting, index) => (
                <label className="toggle-row" key={setting}>
                  <span>{setting}</span>
                  <input type="checkbox" defaultChecked={index !== 1} />
                </label>
              ))}
            </div>
          </Panel>
        )}
      </section>

      {loginOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
            <div className="login-modal-header">
              <div>
                <p className="eyebrow">Admin Login</p>
                <h3 id="admin-login-title">管理員登入</h3>
              </div>
              <button
                aria-label="關閉登入視窗"
                className="icon-button"
                onClick={() => setLoginOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                <span>Email</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                  type="email"
                  value={loginEmail}
                />
              </label>
              <label>
                <span>密碼</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                  type="password"
                  value={loginPassword}
                />
              </label>
              {loginError && <p className="form-error">{loginError}</p>}
              <div className="login-actions">
                <button className="secondary-button" onClick={() => setLoginOpen(false)} type="button">
                  取消
                </button>
                <button className="primary-button" disabled={loginLoading} type="submit">
                  {loginLoading ? "登入中..." : "登入"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ title, value, trend }: { title: string; value: string; trend: string }) {
  return (
    <article className="metric-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{trend}</span>
    </article>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusFilter({
  value,
  onChange
}: {
  value: OrderStatus | "all";
  onChange: (value: OrderStatus | "all") => void;
}) {
  const options: (OrderStatus | "all")[] = ["all", ...orderStatusOptions];
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          className={value === option ? "selected" : ""}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option === "all" ? "全部" : statusLabels[option]}
        </button>
      ))}
    </div>
  );
}

function OrderTable({
  orders: rows,
  compact = false,
  canManageOrders = false,
  onStatusChange,
  updatingOrderId = null
}: {
  orders: Order[];
  compact?: boolean;
  canManageOrders?: boolean;
  onStatusChange?: (order: Order, status: OrderStatus) => void;
  updatingOrderId?: number | null;
}) {
  return (
    <table className={`table ${compact ? "compact" : ""}`}>
      <thead>
        <tr>
          <th>訂單</th>
          <th>品項</th>
          <th>分店</th>
          <th>狀態</th>
          {!compact && <th>付款</th>}
          <th>金額</th>
          {!compact && <th>狀態操作</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((order) => (
          <tr key={order.id}>
            <td><strong>{order.id}</strong><span>{order.customer} / {order.pickupTime}</span></td>
            <td>{order.items.join("、")}</td>
            <td>{order.branch}</td>
            <td><span className={`chip ${order.status}`}>{statusLabels[order.status]}</span></td>
            {!compact && <td>{order.paidBy}</td>}
            <td>{currency(order.total)}</td>
            {!compact && (
              <td>
                {canManageOrders ? (
                  <select
                    className="status-select"
                    disabled={updatingOrderId === order.apiId}
                    onChange={(event) => onStatusChange?.(order, event.target.value as OrderStatus)}
                    value={order.status}
                  >
                    {orderStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="muted-text">僅最高管理員</span>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BranchGrid() {
  return (
    <div className="data-grid">
      {branches.map((branch) => (
        <article className="item-card" key={branch.id}>
          <div>
            <p className="eyebrow">{branch.manager}</p>
            <h3>{branch.name}</h3>
          </div>
          <span className={`chip ${branch.open ? "normal" : "muted"}`}>{branch.open ? "營業中" : "休息"}</span>
          <strong>{currency(branch.revenueToday)}</strong>
          <small>今日 {branch.ordersToday} 筆訂單</small>
        </article>
      ))}
    </div>
  );
}

function stockText(stock: "normal" | "low" | "sold-out") {
  if (stock === "low") return "低庫存";
  if (stock === "sold-out") return "售完";
  return "庫存正常";
}
