import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccountWithBalance } from "../types";
import * as api from "../lib/tauri";
import AddAccountModal from "../components/AddAccountModal";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeIcon: Record<string, string> = {
  cash: "💵", debit: "💳", credit: "💰", savings: "🏦", investment: "📈",
};

const typeOrder = ["cash", "debit", "savings", "credit", "investment"];

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setAccounts(await api.listAccounts());
  }

  useEffect(() => { load(); }, []);

  const activeAccounts = accounts.filter((a) => a.is_active === 1);

  const grouped = typeOrder.reduce<Record<string, AccountWithBalance[]>>((acc, type) => {
    const group = activeAccounts.filter((a) => a.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Account
        </button>
      </div>

      {activeAccounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No accounts yet. Add one to get started!</p>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([type, accs]) => (
          <div key={type} className="mb-4">
            <div style={{ fontWeight: 600, textTransform: "capitalize", marginBottom: 8, color: "var(--text-muted)" }}>
              {typeIcon[type]} {type === "credit" ? "Credit Cards" : type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div className="card-grid">
              {accs.map((a) => (
                <div
                  key={a.id}
                  className="stat-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/accounts/${a.id}`)}
                >
                  <div className="stat-label">{a.name}</div>
                  <div className={`stat-value ${a.type === "credit" ? "expense" : "income"}`}>
                    ₱{fmt(a.balance)}
                  </div>
                  {a.type === "credit" && a.credit_limit && (
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Limit: ₱{fmt(a.credit_limit)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <AddAccountModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
