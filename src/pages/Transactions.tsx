import { useEffect, useState } from "react";
import { AccountWithBalance, Category, Transaction } from "../types";
import * as api from "../lib/tauri";
import AddTransactionModal from "../components/AddTransactionModal";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Filters
  const [filterAccount, setFilterAccount] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const [txns, accs, cats] = await Promise.all([
      api.listTransactions({
        account_id: filterAccount ? Number(filterAccount) : null,
        tx_type: filterType || null,
        category_id: filterCategory ? Number(filterCategory) : null,
        date_from: filterFrom || null,
        date_to: filterTo || null,
        search: search || null,
      }),
      api.listAccounts(),
      api.listCategories(),
    ]);
    setTransactions(txns);
    setAccounts(accs);
    setCategories(cats);
  }

  useEffect(() => { load(); }, [filterAccount, filterType, filterCategory, filterFrom, filterTo, search]);

  async function handleDelete(t: Transaction) {
    if (!confirm("Delete this transaction?")) return;
    await api.deleteTransaction(t.id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <button
          className="btn btn-primary"
          onClick={() => { setEditing(null); setShowModal(true); }}
        >
          + Add
        </button>
      </div>

      <div className="card">
        <div className="filters">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} title="From date" />
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} title="To date" />
          <button className="btn btn-sm" onClick={() => {
            setFilterAccount(""); setFilterType(""); setFilterCategory("");
            setFilterFrom(""); setFilterTo(""); setSearch("");
          }}>Clear</button>
        </div>

        <div className="table-wrapper">
          {transactions.length === 0 ? (
            <div className="empty-state"><p>No transactions found.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
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
                    <td style={{ whiteSpace: "nowrap" }}>{t.date}</td>
                    <td>{t.account_name}</td>
                    <td>{t.category_name ?? "—"}</td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.notes ?? ""}
                      {t.transfer_id && <span className="badge badge-transfer" style={{ marginLeft: 6 }}>Transfer</span>}
                      {t.is_recurring === 1 && <span className="badge" style={{ marginLeft: 4, background: "#fef9c3", color: "#92400e" }}>↻</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${t.type}`}>{t.type}</span>
                    </td>
                    <td className={`text-right ${t.type === "income" ? "text-income" : "text-expense"}`}>
                      {t.type === "income" ? "+" : "-"}₱{fmt(t.amount)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => { setEditing(t); setShowModal(true); }}
                          disabled={!!t.transfer_id}
                          title={t.transfer_id ? "Edit via transfer" : "Edit"}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(t)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
