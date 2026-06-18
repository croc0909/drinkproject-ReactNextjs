"use client";

import { useEffect, useMemo, useState } from "react";
import { branches, coupons, members, orders, salesByDay } from "@/lib/mock-data";
import { currency, number } from "@/lib/format";
import { getDrinks } from "@/lib/drinks";
import type { MenuItem, Order, OrderStatus } from "@/types/admin";

type Section = "dashboard" | "orders" | "menu" | "branches" | "members" | "coupons" | "reports" | "settings";

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
  new: "新訂單",
  making: "製作中",
  ready: "可取餐",
  completed: "已完成",
  cancelled: "已取消"
};

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [query, setQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDrinks() {
      try {
        setMenuLoading(true);
        setMenuError("");
        setMenuItems(await getDrinks(controller.signal));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMenuError("無法載入飲品資料，請確認 Go API 是否已啟動。");
      } finally {
        setMenuLoading(false);
      }
    }

    loadDrinks();

    return () => controller.abort();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderStatus === "all" || order.status === orderStatus;
      const text = `${order.id} ${order.customer} ${order.branch} ${order.items.join(" ")}`.toLowerCase();
      return matchesStatus && text.includes(query.toLowerCase());
    });
  }, [orderStatus, query]);

  const totalRevenue = branches.reduce((sum, branch) => sum + branch.revenueToday, 0);
  const totalOrders = branches.reduce((sum, branch) => sum + branch.ordersToday, 0);
  const bestSeller = [...menuItems].sort((a, b) => b.soldToday - a.soldToday)[0];
  const maxRevenue = Math.max(...salesByDay.map((sale) => sale.revenue));

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
          <p className="eyebrow">今日值班</p>
          <strong>Andy Admin</strong>
          <span>總管理員</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">營運中心</p>
            <h2>{sections.find((section) => section.id === activeSection)?.label}</h2>
          </div>
          <div className="topbar-actions">
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
                <OrderTable orders={filteredOrders.slice(0, 4)} compact />
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
            <OrderTable orders={filteredOrders} />
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
              <Metric title="平均客單價" value={currency(Math.round(totalRevenue / totalOrders))} trend="+3.6%" />
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
  const options: (OrderStatus | "all")[] = ["all", "new", "making", "ready", "completed"];
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

function OrderTable({ orders: rows, compact = false }: { orders: Order[]; compact?: boolean }) {
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
