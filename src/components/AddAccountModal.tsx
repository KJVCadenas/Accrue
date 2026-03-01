import { useState } from "react";
import { AccountWithBalance } from "../types";
import * as api from "../lib/tauri";

interface Props {
  editing?: AccountWithBalance | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddAccountModal({ editing, onClose, onSaved }: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [accountType, setAccountType] = useState(editing?.type ?? "cash");
  const [subtype, setSubtype] = useState(editing?.subtype ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    editing?.opening_balance?.toString() ?? "0"
  );
  const [creditLimit, setCreditLimit] = useState(
    editing?.credit_limit?.toString() ?? ""
  );
  const [billingDay, setBillingDay] = useState(
    editing?.billing_cycle_day?.toString() ?? ""
  );
  const [paymentDay, setPaymentDay] = useState(
    editing?.payment_due_day?.toString() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCredit = accountType === "credit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { setError("Name is required."); return; }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name,
        account_type: accountType,
        subtype: subtype || null,
        opening_balance: parseFloat(openingBalance) || 0,
        credit_limit: isCredit && creditLimit ? parseFloat(creditLimit) : null,
        billing_cycle_day: isCredit && billingDay ? parseInt(billingDay) : null,
        payment_due_day: isCredit && paymentDay ? parseInt(paymentDay) : null,
      };
      if (editing) {
        await api.updateAccount(editing.id, payload);
      } else {
        await api.createAccount(payload);
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
          {editing ? "Edit Account" : "Add Account"}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BDO Savings"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as "cash" | "debit" | "credit" | "savings" | "investment")}
              >
                <option value="cash">Cash</option>
                <option value="debit">Debit</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit Card</option>
                <option value="investment">Investment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Subtype (optional)</label>
              <input
                type="text"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                placeholder="e.g. Checking"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              {isCredit ? "Current Balance Owed" : "Opening Balance"}
            </label>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {isCredit && (
            <>
              <div className="form-group">
                <label>Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Billing Cycle Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                    placeholder="e.g. 15"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Due Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            </>
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
