import { useState } from "react";
import { authenticate } from "@tauri-apps/plugin-biometric";
import { unlockWithPassword, unlockWithBiometric, resetAllDataWithWipe } from "../../lib/auth";
import ConfirmModal from "../../components/ConfirmModal";

interface Props {
  biometricEnabled: boolean;
  onUnlocked: () => void;
}

export default function LockScreen({ biometricEnabled, onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [rateLimitSecs, setRateLimitSecs] = useState(0);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError("");
    setLoading(true);
    try {
      await unlockWithPassword(password);
      onUnlocked();
    } catch (err: unknown) {
      const msg = String(err);
      // Extract remaining seconds from rate-limit message
      const match = msg.match(/(\d+) seconds/);
      if (match) setRateLimitSecs(parseInt(match[1], 10));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    setBiometricLoading(true);
    setError("");
    try {
      await authenticate("Unlock Accrue");
      await unlockWithBiometric();
      onUnlocked();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleWipe() {
    try {
      await resetAllDataWithWipe();
      // App state will re-read auth status and show SetupWizard
      window.location.reload();
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  return (
    <div className="auth-fullscreen">
      <div className="auth-card">
        <div className="auth-logo">🔐 Accrue</div>
        <p className="auth-subtitle">Enter your password to unlock</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              disabled={loading || rateLimitSecs > 0}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading || !password || rateLimitSecs > 0}
          >
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        {biometricEnabled && (
          <button
            className="btn auth-biometric-btn"
            onClick={handleBiometric}
            disabled={biometricLoading}
            style={{ marginTop: 10 }}
          >
            {biometricLoading ? "Verifying…" : "Use biometrics"}
          </button>
        )}

        <button
          className="btn-link"
          style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onClick={() => setShowWipeConfirm(true)}
        >
          Forgot password?
        </button>
      </div>

      {showWipeConfirm && (
        <ConfirmModal
          message="This will permanently delete ALL financial data and your password. This cannot be undone. You will need to set up Accrue from scratch."
          confirmLabel="Delete everything"
          danger
          onConfirm={handleWipe}
          onCancel={() => setShowWipeConfirm(false)}
        />
      )}
    </div>
  );
}
