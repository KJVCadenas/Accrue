import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MonthSummary } from "../types";
import * as api from "../lib/tauri";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MonthlyTrends() {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<MonthSummary[]>([]);

  async function load() {
    setData(await api.getMonthlyTrends(months));
  }

  useEffect(() => { load(); }, [months]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Monthly Trends</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Months:</label>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="card">
          <div className="empty-state"><p>No transaction data yet.</p></div>
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Income vs Expenses</div>
            <div className="chart-container" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v: number | undefined) => v !== undefined ? `₱${fmt(v)}` : ""} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Summary Table</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Income</th>
                    <th className="text-right">Expenses</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((m) => (
                    <tr key={m.label}>
                      <td>{m.label}</td>
                      <td className="text-right text-income">₱{fmt(m.income)}</td>
                      <td className="text-right text-expense">₱{fmt(m.expenses)}</td>
                      <td className={`text-right ${m.net >= 0 ? "text-income" : "text-expense"}`}>
                        ₱{fmt(m.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
