import { useEffect, useState } from "react";
import { Category } from "../../types";
import * as api from "../../lib/tauri";

interface CategoryModalProps {
  editing?: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

function CategoryModal({ editing, onClose, onSaved }: CategoryModalProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [direction, setDirection] = useState(editing?.direction ?? "expense");
  const [icon, setIcon] = useState(editing?.icon ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { setError("Name is required."); return; }
    setLoading(true);
    setError("");
    try {
      if (editing) {
        await api.updateCategory(editing.id, { name, direction, icon: icon || null });
      } else {
        await api.createCategory({ name, direction, icon: icon || null });
      }
      onSaved();
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{editing ? "Edit Category" : "Add Category"}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Direction</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value as "income" | "expense" | "both")}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="form-group">
              <label>Icon (emoji)</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 🍔" />
            </div>
          </div>
          {error && <p style={{ color: "var(--expense)", marginBottom: 12 }}>{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    setCategories(await api.listCategories());
  }

  useEffect(() => { load(); }, []);

  const displayed = showArchived
    ? categories
    : categories.filter((c) => c.is_archived === 0);

  const income = displayed.filter((c) => c.direction === "income" || c.direction === "both");
  const expense = displayed.filter((c) => c.direction === "expense" || c.direction === "both");

  function renderList(cats: Category[], label: string) {
    return (
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{label}</div>
        {cats.length === 0 ? (
          <div className="empty-state"><p>None yet.</p></div>
        ) : (
          <table>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} style={{ opacity: c.is_archived ? 0.5 : 1 }}>
                  <td style={{ width: 32 }}>{c.icon ?? ""}</td>
                  <td>{c.name} {c.is_archived === 1 && <span className="badge" style={{ background: "#e5e7eb", color: "#6b7280" }}>archived</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => { setEditing(c); setShowModal(true); }}
                        disabled={c.is_archived === 1}
                      >
                        Edit
                      </button>
                      {c.is_archived === 0 ? (
                        <button
                          className="btn btn-sm"
                          onClick={async () => { await api.archiveCategory(c.id); load(); }}
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={async () => { await api.restoreCategory(c.id); load(); }}
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
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            + Add Category
          </button>
        </div>
      </div>

      <div className="grid-2">
        {renderList(income, "Income Categories")}
        {renderList(expense, "Expense Categories")}
      </div>

      {showModal && (
        <CategoryModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
