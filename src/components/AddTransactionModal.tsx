import { useState } from "react";
import { AccountWithBalance, Category, Transaction } from "../types";
import * as api from "../lib/tauri";

interface Props {
  accounts: AccountWithBalance[];
  categories: Category[];
  editing?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransactionModal({
  accounts,
  categories,
  editing,
  onClose,
  onSaved,
}: Props) {
  const [txType, setTxType] = useState<"income" | "expense">(
    editing?.type ?? "expense"
  );
  const [accountId, setAccountId] = useState<number>(
    editing?.account_id ?? accounts[0]?.id ?? 0
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    editing?.category_id ?? null
  );
  const [amount, setAmount] = useState(editing?.amount?.toString() ?? "");
  const [date, setDate] = useState(
    editing?.date ?? new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(
    editing?.is_recurring === 1
  );
  const [frequency, setFrequency] = useState(
    editing?.recurrence_frequency ?? "monthly"
  );
  const [nextDue, setNextDue] = useState(editing?.next_due_date ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter(
    (c) => c.is_archived === 0 && (c.direction === txType || c.direction === "both")
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !accountId) { setError("Amount and account are required."); return; }
    setLoading(true);
    setError("");
    try {
      const payload = {
        account_id: accountId,
        category_id: categoryId,
        tx_type: txType,
        amount: parseFloat(amount),
        date,
        notes: notes || null,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? frequency : null,
        next_due_date: isRecurring && nextDue ? nextDue : null,
      };
      if (editing) {
        await api.updateTransaction(editing.id, payload);
      } else {
        await api.createTransaction(payload);
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
        <div className="modal-title">
          {editing ? "Edit Transaction" : "Add Transaction"}
        </div>

        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${txType === "expense" ? "active-expense" : ""}`}
            onClick={() => setTxType("expense")}
          >
            Expense
          </button>
          <button
            type="button"
            className={`toggle-btn ${txType === "income" ? "active-income" : ""}`}
            onClick={() => setTxType("income")}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label>Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {accounts.filter(a => a.is_active === 1).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Uncategorized —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
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

          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ width: "auto" }}
              />
              Recurring
            </label>
          </div>

          {isRecurring && (
            <div className="form-row">
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Next Due Date</label>
                <input
                  type="date"
                  value={nextDue}
                  onChange={(e) => setNextDue(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: "var(--expense)", marginBottom: 12 }}>{error}</p>
          )}

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
