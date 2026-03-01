import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { SpendingBreakdown as SpendingBreakdownData } from "../types";
import * as api from "../lib/tauri";

const COLORS = ["#4f8ef7","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SpendingBreakdown() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<SpendingBreakdownData | null>(null);

  async function load() {
    setData(await api.getSpendingBreakdown(year, month));
  }

  useEffect(() => { load(); }, [year, month]);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Spending Breakdown</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 80, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
          />
        </div>
      </div>

      {data && (
        <>
          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-label">Total Income</div>
              <div className="stat-value income">₱{fmt(data.total_income)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value expense">₱{fmt(data.total_expenses)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net</div>
              <div className={`stat-value ${data.total_income - data.total_expenses >= 0 ? "income" : "expense"}`}>
                ₱{fmt(data.total_income - data.total_expenses)}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Spending Distribution</div>
              {data.categories.length === 0 ? (
                <div className="empty-state"><p>No expense data for this period.</p></div>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categories}
                        dataKey="amount"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                      >
                        {data.categories.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => v !== undefined ? `₱${fmt(v)}` : ""} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Category Breakdown</div>
              {data.categories.length === 0 ? (
                <div className="empty-state"><p>No data.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                            {c.category_name}
                          </div>
                        </td>
                        <td className="text-right text-expense">₱{fmt(c.amount)}</td>
                        <td className="text-right text-muted">
                          {data.total_expenses > 0
                            ? ((c.amount / data.total_expenses) * 100).toFixed(1) + "%"
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
