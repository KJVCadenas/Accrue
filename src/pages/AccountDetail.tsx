import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { AccountWithBalance, Transaction } from "../types";
import * as api from "../lib/tauri";
import AddTransactionModal from "../components/AddTransactionModal";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeIcon: Record<string, string> = {
  cash: "💵", debit: "💳", credit: "💰", savings: "🏦", investment: "📈",
};

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountWithBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  async function load() {
    if (!id) return;
    const [acct, txns, cats, accs] = await Promise.all([
      api.getAccount(Number(id)),
      api.listTransactions({ account_id: Number(id) }),
      api.listCategories(),
      api.listAccounts(),
    ]);
    setAccount(acct);
    setTransactions(txns);
    setCategories(cats);
    setAccounts(accs);
  }

  useEffect(() => { load(); }, [id]);

  if (!account) return <div className="empty-state"><p>Loading…</p></div>;

  // Build running balance chart data
  const sortedTxns = [...transactions].reverse();
  let running = account.opening_balance;
  const chartData = sortedTxns.map((t) => {
    if (account.type === "credit") {
      running += t.type === "expense" ? t.amount : -t.amount;
    } else {
      running += t.type === "income" ? t.amount : -t.amount;
    }
    return { date: t.date, balance: running };
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-sm" onClick={() => navigate("/accounts")} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <h1 className="page-title">
            {typeIcon[account.type]} {account.name}
          </h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          + Transaction
        </button>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className={`stat-value ${account.type === "credit" ? "expense" : "income"}`}>
            ₱{fmt(account.balance)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Type</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
          </div>
        </div>
        {account.credit_limit && (
          <div className="stat-card">
            <div className="stat-label">Credit Limit</div>
            <div className="stat-value" style={{ fontSize: 18 }}>₱{fmt(account.credit_limit)}</div>
          </div>
        )}
      </div>

      {chartData.length > 1 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Balance Over Time</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v: number | undefined) => v !== undefined ? `₱${fmt(v)}` : ""} />
                <Line type="monotone" dataKey="balance" stroke="#4f8ef7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Transactions</div>
        {transactions.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.category_name ?? "—"}</td>
                    <td>{t.notes ?? ""} {t.transfer_id && <span className="badge badge-transfer">Transfer</span>}</td>
                    <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                    <td className={`text-right ${t.type === "income" ? "text-income" : "text-expense"}`}>
                      {t.type === "income" ? "+" : "-"}₱{fmt(t.amount)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => { setEditing(t); setShowModal(true); }}
                        disabled={!!t.transfer_id}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddTransactionModal
          accounts={accounts}
          categories={categories}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
