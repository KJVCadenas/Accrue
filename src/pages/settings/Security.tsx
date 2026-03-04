import { useEffect, useState } from "react";
import {
  getSecuritySettings,
  updateSecuritySettings,
  changePassword,
  enableBiometric,
  disableBiometric,
  resetAllDataWithWipe,
} from "../../lib/auth";
import { authenticate } from "@tauri-apps/plugin-biometric";
import ConfirmModal from "../../components/ConfirmModal";

const AUTO_LOCK_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1 minute", value: 1 },
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
];

interface Props {
  onAutoLockChange: (minutes: number) => void;
  onLock: () => void;
}

export default function SecuritySettings({ onAutoLockChange, onLock }: Props) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [status, setStatus] = useState("");

  // Change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Biometric enable form
  const [bioPassword, setBioPassword] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  // Wipe confirmation
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  useEffect(() => {
    getSecuritySettings().then((s) => {
      setBiometricEnabled(s.biometric_enabled);
      setAutoLockMinutes(s.auto_lock_minutes);
    });
  }, []);

  function showStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 4000);
  }

  async function handleAutoLockChange(minutes: number) {
    setAutoLockMinutes(minutes);
    onAutoLockChange(minutes);
    try {
      await updateSecuritySettings(minutes);
    } catch (err: unknown) {
      showStatus("Error: " + String(err));
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      showStatus("Error: New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNew) {
      showStatus("Error: New passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmNew("");
      showStatus("Password changed successfully.");
    } catch (err: unknown) {
      showStatus("Error: " + String(err));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleEnableBiometric(e: React.FormEvent) {
    e.preventDefault();
    setBioLoading(true);
    try {
      await authenticate("Enable biometric unlock for Accrue");
      await enableBiometric(bioPassword);
      setBiometricEnabled(true);
      setBioPassword("");
      showStatus("Biometric unlock enabled.");
    } catch (err: unknown) {
      showStatus("Error: " + String(err));
    } finally {
      setBioLoading(false);
    }
  }

  async function handleDisableBiometric() {
    try {
      await disableBiometric();
      setBiometricEnabled(false);
      showStatus("Biometric unlock disabled.");
    } catch (err: unknown) {
      showStatus("Error: " + String(err));
    }
  }

  async function handleWipe() {
    try {
      await resetAllDataWithWipe();
      onLock();
    } catch (err: unknown) {
      showStatus("Error: " + String(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Security</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>

        {/* Auto-lock */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Auto-lock</div>
          <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Lock the app automatically after this period of inactivity or when the window loses focus.
          </p>
          <select
            className="form-control"
            style={{ width: "auto" }}
            value={autoLockMinutes}
            onChange={(e) => handleAutoLockChange(Number(e.target.value))}
          >
            {AUTO_LOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Change password */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Change Password</div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current password</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input
                type="password"
                className="form-control"
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pwLoading || !oldPassword || !newPassword || !confirmNew}
            >
              {pwLoading ? "Changing…" : "Change password"}
            </button>
          </form>
        </div>

        {/* Biometric */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Biometric Unlock</div>
          <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Use Windows Hello or fingerprint to unlock without typing your password.
            Your password is still required to change security settings.
          </p>
          {biometricEnabled ? (
            <button className="btn btn-danger" onClick={handleDisableBiometric}>
              Disable biometric unlock
            </button>
          ) : (
            <form onSubmit={handleEnableBiometric}>
              <div className="form-group">
                <label>Confirm with current password</label>
                <input
                  type="password"
                  className="form-control"
                  value={bioPassword}
                  onChange={(e) => setBioPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={bioLoading || !bioPassword}
              >
                {bioLoading ? "Enabling…" : "Enable biometric unlock"}
              </button>
            </form>
          )}
        </div>

        {/* Danger zone */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--expense)" }}>
            Danger Zone
          </div>
          <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Wipe all data and remove the password. Use this if you have forgotten
            your password. <strong>All financial data will be permanently deleted.</strong>
          </p>
          <button className="btn btn-danger" onClick={() => setShowWipeConfirm(true)}>
            Wipe all data
          </button>
        </div>

        {status && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius)",
              background: status.startsWith("Error") ? "#fee2e2" : "#dcfce7",
              color: status.startsWith("Error") ? "#dc2626" : "#16a34a",
              fontSize: 13,
            }}
          >
            {status}
          </div>
        )}
      </div>

      {showWipeConfirm && (
        <ConfirmModal
          message="This will permanently delete ALL financial data and your password. This cannot be undone."
          confirmLabel="Wipe everything"
          danger
          onConfirm={handleWipe}
          onCancel={() => setShowWipeConfirm(false)}
        />
      )}
    </div>
  );
}
