import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { DashboardData } from "../types";
import * as api from "../lib/tauri";
import AddTransactionModal from "../components/AddTransactionModal";
import AddTransferModal from "../components/AddTransferModal";

const COLORS = ["#4f8ef7","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const accountTypeIcon: Record<string, string> = {
  cash: "💵", debit: "💳", credit: "💰", savings: "🏦", investment: "📈",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const [d, cats] = await Promise.all([api.getDashboard(), api.listCategories()]);
    setData(d);
    setCategories(cats);
  }

  useEffect(() => { load(); }, []);

  if (!data) {
    return <div className="empty-state"><p>Loading…</p></div>;
  }

  const barData = [
    { name: "Income", amount: data.monthly_income, fill: "#22c55e" },
    { name: "Expenses", amount: data.monthly_expenses, fill: "#ef4444" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowTransferModal(true)}>
            ↔ Transfer
          </button>
          <button className="btn btn-primary" onClick={() => setShowTxModal(true)}>
            + Transaction
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">₱{fmt(data.net_worth)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Month Income</div>
          <div className="stat-value income">₱{fmt(data.monthly_income)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Month Expenses</div>
          <div className="stat-value expense">₱{fmt(data.monthly_expenses)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Month Net</div>
          <div
            className={`stat-value ${
              data.monthly_income - data.monthly_expenses >= 0 ? "income" : "expense"
            }`}
          >
            ₱{fmt(data.monthly_income - data.monthly_expenses)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Accounts */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Accounts</div>
          {data.accounts.length === 0 ? (
            <div className="empty-state"><p>No accounts yet.</p></div>
          ) : (
            data.accounts.map((a) => (
              <div
                key={a.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => navigate(`/accounts/${a.id}`)}
              >
                <span>
                  {accountTypeIcon[a.type] ?? "🏦"} {a.name}
                </span>
                <span className={a.type === "credit" ? "text-expense" : "text-income"}>
                  ₱{fmt(a.balance)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Monthly bar */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>This Month</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number | undefined) => v !== undefined ? `₱${fmt(v)}` : ""} />
                <Bar dataKey="amount" fill="#4f8ef7">
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Spending donut */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Spending by Category</div>
          {data.spending_by_category.length === 0 ? (
            <div className="empty-state"><p>No expense data this month.</p></div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.spending_by_category}
                    dataKey="amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {data.spending_by_category.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => v !== undefined ? `₱${fmt(v)}` : ""} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent Transactions</div>
          {data.recent_transactions.length === 0 ? (
            <div className="empty-state"><p>No transactions yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <tbody>
                  {data.recent_transactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.category_name ?? "Uncategorized"}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{t.account_name} · {t.date}</div>
                      </td>
                      <td className="text-right">
                        <span className={t.type === "income" ? "text-income" : "text-expense"}>
                          {t.type === "income" ? "+" : "-"}₱{fmt(t.amount)}
                        </span>
                        {t.transfer_id && (
                          <div><span className="badge badge-transfer" style={{ fontSize: 10 }}>Transfer</span></div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showTxModal && (
        <AddTransactionModal
          accounts={data.accounts}
          categories={categories}
          onClose={() => setShowTxModal(false)}
          onSaved={() => { setShowTxModal(false); load(); }}
        />
      )}

      {showTransferModal && (
        <AddTransferModal
          accounts={data.accounts}
          onClose={() => setShowTransferModal(false)}
          onSaved={() => { setShowTransferModal(false); load(); }}
        />
      )}
    </div>
  );
}
