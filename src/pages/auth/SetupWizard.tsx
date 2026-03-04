import { useState } from "react";
import { setupPassword, enableBiometric } from "../../lib/auth";
import { authenticate } from "@tauri-apps/plugin-biometric";

type Step = 1 | 2 | 3 | 4;

interface Props {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  const passwordStrong = password.length >= 8;
  const passwordsMatch = password === confirm;

  async function handleCreatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!passwordStrong) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await setupPassword(password);
      // Always show the biometric step — user can skip if unavailable or unwanted
      setStep(3);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableBiometric() {
    setBiometricError("");
    try {
      await authenticate("Enable biometric unlock for Accrue");
      await enableBiometric(password);
      setStep(4);
    } catch (err: unknown) {
      setBiometricError(String(err));
    }
  }

  return (
    <div className="auth-fullscreen">
      <div className="auth-card">
        <div className="wizard-steps">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`wizard-step${step === s ? " active" : step > s ? " done" : ""}`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="auth-logo">🔐 Accrue</div>
            <p className="auth-subtitle">
              Your financial data will be encrypted and protected with a password.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              This password encrypts the database file on your disk. Without it,
              the data cannot be read — even if someone accesses your computer storage.
              <br /><br />
              <strong>There is no password recovery.</strong> If you forget it,
              you can only reset and lose all data. Choose something memorable.
            </p>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStep(2)}>
              Get started
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-logo">Create password</div>
            <p className="auth-subtitle">Choose a strong password to protect your data.</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleCreatePassword}>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                />
                {password.length > 0 && (
                  <small style={{ color: passwordStrong ? "var(--income)" : "var(--expense)" }}>
                    {passwordStrong ? "✓ Strong enough" : "Too short — use at least 8 characters"}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                />
                {confirm.length > 0 && !passwordsMatch && (
                  <small style={{ color: "var(--expense)" }}>Passwords do not match</small>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={loading || !passwordStrong || !passwordsMatch}
              >
                {loading ? "Setting up…" : "Create password"}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <div className="auth-logo">Enable biometrics?</div>
            <p className="auth-subtitle">
              Use Windows Hello or fingerprint to unlock quickly. Your password
              is still required to change security settings.
            </p>
            {biometricError && <div className="auth-error">{biometricError}</div>}
            <button
              className="btn btn-primary auth-biometric-btn"
              onClick={handleEnableBiometric}
            >
              Enable biometric unlock
            </button>
            <button
              className="btn"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => setStep(4)}
            >
              Skip for now
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="auth-logo">You're protected</div>
            <p className="auth-subtitle">
              Your database is now encrypted. You'll need your password each time you open Accrue.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={onComplete}
            >
              Open Accrue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
