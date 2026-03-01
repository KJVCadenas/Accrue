import { useEffect, useState } from "react";
import { AccountWithBalance } from "../../types";
import * as api from "../../lib/tauri";
import AddAccountModal from "../../components/AddAccountModal";

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeIcon: Record<string, string> = {
  cash: "💵", debit: "💳", credit: "💰", savings: "🏦", investment: "📈",
};

export default function AccountsManagement() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    setAccounts(await api.listAccounts());
  }

  useEffect(() => { load(); }, []);

  const displayed = showArchived ? accounts : accounts.filter((a) => a.is_active === 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Accounts</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <button
            className="btn btn-primary"
            onClick={() => { setEditing(null); setShowModal(true); }}
          >
            + Add Account
          </button>
        </div>
      </div>

      <div className="card">
        {displayed.length === 0 ? (
          <div className="empty-state"><p>No accounts.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Opening</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((a) => (
                <tr key={a.id} style={{ opacity: a.is_active === 0 ? 0.5 : 1 }}>
                  <td>
                    {typeIcon[a.type]} {a.name}
                    {a.subtype && <span className="text-muted"> ({a.subtype})</span>}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{a.type}</td>
                  <td className={`text-right ${a.type === "credit" ? "text-expense" : "text-income"}`}>
                    ₱{fmt(a.balance)}
                  </td>
                  <td className="text-right text-muted">₱{fmt(a.opening_balance)}</td>
                  <td>
                    {a.is_active === 1 ? (
                      <span className="badge" style={{ background: "#dcfce7", color: "#16a34a" }}>Active</span>
                    ) : (
                      <span className="badge" style={{ background: "#e5e7eb", color: "#6b7280" }}>Archived</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => { setEditing(a); setShowModal(true); }}
                        disabled={a.is_active === 0}
                      >
                        Edit
                      </button>
                      {a.is_active === 1 ? (
                        <button
                          className="btn btn-sm"
                          onClick={async () => {
                            if (confirm(`Archive "${a.name}"?`)) {
                              await api.archiveAccount(a.id);
                              load();
                            }
                          }}
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={async () => { await api.restoreAccount(a.id); load(); }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddAccountModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
