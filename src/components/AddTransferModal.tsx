import { useState } from "react";
import { AccountWithBalance, Transfer } from "../types";
import * as api from "../lib/tauri";

interface Props {
  accounts: AccountWithBalance[];
  editing?: Transfer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransferModal({ accounts, editing, onClose, onSaved }: Props) {
  const activeAccounts = accounts.filter((a) => a.is_active === 1);
  const [fromId, setFromId] = useState<number>(editing?.from_account_id ?? activeAccounts[0]?.id ?? 0);
  const [toId, setToId] = useState<number>(editing?.to_account_id ?? activeAccounts[1]?.id ?? 0);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [transferType, setTransferType] = useState<"regular" | "credit_payment">(
    (editing?.transfer_type as "regular" | "credit_payment") ?? "regular"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || (!editing && fromId === toId)) {
      setError("Select different from/to accounts and enter an amount.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (editing) {
        await api.updateTransfer(editing.id, {
          amount: parseFloat(amount),
          date,
          notes: notes || null,
          transfer_type: transferType,
        });
      } else {
        await api.createTransfer({
          from_account_id: fromId,
          to_account_id: toId,
          amount: parseFloat(amount),
          date,
          notes: notes || null,
          transfer_type: transferType,
        });
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
        <div className="modal-title">{editing ? "Edit Transfer" : "Add Transfer"}</div>

        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${transferType === "regular" ? "active" : ""}`}
            onClick={() => setTransferType("regular")}
          >
            Regular Transfer
          </button>
          <button
            type="button"
            className={`toggle-btn ${transferType === "credit_payment" ? "active" : ""}`}
            onClick={() => setTransferType("credit_payment")}
          >
            Credit Payment
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>From Account</label>
            <select value={fromId} onChange={(e) => setFromId(Number(e.target.value))} disabled={!!editing}>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              {editing && !activeAccounts.find((a) => a.id === editing.from_account_id) && (
                <option value={editing.from_account_id}>(archived account)</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>To Account</label>
            <select value={toId} onChange={(e) => setToId(Number(e.target.value))} disabled={!!editing}>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              {editing && !activeAccounts.find((a) => a.id === editing.to_account_id) && (
                <option value={editing.to_account_id}>(archived account)</option>
              )}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && (
            <p style={{ color: "var(--expense)", marginBottom: 12 }}>{error}</p>
          )}

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
